/**
 * Information about the face being tracked. FaceData object is constructed and passed in the {@link DeepARCallbacks.onFaceTracked} callback.
 */
export interface FaceData {
    /**
     * True if the face is detected, false otherwise.
     */
    detected: boolean;
    /**
     * Array of 3 floats containing (x, y, z) position (translation) of the face in 3D space.
     */
    translation: number[];
    /**
     * Array of 3 floats containing (x, y, z) rotation of the face in 3D space.
     */
    rotation: number[];
    /**
     * Array of 16 floats containing 4x4 matrix representing translation and rotation of the face in 3D space.
     */
    poseMatrix: number[];
    /**
     * Array of 63*3 floats containing (x, y, z) positions of the 3D face landmarks. Read more <a href="https://help.deepar.ai/en/articles/4351347-deepar-reference-tracking-models">here</a>.
     */
    landmarks: number[];
    /**
     * Array of 63*2 floats containing (x, y) positions of the 2D face landmarks in screen space. Usually more precise than 3D points but no estimation for z translation. Read more here about feature points. Read more <a href="https://help.deepar.ai/en/articles/4351347-deepar-reference-tracking-models">here</a>.
     */
    landmarks2d: number[];
    /**
     * Array of 4 floats. Rectangle (x, y, width, height) containing the face in screen coordinates.
     */
    faceRect: number[];
}
/**
 * Functions that gets called by the DeepAR SDK.
 * Pass them when creating {@link DeepAR} object in {@link DeepARParams.callbacks} object.
 */
export interface DeepARCallbacks {
    /**
     * Gets called when the SDK is fully initialized. <br>
     * After this method is called you can safely call all methods of the {@link DeepAR} object. <br><br>
     * NOTE: Some methods of {@link DeepAR} object can be called before the SDK is initialized. Those are: <br>
     * - {@link DeepAR.downloadFaceTrackingModel} <br>
     * - {@link DeepAR.setFaceTrackingModel} <br>
     */
    onInitialize: () => void;
    /**
     * Called when the video is started after the call to {@link DeepAR.startVideo}.
     */
    onVideoStarted?: () => void;
    /**
     * Called when the animation player transitions to a new state.
     * @param newState Name of the new state that is being transitioned to.
     */
    onAnimationTransitionedToState?: (newState: string) => void;
    /**
     * Called when the screenshot is taken after the call to {@link DeepAR.takeScreenshot}.
     * @param photo The URL of the screenshot - result of HTMLCanvasElement.toDataURL("image/png")
     */
    onScreenshotTaken?: (photo: string) => void;
    /**
     * Called when the screenshot is taken after the call to {@link DeepAR.takeScreenshot}.
     * @param canvas Canvas containing the screenshot image. You can call canvas.toDataURL("image/png") to get the image or similar.
     */
    onScreenshotTakenCanvas?: (canvas: HTMLCanvasElement) => void;
    /**
     * Called when the camera permission is asked after the call to {@link DeepAR.startVideo}.
     */
    onCameraPermissionAsked?: () => void;
    /**
     * Called when the camera permission is denied after the call to {@link DeepAR.startVideo}.
     */
    onCameraPermissionDenied?: () => void;
    /**
     * Called when the camera permission is granted after the call to {@link DeepAR.startVideo}.
     */
    onCameraPermissionGranted?: () => void;
    /**
     * Called whenever the face enters or exits the camera field of view. <br>
     * NOTE: This callback is only called when the SDK does face tracking. For example, you laded some effect that uses face tracking (most of them do). But if no effect is loaded this callback will not get called because the SDK is not performing face tracking.
     * @param visible True if the face is visible on the camera, false otherwise.
     */
    onFaceVisibilityChanged?: (visible: boolean) => void;
    /**
     * Passes the information about the detected faces. If this callback is set it will get called every frame.
     * @param faceDataArray Information about all the tracked faces.
     */
    onFaceTracked?: (faceDataArray: FaceData[]) => void;
    /**
     * Called when any DeepAR related event happens
     * @param errorType Type of message.
     * @param message Message contents
     */
    onError?: (errorType: string, message: string) => void;
    /**
     * Called when the number of detected faces changes.
     * @param n Number of faces detected.
     */
    onNumberOfFacesVisibleChanged?: (n: number) => void;
    /**
     * Called after DeepAR successfully shuts down. Gets called after {@link DeepAR.shutdown}.
     */
    onShutdown?: () => void;
}
/**
 * Parameters for the initialization of {@link DeepAR} object.
 */
export interface DeepARParams {
    /**
     * License key created on <a href="https://developer.deepar.ai/">DeepAR developer portal</a> for your web app.
     */
    licenseKey: string;
    /**
     * Canvas element where DeepAR will render the camera and effects/filters.
     */
    canvas: HTMLCanvasElement;
    /**
     * Object containing configuration about the DeepAR segmentation which is used by background removal effects.
     */
    segmentationConfig?: {
        /**
         * Path to the segmentation model. Something like "path/to/segmentation-192x192.bin".
         */
        modelPath: string;
    };
    /**
     * Object containing configuration for DeepAR foot tracking which is used for virtual shoe try on
     */
    footTrackingConfig?: {
        /**
         * Path to the pose estimation wasm file, e.g. "/path/to/libPoseEstimation.wasm"
         */
        poseEstimationWasmPath: string;
        /**
         * Path to the detector model, e.g. "/path/to/foot-detector-ios.bin"
         */
        detectorPath: string;
        /**
         * Path to the tracker model, e.g. "/path/to/foot-tracker-ios.bin"
         */
        trackerPath: string;
        /**
         * Path to the foot model object file, e.g. "/path/to/foot-model.obj"
         */
        objPath: string;
    };
    /**
     * Path to deepar.wasm file. Something like "path/to/deepar.wasm".
     */
    deeparWasmPath: string;
    /**
     * Object containing callback functions that get called by the DeepAR SDK.
     */
    callbacks?: DeepARCallbacks;
}
/**
 * Describes the touch/click type.
 */
export declare enum ARTouchType {
    /**
     * Touch started.
     */
    Start = 0,
    /**
     * Touch is pressed and is being moved.
     */
    Move = 1,
    /**
     * Touch ended.
     */
    End = 2
}
/**
 * Information about the touch. Used by {@link DeepAR.touchOccurred}.
 */
export interface ARTouchInfo {
    /**
     * X coordinate.
     */
    x: number;
    /**
     * Y coordinate
     */
    y: number;
    /**
     * Touch type.
     */
    touchType: ARTouchType;
}
/**
 * @internal
 * Enum that defines possible types of logging messages.
 */
declare enum LogType {
    /**
     * Information logging message.
     */
    INFO = 1,
    /**
     * Warning logging message.
     */
    WARNING = 2,
    /**
     * Error logging message.
     */
    ERROR = 3
}
/**
 * Parameters that specify the format of recorded videos. Used by {@link DeepAR.startVideoRecording}.
 */
export interface VideoRecordingOptions {
    /**
     * A MIME type specyfing the format for the resulting video, such as `video/webm` or `video/mp4`.
     * Corresponds to the MIME type used by <a href="https://developer.mozilla.org/en-US/docs/Web/API/Blob">Blob</a>
     * objects and <a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder">MediaRecorder</a>
     * from the MediaStream Recording API.
     *
     * Note that `video/mp4` may not be supported in all browsers.
     */
    mimeType?: string;
}
/**
 * Main class for interacting with DeepAR SDK.
 */
export declare class DeepAR {
    private module;
    private functionsToCallOnInitialize;
    /**
     * Callbacks property is used to add/remove/change callbacks called by the DeepAR SDK. See list of all callbacks at {@link DeepARCallbacks}. <br><br>
     * Example : To add/change certain callback:
     * ```javascript
     * let deepAR = new DeepAR({...});
     * deepAR.callbacks.onScreenshotTaken = (url) => {
     *     // download or show the image from url
     * };
     * ```
     *
     * To remove certain callback:
     * ```javascript
     * deepAR.callbacks.onScreenshotTaken = undefined;
     * ```
     */
    callbacks: DeepARCallbacks;
    /**
     * Downloads the effect file and loads it into the SDK for preview. The method used to switch any effect in the scene.
     * @param face Specifies on which face the effect will be applied. The allowed values are 0, 1, 2 and 3.
     * @param slot Specifies a namespace for the effect in the scene. In each slot, there can be only one effect. If you load another effect in the same slot the previous one will be removed and replaced with a new effect.
     * @param path Path to the effect file exported from DeepAR studio.
     * @param callback Callback to be called when the switching is complete.
     */
    switchEffect(face: number, slot: string, path: string, callback?: () => void): void;
    /**
     * Clears the given slot of any loaded effects.
     * @param slot The effect slot name.
     */
    clearEffect(slot: string): void;
    /**
     * Starts the camera preview. <br><br>
     * Order of events may look something like this: <br>
     * - {@link DeepARCallbacks.onCameraPermissionAsked}
     * - {@link DeepARCallbacks.onCameraPermissionGranted} or {@link DeepARCallbacks.onCameraPermissionDenied}
     * - {@link DeepARCallbacks.onVideoStarted}
     * @param mirror Mirror the video horizontally.
     * @param mediaStreamConstraints Options passed to MediaDevices.getUserMedia().
     */
    startVideo(mirror: boolean, mediaStreamConstraints?: MediaStreamConstraints): void;
    /**
     * Stops the camera preview.
     */
    stopVideo(): void;
    /**
     * Used to pass the HTMLVideoElement to the DeepAR SDK. The SDK will grab frames from the video element and render the frames with masks/filters to the canvas. This method should be used instead of {@link DeepAR.startVideo} when you want to handle getUserMedia outside the SDK or you need to apply the masks to any video stream.
     * @param videoElement Video element.
     * @param mirror Mirror the video horizontally.
     */
    setVideoElement(videoElement: HTMLVideoElement, mirror: boolean): void;
    /**
     * Shuts down the DeepAR SDK. Make sure to call if you do not want DeepAR processing frames anymore.
     */
    shutdown(): void;
    /**
     * Downloads the face tracking model and initializes the face tracking. When it's done, the callback is invoked.
     * @param path Path to the face tracking model. Something like "path/to/models-68-extreme.bin".
     * @param callback Callback to be called when the download is complete.
     */
    downloadFaceTrackingModel(path: string, callback?: () => void): void;
    /**
     * Sets the face tracking model data.
     * @param byteArray Face tracking model data.
     */
    setFaceTrackingModel(byteArray: Uint8Array): void;
    /**
     * Display debugging stats on screen.
     * @param enabled
     */
    showStats(enabled: boolean): void;
    /**
     * Enable or disable global physics simulation.
     * @param enabled
     */
    simulatePhysics(enabled: boolean): void;
    /**
     * Display physics colliders preview on screen.
     * @param enabled
     */
    showColliders(enabled: boolean): void;
    /**
     * Process RGBA image. Used for processing single image. Can be used instead of {@link DeepAR.startVideo} or {@link DeepAR.setVideoElement}.
     * @param frame Image.
     * @param width Width of the image.
     * @param height Height of the image.
     * @param mirror Mirror frame horizontally.
     */
    processFrame(frame: Uint8Array, width: number, height: number, mirror: boolean): void;
    /**
     * If you want to apply DeepAR processing on a single image instead of a camera stream use this method. Can be used instead of {@link DeepAR.startVideo} or {@link DeepAR.setVideoElement}. See example usage <a href="https://github.com/DeepARSDK/photoedit-web-js">here</a>.
     * @param image
     */
    processImage(image: HTMLImageElement): void;
    /**
     * Resumes the previously paused processing and rendering of DeepAR SDK. You can pause SDK with {@link DeepAR.pause}.
     */
    resume(): void;
    /**
     * Pauses the DeepAR processing  and rendering on canvas. You can resume it with {@link DeepAR.resume}.
     */
    pause(): void;
    /**
     * Changes a node or component bool parameter of the currently loaded effect. For more details about changeParameter API read our docs <a href="https://docs.deepar.ai/guides-and-tutorials/changing-filter-parameters-from-code">here</a>.
     * @param gameObject The name of the node from DeepAR Studio. If multiple nodes share the same name, only the first one will be affected.
     * @param component The name of the component. If the name of the component is null or an empty string, the node itself will be affected.
     * @param parameter The name of the parameter.
     * @param value New parameter value.
     */
    changeParameterFloat(gameObject: string, component: string, parameter: string, value: number): void;
    /**
     * Changes a node or component float parameter of the currently loaded effect. For more details about changeParameter API read our docs <a href="https://docs.deepar.ai/guides-and-tutorials/changing-filter-parameters-from-code">here</a>.
     * @param gameObject The name of the node from DeepAR Studio. If multiple nodes share the same name, only the first one will be affected.
     * @param component The name of the component. If the name of the component is null or an empty string, the node itself will be affected.
     * @param parameter The name of the parameter.
     * @param value New parameter value.
     */
    changeParameterBool(gameObject: string, component: string, parameter: string, value: boolean): void;
    /**
     * Changes a node or component vector parameter of the currently loaded effect. For more details about changeParameter API read our docs <a href="https://docs.deepar.ai/guides-and-tutorials/changing-filter-parameters-from-code">here</a>.
     * @param gameObject The name of the node from DeepAR Studio. If multiple nodes share the same name, only the first one will be affected.
     * @param component The name of the component. If the name of the component is null or an empty string, the node itself will be affected.
     * @param parameter The name of the parameter.
     * @param x X component of the new parameter vector.
     * @param y Y component of the new parameter vector.
     * @param z Z component of the new parameter vector.
     * @param w W component of the new parameter vector.
     */
    changeParameterVector(gameObject: string, component: string, parameter: string, x: number, y: number, z: number, w: number): void;
    /**
     * Changes a node or component texture parameter of the currently loaded effect. For more details about changeParameter API read our docs <a href="https://docs.deepar.ai/guides-and-tutorials/changing-filter-parameters-from-code">here</a>.
     * @param gameObject The name of the node from DeepAR Studio. If multiple nodes share the same name, only the first one will be affected.
     * @param component The name of the component. If the name of the component is null or an empty string, the node itself will be affected.
     * @param parameter The name of the parameter.
     * @param textureUrl Url of the image that is going to be used as texture.
     */
    changeParameterTexture(gameObject: string, component: string, parameter: string, textureUrl: string): void;
    /**
     * Captures a screenshot of the current screen. Callback {@link DeepARCallbacks.onScreenshotTaken} will be called after it's done.
     */
    takeScreenshot(): void;
    /**
     * Set the FPS.
     * @param fps New FPS.
     */
    setFps(fps: number): void;
    /**
     * Moves the selected game object from its current position in a tree and sets it as a direct child of a target game object.
     * This is equivalent to moving around a node in the node hierarchy in the DeepAR Studio.
     * @param selectedGameObject Node to move.
     * @param targetGameObject New node parent.
     */
    moveGameObject(selectedGameObject: string, targetGameObject: string): void;
    /**
     * This method allows the user to fire a custom animation trigger for model animations from code. To fire a custom trigger,
     * the trigger string must match the custom trigger set in the Studio when creating the effect. Read more <a href="https://help.deepar.ai/en/articles/4354740-animations-tutorial-fbx-model-animations">here</a>.
     * @param trigger The name of the trigger.
     */
    fireTrigger(trigger: string): void;
    /**
     * Informs DeepAR that the specified touch event occurred.
     * @param touchInfo Touch event information.
     */
    touchOccurred(touchInfo: ARTouchInfo): void;
    /**
     * Starts video recording of the canvas.
     * @param options Video recording options.
     */
    startVideoRecording(options?: VideoRecordingOptions): void;
    /**
     * Stops the video recording and returns a video blob via callback.
     * @param callback A callback function with single argument that will be a blob of video/mp4 file.
     */
    finishVideoRecording(callback: (video: Blob) => void): void;
    /**
     * @internal
     * Pushes message to the console log buffer.
     * @param message Message to be pushed to the console log buffer.
     * @param logType Logging type.
     * @returns true if the message was successfully pushed, false otherwise
     */
    pushConsoleLog(message: string, logType: LogType): boolean;
    /**
     * @internal
     * Returns all the messages pushed to the console log buffer and empties
     * the buffer.
     * @returns All the messages from console log buffer.
     */
    getConsoleLogs(): any;
    /**
     * Change face detection sensitivity
     * @param sensitivity 0 .. 5 (0 is fast, 4,5 is slow but allows to find smaller faces)
     */
    setFaceDetectionSensitivity(sensitivity: number): void;
    /**
     * Enable/disable forced rendering on the canvas. It is useful to enable offscreen rendering in scenarios when the browser
     * does not call requestAnimationFrame() function. DeepAR internally uses requestAnimationFrame() for the rendering loop.
     * For example, when the browser tab is not focused, the browser will not call requestAnimationFrame() and DeepAR will not
     * render. If offscreen rendering is enabled, DeepAR will use its internal timer for the rendering loop. Note that offscreen
     * rendering enabled will not have as good results in terms of FPS compared to offscreen rendering disabled. <br><br>
     *
     * If you need to use offscreen rendering. The best practice is to enable it only when needed - like when the browser tab is not focused.
     * Otherwise, it is best to always disable offscreen rendering.
     * @param enable True - DeepAR will use its internal timer for the rendering loop. Rendering will work even when tab is not focused. False - DeepAR will use requestAnimationFrame() for the rendering loop.
     */
    setOffscreenRenderingEnabled(enable: boolean): void;
    /**
     * @internal
     * @param enable
     */
    enableAutoframing(enable: boolean): void;
    /**
     * Used to initialize the DeepAR SDK.<br><br>
     * <strong><u>IMPORTANT</u></strong>: Note that this is now called with the <b>new</b> keyword. In previous versions of SDK this was just a plain function called without new keyword
     * Also, you cannot create more than one {@link DeepAR} object instances. You need to call {@link DeepAR.shutdown} first if you want to create another {@link DeepAR} object. <br><br>
     * @param {DeepARParams} params An object containing the DeepAR initialization parameters. See example below.
     * @example
     * let deepAR = new DeepAR({
     *   licenseKey: 'your_license_key_here',
     *   canvas: document.getElementById('deepar-canvas'),
     *   deeparWasmPath: 'path/to/deepar.wasm',
     *   segmentationConfig: {
     *      modelPath: "path/to/segmentation-192x192.bin" // Not needed if you don't use background removal effects.
     *   },
     *   callbacks: {
     *      onInitialize: function() {
     *          deepAR.startVideo(true);
     *      }
     *  }
     * });
     * // download the face tracking model
     * deepAR.downloadFaceTrackingModel('models/models-68-extreme.bin');
     */
    constructor(params: DeepARParams);
}
export {};
