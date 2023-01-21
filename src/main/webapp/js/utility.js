import { getUrlParameter } from "./fetch.stream.js";

export function generateRandomString(n) {
    let randomString = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < n; i++) {
        randomString += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return randomString;
}

export function getWebSocketURL(location, rtmpForward) {
    var appName = location.pathname.substring(1, location.pathname.indexOf("/", 1) + 1);
    var path = location.hostname + ":" + location.port + "/" + appName + "websocket";
    if (typeof rtmpForward != "undefined") {
        path += "?rtmpForward=" + rtmpForward;
    }
    var websocketURL = "ws://" + path;

    if (location.protocol.startsWith("https")) {
        websocketURL = "wss://" + path;
    }
    return websocketURL;
}

export function getQueryParameter(paramName) {
	var value = getUrlParameter(paramName);
    if (typeof value != "undefined") {
        return "&" + paramName + "=" +value;
    }
    return "";
	//if it does not match, it returns "undefined"

}

export function updateBroadcastStatusInfo(streamId, linkUrl) {
    $("#offlineInfo").hide();
    $("#broadcastingInfo").show();
    if (linkUrl === undefined) {
        linkUrl = "../play.html?id=" + streamId;
    }
    $("#playlink").attr("href", linkUrl)
    $("#playlink").show();

    setTimeout(function () {
        var state = window.webRTCAdaptor.signallingState(streamId);
        if (state != null && state != "closed") {
            var iceState = window.webRTCAdaptor.iceConnectionState(streamId);
            if (iceState != null && iceState != "failed" && iceState != "disconnected") {
                updateBroadcastStatusInfo(streamId, linkUrl);
            }
            else {
                $("#playlink").hide();
                $("#broadcastingInfo").hide();
                $("#offlineInfo").show();
            }
        }
        else {
            $("#playlink").hide();
            $("#broadcastingInfo").hide();
            $("#offlineInfo").show();
        }
    }, 200);

}

export function errorHandler(error, message) {
    console.log("error callback: " + JSON.stringify(error));
    var errorMessage = JSON.stringify(error);
    if (typeof message != "undefined") {
        errorMessage = message;
    }
    else {
         errorMessage = JSON.stringify(error);
    }
    if (error.indexOf("WebSocketNotConnected") != -1) {
        errorMessage = "WebSocket Connection is disconnected.";
    }
    else if (error.indexOf("not_initialized_yet") != -1) {
        errorMessage = "Server is getting initialized.";
    }
    else if (error.indexOf("data_store_not_available") != -1) {
        errorMessage = "Data store is not available. It's likely that server is initialized or getting closed";
    }
    else {
        if (error.indexOf("NotFoundError") != -1) {
            errorMessage = "Camera or Mic are not found or not allowed in your device";
        }
        else if (error.indexOf("NotReadableError") != -1 || error.indexOf("TrackStartError") != -1) {
            errorMessage = "Camera or Mic are already in use and they cannot be opened. Choose another video/audio source if you have on the page below ";

        }
        else if (error.indexOf("OverconstrainedError") != -1 || error.indexOf("ConstraintNotSatisfiedError") != -1) {
            errorMessage = "There is no device found that fits your video and audio constraints. You may change video and audio constraints"
        }
        else if (error.indexOf("NotAllowedError") != -1 || error.indexOf("PermissionDeniedError") != -1) {
            errorMessage = "You are not allowed to access camera and mic.";
        }
        else if (error.indexOf("TypeError") != -1) {
            errorMessage = "Video/Audio is required";
        }
        else if (error.indexOf("getUserMediaIsNotAllowed") != -1) {
            errorMessage = "You are not allowed to reach devices from an insecure origin, please enable ssl";
        }
        else if (error.indexOf("ScreenSharePermissionDenied") != -1) {
            errorMessage = "You are not allowed to access screen share";
            $(".video-source").first().prop("checked", true);
        }
        else if (error.indexOf("UnsecureContext") != -1) {
            errorMessage = "Please Install SSL(https). Camera and mic cannot be opened because of unsecure context. ";
        }
        else {
            errorMessage = error
        }
        alert(errorMessage);

    }
    console.error(errorMessage);
    if (message !== undefined) {
        console.error(message);
    }
}

