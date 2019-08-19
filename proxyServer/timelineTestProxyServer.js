const express = require('express');
const https = require('https');
const fs = require('fs');
const app = express();
const port = 444;
debug = true

//Set paths to https privkey and cert here
var PATH_TLSPrivateKey = "/mnt/secure/will0-certs/privkey.pem";
var PATH_TLSCertificate = "/mnt/secure/will0-certs/cert.pem";

var privateKey = fs.readFileSync(PATH_TLSPrivateKey);
var certificate = fs.readFileSync(PATH_TLSCertificate);

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

app.get("/",function (req,res) {
	res.end('<meta http-equiv="refresh" content="0; url=https://willow.systems/pebble/timeline-tester">');
});
app.get("*",function (req,res) {
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
  cbo.end("Pin creation error: " + data);
}


function startListening() {
  https.createServer({
	   key: privateKey,
	    cert: certificate
  }, app).listen(port);
  console.log("Started")
}

startListening();
if (debug) { console.log("Debug Mode On") }
