import "./external/loglevel.min.js";

const Logger = window.log;

export class WebSocketAdaptor {
    /**
     * 
     * @param {object} initialValues 
     */
    constructor(initialValues) {
		
		
		/**
		 * Websocket URL
		 */
		this.websocketURL = null;
		
		/**
		 * HTTP Endpoint URL is the endpoint that returns the websocket URL

		 */
		this.httpEndpointUrl = null;
		
		
		/**
		 * HTTP Endpoint URL for access token
		 */
		this.httpEndpointAccessToken = null;
		
		
		/**
		 * WebRTCAdaptor which is responsible for handling WebRTC connections
		 */
		this.webrtcadaptor = null; 
				
		
        /**
         * @type {boolean}
         */
        this.debug = false;
		
		
		/**
		 * Init the connectin when constructor is called
		 */
		this.initConnection = true;
		
		
        for (var key in initialValues) {
            if (initialValues.hasOwnProperty(key)) {
                this[key] = initialValues[key];
            }
        }
		
		if (this.websocketURL == null) {
			this.websocketURL = this.websocket_url;
		}

		if (this.initConnection == true) {
        	this.checkBackendReady();
		}
		addEventListener("offline", (event) => { 
			this.connected = false;
			this.connecting = false;
			Logger.info("Network status has changed to offline. Resetting flags to reconnect faster");
		});

    }
	
	getHttpEndpoint(endpointUrl, options) {
		return fetch(endpointUrl,   options)
	}
	
	tryAgainAfterDelay(callbackConnected) {
		setTimeout(()=> {
			this.checkBackendReady(callbackConnected)
		}, 3000);
	}
	
	async checkBackendInstanceUp(data, callbackConnected) 
	{
		return this.getHttpEndpoint(data.http_url, { method: 'HEAD' })
		  .then(response => {
				if (response.status >= 200 && response.status < 400) {
					this.websocketURL = data.websocket_url;
					this.initWebSocketConnection(callbackConnected);
				}
				else {
					Logger.warn('Backend does not return ok. Retrying in 3 seconds...');
					this.tryAgainAfterDelay(callbackConnected);
				}
			
			})
			.catch((e) => {
				Logger.warn('Backend is not ready yet. Retrying in 3 seconds...');
				Logger.error(e);
				this.tryAgainAfterDelay(callbackConnected);
		    });
	}
	
	async checkBackendReady(callbackConnected) {
		
		this.connecting = true;
		this.connected = false;
		
		if (this.httpEndpointUrl != null) {
					
			const endpointUrl = new URL(this.httpEndpointUrl);
			
			endpointUrl.searchParams.set('source', 'sdk');
			
			if (this.httpEndpointAccessToken != null) {
				endpointUrl.searchParams.set('accessToken', this.httpEndpointAccessToken);
			}
			
			
			this.httpEndpointUrl = endpointUrl.toString();
			//return promise for this case
			return this.getHttpEndpoint(this.httpEndpointUrl,  { method: "GET" })
		      .then(response => {
                  if (response.ok) {
                      Logger.info("http endpoint returns ok")
					  return response.json(); // Parse JSON from body
                  }
				  throw new Error('Network response was not ok');
		                  
              })
			  .then(data => {
			          Logger.info("Response body -> fqdn :" + data.fqdn + "	websocket_url: " + data.websocket_url + " http_url: " + data.http_url); 
					  
					  return this.checkBackendInstanceUp(data, callbackConnected)
			      })
              .catch(e => {
			  	this.tryAgainAfterDelay(callbackConnected);
                Logger.warn('HttpEndpoint is not ready yet', e);
				Logger.error(e);
				  
              });
					  
		}
		else {
			return new Promise((resolve, reject) => {
				this.initWebSocketConnection(callbackConnected);
				resolve();
			});
				
			
		}
		
	}
	
	
    /**
     * Initializes the WebSocket connection.
     * @param {Function} callbackConnected - Optional callback function to be called when the connection is established.
     * @returns {void}
     */
    initWebSocketConnection(callbackConnected) {
        this.connecting = true;
        this.connected = false;
        this.clearPingTimer();
		
		
				

        /*
        * It's not mandatory if you don't use the new Load Balancer mechanism
        * It uses one of the nodes on Cluster mode
        * Example parameters: "origin" or "edge"
        */
        const url = new URL(this.websocketURL);
        if (!['origin', 'edge'].includes(url.searchParams.get('target'))) {
            url.searchParams.set('target', this.webrtcadaptor.isPlayMode ? 'edge' : 'origin');
            this.websocketURL = url.toString();
        }

        this.wsConn = new WebSocket(this.websocketURL);
        this.wsConn.onopen = () => {
            Logger.debug("websocket connected");
            

            this.pingTimerId = setInterval(() => {
                this.sendPing();
            }, 3000);

            this.connected = true;
            this.connecting = false;
            this.callback("initialized");
            
            // Request ICE server configuration from server if user hasn't provided any
            this.webrtcadaptor.getIceServerConfiguration();

            if (typeof callbackConnected != "undefined") {
                callbackConnected();
            }
        }

        this.wsConn.onmessage = (event) => {
            var obj = JSON.parse(event.data);

            if (obj.command == "start") {
                //this command is received first, when publishing so playmode is false

                if (this.debug) {
                    Logger.debug("received start command");
                }

                this.webrtcadaptor.startPublishing(obj.streamId);
            } else if (obj.command == "takeCandidate") {

                if (this.debug) {
                    Logger.debug("received ice candidate for stream id " + obj.streamId);
                    Logger.debug(obj.candidate);
                }

                this.webrtcadaptor.takeCandidate(obj.streamId, obj.label, obj.candidate);

            } else if (obj.command == "takeConfiguration") {

                if (this.debug) {
                    Logger.debug("received remote description type for stream id: " + obj.streamId + " type: " + obj.type);
                }
                this.webrtcadaptor.takeConfiguration(obj.streamId, obj.sdp, obj.type, obj.idMapping);

            } else if (obj.command == "stop") {
                if (this.debug) {
                    Logger.debug("Stop command received");
                }
                //server sends stop command when the peers are connected to each other in peer-to-peer.
                //It is not being sent in publish,play modes
                this.webrtcadaptor.closePeerConnection(obj.streamId);
            } else if (obj.command == "error") {
                this.callbackError(obj.definition, obj);
            } else if (obj.command == "notification") {
                this.callback(obj.definition, obj);
            } else if (obj.command == "streamInformation") {
                this.callback(obj.command, obj);
            } else if (obj.command == "roomInformation") {
                this.callback(obj.command, obj);
            } else if (obj.command == "pong") {
                this.callback(obj.command);
            } else if (obj.command == "trackList") {
                this.callback(obj.command, obj);
            } else if (obj.command == "connectWithNewId") {
                this.multiPeerStreamId = obj.streamId;
                this.join(obj.streamId);
            } else if (obj.command == "peerMessageCommand") {
                this.callback(obj.command, obj);
            } else if (obj.command == "iceServerConfig") {
                if (this.debug) {
                    Logger.debug("received ice server config");
                }

                if (obj.stunServerUri) {
                    // Construct the iceServers configuration based on URI type
                    if (obj.stunServerUri.startsWith("turn:")) {
                        // For TURN server
                        this.webrtcadaptor.peerconnection_config.iceServers = [
                            {
                                'urls': 'stun:stun1.l.google.com:19302'
                            },
                            {
                                'urls': obj.stunServerUri,
                                'username': obj.turnServerUsername || "",
                                'credential': obj.turnServerCredential || ""
                            }
                        ];
                    } else if (obj.stunServerUri.startsWith("stun:")) {
                        // For STUN server
                        this.webrtcadaptor.peerconnection_config.iceServers = [
                            {
                                'urls': obj.stunServerUri
                            }
                        ];
                    }
                    
                    if (this.debug) {
                        Logger.debug("ice servers updated: " + JSON.stringify(this.webrtcadaptor.peerconnection_config.iceServers));
                    }
                }
            }
        }

        this.wsConn.onerror = (error) => {
            this.connecting = false;
            this.connected = false;
            Logger.info(" error occured: " + JSON.stringify(error));

            this.clearPingTimer();
            this.callbackError("WebSocketNotConnected", error)
        }

        this.wsConn.onclose = (event) => {
            this.connecting = false;
            this.connected = false;
            if (this.debug) {
                Logger.debug("connection closed.");
            }
            this.clearPingTimer();
            this.callback("closed", event);
        }

    }

    clearPingTimer() {
        if (this.pingTimerId != -1) {
            if (this.debug) {
                Logger.debug("Clearing ping message timer");
            }
            clearInterval(this.pingTimerId);
            this.pingTimerId = -1;
        }
    }

    sendPing() {
        var jsCmd = {
            command: "ping"
        };
        this.wsConn.send(JSON.stringify(jsCmd));
    }

    close() {
        this.wsConn.close();
    }
    /**
     * 
     * @param {*} text 
     * @returns 
     */
    send(text) {
        if (this.connecting == false && this.connected == false) {
            //try to reconnect
            this.checkBackendReady(() => {
                this.send(text);
            });
            return;
        }
        try {
            this.wsConn.send(text);
            if (this.debug) {
                Logger.debug("sent message:" + text);
            }
        }
        catch (error) {
            Logger.warn("Make sure you call methods after you receive initialized callback. Cannot send message:" + text + " Error is " + error);
        }
    }

    isConnected() {
        return this.connected;
    }

    isConnecting() {
        return this.connecting;
    }
}
