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

function createPin() {
  

  var finalTime;
  var time = new Date();

  switch ($('#pinTime').val()) {
    case "2":
      time = addMinutes(time, 10);
    break;
    case "3":
      time = addMinutes(time, 30);
    break;
    case "4":
      time = subMinutes(time, 10);
    break;
    case "5":
      time = subMinutes(time, 30);
    break;
  }

  finalTime = time.toISOString();

  var pin = {};
  pin.id = "ws-tester-" + uuidv4();
  pin.time = finalTime;
  pin.layout = {};
  pin.layout.type = "genericPin";
  pin.layout.title = $('#pinTitle').val();
  pin.layout.body = $('#pinBody').val();
  pin.layout.tinyIcon = "system://images/" + $('#pinIcon').val();

  $('#sendbtn').prop("disabled",true);
  $('#sendbtn').removeClass("btn-info");
  $('#sendbtn').addClass("btn-warning");
  $('#sendbtn').html('Sending Pin  <div class="spinner-border" role="status"></div>');
}
