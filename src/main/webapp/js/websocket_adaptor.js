
export class WebSocketAdaptor 
{
    constructor(initialValues){
        
        this.debug = false;
        for(var key in initialValues) {
			if(initialValues.hasOwnProperty(key)) {
				this[key] = initialValues[key];
			}
        }
        
		this.initWebSocketConnection();

     }

    initWebSocketConnection(callbackConnected)  {
		this.connecting = true;
        this.connected = false;
        this.pingTimerId = -1;

        /*
        * It's not mandatory if you don't use the new Load Balancer mechanism
        * It uses one of the nodes on Cluster mode
        * Example parameters: "origin" or "edge"
        */
        if (this.websocket_url.indexOf("?") == -1) {
            //if there is no question mark just add it to give extra parameter
            this.websocket_url+="?";
        }
        else {
            //if there is a question mark, just append extra parameter
            this.websocket_url+="&";
        }
        //add the target field
        this.websocket_url+="target=";

        //add the target value
        if(this.webrtcadaptor.isPlayMode){
            this.websocket_url+="edge";
        }
        else{
           this.websocket_url+="origin";
        }

		this.wsConn = new WebSocket(this.websocket_url);
        this.wsConn.onopen = () => {
            if (this.debug) 
            {
                console.debug("websocket connected");
            }
    
            this.pingTimerId = setInterval(() => {
                this.sendPing();
            }, 3000);
    
            this.connected = true;
            this.connecting = false;
            this.callback("initialized");

			if (typeof callbackConnected != "undefined") {
				callbackConnected();
			}
        }

        this.wsConn.onmessage = (event) => {
            var obj = JSON.parse(event.data);

            if (obj.command == "start")
            {
                //this command is received first, when publishing so playmode is false

                if (this.debug) {
                    console.debug("received start command");
                }

                this.webrtcadaptor.startPublishing(obj.streamId);
            }
            else if (obj.command == "takeCandidate") {

                if (this.debug) {
                    console.debug("received ice candidate for stream id " + obj.streamId);
                    console.debug(obj.candidate);
                }

                this.webrtcadaptor.takeCandidate(obj.streamId, obj.label, obj.candidate);

            } else if (obj.command == "takeConfiguration") {

                if (this.debug) {
                    console.debug("received remote description type for stream id: " + obj.streamId + " type: " + obj.type );
                }
                this.webrtcadaptor.takeConfiguration(obj.streamId, obj.sdp, obj.type, obj.idMapping);

            }
            else if (obj.command == "stop") {
            	if (this.debug){
                	console.debug("Stop command received");
                }
                this.webrtcadaptor.closePeerConnection(obj.streamId);
            }
            else if (obj.command == "error") {
                this.callbackError(obj.definition, obj);
            }
            else if (obj.command == "notification") {
                this.callback(obj.definition, obj);
                if (obj.definition == "play_finished" || obj.definition == "publish_finished") {
                    this.webrtcadaptor.closePeerConnection(obj.streamId);
                }
            }
            else if (obj.command == "streamInformation") {
                this.callback(obj.command, obj);
            }
            else if (obj.command == "roomInformation") {
                this.callback(obj.command, obj);
            }
            else if (obj.command == "pong") {
                this.callback(obj.command);
            }
            else if (obj.command == "trackList") {
                this.callback(obj.command, obj);
            }
            else if (obj.command == "connectWithNewId") {
                this.multiPeerStreamId = obj.streamId;
                this.join(obj.streamId);
            }
            else if (obj.command == "peerMessageCommand") {
                this.callback(obj.command, obj);
            }
        }

        this.wsConn.onerror = (error) => {
        	this.connecting = false;
        	this.connected = false;
            console.info(" error occured: " + JSON.stringify(error));
            
            this.clearPingTimer();
            this.callbackError("WebSocketNotConnected", error)
        }

        this.wsConn.onclose = (event) => {
        	this.connecting = false;
            this.connected = false;
            if (this.debug) {
            	console.debug("connection closed.");
            }
            this.clearPingTimer();
            this.callback("closed", event);
        }

	}

    clearPingTimer(){
        if (this.pingTimerId != -1) {
            if (this.debug) {
                console.debug("Clearing ping message timer");
            }
            clearInterval(this.pingTimerId);
            this.pingTimerId = -1;
        }
    }

    sendPing() {
        var jsCmd = {
                command : "ping"
        };
        this.wsConn.send(JSON.stringify(jsCmd));
    }

    close() {
        this.wsConn.close();
    }
	
    send(text) {

        if (this.connecting == false && this.connected == false) {
			//try to reconnect
			this.initWebSocketConnection(() => {
				this.send(text);
			});
            return;
        }
        this.wsConn.send(text);
        if (this.debug) {
        	console.debug("sent message:" +text);
        }
    }

    isConnected(){
        return this.connected;
    }
    
    isConnecting() {
    	return this.connecting;
    }
}