export declare class EmbeddedPlayer {
    static DEFAULT_PLAY_ORDER: string[];
    static DEFAULT_PLAY_TYPE: string[];
    static HLS_EXTENSION: string;
    static WEBRTC_EXTENSION: string;
    static DASH_EXTENSION: string;
    /**
     * streamsFolder: streams folder. Optional. Default value is "streams"
     */
    static STREAMS_FOLDER: string;
    static VIDEO_HTML: string;
    static VIDEO_PLAYER_ID: string;
    constructor(window: any, containerElement: any, placeHolderElement: any);
    /**
     *  "playOrder": the order which technologies is used in playing. Optional. Default value is "webrtc,hls".
     *	possible values are "hls,webrtc","webrtc","hls","vod","dash"
     *   It will be taken from url parameter "playOrder".
     */
    playOrder: any;
    /**
     * currentPlayType: current play type in playOrder
     */
    currentPlayType: any;
    /**
     * "is360": if true, player will be 360 degree player. Optional. Default value is false.
     * It will be taken from url parameter "is360".
     */
    is360: boolean;
    /**
     * "streamId": stream id. Mandatory. If it is not set, it will be taken from url parameter "id".
     * It will be taken from url parameter "id".
     */
    streamId: string | true;
    /**
     * "playType": play type. Optional.  It's used for vod. Default value is "mp4,webm".
     * It can be "mp4,webm","webm,mp4","mp4","webm","mov" and it's used for vod.
     * It will be taken from url parameter "playType".
     */
    playType: any;
    /**
     * "token": token. It's required when stream security for playback is enabled .
     * It will be taken from url parameter "token".
     */
    token: string | boolean | null;
    /**
     * autoplay: if true, player will be started automatically. Optional. Default value is true.
     * autoplay is false by default for mobile devices because of mobile browser's autoplay policy.
     * It will be taken from url parameter "autoplay".
     */
    autoPlay: boolean;
    /**
     * mute: if true, player will be started muted. Optional. Default value is true.
     * default value is true because of browser's autoplay policy.
     * It will be taken from url parameter "mute".
     */
    mute: boolean;
    /**
     * targetLatency: target latency in seconds. Optional. Default value is 3.
     * It will be taken from url parameter "targetLatency".
     * It's used for dash(cmaf) playback.
     */
    targetLatency: number;
    /**
     * subscriberId: subscriber id. Optional. It will be taken from url parameter "subscriberId".
     */
    subscriberId: string | boolean | null;
    /**
     * subscriberCode: subscriber code. Optional. It will be taken from url parameter "subscriberCode".
     */
    subscriberCode: string | boolean | null;
    /**
     * window: window object
     */
    window: any;
    /**
     * video player container element
     */
    containerElement: any;
    /**
     * player placeholder element
     */
    placeHolderElement: any;
    /**
     * videojs player
     */
    videojsPlayer: any;
    /**
     * dash player
     */
    dashPlayer: any;
    /**
     * Ice servers for webrtc
     */
    iceServers: string;
    /**
     * ice connection state
     */
    iceConnected: boolean;
    /**
     * flag to check if error callback is called
     */
    errorCalled: boolean;
    /**
     * scene for 360 degree player
     */
    aScene: any;
    /**
     * player listener
     */
    playerListener: any;
    /**
     * webRTCDataListener
     */
    webRTCDataListener: any;
    /**
     * Field to keep if tryNextMethod is already called
     */
    tryNextTechTimer: number;
    dom: any;
    /**
     * load scripts dynamically
     */
    loadScripts(): void;
    /**
     * enable 360 player
     */
    enable360Player(): void;
    /**
     * set player visibility
     * @param {boolean} visible
     */
    setPlayerVisible(visible: boolean): void;
    handleWebRTCInfoMessages(infos: any): void;
    /**
     * Play the stream via videojs
     * @param {*} streamUrl
     * @param {*} extension
     * @returns
     */
    playWithVideoJS(streamUrl: any, extension: any): void;
    makeVideoJSVisibleWhenReady(): void;
    /**
     * check if stream exists via http
     * @param {*} streamsfolder
     * @param {*} streamId
     * @param {*} extension
     * @returns
     */
    checkStreamExistsViaHttp(streamsfolder: any, streamId: any, extension: any): Promise<any>;
    addSecurityParams(streamPath: any): any;
    /**
     * try next tech if current tech is not working
     */
    tryNextTech(): void;
    /**
     * play stream throgugh dash player
     * @param {string"} streamUrl
         */
     playViaDash(streamUrl: any): void;
     dashLatencyTimer: NodeJS.Timer | undefined;
     makeDashPlayerVisibleWhenInitialized(): void;
     /**
      * destroy the dash player
      */
     destroyDashPlayer(): void;
     /**
      * destroy the videojs player
      */
     destroyVideoJSPlayer(): void;
     /**
      * play the stream with the given tech
      * @param {string} tech
      */
     playIfExists(tech: string): Promise<void>;
     /**
      *
      * @returns {String} query string for security
      */
     getSecurityQueryParams(): string;
     /**
      * play the stream with videojs player or dash player
      */
     play(): void;
     /**
      * mute or unmute the player
      * @param {boolean} mutestatus true to mute the player
      */
     mutePlayer(mutestatus: boolean): void;
     /**
      *
      * @returns {boolean} true if player is muted
      */
     isMuted(): boolean;
     addPlayerListener(playerListener: any): void;
     /**
      * WebRTC data listener
      * @param {*} webRTCDataListener
      */
     addWebRTCDataListener(webRTCDataListener: any): void;
     /**
      *
      * @param {*} data
      */
     sendWebRTCData(data: any): boolean;
    }

    /**
     *
     * @param {string} sParam
     * @param {string=} search
     * @returns
     */
    export declare function getUrlParameter(sParam: string, search?: string | undefined): string | true | undefined;

    /**
     * Media management class is responsible to manage audio and video
     * sources and tracks management for the local stream.
     * Also audio and video properties (like bitrate) are managed by this class .
     */
    declare class MediaManager {
        /**
         *
         * @param {object} initialValues
         */
        constructor(initialValues: object);
        /**
         * the maximum bandwith value that browser can send a stream
         * keep in mind that browser may send video less than this value
         */
        bandwidth: number;
        /**
         * This flags enables/disables debug logging
         */
        debug: boolean;
        /**
         * The cam_location below is effective when camera and screen is send at the same time.
         * possible values are top and bottom. It's on right all the time
         */
        camera_location: string;
        /**
         * The cam_margin below is effective when camera and screen is send at the same time.
         * This is the margin value in px from the edges
         */
        camera_margin: number;
        /**
         * this camera_percent is how large the camera view appear on the screen. It's %15 by default.
         */
        camera_percent: number;
        /**
         * initial media constraints provided by the user
         */
        mediaConstraints: {
            video: boolean;
            audio: boolean;
        };
        /**
         * this is the callback function to get video/audio sender from WebRTCAdaptor
         */
        getSender: any;
        /**
         * This is the Stream Id for the publisher.
         */
        publishStreamId: any;
        /**
         * this is the object of the local stream to publish
         * it is initiated in initLocalStream method
         */
        localStream: any;
        /**
         * publish mode is determined by the user and set by @mediaConstraints.video
         * It may be camera, screen, screen+camera
         */
        publishMode: string;
        /**
         * Default callback. It's overriden below if it exists
         */
        callback: (info: any, obj: any) => void;
        /**
         * Default callback error implementation. It's overriden below if it exists
         */
        callbackError: (err: any) => void;
        /**
         * current volume value which is set by the user
         */
        currentVolume: any;
        /**
         * Keeps the audio track to be closed in case of audio track change
         */
        previousAudioTrack: MediaStreamTrack | null;
        /**
         * silent audio track for switching between dummy track to real tracks on the fly
         */
        silentAudioTrack: any;
        /**
         * The screen video track in screen+camera mode
         */
        desktopStream: any;
        /**
         * The camera (overlay) video track in screen+camera mode
         */
        smallVideoTrack: any;
        /**
         * black video track for switching between dummy video track to real tracks on the fly
         */
        blackVideoTrack: MediaStreamTrack | null;
        /**
         * Audio context to use for meter, mix, gain
         */
        audioContext: AudioContext;
        /**
         * osciallator to generate silent audio
         */
        oscillator: OscillatorNode | null;
        /**
         * the main audio in single audio case
         * the primary audio in mixed audio case
         *
         * its volume can be controled
         */
        primaryAudioTrackGainNode: GainNode | null;
        /**
         * the secondary audio in mixed audio case
         *
         * its volume can be controled
         */
        secondaryAudioTrackGainNode: GainNode | null;
        /**
         * this is the sound meter object for the local stream
         */
        localStreamSoundMeter: SoundMeter | null;
        /**
         * this is the level callback for sound meter object
         */
        levelCallback: Function | null;
        /**
         * Timer to create black frame to publish when video is muted
         */
        blackFrameTimer: NodeJS.Timer | null;
        /**
         * Timer to draw camera and desktop to canvas
         */
        desktopCameraCanvasDrawerTimer: NodeJS.Timer | null;
        /**
         * For audio check when the user is muted itself.
         * Check enableAudioLevelWhenMuted
         */
        mutedAudioStream: MediaStream | null;
        /**
         * This flag is the status of audio stream
         * Checking when the audio stream is updated
         */
        isMuted: boolean;
        /**
         * meter refresh period for "are you talking?" check
         */
        meterRefresh: NodeJS.Timer | null;
        /**
         * For keeping track of whether user turned off the camera
         */
        cameraEnabled: boolean;
        /**
         * Replacement stream for video track when the camera is turn off
         */
        replacementStream: MediaStream | null;
        /**
         * html video element that presents local stream
         */
        localVideo: any;
        dummyCanvas: HTMLCanvasElement;
        /**
         * Called by the WebRTCAdaptor at the start if it isn't play mode
         */
        initLocalStream(): Promise<any>;
        checkWebRTCPermissions(): void;
        getDevices(): Promise<any[]>;
        trackDeviceChange(): void;
        /**
         * This function create a canvas which combines screen video and camera video as an overlay
         *
         * @param {*} stream : screen share stream
         * @param {*} streamId
         * @param {*} onEndedCallback : callback when called on screen share stop
         */
        setDesktopwithCameraSource(stream: any, streamId: any, onEndedCallback: any): Promise<any>;
        /**
         * This function does these:
         *    1. Remove the audio track from the stream provided if it is camera. Other case
         *       is screen video + system audio track. In this case audio is kept in stream.
         *    2. Open audio track again if audio constaint isn't false
         *    3. Make audio track Gain Node to be able to volume adjustable
         *  4. If screen is shared and system audio is available then the system audio and
         *     opened audio track are mixed
         *
         * @param {*} mediaConstraints
         * @param {*} audioConstraint
         * @param {*} stream
         * @param {*} streamId
         */
        prepareStreamTracks(mediaConstraints: any, audioConstraint: any, stream: any, streamId: any): Promise<any>;
        /**
         * Called to get user media (camera and/or mic)
         *
         * @param {*} mediaConstraints : media constaint
         * @param {*} func : callback on success. The stream which is got, is passed as parameter to this function
         * @param {*} catch_error : error is checked if catch_error is true
         */
        navigatorUserMedia(mediaConstraints: any, func: any, catch_error: any): Promise<any>;
        /**
         * Called to get display media (screen share)
         *
         * @param {*} mediaConstraints : media constaint
         * @param {*} func : callback on success. The stream which is got, is passed as parameter to this function
         */
        navigatorDisplayMedia(mediaConstraints: any, func: any): Promise<void | MediaStream>;
        /**
         * Called to get the media (User Media or Display Media)
         * @param {*} mediaConstraints, media constraints
         * @param {*} streamId, streamId to be used to replace track if there is an active peer connection
         */
        getMedia(mediaConstraints: any, streamId: any): Promise<any>;
        /**
         * Open media stream, it may be screen, camera or audio
         */
        openStream(mediaConstraints: any, streamId: any): Promise<void>;
        /**
         * Closes stream, if you want to stop peer connection, call stop(streamId)
         */
        closeStream(): void;
        /**
         * Checks browser supports screen share feature
         * if exist it calls callback with "browser_screen_share_supported"
         */
        checkBrowserScreenShareSupported(): void;
        /**
         * Changes the secondary stream gain in mixed audio mode
         *
         * @param {*} enable
         */
        enableSecondStreamInMixedAudio(enable: any): void;
        /**
         * Changes local stream when new stream is prepared
         *
         * @param {*} stream
         */
        gotStream(stream: any): Promise<any>;
        /**
         * Changes local video and sets localStream as source
         *
         * @param {*} videoEl
         */
        changeLocalVideo(videoEl: any): void;
        /**
         * These methods are initialized when the user is muted himself in a publish scenario
         * It will keep track if the user is trying to speak without sending any data to server
         * Please don't forget to disable this function with disableAudioLevelWhenMuted if you use it.
         */
        enableAudioLevelWhenMuted(): void;
        mutedSoundMeter: SoundMeter | null | undefined;
        disableAudioLevelWhenMuted(): void;
        /**
         * @Deprecated. It's not the job of SDK to make these things. It increases the complexity of the code.
         * We provide samples for having these function
         *
         * This method mixed the first stream audio to the second stream audio and
         * @param {*} stream  : Primary stream that contain video and audio (system audio)
         * @param {*} secondStream :stream has device audio
         * @returns mixed stream.
         */
        mixAudioStreams(stream: any, secondStream: any): MediaStream;
        /**
         * This method creates a Gain Node stream to make the audio track adjustable
         *
         * @param {*} stream
         * @returns
         */
        setGainNodeStream(stream: any): any;
        /**
         * Called by User
         * to switch the Screen Share mode
         *
         * @param {*} streamId
         */
        switchDesktopCapture(streamId: any): Promise<any>;
        /**
         * Called by User
         * to switch the Screen Share with Camera mode
         *
         * @param {*} streamId
         */
        switchDesktopCaptureWithCamera(streamId: any): Promise<any>;
        /**
         * This method updates the local stream. It removes existant audio track from the local stream
         * and add the audio track in `stream` parameter to the local stream
         */
        updateLocalAudioStream(stream: any, onEndedCallback: any): void;
        /**
         * This method updates the local stream. It removes existant video track from the local stream
         * and add the video track in `stream` parameter to the local stream
         */
        updateLocalVideoStream(stream: any, onEndedCallback: any, stopDesktop: any): void;
        /**
         * Called by User
         * to change video source
         *
         * @param {*} streamId
         * @param {*} deviceId
         */
        switchAudioInputSource(streamId: any, deviceId: any): Promise<any>;
        /**
         * This method sets Audio Input Source and called when you change audio device
         * It calls updateAudioTrack function to update local audio stream.
         */
        setAudioInputSource(streamId: any, mediaConstraints: any, onEndedCallback: any): Promise<any>;
        /**
         * Called by User
         * to change video camera capture
         *
         * @param {*} streamId Id of the stream to be changed.
         * @param {*} deviceId Id of the device which will use as a media device
         * @param {*} onEndedCallback callback for when the switching video state is completed, can be used to understand if it is loading or not
         *
         * This method is used to switch to video capture.
         */
        switchVideoCameraCapture(streamId: any, deviceId: any, onEndedCallback: any): Promise<any>;
        /**
         * This method sets Video Input Source and called when you change video device
         * It calls updateVideoTrack function to update local video stream.
         */
        setVideoCameraSource(streamId: any, mediaConstraints: any, onEndedCallback: any, stopDesktop: any): Promise<any>;
        /**
         * Called by User
         * to switch between front and back camera on mobile devices
         *
         * @param {*} streamId Id of the stream to be changed.
         * @param {*} facingMode it can be "user" or "environment"
         *
         * This method is used to switch front and back camera.
         */
        switchVideoCameraFacingMode(streamId: any, facingMode: any): Promise<any>;
        /**
         * Updates the audio track in the audio sender
         * getSender method is set on MediaManagercreation by WebRTCAdaptor
         *
         * @param {*} stream
         * @param {*} streamId
         * @param {*} onEndedCallback
         */
        updateAudioTrack(stream: any, streamId: any, onEndedCallback: any): any;
        /**
         * Updates the video track in the video sender
         * getSender method is set on MediaManagercreation by WebRTCAdaptor
         *
         * @param {*} stream
         * @param {*} streamId
         * @param {*} onEndedCallback
         */
        updateVideoTrack(stream: any, streamId: any, onEndedCallback: any, stopDesktop: any): any;
        /**
         * If you mute turn off the camera still some data should be sent
         * Tihs method create a black frame to reduce data transfer
         */
        getBlackVideoTrack(): MediaStreamTrack;
        /**
         * Silent audio track
         */
        getSilentAudioTrack(): any;
        stopSilentAudioTrack(): void;
        /**
         * Called by User
         * turns of the camera stream and starts streaming black dummy frame
         */
        turnOffLocalCamera(streamId: any): any;
        clearBlackVideoTrackTimer(): void;
        stopBlackVideoTrack(): void;
        /**
         * Called by User
         * turns of the camera stream and starts streaming camera again instead of black dummy frame
         */
        turnOnLocalCamera(streamId: any): Promise<any>;
        /**
         * Called by User
         * to mute local audio streaming
         */
        muteLocalMic(): void;
        /**
         * Called by User
         * to unmute local audio streaming
         *
         * if there is audio it calls callbackError with "AudioAlreadyActive" parameter
         */
        unmuteLocalMic(): void;
        /**
         * If we have multiple video tracks in coming versions, this method may cause some issues
         */
        getVideoSender(streamId: any): any;
        /**
         * Called by User
         * to set maximum video bandwidth is in kbps
         */
        changeBandwidth(bandwidth: any, streamId: any): any;
        /**
         * Called by user
         * sets the volume level
         *
         * @param {*} volumeLevel : Any number between 0 and 1.
         */
        setVolumeLevel(volumeLevel: any): void;
        /**
         * Called by user
         * To create a sound meter for the local stream
         *
         * @param {Function} levelCallback : callback to provide the audio level to user
         * @param {*} period : measurement period
         */
        enableAudioLevelForLocalStream(levelCallback: Function): Promise<void>;
        disableAudioLevelForLocalStream(): void;
        /**
         * Called by user
         * To change audio/video constraints on the fly
         *
         */
        applyConstraints(newConstraints: any): any;
    }

    declare class SoundMeter {
        /**
         *
         * @param {AudioContext} context
         */
        constructor(context: AudioContext);
        context: AudioContext;
        instant: number;
        mic: MediaStreamAudioSourceNode | null;
        volumeMeterNode: AudioWorkletNode | null;
        /**
         *
         * @param {MediaStream} stream
         * @param {Function} levelCallback
         * @param {Function} errorCallback
         * @returns
         */
        connectToSource(stream: MediaStream, levelCallback: Function, errorCallback: Function): Promise<void>;
        stop(): void;
    }

    /**
     * This class is used to apply a video effect to the video stream.
     * It's compatible with Ant Media Server JavaScript SDK v2.5.2+
     *
     */
    export declare class VideoEffect {
        static DEEPAR: string;
        static VIRTUAL_BACKGROUND: string;
        static BLUR_BACKGROUND: string;
        static NO_EFFECT: string;
        static deepARModelList: string[];
        /**
         * @type {boolean}
         */
        static DEBUG: boolean;
        /**
         * LOCATE_FILE_URL is optional, it's to give locate url of selfie segmentation
         * If you would like to use CDN,
         * Give "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/"
         * or give local file relative path "./js/external/selfie-segmentation" according to your file
         */
        static LOCATE_FILE_URL: string;
        static DEEP_AR_FOLDER_ROOT_URL: string;
        static DEEP_AR_EFFECTS_URL: string;
        static DEEP_AR_EXTENSION: string;
        /**
         *
         * @param {WebRTCAdaptor} webRTCAdaptor
         */
        constructor(webRTCAdaptor: WebRTCAdaptor);
        webRTCAdaptor: WebRTCAdaptor;
        selfieSegmentation: any;
        effectCanvas: HTMLCanvasElement | null;
        ctx: CanvasRenderingContext2D | null;
        rawLocalVideo: HTMLVideoElement;
        deepAR: any;
        backgroundBlurRange: number;
        edgeBlurRange: number;
        effectName: string;
        startTime: number;
        statTimerId: number;
        renderedFrameCount: number;
        lastRenderedFrameCount: number;
        effectCanvasFPS: number;
        videoCallbackPeriodMs: number;
        isInitialized: boolean;
        /**
         * This method is used to initialize the video effect.
         * @param {MediaStream} stream - Original stream to be manipulated.
         * @returns {Promise<void>}
         */
        init(stream: MediaStream): Promise<void>;
        canvasStream: MediaStream | null | undefined;
        /**
         * This method is used to set raw local video.
         * @param {MediaStream} stream
         * @returns {Promise<void>}
         */
        setRawLocalVideo(stream: MediaStream): Promise<void>;
        /**
         * This method is used to create the canvas element which is used to apply the video effect.
         * @param {number} height
         * @param {number} width
         */
        createEffectCanvas(width: number, height: number): HTMLCanvasElement;
        /**
         * This method is used to initialize the selfie segmentation.
         */
        initializeSelfieSegmentation(): void;
        /**
         * @param {HTMLElement} imageElement
         */
        set virtualBackgroundImage(arg: HTMLElement);
        startFpsCalculation(): void;
        stopFpsCalculation(): void;
        processFrame(): Promise<void>;
        /**
         * Enable effect
         * @param {string} effectName
         * @param {string} deepARApiKey
         * @param {*} deepARModel
         */
        enableEffect(effectName: string, deepARApiKey: string, deepARModel: any): Promise<any>;
        /**
         * This method is used to draw the segmentation mask.
         * @param {*} segmentation
         */
        drawSegmentationMask(segmentation: any): void;
        /**
         * This method is called by mediapipe when the segmentation mask is ready.
         * @param {*} results
         */
        onResults(results: any): void;
        /**
         * This method is used to draw the raw frame directly to the canvas.
         * @param {*} image
         */
        drawImageDirectly(image: any): void;
        /**
         * This method is used to draw the frame with virtual background effect to the canvas.
         * @param {*} image
         * @param {*} segmentation
         * @param {*} virtualBackgroundImage
         */
        drawVirtualBackground(image: any, segmentation: any, virtualBackgroundImage: any): void;
        /**
         * This method is used to draw frame with background blur effect to the canvas.
         * @param {*} image
         * @param {*} segmentation
         * @param {*} blurAmount
         */
        drawBlurBackground(image: any, segmentation: any, blurAmount: any): void;
        #private;
    }

    /**
     * WebRTCAdaptor Class is interface to the JS SDK of Ant Media Server (AMS). This class manages the signalling,
     * keeps the states of peers.
     *
     * This class is used for peer-to-peer signalling,
     * publisher and player signalling and conference.
     *
     * Also it is responsible for some room management in conference case.
     *
     * There are different use cases in AMS. This class is used for all of them.
     *
     * WebRTC Publish
     * WebRTC Play
     * WebRTC Data Channel Connection
     * WebRTC Conference
     * WebRTC Multitrack Play
     * WebRTC Multitrack Conference
     * WebRTC peer-to-peer session
     *
     */
    export declare class WebRTCAdaptor {
        /**
         * @type {Array<Function>}
         */
        static pluginInitMethods: Array<Function>;
        /**
         * Register plugins to the WebRTCAdaptor
         * @param {Function} plugin
         */
        static register(pluginInitMethod: any): void;
        /**
         *
         * @param {object} initialValues
         */
        constructor(initialValues: object);
        /**
         * PeerConnection configuration while initializing the PeerConnection.
         * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#parameters
         *
         * More than one STURN and/or TURN servers can be added.  Here is a typical turn server configuration
         *
         *    {
         * 	  urls: "",
         *	  username: "",
         *    credential: "",
         *	}
         *
         *  Default value is the google stun server
         */
        peerconnection_config: {
            iceServers: {
                urls: string;
            }[];
            sdpSemantics: string;
        };
        /**
         * Used while creating SDP (answer or offer)
         * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer#parameters
         */
        sdp_constraints: {
            OfferToReceiveAudio: boolean;
            OfferToReceiveVideo: boolean;
        };
        /**
         * This keeps the PeerConnections for each stream id.
         * It is an array because one @WebRTCAdaptor instance can manage multiple WebRTC connections as in the conference.
         * Its indices are the Stream Ids of each stream
         */
        remotePeerConnection: any[];
        /**
         * This keeps statistics for the each PeerConnection.
         * It is an array because one @WebRTCAdaptor instance can manage multiple WebRTC connections as in the conference.
         * Its indices are the Stream Ids of each stream
         */
        remotePeerConnectionStats: any[];
        /**
         * This keeps the Remote Description (SDP) set status for each PeerConnection.
         * We need to keep this status because sometimes ice candidates from the remote peer
         * may come before the Remote Description (SDP). So we need to store those ice candidates
         * in @iceCandidateList field until we get and set the Remote Description.
         * Otherwise setting ice candidates before Remote description may cause problem.
         */
        remoteDescriptionSet: any[];
        /**
         * This keeps the Ice Candidates which are received before the Remote Description (SDP) received.
         * For details please check @remoteDescriptionSet field.
         */
        iceCandidateList: any[];
        /**
         * This is the name for the room that is desired to join in conference mode.
         */
        roomName: string | null;
        /**
         * This keeps StreamIds for the each playing session.
         * It is an array because one @WebRTCAdaptor instance can manage multiple playing sessions.
         */
        playStreamId: any[];
        /**
         * This is the flag indicates if multiple peers will join a peer in the peer to peer mode.
         * This is used only with Embedded SDk
         */
        isMultiPeer: boolean;
        /**
         * This is the stream id that multiple peers can join a peer in the peer to peer mode.
         * This is used only with Embedded SDk
         */
        multiPeerStreamId: any;
        /**
         * This is instance of @WebSocketAdaptor and manages to websocket connection.
         * All signalling messages are sent to/recived from
         * the Ant Media Server over this web socket connection
         */
        webSocketAdaptor: WebSocketAdaptor | null;
        /**
         * This flags indicates if this @WebRTCAdaptor instance is used only for playing session(s)
         * You don't need camera/mic access in play mode
         */
        isPlayMode: boolean;
        /**
         * This flags enables/disables debug logging
         */
        debug: boolean;
        /**
         * This is the Stream Id for the publisher. One @WebRCTCAdaptor supports only one publishing
         * session for now (23.02.2022).
         * In conference mode you can join a room with null stream id. In that case
         * Ant Media Server generates a stream id and provides it JoinedTheRoom callback and it is set to this field.
         */
        publishStreamId: string | null;
        /**
         * This is used to keep stream id and track id (which is provided in SDP) mapping
         * in MultiTrack Playback and conference.
         */
        idMapping: any[];
        /**
         * This is used when only data is brodcasted with the same way video and/or audio.
         * The difference is that no video or audio is sent when this field is true
         */
        onlyDataChannel: boolean;
        /**
         * While publishing and playing streams data channel is enabled by default
         */
        dataChannelEnabled: boolean;
        /**
         * This is array of @ReceivingMessage
         * When you receive multiple large size messages @ReceivingMessage simultaneously
         * this map is used to indicate them with its index tokens.
         */
        receivingMessages: Map<any, any>;
        /**
         * Supported candidate types. Below types are for both sending and receiving candidates.
         * It means if when client receives candidate from STUN server, it sends to the server if candidate's protocol
         * is in the list. Likely, when client receives remote candidate from server, it adds as ice candidate
         * if candidate protocol is in the list below.
         */
        candidateTypes: string[];
        /**
         * Method to call when there is an event happened
         */
        callback: any;
        /**
         * Method to call when there is an error happened
         */
        callbackError: any;
        /**
         * Flag to indicate if the stream is published or not after the connection fails
         */
        reconnectIfRequiredFlag: boolean;
        /**
         * websocket url to connect
         * @deprecated use websocketURL
         */
        websocket_url: any;
        /**
         * Websocket URL
         */
        websocketURL: any;
        /**
         * flag to initialize components in constructor
         */
        initializeComponents: boolean;
        /**
         * The html video tag for receiver is got here
         */
        remoteVideo: any;
        /**
         * Keeps the sound meters for each connection. Its index is stream id
         */
        soundMeters: any[];
        /**
         * Keeps the current audio level for each playing streams in conference mode
         */
        soundLevelList: any[];
        /**
         * This is the event listeners that WebRTC Adaptor calls when there is a new event happened
         */
        eventListeners: any[];
        /**
         * This is the error event listeners that WebRTC Adaptor calls when there is an error happened
         */
        errorEventListeners: any[];
        /**
         * This is token that is being used to publish the stream. It's added here to use in reconnect scenario
         */
        publishToken: string | null | undefined;
        /**
         * subscriber id that is being used to publish the stream. It's added here to use in reconnect scenario
         */
        publishSubscriberId: string | null | undefined;
        /**
         * subscriber code that is being used to publish the stream. It's added here to use in reconnect scenario
         */
        publishSubscriberCode: string | null | undefined;
        /**
         * This is the stream name that is being published. It's added here to use in reconnect scenario
         */
        publishStreamName: string | null | undefined;
        /**
         * This is the stream id of the main track that the current publishStreamId is going to be subtrack of it. It's added here to use in reconnect scenario
         */
        publishMainTrack: string | null | undefined;
        /**
         * This is the metadata that is being used to publish the stream. It's added here to use in reconnect scenario
         */
        publishMetaData: string | null | undefined;
        /**
         * This is the token to play the stream. It's added here to use in reconnect scenario
         */
        playToken: string | null | undefined;
        /**
         * This is the room id to play the stream. It's added here to use in reconnect scenario
         * This approach is old conferencing. It's better to use multi track conferencing
         */
        playRoomId: string | null | undefined;
        /**
         * These are enabled tracks to play the stream. It's added here to use in reconnect scenario
         */
        playEnableTracks: MediaStreamTrack[] | null | undefined;
        /**
         * This is the subscriber Id to play the stream. It's added here to use in reconnect scenario
         */
        playSubscriberId: string | null | undefined;
        /**
         * This is the subscriber code to play the stream. It's added here to use in reconnect scenario
         */
        playSubscriberCode: string | null | undefined;
        /**
         * This is the meta data to play the stream. It's added here to use in reconnect scenario
         */
        playMetaData: string | null | undefined;
        /**
         * This is the time info for the last reconnection attempt
         */
        lastReconnectiontionTrialTime: number;
        /**
         * All media management works for teh local stream are made by @MediaManager class.
         * for details please check @MediaManager
         */
        mediaManager: MediaManager;
        /**
         * Init plugins
         */
        initPlugins(): void;
        /**
         * Add event listener to be notified. This is generally for plugins
         * @param {*} listener
         */
        addEventListener(listener: any): void;
        /**
         * Add error event listener to be notified. Thisis generally for plugins
         * @param {*} errorListener
         */
        addErrorEventListener(errorListener: any): void;
        /**
         * Notify event listeners and callback method
         * @param {*} info
         * @param {*} obj
         */
        notifyEventListeners(info: any, obj: any): void;
        /**
         * Notify error event listeners and callbackError method
         * @param {*} error
         * @param {*} message
         */
        notifyErrorEventListeners(error: any, message: any): void;
        /**
         * Called by constuctor to
         *    -check local stream unless it is in play mode
         *    -start websocket connection
         */
        initialize(): Promise<any>;
        /**
         * Called to start a new WebRTC stream. AMS responds with start message.
         * Parameters:
         *  @param {string} streamId : unique id for the stream
         *  @param {string=} [token] : required if any stream security (token control) enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Stream-Security-Documentation
         *  @param {string=} [subscriberId] : required if TOTP enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Time-based-One-Time-Password-(TOTP)
         *  @param {string=} [subscriberCode] : required if TOTP enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Time-based-One-Time-Password-(TOTP)
         *  @param {string=} [streamName] : required if you want to set a name for the stream
         *  @param {string=} [mainTrack] :  required if you want to start the stream as a subtrack for a main stream which has id of this parameter.
         *                Check:https://antmedia.io/antmediaserver-webrtc-multitrack-playing-feature/
         *                !!! for multitrack conference set this value with roomName
         *  @param {string=} [metaData] : a free text information for the stream to AMS. It is provided to Rest methods by the AMS
         */
        publish(streamId: string, token?: string | undefined, subscriberId?: string | undefined, subscriberCode?: string | undefined, streamName?: string | undefined, mainTrack?: string | undefined, metaData?: string | undefined): void;
        sendPublishCommand(streamId: any, token: any, subscriberId: any, subscriberCode: any, streamName: any, mainTrack: any, metaData: any, videoEnabled: any, audioEnabled: any): void;
        /**
         * Called to join a room. AMS responds with joinedTheRoom message.
         * Parameters:
         * @param {string} roomName : unique id of the room
         * @param {string=} streamId : unique id of the stream belongs to this participant
         * @param {string=} mode :    legacy for older implementation (default value)
         *            mcu for merging streams
         *            amcu: audio only conferences with mixed audio
         */
        joinRoom(roomName: string, streamId?: string | undefined, mode?: string | undefined): void;
        /**
         * Called to start a playing session for a stream. AMS responds with start message.
         * Parameters:
         *  @param {string} streamId :(string) unique id for the stream that you want to play
         *  @param {string=} token :(string) required if any stream security (token control) enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Stream-Security-Documentation
         *  @param {string=} roomId :(string) required if this stream is belonging to a room participant
         *  @param {Array.<MediaStreamTrack>=} enableTracks :(array) required if the stream is a main stream of multitrack playing. You can pass the the subtrack id list that you want to play.
         *                    you can also provide a track id that you don't want to play by adding ! before the id.
         *  @param {string=} subscriberId :(string) required if TOTP enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Time-based-One-Time-Password-(TOTP)
         *  @param {string=} subscriberCode :(string) required if TOTP enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Time-based-One-Time-Password-(TOTP)
         *  @param {string=} metaData :(string, json) a free text information for the stream to AMS. It is provided to Rest methods by the AMS
         */
        play(streamId: string, token?: string | undefined, roomId?: string | undefined, enableTracks?: Array<MediaStreamTrack> | undefined, subscriberId?: string | undefined, subscriberCode?: string | undefined, metaData?: string | undefined): void;
        /**
         * Reconnects to the stream if it is not stopped on purpose
         * @param {number} [delayMs]
         * @returns
         */
        reconnectIfRequired(delayMs?: number | undefined): void;
        tryAgain(): void;
        /**
         * Called to stop a publishing/playing session for a stream. AMS responds with publishFinished or playFinished message.
         * Parameters:
         *  @param {string} streamId : unique id for the stream that you want to stop publishing or playing
         */
        stop(streamId: string): void;
        /**
         * Called to join a peer-to-peer mode session as peer. AMS responds with joined message.
         * Parameters:
         * @param {string} streamId : unique id for the peer-to-peer session
         */
        join(streamId: string): void;
        /**
         * Called by browser when a new track is added to WebRTC connetion. This is used to infor html pages with newStreamAvailable callback.
         * Parameters:
         * 	 event: TODO
         * 	 streamId: unique id for the stream
         */
        onTrack(event: any, streamId: any): void;
        /**
         * Called to leave from a conference room. AMS responds with leavedTheRoom message.
         * Parameters:
         * @param {string} roomName : unique id for the conference room
         */
        leaveFromRoom(roomName: string): void;
        /**
         * Called to leave from a peer-to-peer mode session. AMS responds with leaved message.
         * Parameters:
         * @param {string} streamId : unique id for the peer-to-peer session
         */
        leave(streamId: string): void;
        /**
         * Called to get a stream information for a specific stream. AMS responds with streamInformation message.
         * Parameters:
         * @param {string} streamId : unique id for the stream that you want to get info about
         */
        getStreamInfo(streamId: string): void;
        /**
         * Called to get the list of video track assignments. AMS responds with the videoTrackAssignmentList message.
         * Parameters:
         * @param {string} streamId : unique id for the stream that you want to get info about
         */
        requestVideoTrackAssignments(streamId: string): void;
        /**
         * Called to get the broadcast object for a specific stream. AMS responds with the broadcastObject callback.
         * Parameters:
         * @param {string} streamId : unique id for the stream that you want to get info about
         */
        getBroadcastObject(streamId: string): void;
        /**
         * Called to update the meta information for a specific stream.
         * Parameters:
         * @param {string} streamId : unique id for the stream that you want to update MetaData
         * @param {string}  metaData : new free text information for the stream
         */
        updateStreamMetaData(streamId: string, metaData: string): void;
        /**
         * Called to get the room information for a specific room. AMS responds with roomInformation message
         * which includes the ids and names of the streams in that room.
         * If there is no active streams in the room, AMS returns error `no_active_streams_in_room` in error callback
         * Parameters:
         * @param {string} roomName : unique id for the room that you want to get info about
         * @param {string} streamId : unique id for the stream that is streamed by this @WebRTCAdaptor
         */
        getRoomInfo(roomName: string, streamId: string): void;
        /**
         * Called to enable/disable data flow from the AMS for a specific track under a main track.
         * Parameters:
         * @param {string}  mainTrackId : unique id for the main stream
         * @param {string}  trackId : unique id for the track that you want to enable/disable data flow for
         * @param {boolean} enabled : true or false
         */
        enableTrack(mainTrackId: string, trackId: string, enabled: boolean): void;
        /**
         * Called to get the track ids under a main stream. AMS responds with trackList message.
         * Parameters:
         * @param {string} streamId : unique id for the main stream
         * @param {string=} [token] : not used
         * TODO: check this function
         */
        getTracks(streamId: string, token?: string | undefined): void;
        /**
         * Called by WebSocketAdaptor when a new ice candidate is received from AMS.
         * Parameters:
         *     event: TODO
         *     streamId: unique id for the stream
         */
        iceCandidateReceived(event: any, streamId: any): void;
        /**
         * Called internally to sanitize the text if it contains script to prevent xss
         * @param text
         * @returns {*}
         */
        sanitizeHTML(text: any): any;
        /**
         * Called internally to initiate Data Channel.
         * Note that Data Channel should be enabled fromAMS settings.
         *  @param {string}  streamId : unique id for the stream
         *  @param {*} dataChannel : provided by PeerConnection
         */
        initDataChannel(streamId: string, dataChannel: any): void;
        /**
         * Called internally to initiate PeerConnection.
         * @param {string} streamId : unique id for the stream
         * @param {string}  dataChannelMode : can be "publish" , "play" or "peer" based on this it is decided which way data channel is created
         */
        initPeerConnection(streamId: string, dataChannelMode: string): void;
        /**
         * Called internally to close PeerConnection.
         * @param {string} streamId : unique id for the stream
         */
        closePeerConnection(streamId: string): void;
        /**
         * Called to get the signalling state for a stream.
         * This information can be used for error handling.
         * Check: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState
         * @param {string} streamId : unique id for the stream
         */
        signallingState(streamId: string): any;
        /**
         * Called to get the ice connection state for a stream.
         * This information can be used for error handling.
         * Check: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
         * @param {string} streamId : unique id for the stream
         */
        iceConnectionState(streamId: string): any;
        /**
         * Called by browser when Local Configuration (SDP) is created successfully.
         * It is set as LocalDescription first then sent to AMS.
         * @param {object} configuration : created Local Configuration (SDP)
         * @param {string} streamId : unique id for the stream
         */
        gotDescription(configuration: object, streamId: string): void;
        /**
         * Called by WebSocketAdaptor when Remote Configuration (SDP) is received from AMS.
         * It is set as RemoteDescription first then if @iceCandidateList has candidate that
         * is received bfore this message, it is added as ice candidate.
         * @param {object} configuration : received Remote Configuration (SDP)
         * @param {string} idOfStream : unique id for the stream
         * @param {string} typeOfConfiguration
         * @param {string} idMapping : stream id and track id (which is provided in SDP) mapping in MultiTrack Playback and conference.
         *                It is recorded to match stream id as new tracks are added with @onTrack
         */
        takeConfiguration(idOfStream: string, configuration: object, typeOfConfiguration: string, idMapping: string): void;
        /**
         * Called by WebSocketAdaptor when new ice candidate is received from AMS.
         * If Remote Description (SDP) is already set, the candidate is added immediately,
         * otherwise stored in @iceCandidateList to add after Remote Description (SDP) set.
         * @param {string} idOfTheStream : unique id for the stream
         * @param {number|null} tmpLabel : sdpMLineIndex
         * @param {string} tmpCandidate : ice candidate
         */
        takeCandidate(idOfTheStream: string, tmpLabel: number | null, tmpCandidate: string): void;
        /**
         * Called internally to add the Ice Candidate to PeerConnection
         *  @param {string} streamId : unique id for the stream
         *  @param {object} candidate : ice candidate
         */
        addIceCandidate(streamId: string, candidate: object): void;
        /**
         * Called by WebSocketAdaptor when start message is received //TODO: may be changed. this logic shouldn't be in WebSocketAdaptor
         * @param {string} idOfStream : unique id for the stream
         */
        startPublishing(idOfStream: string): void;
        /**
         * Toggle video track on the server side.
         *
         * @param {string}  streamId : is the id of the stream
         * @param {string}  trackId : is the id of the track. streamId is also one of the trackId of the stream. If you are having just a single track on your
         *         stream, you need to give streamId as trackId parameter as well.
         * @param {boolean}  enabled : is the enable/disable video track. If it's true, server sends video track. If it's false, server does not send video
         */
        toggleVideo(streamId: string, trackId: string, enabled: boolean): void;
        /**
         * Toggle audio track on the server side.
         *
         * @param {string} streamId : is the id of the stream
         * @param {string}  trackId : is the id of the track. streamId is also one of the trackId of the stream. If you are having just a single track on your
         *            stream, you need to give streamId as trackId parameter as well.
         * @param {boolean}  enabled : is the enable/disable video track. If it's true, server sends audio track. If it's false, server does not send audio
         *
         */
        toggleAudio(streamId: string, trackId: string, enabled: boolean): void;
        /**
         * Called to get statistics for a PeerConnection. It can be publisher or player.
         *
         * @param {string} streamId : unique id for the stream
         */
        getStats(streamId: string): Promise<any>;
        /**
         * Called to start a periodic timer to get statistics periodically (5 seconds) for a specific stream.
         *
         * @param {string} streamId : unique id for the stream
         */
        enableStats(streamId: string): void;
        /**
         * Called to stop the periodic timer which is set by @enableStats
         *
         * @param {string} streamId : unique id for the stream
         */
        disableStats(streamId: string): void;
        /**
         * Called to check and start Web Socket connection if it is not started
         */
        checkWebSocketConnection(): void;
        /**
         * Called to stop Web Socket connection
         * After calling this function, create new WebRTCAdaptor instance, don't use the the same object
         * Because all streams are closed on server side as well when websocket connection is closed.
         */
        closeWebSocket(): void;
        /**
         * @param {string} streamId Called to send a text message to other peer in the peer-to-peer sessionnnection is closed.
         * @param {*} definition
         * @param {*} data
         */
        peerMessage(streamId: string, definition: any, data: any): void;
        /**
         * Called to force AMS to send the video with the specified resolution in case of Adaptive Streaming (ABR) enabled.
         * Normally the resolution is automatically determined by AMS according to the network condition.
         * @param {string}  streamId : unique id for the stream
         * @param {*}  resolution : default is auto. You can specify any height value from the ABR list.
         */
        forceStreamQuality(streamId: string, resolution: any): void;
        /**
         * Called to send data via DataChannel. DataChannel should be enabled on AMS settings.
         * @param {string} streamId : unique id for the stream
         * @param {*}  data : data that you want to send. It may be a text (may in Json format or not) or binary
         */
        sendData(streamId: string, data: any): void;
        /**
         * Called by user
         * to add SoundMeter to a stream (remote stream)
         * to measure audio level. This sound Meters are added to a map with the key of StreamId.
         * When user called @getSoundLevelList, the instant levels are provided.
         *
         * This list can be used to add a sign to talking participant
         * in conference room. And also to determine the dominant audio to focus that player.
         * @param {MediaStream} stream
         * @param {string} streamId
         */
        enableAudioLevel(stream: MediaStream, streamId: string): void;
        /**
         * Called by the user
         * to get the audio levels for the streams for the provided StreamIds
         *
         * @param {*} streamsList
         */
        getSoundLevelList(streamsList: any): void;
        /**
         * Called media manaher to get video/audio sender for the local peer connection
         *
         * @param {string} streamId :
         * @param {string} type : "video" or "audio"
         * @returns
         */
        getSender(streamId: string, type: string): any;
        /**
         * Called by user
         *
         * @param {string} videoTrackId : track id associated with pinned video
         * @param {string} streamId : streamId of the pinned video
         * @param {boolean} enabled : true | false
         * @returns
         */
        assignVideoTrack(videoTrackId: string, streamId: string, enabled: boolean): void;
        /**
         * Called by user
         * video tracks may be less than the participants count
         * so these parameters are used for assigning video tracks to participants.
         * This message is used to make pagination in conference.
         * @param {string} streamId
         * @param {number} offset : start index for participant list to play
         * @param {number} size : number of the participants to play
         * @returns
         */
        updateVideoTrackAssignments(streamId: string, offset: number, size: number): void;
        /**
         * Called by user
         * This message is used to set max video track count in a conference.
         * @param {string} streamId
         * @param {number} maxTrackCount : maximum video track count
         * @returns
         */
        setMaxVideoTrackCount(streamId: string, maxTrackCount: number): void;
        /**
         * Called by user
         * This message is used to send audio level in a conference.
         *
         * IMPORTANT: AMS v2.7+ can get the audio level from the RTP header and sends audio level to the viewers the same way here.
         *  Just one difference, AMS sends the audio level in the range of 0 and 127. 0 is max, 127 is ms

         *  It means that likely you don't need to send UPDATE_AUDIO_LEVEL anymore
         *
         * @param {string} streamId
         * @param {*} value : audio level
         * @returns
         */
        updateAudioLevel(streamId: string, value: any): void;
        /**
         * Called by user
         * This message is used to get debug data from server for debugging purposes in conference.
         * @param {string} streamId
         * @returns
         */
        getDebugInfo(streamId: string): void;
        /**
         * The following messages are forwarded to MediaManager. They are also kept here because of backward compatibility.
         * You can find the details about them in media_manager.js
         * @param {string} streamId
         */
        turnOffLocalCamera(streamId: string): void;
        /**
         *
         * @param {string} streamId
         * @returns
         */
        turnOnLocalCamera(streamId: string): Promise<any>;
        muteLocalMic(): void;
        unmuteLocalMic(): void;
        /**
         *
         * @param {string} streamId
         * @returns
         */
        switchDesktopCapture(streamId: string): Promise<any>;
        /**
         * Switch to Video camera capture again. Updates the video track on the fly as well.
         * @param {string} streamId
         * @param {string} deviceId
         * @returns {Promise}
         */
        switchVideoCameraCapture(streamId: string, deviceId: string): Promise<any>;
        /**
         * Update video track of the stream. Updates the video track on the fly as well.
         * @param {string} stream
         * @param {string} streamId
         * @param {function} onEndedCallback
         * @param {boolean} stopDesktop
         * @returns {Promise}
         */
        updateVideoTrack(stream: string, streamId: string, onEndedCallback: Function, stopDesktop: boolean): Promise<any>;
        /**
         * Update audio track of the stream. Updates the audio track on the fly as well. It just replaces the audio track with the first one in the stream
         * @param {*} stream
         * @param {*} streamId
         * @param {*} onEndedCallback
         * @returns
         */
        updateAudioTrack(stream: any, streamId: any, onEndedCallback: any): any;
        /**
         * Called by User
         * to switch between front and back camera on mobile devices
         *
         * @param {string} streamId Id of the stream to be changed.
         * @param {string} facingMode it can be ""user" or "environment"
         *
         * This method is used to switch front and back camera.
         */
        switchVideoCameraFacingMode(streamId: string, facingMode: string): Promise<any>;
        /**
         *
         * @param {string} streamId
         * @returns
         */
        switchDesktopCaptureWithCamera(streamId: string): Promise<any>;
        /**
         *
         * @param {string} streamId
         * @param {string} deviceId
         * @returns
         */
        switchAudioInputSource(streamId: string, deviceId: string): Promise<any>;
        /**
         *
         * @param {number} volumeLevel
         */
        setVolumeLevel(volumeLevel: number): void;
        /**
         *
         * Using sound meter in order to get audio level may cause audio distortion in Windows browsers
         * @param {Function} levelCallback
         * @param {number} period
         * @returns
         */
        enableAudioLevelForLocalStream(levelCallback: Function, period: number): Promise<void>;
        disableAudioLevelForLocalStream(): void;
        /**
         *
         * @param {object} constraints
         * @returns
         */
        applyConstraints(constraints: object): any;
        /**
         *
         * @param {number} bandwidth
         * @param {string} streamId
         */
        changeBandwidth(bandwidth: number, streamId: string): void;
        enableAudioLevelWhenMuted(): void;
        disableAudioLevelWhenMuted(): void;
        /**
         *
         * @param {string} streamId
         * @returns
         */
        getVideoSender(streamId: string): any;
        /**
         *
         * @param {object} mediaConstraints : media constraints to be used for opening the stream
         * @param {string} streamId : id of the stream to replace tracks with
         * @returns
         */
        openStream(mediaConstraints: object, streamId: string): Promise<void>;
        closeStream(): void;
    }

    declare class WebSocketAdaptor {
        /**
         *
         * @param {object} initialValues
         */
        constructor(initialValues: object);
        /**
         * @type {boolean}
         */
        debug: boolean;
        /**
         * Initializes the WebSocket connection.
         * @param {Function} callbackConnected - Optional callback function to be called when the connection is established.
         * @returns {void}
         */
        initWebSocketConnection(callbackConnected: Function): void;
        connecting: boolean | undefined;
        connected: boolean | undefined;
        pingTimerId: number | NodeJS.Timer | undefined;
        websocket_url: any;
        wsConn: WebSocket | undefined;
        multiPeerStreamId: any;
        clearPingTimer(): void;
        sendPing(): void;
        close(): void;
        /**
         *
         * @param {*} text
         * @returns
         */
        send(text: any): void;
        isConnected(): boolean | undefined;
        isConnecting(): boolean | undefined;
    }

    export { }
