'use strict';

export function SoundMeter(context) {
    this.context = context;
    this.instant = 0.0;
    const that = this;
}

SoundMeter.prototype.connectToSource = async function (stream, levelCallback, errorCallback) {
    await this.context.audioWorklet.addModule(new URL('./volume-meter-processor.js', import.meta.url))
        .catch((err) => {
            if (typeof errorCallback !== 'undefined') {
                errorCallback(err);
            }
        });
    try {
        this.mic = this.context.createMediaStreamSource(stream);
        this.volumeMeterNode = new AudioWorkletNode(this.context, 'volume-meter');
        this.volumeMeterNode.port.onmessage = ({data}) => {
            this.instant = data;
            levelCallback(data.toFixed(2));
        };
        this.mic.connect(this.volumeMeterNode).connect(this.context.destination);
        if (typeof errorCallback !== 'undefined') {
            errorCallback(null);
        }
    } catch (e) {
        if (typeof errorCallback !== 'undefined') {
            errorCallback(null);
        }
    }
};

SoundMeter.prototype.stop = function () {
    this.mic.disconnect();
};
