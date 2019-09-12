const express = require('express');
const https = require('https');
const Entities = require('html-entities').AllHtmlEntities;
const entities = new Entities();
const fs = require('fs');
const cors = require('cors');
const app = express();

version = 1.7;

//Port to listen on
const port = 8080;

//More logging
debug = true

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

function uuidv4() {
  return 'xxxxxxxx-xxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}
function log(data) {
  console.log("[" + Date() + "] " + data);
}
function endAndLog(msg, res) {
  log("ifttt::end::msg:" + msg)
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
	endAndLog("Request body was blank!", res);
	return
  }

  try {
	  pin = JSON.parse(req.rawBody);
  } catch(e) {
          res.status(400);
	  endAndLog("JSON Parse error: " + e, res);
	  return;
  }

  //Check that everything is there
  if (pin.id == null || pin.id == "") {
    res.status(400);
    res.end("Pin ID missing");
  }

  log(`${pin.id}::createPin`);
  log(`${pin.id}::validatePin`);

  if (req.params.id != pin.id) {
    res.status(400);
    res.end("Pin ID in JSON doesn't match Pin ID in request URL");
    return
  }

  if (pin.time == null || pin.time == "") {
    res.status(400);
    res.end("Pin Time missing");
    return
  }

  if (pin.layout == null) {
    res.status(400);
    res.end("Pin Layout is blank");
    return
  }

  if (pin.layout.type != "genericPin") {
    res.status(400);
    res.end("Pin Layout is blank or set to a currently unsupported type");
    return
  }

  if (pin.layout.title == null) {
    pin.layout.title = ""
  }
  if (pin.layout.title != null && pin.layout.title.toString().length > 512) {
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

  log(`${pin.id}::validatePin::pinValid`)

  // log(`${pin.id}::ifttt::escapePin`);
  // pin.layout.title = entities.encode(pin.layout.title);
  // pin.layout.subtitle = entities.encode(pin.layout.subtitle);
  // pin.layout.body = entities.encode(pin.layout.body);
  // log(`${pin.id}::ifttt::escapePin::pinEscaped`);

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

  if (pin.time == null || pin.time == "") {
    res.status(400);
    endAndLog("Pin Time missing", res);
    return
  }

  if (pin.token == null || pin.token == "") {
    res.status(400);
    endAndLog("Pin Token missing", res);
    return
  }

  if (["1","2","3"].indexOf(pin.time) == -1) {
    res.status(400);
    endAndLog("Pin Time is invalid (" + pin.time + ")", res);
    return
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

  log(`${pin.id}::ifttt::escapePin`);
  fields = ["title","body","subtitle"]
  for(let i = 0; i < fields.length; i++){
    pin["layout." + fields[i].toString()] = escape(pin["layout." + fields[i].toString()]);
  }
  log(`${pin.id}::ifttt::escapePin::pinEscaped`);


  var time = new Date();

  if (pin.time == "2") {
    time = addMinutes(time, 30);
  } else if (pin.time == "3") {
    time = addMinutes(time, 60);
  }

  pin.time = time.toISOString();

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
      'Content-Length': data.length,
      'X-User-Token': pinData.token
    }
  }

  if (debug) {
    log(`${pin.id}::debug::requestOptions:${JSON.stringify(options)}`);
    log(`${pin.id}::debug::pinData:${data}`);
  }

  const req = https.request(options, (res) => {
    log(`${pinData.id}::submitPin::rwscode:${res.statusCode}`)
    stats[res.statusCode.toString()] += 1;

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
if (debug) { log("Debug Mode On") }
