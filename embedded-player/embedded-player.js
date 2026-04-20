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
	// Send to backend if analytics is enabled
	if (sendAnalytic) {
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
	
	// Send to Google Analytics if enabled
	if (gaEnabled && window.gtag) {
		// Map backend event names to Google Analytics event names
		let gaEventName = null;
		let gaEventParams = {
			stream_id: data.streamId || '',
			protocol: data.protocol || '',
			subscriber_id: data.subscriberId || ''
		};
		
		// Map events to GA4 event names
		switch(data.event) {
			case "playStartedFirstTime":
				gaEventName = "video_play_started_first_time";
				break;
			case "playStarted":
				gaEventName = "video_play_started";
				break;
			case "playPaused":
				gaEventName = "video_play_paused";
				break;
			case "playEnded":
				gaEventName = "video_play_ended";
				break;
			case "watchTime":
				gaEventName = "video_watch_time";
				// Add watch time specific parameters
				if (data.watchTimeMs) {
					gaEventParams.watch_time_ms = data.watchTimeMs;
					gaEventParams.watch_time_seconds = Math.round(data.watchTimeMs / 1000);
				}
				if (data.startTimeMs) {
					gaEventParams.start_time_ms = data.startTimeMs;
				}
				break;
			default:
				// Use event name as-is for unknown events
				gaEventName = data.event.toLowerCase().replace(/([A-Z])/g, '_$1');
				break;
		}
		
		if (gaEventName) {
			sendEventToGoogleAnalytics(gaEventName, gaEventParams);
		}
	}
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

// Google Analytics configuration
let gaEnabled = false;
let gaMeasurementId = null;

// Check if Google Analytics is enabled via URL parameter
const gaEnabledParam = getUrlParameter("gaEnabled", window.location.search);
if (gaEnabledParam == "true" || gaEnabledParam === true) {
	gaEnabled = true;
	// Get GA Measurement ID from URL parameter (e.g., G-XXXXXXXXXX)
	gaMeasurementId = getUrlParameter("gaId", window.location.search);
	
	// If no gaId provided, try gaMeasurementId as alternative parameter name
	if (!gaMeasurementId) {
		gaMeasurementId = getUrlParameter("gaMeasurementId", window.location.search);
	}
	
	if (gaMeasurementId) {
		loadGoogleAnalytics(gaMeasurementId);
	} else {
		console.warn("[Google Analytics] gaEnabled is true but no gaId or gaMeasurementId provided in URL");
	}
}

/**
 * Load Google Analytics script dynamically
 * @param {string} measurementId - Google Analytics Measurement ID (e.g., G-XXXXXXXXXX)
 */
function loadGoogleAnalytics(measurementId) {
	if (window.gtag) {
		console.debug("[Google Analytics] Already loaded");
		return;
	}
	
	console.debug(`[Google Analytics] Loading Google Analytics with Measurement ID: ${measurementId}`);
	
	// Create and configure gtag script
	const script1 = document.createElement('script');
	script1.async = true;
	script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
	document.head.appendChild(script1);
	
	// Initialize gtag dataLayer and function
	window.dataLayer = window.dataLayer || [];
	function gtag(){dataLayer.push(arguments);}
	window.gtag = gtag;
	
	gtag('js', new Date());
	gtag('config', measurementId, {
		// Optional: Add any custom configuration here
	});
	
	console.debug("[Google Analytics] Google Analytics loaded successfully");
}

/**
 * Send event to Google Analytics
 * @param {string} eventName - GA4 event name
 * @param {object} eventParams - Event parameters
 */
function sendEventToGoogleAnalytics(eventName, eventParams) {
	if (!gaEnabled || !window.gtag) {
		return;
	}
	
	try {
		window.gtag('event', eventName, eventParams);
		console.debug(`[Google Analytics] Event sent: ${eventName}`, eventParams);
	} catch (error) {
		console.error("[Google Analytics] Error sending event:", error);
	}
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
    //console.debug("player event: ", status);
});