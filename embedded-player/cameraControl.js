import { getUrlParameter } from "@antmedia/webrtc_adaptor";

var leftButton = document.getElementById('left-button');
var rightButton = document.getElementById('right-button');
var upButton = document.getElementById('up-button');
var downButton = document.getElementById('down-button');
var zoomInButton = document.getElementById('zoom-in-button');
var zoomOutButton = document.getElementById('zoom-out-button');

var restJwt = getUrlParameter("restJwt");
var apiUrl = "";

function isIpCameraBroadcast(streamId) {
  var appName = location.pathname.substring(1, location.pathname.indexOf("/", 1) + 1);
  var path = location.protocol + "//" + location.hostname + ":" + location.port + "/" + appName;

  apiUrl = path + "rest/v2/broadcasts/" + streamId;
  console.log(apiUrl);

  const requestOptions = {
    method: 'GET',
    headers: {
      'Authorization': restJwt
    },
  };

  fetch(apiUrl, requestOptions)
    .then(response => response.json())
    .then(data => {
      var broadcastType = data.type;

      if (broadcastType === "ipCamera") {
        const showPtzButton = document.getElementById("show-ptz-button");

        leftButton.addEventListener('click', () => moveCamera("left"));
        rightButton.addEventListener('click', () => moveCamera("right"));
        downButton.addEventListener('click', () => moveCamera("down"));
        upButton.addEventListener('click', () => moveCamera("up"));
        zoomInButton.addEventListener('click', () => moveCamera("zoomIn"));
        zoomOutButton.addEventListener('click', () => moveCamera("zoomOut"));


        if (showPtzButton) {
          showPtzButton.style.display = "block";
          showPtzButton.addEventListener('click', function () {
            const ptzContainer = document.getElementById('ptz-camera-container');

            if (ptzContainer) {
              if (ptzContainer.style.display === 'flex') {
                ptzContainer.style.display = 'none';
                showPtzButton.innerText = 'Show PTZ';
              } else {
                ptzContainer.style.display = 'flex';
                showPtzButton.innerText = 'Hide PTZ';
              }
            }
          });
        } else {
          console.error("Button with ID 'showPtzButton' not found.");
        }
      }

      console.log(data);
    });
}

function moveCamera(direction) {
  console.log("move camera called " + direction);
  var moveApiUrl = apiUrl + "/ip-camera/move";

  var requestBody = {
    "valueX": 0.1 // test this
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Authorization': restJwt,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  };

  fetch(moveApiUrl, requestOptions)
    .then(response => response.json())
    .then(data => {
      // Handle the response data as needed
    })
    .catch(error => console.error('Error:', error));
}

var streamId = getUrlParameter("id");
if (streamId) {
  isIpCameraBroadcast(streamId);
}
