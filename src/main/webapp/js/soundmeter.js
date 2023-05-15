'use strict';

export class SoundMeter {

	constructor(context) {
		this.context = context;
    	this.instant = 0.0;
	}

	async connectToSource(stream, levelCallback, errorCallback) {
		await this.context.audioWorklet.addModule('./volume-meter-processor.js')
        .catch((err) => {
            if (errorCallback !== undefined) {
                errorCallback(err);
            }
            console.error(err);
        });
	    try {
	        this.mic = this.context.createMediaStreamSource(stream);
	        this.volumeMeterNode = new AudioWorkletNode(this.context, 'volume-meter');
	        this.volumeMeterNode.port.onmessage = ({data}) => {
	            this.instant = data;
	            levelCallback(data.toFixed(2));
	        };
	        this.mic.connect(this.volumeMeterNode).connect(this.context.destination);
	    } catch (e) {
	        if (errorCallback !== undefined) {
	            errorCallback(null);
	        }
	        console.error(e);
	    }
	}

	stop() {
		this.mic.disconnect();
	}

}
