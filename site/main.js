function uuidv4() {
  return 'xxxxxxxx-xxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes*60000);
}
function subMinutes(date, minutes) {
    return new Date(date.getTime() - minutes*60000);
}
function createmsg(style, message) {
  $('#msgdiv').html($('#msgdiv').html() + '<div class="alert alert-' + style + ' alert-dismissible fade show" role="alert">\
  ' + message + '\
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">\
    <span aria-hidden="true">&times;</span>\
  </button>\
  </div>'
  );
}

function apiPOST(rurl, postdata, callback, errorCallback, callBackObject) {
	console.log("POST: " + rurl + " - Data: " + postdata)
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.onreadystatechange = function() {
	if (xmlHttp.readyState == 4 && RegExp('2.*').test(xmlHttp.status)) {
		if (callBackObject != null) {
			callback(xmlHttp.responseText, callBackObject);
		} else {
			callback(xmlHttp.responseText);
    }
	} else if (xmlHttp.readyState == 4) {
           console.log("Error Code: " + xmlHttp.status)
           if (errorCallback != null) {
	   	errorCallback(xmlHttp.responseText);
       	   }
	}
    }
    xmlHttp.open("POST", rurl, true); // true for asynchronous
    xmlHttp.setRequestHeader("Content-Type", "application/json");
    xmlHttp.setRequestHeader("X-User-Token", token);
    xmlHttp.send(postdata);
}

function sanityError(com, name) {
  $('#' + com).addClass("error");
  createmsg("danger", name + " has an invalid or missing value");
  $('#' + com).focusout(function() {
    $('#' + com).removeClass("error");
  });
}

function createPin() {

  //Sanity Check
  if ($('#timelineToken').val() == null || $('#timelineToken').val() == "") {
    sanityError("timelineToken", "Timeline Token");
    return;
  }
  if ($('#pinTitle').val() == null || $('#pinTitle').val() == "") {
    sanityError("pinTitle", "Pin Title");
    return;
  }


  var finalTime;
  var time = new Date();

  switch ($('#pinTime').val()) {
    case "2":
      time = addMinutes(time, 30);
    break;
    case "3":
      time = addMinutes(time, 60);
    break;
    case "4":
      time = subMinutes(time, 30);
    break;
    case "5":
      time = subMinutes(time, 60);
    break;
  }

  finalTime = time.toISOString();

  var pin = {};
  pin.id = "ws-tester-" + uuidv4();
  // pin.id = "123";
  pin.time = finalTime;
  pin.layout = {};
  pin.layout.type = "genericPin";
  pin.layout.title = $('#pinTitle').val();
  pin.layout.body = $('#pinBody').val();
  pin.layout.subtitle = $('#pinSubtitle').val();
  pin.layout.tinyIcon = "system://images/" + $('#pinIcon').val();
  pin.token = $('#timelineToken').val();

  if ($('#includeNotification').is(':checked')) {
    pin.reminders = [];
    var reminderObj = {};
    reminderObj.time = finalTime;
    reminderObj.layout = {};
    reminderObj.layout.type = "genericReminder";
    reminderObj.layout.title = $('#pinTitle').val();
    reminderObj.layout.body = $('#pinBody').val();
    reminderObj.layout.subtitle = $('#pinSubtitle').val();
    reminderObj.layout.tinyIcon = "system://images/" + $('#pinIcon').val();
    pin.reminders.push(reminderObj);
  }

  $('#sendbtn').prop("disabled",true);
  $('#msgdiv').html("");
  $('#sendbtn').removeClass("btn-info");
  $('#sendbtn').addClass("btn-warning");
  $('#sendbtn').html('Sending Pin  <div class="spinner-border" role="status"></div>');

  token = pin.token;

  postdata = JSON.stringify(pin);

  apiPOST("https://local.will0.id:444/pinproxy/" + pin.id, postdata, createPinCB, errorCB, pin);
  // apiPUT("https://willow.systems:444/pinproxy/" + pin.id, postdata, createPinCB, errorCB, pin);

}
function createPinCB(d) {
  $('#sendbtn').addClass("btn-success");
  $('#sendbtn').removeClass("btn-warning");
  $('#sendbtn').html('Success');

  createmsg("info", "Pin created! It may take up to 30 mins to appear for rebble subscribers, for non-subscribers up to 3 hours");

  $('#pinTitle').val("");
  $('#pinSubtitle').val("");
  $('#pinBody').val("");

  setTimeout(function() {
    $('#sendbtn').prop("disabled",false);
    $('#sendbtn').removeClass("btn-success");
    $('#sendbtn').addClass("btn-info");
    $('#sendbtn').html('CREATE PIN');
  }, 1000)
}
function errorCB(d) {
  $('#sendbtn').prop("disabled",false);
  $('#sendbtn').addClass("btn-info");
  $('#sendbtn').removeClass("btn-warning");
  $('#sendbtn').html('CREATE PIN');
  $('#pinTitle').val("");
  $('#pinSubtitle').val("");
  $('#pinBody').val("");
  createmsg("warning", "Error: " + d);
}

function setSetting(setting, value) {
  console.log("Setting " + setting + " to " + value);
  localStorage.setItem("SETTING_" + setting, value);
}
function getSetting(setting) {
  return localStorage.getItem("SETTING_" + setting);
}

function start() {
  var savedToken = getSetting("token");
  if (savedToken != null && savedToken != "") {
    $('#timelineToken').val(savedToken);
  }
  $('#timelineToken').focusout(function() {
    setSetting("token",$('#timelineToken').val());
  });
}
