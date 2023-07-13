export class PeerStats {
    /**
     * Creates an instance of the class.
     * @param {string} streamId - The stream ID.
     * @constructor
     */
    constructor(streamId) {
        /**
         * The stream ID.
         * @type {string}
         */
        this.streamId = streamId;

        /**
         * The total number of bytes received.
         * @type {number}
         */
        this.totalBytesReceivedCount = 0;

        /**
         * The total number of bytes sent.
         * @type {number}
         */
        this.totalBytesSent = 0;

        /**
         * The number of video packets lost.
         * @type {number}
         */
        this.videoPacketsLost = 0;

        /**
         * The fraction of lost video packets.
         * @type {number}
         */
        this.fractionLost = 0;

        /**
         * The start time.
         * @type {number}
         */
        this.startTime = 0;

        /**
         * The last number of frames encoded.
         * @type {number}
         */
        this.lastFramesEncoded = 0;

        /**
         * The total number of frames encoded.
         * @type {number}
         */
        this.totalFramesEncodedCount = 0;

        /**
         * The last number of bytes received.
         * @type {number}
         */
        this.lastBytesReceived = 0;

        /**
         * The last number of bytes sent.
         * @type {number}
         */
        this.lastBytesSent = 0;

        /**
         * The total number of video packets sent.
         * @type {number}
         */
        this.totalVideoPacketsSent = 0;

        /**
         * The total number of audio packets sent.
         * @type {number}
         */
        this.totalAudioPacketsSent = 0;

        /**
         * The current timestamp.
         * @type {number}
         */
        this.currentTimestamp = 0;

        /**
         * The last recorded timestamp.
         * @type {number}
         */
        this.lastTime = 0;

        /**
         * The timer ID.
         * @type {number}
         */
        this.timerId = 0;

        /**
         * The first byte sent count.
         * @type {number}
         */
        this.firstByteSentCount = 0;

        /**
         * The first bytes received count.
         * @type {number}
         */
        this.firstBytesReceivedCount = 0;

        /**
         * The audio level.
         * @type {number}
         */
        this.audioLevel = -1;

        /**
         * The quality limitation reason.
         * @type {string}
         */
        this.qualityLimitationReason = "";

        /**
         * The source resolution width.
         * @type {number}
         */
        this.resWidth = 0;

        /**
         * The source resolution height.
         * @type {number}
         */
        this.resHeight = 0;

        /**
         * The source frames per second.
         * @type {number}
         */
        this.srcFps = 0;

        /**
         * The frame width of the sent video.
         * @type {number}
         */
        this.frameWidth = 0;

        /**
         * The frame height of the sent video.
         * @type {number}
         */
        this.frameHeight = 0;

        /**
         * The video round-trip time.
         * @type {number}
         */
        this.videoRoundTripTime = 0;

        /**
         * The video jitter.
         * @type {number}
         */
        this.videoJitter = 0;

        /**
         * The audio round-trip time.
         * @type {number}
         */
        this.audioRoundTripTime = 0;

        /**
         * The audio jitter.
         * @type {number}
         */
        this.audioJitter = 0;

        /**
         * The number of audio packets lost.
         * @type {number}
         */
        this.audioPacketsLost = 0;

        /**
         * The number of frames received.
         * @type {number}
         */
        this.framesReceived = 0;

        /**
         * The number of frames dropped.
         * @type {number}
         */
        this.framesDropped = 0;

        /**
         * The number of frames decoded.
         * @type {number}
         */
        this.framesDecoded = 0;

        /**
         * The average audio jitter delay.
         * @type {number}
         */
        this.audioJitterAverageDelay = 0;

        /**
         * The average video jitter delay.
         * @type {number}
         */
        this.videoJitterAverageDelay = 0;
        this.availableOutgoingBitrate = Infinity;
    }
    //kbits/sec
    get averageOutgoingBitrate() {
        return Math.floor(8 * (this.totalBytesSentCount - this.firstByteSentCount) / (this.currentTimestamp - this.startTime));
    }

    //frames per second
    get currentFPS() {
        return (((this.totalFramesEncodedCount - this.lastFramesEncoded) / (this.currentTimestamp - this.lastTime)) * 1000).toFixed(1);
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
    /**
     * @param {number} timestamp
     * @returns {void}
     */
    set currentTime(timestamp) {
        this.lastTime = this.currentTimestamp;
        this.currentTimestamp = timestamp;
        if (this.startTime == 0) {
            this.startTime = timestamp - 1; // do not have zero division error
        }
    }
    /**
     * @param {number} bytesReceived
     * @returns {void}
     */
    set totalBytesReceived(bytesReceived) {
        this.lastBytesReceived = this.totalBytesReceivedCount;
        this.totalBytesReceivedCount = bytesReceived;
        if (this.firstBytesReceivedCount == 0) {
            this.firstBytesReceivedCount = bytesReceived;
        }
    }
    /**
     * @param {number} bytesSent
     * @returns {void}
     */
    set totalBytesSent(bytesSent) {
        this.lastBytesSent = this.totalBytesSentCount;
        this.totalBytesSentCount = bytesSent;
        if (this.firstByteSentCount == 0) {
            this.firstByteSentCount = bytesSent;
        }
    }
    /**
     * @param {number} framesEncoded
     * @returns {void}
     */
    set totalFramesEncoded(framesEncoded) {
        this.lastFramesEncoded = this.totalFramesEncodedCount;
        this.totalFramesEncodedCount = framesEncoded;
        if (this.lastFramesEncoded == 0) {
            this.lastFramesEncoded = framesEncoded;
        }
    }

}
