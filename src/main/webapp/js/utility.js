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