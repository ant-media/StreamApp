'use strict';

import "./external/loglevel.min.js";

const Logger = window.log;

export class SoundMeter {
	/**
	 * 
	 * @param {AudioContext} context 
	 */
	constructor(context, volumeMeterUrl) {
		this.context = context;
    	this.instant = 0.0;
		this.mic = null;
		this.volumeMeterNode = null;
		this.url  = volumeMeterUrl;
	}
	/**
	 * 
	 * @param {MediaStream} stream 
	 * @param {Function} levelCallback 
	 * @param {Function} errorCallback 
	 * @returns 
	 */
	connectToSource(stream, levelCallback, errorCallback) {
	  return this.context.audioWorklet.addModule(this.url).then(()=> {
		    console.log("debug70");
			this.mic = this.context.createMediaStreamSource(stream);
			console.log("debug701 mic:", this.context);
	        this.volumeMeterNode = new AudioWorkletNode(this.context, 'volume-meter');
			console.log("debug71");


	        this.volumeMeterNode.port.onmessage = (event) => {
				console.log("debug72***********");

				if (event.data.type == 'debug') {
					Logger.debug(event.data.message);
				}
				else {
	            	this.instant = event.data;
	            	levelCallback(this.instant.toFixed(2));
					Logger.debug("Audio level: " + this.instant.toFixed(2));

				}
	        };

	        this.mic.connect(this.volumeMeterNode);
		})
        .catch((err) => {
            if (errorCallback !== undefined) {
                errorCallback(err);
            }
			Logger.error("Error in soundmeter: " + err);
			Logger.error("You may need to define the url of the volume-meter-processor.js");
            throw err;
        });
	}

	stop() {

		if (this.volumeMeterNode != null) {
			this.volumeMeterNode.port.postMessage('stop');
			this.volumeMeterNode.disconnect();
			this.volumeMeterNode.port.close();
			this.volumeMeterNode = null;
		}
		if (this.mic != null) {
			this.mic.disconnect();
			this.mic = null;
		}
	}

}
