export class PeerStats {

    constructor(streamId) {
        this.streamId = streamId;
        this.totalBytesReceivedCount = 0;
        this.totalBytesSent = 0;
        this.videoPacketsLost = 0;
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
        //res width and res height are video source resolutions
        this.resWidth = 0;
        this.resHeight = 0;
        this.srcFps = 0;
        //frameWidth and frameHeight are the resolutions of the sent video
        this.frameWidth = 0;
        this.frameHeight = 0;

        this.videoRoundTripTime = 0;
        this.videoJitter = 0;

        this.audioRoundTripTime = 0;
        this.audioJitter = 0;

        this.audioPacketsLost = 0;

        this.framesReceived = 0;
        this.framesDropped = 0;
        this.framesDecoded = 0;

        this.audioJitterAverageDelay = 0;
        this.videoJitterAverageDelay = 0;
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