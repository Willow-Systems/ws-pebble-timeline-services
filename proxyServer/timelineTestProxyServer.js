const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const app = express();

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

app.get("/ping",function (req, res) {
	res.end("pong");
});
app.get("/",function (req, res) {
	res.end('<meta http-equiv="refresh" content="0; url=https://willow.systems/pebble/timeline-tester">');
});
app.get("*",function (req, res) {
	res.end('<meta http-equiv="refresh" content="0; url=https://willow.systems/pebble/timeline-tester">');
});

app.post('/pinproxy/:id',function(req,res){


	pin = JSON.parse(req.rawBody);

  //Check that everything is there
  if (pin.id == null || pin.id == "") {
    res.status(400);
    res.end("Pin ID missing");
  }

  console.log(`${pin.id}::createPin`);
  console.log(`${pin.id}::validatePin`);

  if (req.params.id != pin.id) {
    res.status(400);
    res.end("Pin ID in JSON doesn't match Pin ID in request URL");
  }

  if (pin.time == null || pin.time == "") {
    res.status(400);
    res.end("Pin Time missing");
  }

  if (pin.layout == null) {
    res.status(400);
    res.end("Pin Layout is blank");
  }

  if (pin.layout.type != "genericPin") {
    res.status(400);
    res.end("Pin Layout time is blank or set to a currently unsupported type");
  }

  if (pin.layout.title == null) {
    pin.layout.title = ""
  }
  if (pin.layout.body == null) {
    pin.layout.body = ""
  }
  if (pin.layout.subtitle == null) {
    pin.layout.subtitle = ""
  }

  if (pin.layout.tinyIcon == null || pin.layout.tinyIcon == "") {
    res.status(400);
    res.end("Pin icon is missing");
  }

  console.log(`${pin.id}::validatePin::pinValid`)

  //If we're here, all is good.
  submitPinToRWS(pin,submitPinToRWS_cb, submitPinToRWS_ecb, res);


});

function submitPinToRWS(pinData, callBack, errorCallBack, callBackObject ) {

  console.log(`${pin.id}::submitPin`)

  var data = JSON.stringify(pinData)

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
    console.log(`${pin.id}::debug::requestOptions:${JSON.stringify(options)}`);
    console.log(`${pin.id}::debug::pinData:${data}`);
  }

  const req = https.request(options, (res) => {
    console.log(`${pinData.id}::submitPin::rwscode:${res.statusCode}`)

    res.on('data', (d) => {
      if (res.statusCode != "200") {
        console.log(`${pin.id}::submitPin::errorcode:` + res.statusCode);
        errorCallBack(d, callBackObject);
      } else {
        console.log(`${pin.id}::submitPin::success`);
        console.log(`${pinData.id}::submitPin::data:${d}`)
        callBack(d, callBackObject);
      }

    })
  })

  req.on('error', (error) => {
    console.log(`${pin.id}::submitPin::error:` + error);
    errorCallBack(error, callBackObject);
  })

  req.write(data)
  req.end()

}
function submitPinToRWS_cb(data, cbo) {
  cbo.status(200);
  cbo.end("OK");
}
function submitPinToRWS_ecb(data, cbo) {
  cbo.status(500);
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
     console.log("Listening on port " + port);
    });
    console.log("Not using HTTPS! Ensure you're running behind a reverse proxy")
  }
}

startListening();
if (debug) { console.log("Debug Mode On") }
