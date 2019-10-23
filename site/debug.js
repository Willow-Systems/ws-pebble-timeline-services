
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
    $('#token').val(savedToken);
  }
}

function apiGet(url, callback, errorCallback, callBackObject) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && RegExp('2.*').test(xmlHttp.status)) {
      if (callBackObject != null) {
        callback(xmlHttp.responseText, callBackObject);
      } else {
        callback(xmlHttp.responseText);
      }
      console.log(url);

    } else if (xmlHttp.readyState == 4) {
      if (errorCallback != null) {
        errorCallback();
      }
    }
  }
  xmlHttp.open("GET", url, true); // true for asynchronous
  xmlHttp.send(null);
}

function generateDebugTable() {
  $('#outputTable').html("Fetching...");
  var token = $('#token').val();
  apiGet("https://willow.systems/pinproxy/debug/" + token, generateDebugTable_cb, null)
}

function httpCodeToSymbol(code) {
  switch (code) {
    case "200":
      return '<i title="Successful Request" class="fas fa-check"></i>'
      break;
    case "410":
      return '<i title="Invalid Timeline Token" class="fas fa-key"></i><i title="Invalid Timeline Token" class="fas fa-times"></i>';
      break;
    case "400":
      return '<i title="Request formatted improperly" class="fas fa-exclamation-triangle"></i>';
      break;
    case "503":
      return '<i title="Server Error from Rebble" class="fas fa-bug"></i>';
      break;
    case "500":
      return '<i title="Server Error from Rebble" class="fas fa-bug"></i>';
      break;
    default:
      return '<i title="Request to PinProxy was bad. Not sent on to Rebble." class="fas fa-code"></i>';
      break;
  }
}
function boolToSymbol(bool) {
  return bool ? '<i title="Forwarded To Rebble" class="fas fa-check"></i>' : '<i title="Not Forwarded" class="fas fa-times"></i>'
}

function generateDebugTable_cb(data) {

  if (data == null || data == "") {

    $('#outputTable').html("Nothing here. Either you haven't made any requests, or your timeline token is incorrect.");

  } else {

    var html = '<thead>\
    <tr>\
      <th class="th-sm">#</th>\
      <th class="th-sm">Pin Title</th>\
      <th class="th-sm">Source</th>\
      <th class="th-sm">Sent to Rebble?</th>\
      <th class="th-sm">Result <span class="smoller">Hover on icon to see details</span></th>\
      <th class="th-sm">Time</th>\
      </tr>'

      html = html + '</thead><tbody>'

      var entries = JSON.parse(data);

      for (i=0;i < entries.length;i++) {
        html = html + '<tr>'
        html = html + '<td>' + entries[i].number + '</td>'
        html = html + '<td>' + entries[i].title + '</td>'
        html = html + '<td>' + entries[i].source + '</td>'
        html = html + '<td>' + boolToSymbol(entries[i].sentToRWS) + '</td>'
        html = html + '<td>(' + httpCodeToSymbol(entries[i].result) + ") " + entries[i].result + '</td>'
        html = html + '<td>' + entries[i].time + '</td>'
        html = html + '</tr>'
      }

      html = html + "</tbody>"

      $('#outputTable').html(html);

  }

}
