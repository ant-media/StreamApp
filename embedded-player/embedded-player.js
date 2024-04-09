import { WebPlayer } from "@antmedia/web_player";
import { getUrlParameter } from "@antmedia/webrtc_adaptor/;


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

function getHttpBaseUrl() {
	// Mute/Unmute Video Button for 360 playback
	if (httpBaseUrl) {
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
    fetch(getHttpBaseUrl() + "analytic/events", {
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

let httpBaseUrl = getHttpBaseUrl();

let sendAnalytic = true;
if (getUrlParameter("sendAnalytic", this.window.location.search) == "false") {
	sendAnalytic = false;
}

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
				event: "newView",
				token: webPlayer.token,
				streamId: webPlayer.streamId,
				playType: webPlayer.currentPlayType,
				src: webPlayer.getSource()
			});
		}
		
		//send play event
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "playStarted",
				token: webPlayer.token,
				streamId: webPlayer.streamId,
				playType: webPlayer.currentPlayType,
				src: webPlayer.getSource()
			});
    }
    else if (status == "ended") {
        document.getElementById("unmuteButton").style.display = "none";
        
        //send watchtime evenet
        let timeDiff = (lastTimeUpdate - firstTimeUpdate).toFixed(2);
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "watchTime",
				token: webPlayer.token,
				streamId: webPlayer.streamId,
				playType: webPlayer.currentPlayType,
				src: webPlayer.getSource(),
				watchTime: timeDiff,
				startTime: firstTimeUpdate,
				endTime: lastTimeUpdate
			});
		firstTimeUpdate = -1;
		
		
        //send ended event
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "playEnded",
				token: webPlayer.token,
				streamId: webPlayer.streamId,
				playType: webPlayer.currentPlayType,
				src: webPlayer.getSource()
			});
    }
    else if (status == "seeked") {
		
		//send latest watchTime
		let timeDiff = (lastTimeUpdate - firstTimeUpdate).toFixed(2);
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "watchTime",
				token: webPlayer.token,
				streamId: webPlayer.streamId,
				playType: webPlayer.currentPlayType,
				src: webPlayer.getSource(),
				watchTime: timeDiff,
				startTime: firstTimeUpdate,
				endTime: lastTimeUpdate
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
				token: webPlayer.token,
				streamId: webPlayer.streamId,
				playType: webPlayer.currentPlayType,
				src: webPlayer.getSource(),
				watchTime: timeDiff,
				startTime: firstTimeUpdate,
				endTime: lastTimeUpdate
			});
			firstTimeUpdate = -1;
		}
		
		
	}
	else if (status == "pause") {
		
		//send pause event
		sendEventToBackend({
				subscriberId: webPlayer.subscriberId,
				event: "playPaused",
				token: webPlayer.token,
				streamId: webPlayer.streamId,
				playType: webPlayer.currentPlayType,
				src: webPlayer.getSource()
			});
	}
    console.debug("player event: ", status);
});