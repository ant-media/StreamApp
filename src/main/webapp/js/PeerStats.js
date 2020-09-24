export class PeerStats {

    constructor(streamId) {
        this.streamId = streamId;
        this.totalBytesReceivedCount = 0;
        this.totalBytesSent = 0;
        this.packetsLost = 0;
        this.fractionLost = 0;
        this.startTime = 0;
        this.lastFramesEncoded = 0;
		this.totalFramesEncodedCount = 0;
        this.lastBytesReceived = 0;
        this.lastBytesSent = 0;
        this.currentTimestamp = 0;
        this.lastTime = 0;
        this.timerId = 0;
        this.firstByteSentCount = 0;
        this.firstBytesReceivedCount = 0;
        this.audioLevel = -1;
        this.qualityLimitationReason = "";
        this.resWidth = 0;
        this.resHeight = 0;
        this.srcFps = 0;
    }

    //kbits/sec
    get averageOutgoingBitrate() {
        return Math.floor(8 * (this.totalBytesSentCount - this.firstByteSentCount) / (this.currentTimestamp - this.startTime));
    }

    //frames per second
    get currentFPS() {
        return (((this.totalFramesEncodedCount - this.lastFramesEncoded) / (this.currentTimestamp - this.lastTime))*1000).toFixed(1);
    }
    //kbits/sec
    get averageIncomingBitrate() {
        return Math.floor(8 * (this.totalBytesReceivedCount - this.firstBytesReceivedCount) / (this.currentTimestamp - this.startTime));
    }

    //kbits/sec
    get currentOutgoingBitrate() {
        return Math.floor(8 * (this.totalBytesSentCount - this.lastBytesSent) / (this.currentTimestamp - this.lastTime));
    }

    //kbits/sec
    get currentIncomingBitrate() {
        return Math.floor(8 * (this.totalBytesReceivedCount - this.lastBytesReceived) / (this.currentTimestamp - this.lastTime));
    }

    set currentTime(timestamp) {
        this.lastTime = this.currentTimestamp;
        this.currentTimestamp = timestamp;
        if (this.startTime == 0) {
            this.startTime = timestamp-1; // do not have zero division error
        }
    }

    set totalBytesReceived(bytesReceived) {
        this.lastBytesReceived = this.totalBytesReceivedCount;
        this.totalBytesReceivedCount = bytesReceived;
        if (this.firstBytesReceivedCount == 0) {
            this.firstBytesReceivedCount = bytesReceived;
        }
    }

    set totalBytesSent(bytesSent) {
        this.lastBytesSent = this.totalBytesSentCount;
        this.totalBytesSentCount = bytesSent;
        if (this.firstByteSentCount == 0) {
            this.firstByteSentCount = bytesSent;
        }
    }
    set totalFramesEncoded(framesEncoded) {
        this.lastFramesEncoded = this.totalFramesEncodedCount;
        this.totalFramesEncodedCount = framesEncoded;
        if (this.lastFramesEncoded == 0) {
            this.lastFramesEncoded = framesEncoded;
        }
    }

}