const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const app = express();

version = 1.8;

//Port to listen on
const port = 8081;

//More logging
debug = false

//Don't actually send the pin to rws
//Logs result as 200
debug_disable_rws_callout = false

//If you're not running this behind a reverse proxy, you should use https
use_https = false

//Set paths to https privkey and cert here (only needed if use_https is true)
var PATH_TLSPrivateKey = "";
var PATH_TLSCertificate = "";

//If you're not using a reverse proxy, you'll probably need to setup cors with the address of whatever is serving the html
//app.use(cors({
//  origin: 'https://127.0.0.1'
//}));


//Don't change anything beneath this line now plz

var stats = {};
var resultTracker = {};
stats["outgoingRequests"] = 0;
stats["200"] = 0;
stats["400"] = 0;
stats["410"] = 0;
stats["500"] = 0;
stats["rejectedRequests"] = 0;
stats["incomingRequests"] = 0;
stats.serverVersion = version;

if (use_https) {
  var privateKey = fs.readFileSync(PATH_TLSPrivateKey);
  var certificate = fs.readFileSync(PATH_TLSCertificate);
}

//Custom middleware to let us get the whole post body
app.use(function(req, res, next) {
  req.rawBody = '';
  req.setEncoding('utf8');

  req.on('data', function(chunk) {
    req.rawBody += chunk;
  });

  req.on('end', function() {
    next();
  });
});


function addTrackerResponse(token, result, title, sentToRebble = true, source = "IFTTT") {
    if (resultTracker[token] == null) {
      resultTracker[token] = [];
    }

    var i = {};
    var num = parseInt(resultTracker[token].length);
    // if (num < 0) { num = 0 };
    i.number = num;
    i.result = result;
    i.title = title;
    i.sentToRWS = sentToRebble;
    i.source = source;
    i.time = new Date();

    resultTracker[token].push(i)
}

function uuidv4() {
  return 'xxxxxxxx-xxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}
function is_timeString(str) {
 regexp = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
 return (regexp.test(str))
}
function log(data) {
  console.log("[" + Date() + "] " + data);
}
function endAndLog(msg, res) {
  log("ifttt::end::msg:" + msg)
  addTrackerResponse(pin.id, "Parse Failure", "", false);
  stats["rejectedRequests"] += 1;
  res.end(msg);
}

app.get("/ping",function (req, res) {
	res.end("pong");
});
app.get("/pinproxy/ping",function (req, res) {
        res.end("pong");
});
app.get("/pinproxy/stats", function (req,res) {
        // var output = "";
        // for (var key in stats) {
        //     if (stats.hasOwnProperty(key)) {
        //         output = output + (key + " -> " + stats[key] + "  ");
        //     }
        // }
        res.end(JSON.stringify(stats));
});
app.get("/pinproxy/debug/:token", function (req,res) {
        if (req.params.token != null && req.params.token != "") {
            res.end(JSON.stringify(resultTracker[req.params.token]));
        } else {
            res.end("Missing Token");
        }
});
app.get("/",function (req, res) {
	res.end('<meta http-equiv="refresh" content="0; url=https://willow.systems/pebble/timeline-tester">');
});
app.get("*",function (req, res) {
	res.end('<meta http-equiv="refresh" content="0; url=https://willow.systems/pebble/timeline-tester">');
});

app.post('/pinproxy/:id',function(req,res){

  stats["incomingRequests"] += 1;


  if (req.rawBody == null || req.rawBody == "") {
	   res.status(400)
     addTrackerResponse(req.params.id, "JSON Body Missing", "", false, "Timeline-Tester");
	   endAndLog("Request body was blank!", res);
	   return
  }

  try {
	  pin = JSON.parse(req.rawBody);
  } catch(e) {
    res.status(400);
    addTrackerResponse(req.params.id, "JSON Parse Failed", "", false, "Timeline-Tester");
	  endAndLog("JSON Parse error: " + e, res);
	  return;
  }

  //Check that everything is there
  if (pin.id == null || pin.id == "") {
    res.status(400);
    addTrackerResponse(req.params.id, "Pin ID missing from JSON", "", false, "Timeline-Tester");
    res.end("Pin ID missing");
  }

  log(`${pin.id}::createPin`);
  log(`${pin.id}::validatePin`);

  if (req.params.id != pin.id) {
    res.status(400);
    addTrackerResponse(req.params.id, "Pin ID in JSON doesn't match Pin ID in request URL", "", false, "Timeline-Tester");
    res.end("Pin ID in JSON doesn't match Pin ID in request URL");
    return
  }

  if (pin.time == null || pin.time == "") {
    res.status(400);
    addTrackerResponse(pin.id, "pin.time missing from body", "", false, "Timeline-Tester");
    res.end("Pin Time missing");
    return
  }

  if (pin.layout == null) {
    res.status(400);
    addTrackerResponse(pin.id, "pin.layout missing from body", "", false, "Timeline-Tester");
    res.end("Pin Layout is blank");
    return
  }

  if (pin.layout.type != "genericPin") {
    res.status(400);
    addTrackerResponse(pin.id, "pin.layout.type was blank or set to a currently unsupported type", "", false, "Timeline-Tester");
    res.end("Pin Layout is blank or set to a currently unsupported type");
    return
  }

  if (pin.layout.title == null) {
    pin.layout.title = ""
  }
  if (pin.layout.title != null && pin.layout.title.toString().length > 512) {
    res.status(413);
    addTrackerResponse(pin.id, "pin.title was too long (Max 512 Chars)", "", false, "Timeline-Tester");
    endAndLog("Pin Title is too long (Max 512 character)", res);
    return
  }

  if (pin.layout.body == null) {
    pin.layout.body = ""
  }
  if (pin.layout.body != null && pin.layout.body.toString().length > 512) {
    res.status(413);
    addTrackerResponse(pin.id, "pin.body was too long (Max 512 Chars)", "", false, "Timeline-Tester");
    endAndLog("Pin Body is too long (Max 512 character)", res);
    return
  }

  if (pin.layout.subtitle == null) {
    pin.layout.subtitle = ""
  }
  if (pin.layout.subtitle != null && pin.layout.subtitle.toString().length > 512) {
    res.status(413);
    addTrackerResponse(pin.id, "pin.subtitle was too long (Max 512 Chars)", "", false, "Timeline-Tester");
    endAndLog("Pin Subtitle is too long (Max 512 character)", res);
    return
  }

  if (pin.layout.tinyIcon == null || pin.layout.tinyIcon == "") {
    res.status(400);
    res.end("Pin icon is missing");
    addTrackerResponse(pin.id, "pin.icon was missing", "", false, "Timeline-Tester");
    return
  }

  log(`${pin.id}::validatePin::pinValid`)

  //If we're here, all is good.
  submitPinToRWS(pin,submitPinToRWS_cb, submitPinToRWS_ecb, res);


});
app.post('/pinproxy-ifttt',function(req,res){

  stats["incomingRequests"] += 1;
  //Designed to be used as a proxy for ifttt webhooks, we'll generate the token here

  if (debug) {
	log("ifttt:start::parse: " + req.rawBody);
  }

  if (req.rawBody == null || req.rawBody == "") {
	   res.status(400)
	   endAndLog("Request body was blank!", res);
	return
  }
  try {
	  pin = JSON.parse(req.rawBody);
  } catch(e) {
	  res.status(400)
	  endAndLog("JSON Parse error: " + e, res);
	  return
  }

  pin.id = "ws-ifttt-" + uuidv4();

  //Check that everything is there
  log(`${pin.id}::ifttt::createPin`);
  log(`${pin.id}::ifttt::validatePin`);

  if (pin.token == null || pin.token == "") {
    res.status(400);
    endAndLog("Pin Token missing", res);
    return
  }

  if (pin.time == null || pin.time == "") {
    res.status(400);
    endAndLog("Pin Time missing", res);
    addTrackerResponse(pinData.token, "Not send to RWS: pin.time was missing", pinData.layout.title);
    return
  }

  if (! ["1","2","3","4","A"].includes(pin.time.toString())) {
    res.status(400);
    addTrackerResponse(pin.id, "Pin Time was invalid", "", false);
    endAndLog("Pin Time is invalid (" + pin.time + "). Expected 1, 2, 3, 4, or A", res);
    return
  }

  if (pin.time == "A") {
    //Validate the meta clocktime
    if (pin.meta.clocktime.hour == null || pin.meta.clocktime.hour == "") {
      res.status(400);
      endAndLog("pin.meta.clocktime.hour is missing", res);
      return
    }
    if (pin.meta.clocktime.minute == null || pin.meta.clocktime.minute == "") {
      res.status(400);
      endAndLog("pin.meta.clocktime.minute is missing", res);
      return
    }

    if (! is_timeString(pin.meta.clocktime.hour + ":" + pin.meta.clocktime.minute)) {
      res.status(400);
      endAndLog("Clock time is invalid", res);
      return
    }
  }

  if (pin.layout == null) {
    res.status(400);
    endAndLog("Pin Layout is blank", res);
    return
  }

  if (pin.layout.type != "genericPin") {
    res.status(400);
    endAndLog("Pin Layout is blank or set to a currently unsupported type", res);
    return
  }

  if (pin.layout.title == null) {
    pin.layout.title = ""
  }
  if (pin.layout.title.toString().length > 512) {
    res.status(413);
    endAndLog("Pin Title is too long (Max 512 character)", res);
    return
  }

  if (pin.layout.body == null) {
    pin.layout.body = ""
  }
  if (pin.layout.body != null && pin.layout.body.toString().length > 512) {
    res.status(413);
    endAndLog("Pin Body is too long (Max 512 character)", res);
    return
  }

  if (pin.layout.subtitle == null) {
    pin.layout.subtitle = ""
  }
  if (pin.layout.subtitle != null && pin.layout.subtitle.toString().length > 512) {
    res.status(413);
    endAndLog("Pin Subtitle is too long (Max 512 character)", res);
    return
  }

  if (pin.layout.tinyIcon == null || pin.layout.tinyIcon == "") {
    res.status(400);
    res.end("Pin icon is missing");
    return
  }


  log(`${pin.id}::ifttt::validatePin::pinValid`)

  //Create Pin time

  var time = new Date();

  if (pin.time == "2") {
    time = addMinutes(time, 30);
  } else if (pin.time == "3") {
    time = addMinutes(time, 60);
  } else if (pin.time == "4") {
    time = addMinutes(time, 180);
  } else if (pin.time == "A") {
    //Check if we have already passed the time today

    pin.meta.clocktime.hour = parseInt(pin.meta.clocktime.hour)
    pin.meta.clocktime.minute = parseInt(pin.meta.clocktime.minute)

    if (debug) {
        log(`${pin.id}::ifttt::A::absoluteTime:${pin.meta.clocktime.hour}:${pin.meta.clocktime.minute}`)
        log(`${pin.id}::ifttt::A::systemTime: ${time.getHours()}:${time.getMinutes()}`)
    }

    //Adjust for BST being GMT+1
    //For the love of god, replace this with a proper timezone offset soon
    var adjustedTime = parseInt(time.getHours()) - 1;
    if (adjustedTime < 0) { adjustedTime = 0 }


    if (adjustedTime > pin.meta.clocktime.hour) {

      //We have missed it. Set for tomorrow
      if (debug) { log(`${pin.id}::ifttt::A::setDate:tomorrow1`) }
      time.setDate(parseInt(time.getDate()+1))

    } else if (adjustedTime == pin.meta.clocktime.hour) {

      //We are in the same hour
      if (time.getMinutes() > pin.meta.clocktime.minute) {
        if (debug) { log(`${pin.id}::ifttt::A::setDate:tomorrow2`) }
        //We have missed it. Set for tomorrow
        time.setDate(parseInt(time.getDate()+1))
      }

    } else {

      if (debug) { log(`${pin.id}::ifttt::A::setDate:today`) }

    }

    //Set the hour and minute
    time.setHours(parseInt(pin.meta.clocktime.hour))
    time.setMinutes(parseInt(pin.meta.clocktime.minute))

  }

  pin.time = time.toISOString();

  //Create notifications
  if (pin.meta == null) {
	  pin.meta = {};
  }

  if (pin.meta.notifyOnArrival != null && pin.meta.notifyOnArrival == true) {
    //Create an arrival notification
    var n = {};
    n.layout = {};
    n.layout.type = "genericNotification"
    n.layout.title = pin.layout.title
    n.layout.tinyIcon = pin.layout.tinyIcon
    n.layout.body = pin.layout.body
    pin.createNotification = n
  }

  if (pin.meta.notifyOnActive != null && pin.meta.notifyOnActive == true) {

    //Create an activation reminder
    var r = {};
    r.time = pin.time;
    r.layout = {};
    r.layout.type = "genericReminder"
    r.layout.title = pin.layout.title
    r.layout.tinyIcon = pin.layout.tinyIcon
    r.layout.body = pin.layout.body

    if (pin.reminders == null) {
      pin.reminders = []
    }

    pin.reminders.push(r);

  }


  //Wipe meta
  pin.meta = null

  //If we're here, all is good.
  submitPinToRWS(pin,submitPinToRWS_cb, submitPinToRWS_ecb, res);


});

function submitPinToRWS(pinData, callBack, errorCallBack, callBackObject ) {

  log(`${pin.id}::submitPin`)

  var data = JSON.stringify(pinData)

  // data = encodeURI(data);

  //hostname: 'local.will0.id',
  const options = {
    hostname: 'timeline-api.rebble.io',
    port: 443,
    path: '/v1/user/pins/' + pinData.id,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'X-User-Token': pinData.token
    }
  }

  if (debug) {
    log(`${pin.id}::debug::requestOptions:${JSON.stringify(options)}`);
    log(`${pin.id}::debug::pinData:${data}`);
  }

  if (debug_disable_rws_callout) {

    log(`${pin.id}::submitPin::abort::debugDisableRWSCalloutActive`)
    stats["200"] += 1;
    addTrackerResponse(pinData.token, "200", pinData.layout.title);

    callBack("Did not send to RWS due to debug option", callBackObject);

  } else {

    const req = https.request(options, (res) => {

      log(`${pinData.id}::submitPin::rwscode:${res.statusCode}`)
      stats[res.statusCode.toString()] += 1;
      addTrackerResponse(pinData.token, res.statusCode.toString(), pinData.layout.title)

      res.on('data', (d) => {
        if (res.statusCode != "200") {
          log(`${pin.id}::submitPin::errorcode:` + res.statusCode);
          errorCallBack(d, callBackObject);
        } else {
          log(`${pin.id}::submitPin::success`);
          log(`${pinData.id}::submitPin::data:${d}`)
          callBack(d, callBackObject);
        }

      })
    })

    req.on('error', (error) => {
      log(`${pin.id}::submitPin::error:` + error);
      errorCallBack(error, callBackObject);
    })

    stats.outgoingRequests += 1;

    req.write(data)
    req.end()

  }


}
function submitPinToRWS_cb(data, cbo) {
  cbo.status(200);
  cbo.end("OK");
}
function submitPinToRWS_ecb(data, cbo) {
  cbo.status(500);
  log("RWS Error msg: " + data);
  cbo.end("Rebble Web Services returned the following error: " + data);
}

function startListening() {
  if (use_https) {
    https.createServer({
    	   key: privateKey,
    	    cert: certificate
    }, app).listen(port);
  } else {
    app.listen(port,function(){
     log("Listening on port " + port);
    });
    log("Not using HTTPS! Ensure you're running behind a reverse proxy")
  }
}

startListening();
if (debug) {
  log("Debug Mode On")
  //Populate fake errors into the tracker
  addTrackerResponse("potato", "200", "Test 1");
  addTrackerResponse("potato", "400", "Test 2");
  addTrackerResponse("potato", "410", "Test 3");
  addTrackerResponse("potato", "503", "Test 3");
  addTrackerResponse("potato", "500", "Test 4");
  addTrackerResponse("potato", "pin.time was missing", "Test 5", false);
  addTrackerResponse("potato", "JSON Body Missing", "", false, "Timeline-Tester");
}
