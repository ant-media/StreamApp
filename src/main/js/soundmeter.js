'use strict';

import "./external/loglevel.min.js";

const Logger = window.log;

export class SoundMeter {
	/**
	 * 
	 * @param {AudioContext} context 
	 */
	constructor(context) {
		this.context = context;
    	this.instant = 0.0;
		this.mic = null;
		this.volumeMeterNode = null;
	}
	/**
	 * 
	 * @param {MediaStream} stream 
	 * @param {Function} levelCallback 
	 * @param {Function} errorCallback 
	 * @returns 
	 */
	connectToSource(stream, levelCallback, errorCallback) {
	  return this.context.audioWorklet.addModule(new URL('./volume-meter-processor.js', import.meta.url)).then(()=> {
			this.mic = this.context.createMediaStreamSource(stream);
	        this.volumeMeterNode = new AudioWorkletNode(this.context, 'volume-meter');

	        this.volumeMeterNode.port.onmessage = (event) => {
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
