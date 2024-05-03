import { WebPlayer } from "@antmedia/web_player";

var webPlayer = new WebPlayer(window, document.getElementById("video_container"), document.getElementById("video_info"));

webPlayer.initialize().then(() => {
    webPlayer.play();
});



webPlayer.addWebRTCDataListener((data) => {
    console.debug("Data received: " + data);
});

document.getElementById("unmuteButton").addEventListener("click", function() {
	    if (webPlayer.isMuted()) {
	        webPlayer.mutePlayer(false);
	        document.getElementById("unmuteButton").innerHTML = "Mute";
	    } else {
	        webPlayer.mutePlayer(true);
	        document.getElementById("unmuteButton").innerHTML = "Unmute";
	    }
	});

var httpBaseUrl = null;

function getHttpBaseUrl() {
	// Mute/Unmute Video Button for 360 playback
	if (httpBaseUrl == null) {
		let appName = "/";
		if (window.location.pathname && window.location.pathname.indexOf("/") != -1) {
		    appName = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1);
		}
		
		let path = window.location.hostname;
		if (window.location.port != "") {
		    path += ":" + window.location.port;
		}
		if (!appName.startsWith("/")) {
		    appName = "/" + appName;
		}
		
		if (!appName.endsWith("/")) 
		{
		    appName += "/";
		}
		path += appName 
		httpBaseUrl = window.location.protocol + "//" + path;
	}
	return httpBaseUrl;
}

function sendEventToBackend(data) {
	if (!sendAnalytic) {
		return;
	}
	
	let url = getHttpBaseUrl() + "analytic/events/";
	if (data.event.startsWith("play")) {
		url += "play"
	}
	else if (data.event.startsWith("watch")) {
		url += "watch-time"
	}
	else {
		console.warn("Not known event type");
	}
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => console.log('Event sent successfully:', data))
    .catch((error) => console.error('Error sending event:', error));
}


function getUrlParameter(sParam, search) {
  if (typeof search === undefined || search == null) {
    search = window.location.search;
  }
  var sPageURL = decodeURIComponent(search.substring(1)),
    sURLVariables = sPageURL.split('&'),
    sParameterName,
    i;
  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
}

let sendAnalytic = false;
if (getUrlParameter("sendAnalytic", window.location.search) == "true") {
	sendAnalytic = true;
}

httpBaseUrl = getHttpBaseUrl();

window.webPlayer = webPlayer;

let firstTimePlay = true;

let firstTimeUpdate = -1;
let lastTimeUpdate = -1;

webPlayer.addPlayerListener((status) => {
    if (status == "play") {
        if (webPlayer.is360) {
            document.getElementById("unmuteButton").style.display = "block";
        }
        
        if (firstTimePlay) {
			firstTimePlay = false;
			sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "playStartedFirstTime",
				streamId: webPlayer.streamId,
				protocol: webPlayer.currentPlayType,
			});
		}
		
		//send play event
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "playStarted",
				streamId: webPlayer.streamId,
				protocol: webPlayer.currentPlayType,
			});
    }
    else if (status == "ended") {
        document.getElementById("unmuteButton").style.display = "none";
        
        //send watchtime evenet
        let timeDiff = (lastTimeUpdate - firstTimeUpdate).toFixed(2);
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "watchTime",
				streamId: webPlayer.streamId,
				protocol: webPlayer.currentPlayType,
				watchTimeMs: timeDiff * 1000,
				startTimeMs: firstTimeUpdate * 1000,
			});
		firstTimeUpdate = -1;
		
		
        //send ended event
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "playEnded",
				streamId: webPlayer.streamId,
				protocol: webPlayer.currentPlayType,
			});
    }
    else if (status == "seeked") {
		
		//send latest watchTime
		let timeDiff = (lastTimeUpdate - firstTimeUpdate).toFixed(2);
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "watchTime",
				streamId: webPlayer.streamId,
				protocol: webPlayer.currentPlayType,
				watchTimeMs: timeDiff * 1000,
				startTimeMs: firstTimeUpdate * 1000,
			});
		firstTimeUpdate = -1;

	}
    else if (status == "timeupdate") {
		//send duration event
		if (firstTimeUpdate == -1) {
			firstTimeUpdate = webPlayer.getTime().toFixed(2); ;
		}
		
		lastTimeUpdate = webPlayer.getTime().toFixed(2);
		
		let timeDiff = (lastTimeUpdate - firstTimeUpdate).toFixed(2);
		
		if (lastTimeUpdate - firstTimeUpdate > 5) 
		{
			sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "watchTime",
				streamId: webPlayer.streamId,
				protocol: webPlayer.currentPlayType,
				watchTimeMs: timeDiff * 1000,
				startTimeMs: firstTimeUpdate * 1000,
			});
			firstTimeUpdate = -1;
		}
		
		
	}
	else if (status == "pause") {
		
		//send pause event
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "playPaused",
				streamId: webPlayer.streamId,
				protocol: webPlayer.currentPlayType,
			});
	}
    console.debug("player event: ", status);
});