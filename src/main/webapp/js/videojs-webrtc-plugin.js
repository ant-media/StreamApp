/*! @name @antmedia/videojs-webrtc-plugin @version 1.1.0 @license MIT */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('video.js')) :
  typeof define === 'function' && define.amd ? define(['video.js'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.videojsWebrtcPlugin = factory(global.videojs));
}(this, (function (videojs) { 'use strict';

  function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

  var videojs__default = /*#__PURE__*/_interopDefaultLegacy(videojs);

  var ANT_CALLBACKS = {
    INITIALIZED: 'initialized',
    PLAY_STARTED: 'play_started',
    PLAY_FINISHED: 'play_finished',
    CLOSED: 'closed',
    STREAM_INFORMATION: 'streamInformation',
    RESOLUTION_CHANGE_INFO: 'resolutionChangeInfo',
    ICE_CONNECTION_STATE_CHANGED: 'ice_connection_state_changed',
    DATA_RECEIVED: 'data_received',
    DATACHANNEL_NOT_OPEN: 'data_channel_not_open',
    NEW_TRACK_AVAILABLE: 'newTrackAvailable'
  };

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, basedir, module) {
  	return module = {
  	  path: basedir,
  	  exports: {},
  	  require: function (path, base) {
        return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
      }
  	}, fn(module, module.exports), module.exports;
  }

  function commonjsRequire () {
  	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
  }

  var assertThisInitialized = createCommonjsModule(function (module) {
    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }

      return self;
    }

    module.exports = _assertThisInitialized;
    module.exports["default"] = module.exports, module.exports.__esModule = true;
  });

  var setPrototypeOf = createCommonjsModule(function (module) {
    function _setPrototypeOf(o, p) {
      module.exports = _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
      };

      module.exports["default"] = module.exports, module.exports.__esModule = true;
      return _setPrototypeOf(o, p);
    }

    module.exports = _setPrototypeOf;
    module.exports["default"] = module.exports, module.exports.__esModule = true;
  });

  var inheritsLoose = createCommonjsModule(function (module) {
    function _inheritsLoose(subClass, superClass) {
      subClass.prototype = Object.create(superClass.prototype);
      subClass.prototype.constructor = subClass;
      setPrototypeOf(subClass, superClass);
    }

    module.exports = _inheritsLoose;
    module.exports["default"] = module.exports, module.exports.__esModule = true;
  });

  var MenuItem = videojs__default['default'].getComponent('MenuItem');
  var Component = videojs__default['default'].getComponent('Component');

  var ResolutionMenuItem = /*#__PURE__*/function (_MenuItem) {
    inheritsLoose(ResolutionMenuItem, _MenuItem);

    function ResolutionMenuItem(player, options) {
      options.selectable = true;
      options.multiSelectable = false;
      return _MenuItem.call(this, player, options) || this;
    }

    var _proto = ResolutionMenuItem.prototype;

    _proto.handleClick = function handleClick() {
      this.options().plugin.changeStreamQuality(this.options().value);
    };

    return ResolutionMenuItem;
  }(MenuItem);

  Component.registerComponent('ResolutionMenuItem', ResolutionMenuItem);

  var MenuButton = videojs__default['default'].getComponent('MenuButton');

  var ResolutionMenuButton = /*#__PURE__*/function (_MenuButton) {
    inheritsLoose(ResolutionMenuButton, _MenuButton);

    function ResolutionMenuButton(player, options) {
      var _this;

      _this = _MenuButton.call(this, player, options) || this;
      MenuButton.apply(assertThisInitialized(_this), arguments);
      return _this;
    }

    var _proto = ResolutionMenuButton.prototype;

    _proto.createEl = function createEl() {
      return videojs__default['default'].dom.createEl('div', {
        className: 'vjs-http-source-selector vjs-menu-button vjs-menu-button-popup vjs-control vjs-button'
      });
    };

    _proto.buildCSSClass = function buildCSSClass() {
      return MenuButton.prototype.buildCSSClass.call(this) + ' vjs-icon-cog';
    };

    _proto.update = function update() {
      return MenuButton.prototype.update.call(this);
    };

    _proto.createItems = function createItems() {
      var menuItems = [];
      var levels = [{
        label: 'auto',
        value: 0
      }].concat(this.player().resolutions);

      for (var i = 0; i < levels.length; i++) {
        menuItems.push(new ResolutionMenuItem(this.player_, {
          label: levels[i].label,
          value: levels[i].value,
          selected: levels[i].value === this.player().selectedResolution,
          plugin: this.options().plugin,
          streamName: this.options().streamName
        }));
      }

      return menuItems;
    };

    return ResolutionMenuButton;
  }(MenuButton);

  var _extends_1 = createCommonjsModule(function (module) {
    function _extends() {
      module.exports = _extends = Object.assign || function (target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];

          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }

        return target;
      };

      module.exports["default"] = module.exports, module.exports.__esModule = true;
      return _extends.apply(this, arguments);
    }

    module.exports = _extends;
    module.exports["default"] = module.exports, module.exports.__esModule = true;
  });

  var createClass = createCommonjsModule(function (module) {
    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }

    module.exports = _createClass;
    module.exports["default"] = module.exports, module.exports.__esModule = true;
  });

  function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } it = o[Symbol.iterator](); return it.next.bind(it); }

  function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

  function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
  var webrtc_adaptor = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
      factory(exports) ;
    })(commonjsGlobal, function (exports) {

      function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }

        if (info.done) {
          resolve(value);
        } else {
          Promise.resolve(value).then(_next, _throw);
        }
      }

      function _asyncToGenerator(fn) {
        return function () {
          var self = this,
              args = arguments;
          return new Promise(function (resolve, reject) {
            var gen = fn.apply(self, args);

            function _next(value) {
              asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }

            function _throw(err) {
              asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }

            _next(undefined);
          });
        };
      }

      function _defineProperty(obj, key, value) {
        key = _toPropertyKey(key);

        if (key in obj) {
          Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        } else {
          obj[key] = value;
        }

        return obj;
      }

      function _toPrimitive(input, hint) {
        if (typeof input !== "object" || input === null) return input;
        var prim = input[Symbol.toPrimitive];

        if (prim !== undefined) {
          var res = prim.call(input, hint || "default");
          if (typeof res !== "object") return res;
          throw new TypeError("@@toPrimitive must return a primitive value.");
        }

        return (hint === "string" ? String : Number)(input);
      }

      function _toPropertyKey(arg) {
        var key = _toPrimitive(arg, "string");

        return typeof key === "symbol" ? key : String(key);
      }

      var PeerStats = /*#__PURE__*/function () {
        function PeerStats(streamId) {
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
          this.totalVideoPacketsSent = 0;
          this.totalAudioPacketsSent = 0;
          this.currentTimestamp = 0;
          this.lastTime = 0;
          this.timerId = 0;
          this.firstByteSentCount = 0;
          this.firstBytesReceivedCount = 0;
          this.audioLevel = -1;
          this.qualityLimitationReason = ""; //res width and res height are video source resolutions

          this.resWidth = 0;
          this.resHeight = 0;
          this.srcFps = 0; //frameWidth and frameHeight are the resolutions of the sent video

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
        } //kbits/sec


        createClass(PeerStats, [{
          key: "averageOutgoingBitrate",
          get: function get() {
            return Math.floor(8 * (this.totalBytesSentCount - this.firstByteSentCount) / (this.currentTimestamp - this.startTime));
          } //frames per second

        }, {
          key: "currentFPS",
          get: function get() {
            return ((this.totalFramesEncodedCount - this.lastFramesEncoded) / (this.currentTimestamp - this.lastTime) * 1000).toFixed(1);
          } //kbits/sec

        }, {
          key: "averageIncomingBitrate",
          get: function get() {
            return Math.floor(8 * (this.totalBytesReceivedCount - this.firstBytesReceivedCount) / (this.currentTimestamp - this.startTime));
          } //kbits/sec

        }, {
          key: "currentOutgoingBitrate",
          get: function get() {
            return Math.floor(8 * (this.totalBytesSentCount - this.lastBytesSent) / (this.currentTimestamp - this.lastTime));
          } //kbits/sec

        }, {
          key: "currentIncomingBitrate",
          get: function get() {
            return Math.floor(8 * (this.totalBytesReceivedCount - this.lastBytesReceived) / (this.currentTimestamp - this.lastTime));
          }
        }, {
          key: "currentTime",
          set: function set(timestamp) {
            this.lastTime = this.currentTimestamp;
            this.currentTimestamp = timestamp;

            if (this.startTime == 0) {
              this.startTime = timestamp - 1; // do not have zero division error
            }
          }
        }, {
          key: "totalBytesReceived",
          set: function set(bytesReceived) {
            this.lastBytesReceived = this.totalBytesReceivedCount;
            this.totalBytesReceivedCount = bytesReceived;

            if (this.firstBytesReceivedCount == 0) {
              this.firstBytesReceivedCount = bytesReceived;
            }
          }
        }, {
          key: "totalBytesSent",
          set: function set(bytesSent) {
            this.lastBytesSent = this.totalBytesSentCount;
            this.totalBytesSentCount = bytesSent;

            if (this.firstByteSentCount == 0) {
              this.firstByteSentCount = bytesSent;
            }
          }
        }, {
          key: "totalFramesEncoded",
          set: function set(framesEncoded) {
            this.lastFramesEncoded = this.totalFramesEncodedCount;
            this.totalFramesEncodedCount = framesEncoded;

            if (this.lastFramesEncoded == 0) {
              this.lastFramesEncoded = framesEncoded;
            }
          }
        }]);

        return PeerStats;
      }();

      var WebSocketAdaptor = /*#__PURE__*/function () {
        function WebSocketAdaptor(initialValues) {
          this.debug = false;

          for (var key in initialValues) {
            if (initialValues.hasOwnProperty(key)) {
              this[key] = initialValues[key];
            }
          }

          this.initWebSocketConnection();
        }

        var _proto = WebSocketAdaptor.prototype;

        _proto.initWebSocketConnection = function initWebSocketConnection(callbackConnected) {
          var _this2 = this;

          this.connecting = true;
          this.connected = false;
          this.pingTimerId = -1;
          /*
          * It's not mandatory if you don't use the new Load Balancer mechanism
          * It uses one of the nodes on Cluster mode
          * Example parameters: "origin" or "edge"
          */

          var url = new URL(this.websocket_url);

          if (!['origin', 'edge'].includes(url.searchParams.get('target'))) {
            url.searchParams.set('target', this.webrtcadaptor.isPlayMode ? 'edge' : 'origin');
            this.websocket_url = url.toString();
          }

          this.wsConn = new WebSocket(this.websocket_url);

          this.wsConn.onopen = function () {
            if (_this2.debug) {
              console.debug("websocket connected");
            }

            _this2.pingTimerId = setInterval(function () {
              _this2.sendPing();
            }, 3000);
            _this2.connected = true;
            _this2.connecting = false;

            _this2.callback("initialized");

            if (typeof callbackConnected != "undefined") {
              callbackConnected();
            }
          };

          this.wsConn.onmessage = function (event) {
            var obj = JSON.parse(event.data);

            if (obj.command == "start") {
              //this command is received first, when publishing so playmode is false
              if (_this2.debug) {
                console.debug("received start command");
              }

              _this2.webrtcadaptor.startPublishing(obj.streamId);
            } else if (obj.command == "takeCandidate") {
              if (_this2.debug) {
                console.debug("received ice candidate for stream id " + obj.streamId);
                console.debug(obj.candidate);
              }

              _this2.webrtcadaptor.takeCandidate(obj.streamId, obj.label, obj.candidate);
            } else if (obj.command == "takeConfiguration") {
              if (_this2.debug) {
                console.debug("received remote description type for stream id: " + obj.streamId + " type: " + obj.type);
              }

              _this2.webrtcadaptor.takeConfiguration(obj.streamId, obj.sdp, obj.type, obj.idMapping);
            } else if (obj.command == "stop") {
              if (_this2.debug) {
                console.debug("Stop command received");
              } //server sends stop command when the peers are connected to each other in peer-to-peer.
              //It is not being sent in publish,play modes  


              _this2.webrtcadaptor.closePeerConnection(obj.streamId);
            } else if (obj.command == "error") {
              _this2.callbackError(obj.definition, obj);
            } else if (obj.command == "notification") {
              _this2.callback(obj.definition, obj);
            } else if (obj.command == "streamInformation") {
              _this2.callback(obj.command, obj);
            } else if (obj.command == "roomInformation") {
              _this2.callback(obj.command, obj);
            } else if (obj.command == "pong") {
              _this2.callback(obj.command);
            } else if (obj.command == "trackList") {
              _this2.callback(obj.command, obj);
            } else if (obj.command == "connectWithNewId") {
              _this2.multiPeerStreamId = obj.streamId;

              _this2.join(obj.streamId);
            } else if (obj.command == "peerMessageCommand") {
              _this2.callback(obj.command, obj);
            }
          };

          this.wsConn.onerror = function (error) {
            _this2.connecting = false;
            _this2.connected = false;
            console.info(" error occured: " + JSON.stringify(error));

            _this2.clearPingTimer();

            _this2.callbackError("WebSocketNotConnected", error);
          };

          this.wsConn.onclose = function (event) {
            _this2.connecting = false;
            _this2.connected = false;

            if (_this2.debug) {
              console.debug("connection closed.");
            }

            _this2.clearPingTimer();

            _this2.callback("closed", event);
          };
        };

        _proto.clearPingTimer = function clearPingTimer() {
          if (this.pingTimerId != -1) {
            if (this.debug) {
              console.debug("Clearing ping message timer");
            }

            clearInterval(this.pingTimerId);
            this.pingTimerId = -1;
          }
        };

        _proto.sendPing = function sendPing() {
          var jsCmd = {
            command: "ping"
          };
          this.wsConn.send(JSON.stringify(jsCmd));
        };

        _proto.close = function close() {
          this.wsConn.close();
        };

        _proto.send = function send(text) {
          var _this3 = this;

          if (this.connecting == false && this.connected == false) {
            //try to reconnect
            this.initWebSocketConnection(function () {
              _this3.send(text);
            });
            return;
          }

          this.wsConn.send(text);

          if (this.debug) {
            console.debug("sent message:" + text);
          }
        };

        _proto.isConnected = function isConnected() {
          return this.connected;
        };

        _proto.isConnecting = function isConnecting() {
          return this.connecting;
        };

        return WebSocketAdaptor;
      }();

      var SoundMeter = /*#__PURE__*/function () {
        function SoundMeter(context) {
          this.context = context;
          this.instant = 0.0;
        }

        var _proto2 = SoundMeter.prototype;

        _proto2.connectToSource = function connectToSource(stream, levelCallback, errorCallback) {
          var _this = this;

          return _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
            return regeneratorRuntime.wrap(function _callee$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    _context.next = 2;
                    return _this.context.audioWorklet.addModule(new URL('./volume-meter-processor.js', typeof document === 'undefined' && typeof location === 'undefined' ? commonjsRequire().pathToFileURL(__filename).href : typeof document === 'undefined' ? location.href : document.currentScript && document.currentScript.src || new URL('webrtc_adaptor.js', document.baseURI).href)).catch(function (err) {
                      if (errorCallback !== undefined) {
                        errorCallback(err);
                      }

                      console.error(err);
                    });

                  case 2:
                    try {
                      _this.mic = _this.context.createMediaStreamSource(stream);
                      _this.volumeMeterNode = new AudioWorkletNode(_this.context, 'volume-meter');

                      _this.volumeMeterNode.port.onmessage = function (_ref) {
                        var data = _ref.data;
                        _this.instant = data;
                        levelCallback(data.toFixed(2));
                      };

                      _this.mic.connect(_this.volumeMeterNode).connect(_this.context.destination);
                    } catch (e) {
                      if (errorCallback !== undefined) {
                        errorCallback(null);
                      }

                      console.error(e);
                    }

                  case 3:
                  case "end":
                    return _context.stop();
                }
              }
            }, _callee);
          }))();
        };

        _proto2.stop = function stop() {
          this.mic.disconnect();
        };

        return SoundMeter;
      }();
      /**
       * Media management class is responsible to manage audio and video
       * sources and tracks management for the local stream.
       * Also audio and video properties (like bitrate) are managed by this class .
       */


      var MediaManager = /*#__PURE__*/function () {
        function MediaManager(initialValues) {
          /**
           * the maximum bandwith value that browser can send a stream
           * keep in mind that browser may send video less than this value
           */
          this.bandwidth = 1200; //kbps

          /**
           * This flags enables/disables debug logging
           */

          this.debug = false;
          /**
           * The cam_location below is effective when camera and screen is send at the same time.
           * possible values are top and bottom. It's on right all the time
           */

          this.camera_location = "top";
          /**
           * The cam_margin below is effective when camera and screen is send at the same time.
           * This is the margin value in px from the edges
           */

          this.camera_margin = 15;
          /**
           * this camera_percent is how large the camera view appear on the screen. It's %15 by default.
           */

          this.camera_percent = 15;
          /**
           * initial media constraints provided by the user
           */

          this.mediaConstraints = {
            video: true,
            audio: true
          };
          /**
           * this is the callback function to get video/audio sender from WebRTCAdaptor
           */

          this.getSender = initialValues.getSender;
          /**
           * This is the Stream Id for the publisher.
           */

          this.publishStreamId = null;
          /**
           * this is the object of the local stream to publish
           * it is initiated in initLocalStream method
           */

          this.localStream = null;
          /**
           * publish mode is determined by the user and set by @mediaConstraints.video
           * It may be camera, screen, screen+camera
           */

          this.publishMode = "camera"; //screen, screen+camera

          /**
           * Default callback. It's overriden below if it exists
           */

          this.callback = function (info, obj) {
            console.debug("Callback info: " + info + " object: " + typeof obj !== undefined ? JSON.stringify(obj) : "");
          };
          /**
           * Default callback error implementation. It's overriden below if it exists
           */


          this.callbackError = function (err) {
            console.error(err);
          };
          /**
           * The values of the above fields are provided as user parameters by the constructor.
           * TODO: Also some other hidden parameters may be passed here
           */


          for (var key in initialValues.userParameters) {
            if (initialValues.userParameters.hasOwnProperty(key)) {
              this[key] = initialValues.userParameters[key];
            }
          }
          /**
           * current volume value which is set by the user
           */


          this.currentVolume = null;
          /**
           * Keeps the audio track to be closed in case of audio track change
           */

          this.previousAudioTrack = null;
          /**
           * The screen video track in screen+camera mode
           */

          this.desktopStream = null;
          /**
           * The camera (overlay) video track in screen+camera mode
           */

          this.smallVideoTrack = null;
          /**
           * Audio context to use for meter, mix, gain
           */

          this.audioContext = new AudioContext();
          /**
           * the main audio in single audio case
           * the primary audio in mixed audio case
           *
           * its volume can be controled
           */

          this.primaryAudioTrackGainNode = null;
          /**
           * the secondary audio in mixed audio case
           *
           * its volume can be controled
           */

          this.secondaryAudioTrackGainNode = null;
          /**
           * this is the sound meter object for the local stream
           */

          this.localStreamSoundMeter = null;
          /**
           * this is the level callback for sound meter object
           */

          this.levelCallback = null;
          /**
           * Timer to create black frame to publish when video is muted
           */

          this.blackFrameTimer = null;
          /**
           * Timer to draw camera and desktop to canvas
           */

          this.desktopCameraCanvasDrawerTimer = null;
          /**
           * For audio check when the user is muted itself.
           * Check enableAudioLevelWhenMuted
           */

          this.mutedAudioStream = null;
          /**
           * This flag is the status of audio stream
           * Checking when the audio stream is updated
           */

          this.isMuted = false;
          /**
           * meter refresh period for "are you talking?" check
           */

          this.meterRefresh = null;
          /**
           * For keeping track of whether user turned off the camera
           */

          this.cameraEnabled = true;
          /**
           * html video element that presents local stream
           */

          this.localVideo = this.localVideoElement || document.getElementById(this.localVideoId); //A dummy stream created to replace the tracks when camera is turned off.

          this.dummyCanvas = document.createElement("canvas");
          /**
           * The timer id for SoundMeter for the local stream
           */

          this.soundLevelProviderId = -1; // It should be compatible with previous version

          if (this.mediaConstraints) {
            if (this.mediaConstraints.video == "camera") {
              this.publishMode = "camera";
            } else if (this.mediaConstraints.video == "screen") {
              this.publishMode = "screen";
            } else if (this.mediaConstraints.video == "screen+camera") {
              this.publishMode = "screen+camera";
            }
          } else {
            //just define default values
            this.mediaConstraints = {
              video: true,
              audio: true
            };
          } //Check browser support for screen share function


          this.checkBrowserScreenShareSupported();
        }
        /**
         * Called by the WebRTCAdaptor at the start if it isn't play mode
         */


        var _proto3 = MediaManager.prototype;

        _proto3.initLocalStream = function initLocalStream() {
          var _this4 = this;

          this.checkWebRTCPermissions();

          if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false) {
            return this.openStream(this.mediaConstraints, this.mode);
          } else if (typeof this.mediaConstraints.audio != "undefined" && this.mediaConstraints.audio != false) {
            // get only audio
            var media_audio_constraint = {
              audio: this.mediaConstraints.audio
            };
            return this.navigatorUserMedia(media_audio_constraint, function (stream) {
              return _this4.gotStream(stream);
            }, true);
          } else {
            //neither video nor audio is requested
            //just return null stream
            console.log("no media requested, just return an empty stream");
            return new Promise(function (resolve, reject) {
              resolve(null);
            });
          }
        }
        /*
        * Called to checks if Websocket and media usage are allowed
        */
        ;

        _proto3.checkWebRTCPermissions = function checkWebRTCPermissions() {
          if (!("WebSocket" in window)) {
            console.log("WebSocket not supported.");
            this.callbackError("WebSocketNotSupported");
            return;
          }

          if (typeof navigator.mediaDevices == "undefined") {
            console.log("Cannot open camera and mic because of unsecure context. Please Install SSL(https)");
            this.callbackError("UnsecureContext");
            return;
          }

          if (typeof navigator.mediaDevices == "undefined" || navigator.mediaDevices == undefined || navigator.mediaDevices == null) {
            this.callbackError("getUserMediaIsNotAllowed");
          }
        }
        /*
         * Called to get the available video and audio devices on the system
         */
        ;

        _proto3.getDevices = function getDevices() {
          var _this5 = this;

          return navigator.mediaDevices.enumerateDevices().then(function (devices) {
            var deviceArray = new Array();
            var checkAudio = false;
            var checkVideo = false;
            devices.forEach(function (device) {
              if (device.kind == "audioinput" || device.kind == "videoinput") {
                deviceArray.push(device);

                if (device.kind == "audioinput") {
                  checkAudio = true;
                }

                if (device.kind == "videoinput") {
                  checkVideo = true;
                }
              }
            });

            _this5.callback("available_devices", deviceArray); //TODO: is the following part necessary. why?


            if (checkAudio == false && _this5.localStream == null) {
              console.log("Audio input not found");
              console.log("Retrying to get user media without audio");

              if (_this5.inputDeviceNotFoundLimit < 2) {
                if (checkVideo != false) {
                  _this5.openStream({
                    video: true,
                    audio: false
                  }, _this5.mode);

                  _this5.inputDeviceNotFoundLimit++;
                } else {
                  console.log("Video input not found");
                  alert("There is no video or audio input");
                }
              } else {
                alert("No input device found, publish is not possible");
              }
            }

            return deviceArray;
          }).catch(function (err) {
            console.error("Cannot get devices -> error name: " + err.name + ": " + err.message);
            throw err;
          });
        }
        /*
         * Called to add a device change listener
         */
        ;

        _proto3.trackDeviceChange = function trackDeviceChange() {
          var _this6 = this;

          navigator.mediaDevices.ondevicechange = function () {
            _this6.getDevices();
          };
        }
        /**
         * This function create a canvas which combines screen video and camera video as an overlay
         *
         * @param {*} stream : screen share stream
         * @param {*} streamId
         * @param {*} onEndedCallback : callback when called on screen share stop
         */
        ;

        _proto3.setDesktopwithCameraSource = function setDesktopwithCameraSource(stream, streamId, onEndedCallback) {
          var _this7 = this;

          this.desktopStream = stream;
          return this.navigatorUserMedia({
            video: true,
            audio: false
          }, function (cameraStream) {
            _this7.smallVideoTrack = cameraStream.getVideoTracks()[0]; //create a canvas element

            var canvas = document.createElement("canvas");
            var canvasContext = canvas.getContext("2d"); //create video element for screen
            //var screenVideo = document.getElementById('sourceVideo');

            var screenVideo = document.createElement('video');
            screenVideo.srcObject = stream;
            screenVideo.play(); //create video element for camera

            var cameraVideo = document.createElement('video');
            cameraVideo.srcObject = cameraStream;
            cameraVideo.play();
            var canvasStream = canvas.captureStream(15);

            if (onEndedCallback != null) {
              stream.getVideoTracks()[0].onended = function (event) {
                onEndedCallback(event);
              };
            }

            var promise;

            if (_this7.localStream == null) {
              promise = _this7.gotStream(canvasStream);
            } else {
              promise = _this7.updateVideoTrack(canvasStream, streamId, onended, null);
            }

            promise.then(function () {
              //update the canvas
              _this7.desktopCameraCanvasDrawerTimer = setInterval(function () {
                //draw screen to canvas
                canvas.width = screenVideo.videoWidth;
                canvas.height = screenVideo.videoHeight;
                canvasContext.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
                var cameraWidth = screenVideo.videoWidth * (_this7.camera_percent / 100);
                var cameraHeight = cameraVideo.videoHeight / cameraVideo.videoWidth * cameraWidth;
                var positionX = canvas.width - cameraWidth - _this7.camera_margin;
                var positionY;

                if (_this7.camera_location == "top") {
                  positionY = _this7.camera_margin;
                } else {
                  //if not top, make it bottom
                  //draw camera on right bottom corner
                  positionY = canvas.height - cameraHeight - _this7.camera_margin;
                }

                canvasContext.drawImage(cameraVideo, positionX, positionY, cameraWidth, cameraHeight);
              }, 66);
            });
          }, true);
        }
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
        ;

        _proto3.prepareStreamTracks = function prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId) {
          var _this8 = this;

          //this trick, getting audio and video separately, make us add or remove tracks on the fly
          var audioTracks = stream.getAudioTracks();

          if (audioTracks.length > 0 && this.publishMode == "camera") {
            audioTracks[0].stop();
            stream.removeTrack(audioTracks[0]);
          } //now get only audio to add this stream


          if (audioConstraint != "undefined" && audioConstraint != false) {
            var media_audio_constraint = {
              audio: audioConstraint
            };
            return this.navigatorUserMedia(media_audio_constraint, function (audioStream) {
              //here audioStream has onr audio track only
              audioStream = _this8.setGainNodeStream(audioStream); // now audio stream has two audio strams.
              // 1. Gain Node : this will be added to local stream to publish
              // 2. Original audio track : keep its reference to stop later
              //add callback if desktop is sharing

              var onended = function onended(event) {
                _this8.callback("screen_share_stopped");

                _this8.setVideoCameraSource(streamId, mediaConstraints, null, true);
              };

              if (_this8.publishMode == "screen") {
                return _this8.updateVideoTrack(stream, streamId, onended, true).then(function () {
                  if (audioTracks.length > 0) {
                    //system audio share case, then mix it with device audio
                    audioStream = _this8.mixAudioStreams(stream, audioStream);
                  }

                  return _this8.updateAudioTrack(audioStream, streamId, null);
                });
              } else if (_this8.publishMode == "screen+camera") {
                if (audioTracks.length > 0) {
                  //system audio share case, then mix it with device audio
                  audioStream = _this8.mixAudioStreams(stream, audioStream);
                }

                return _this8.updateAudioTrack(audioStream, streamId, null).then(function () {
                  return _this8.setDesktopwithCameraSource(stream, streamId, onended);
                });
              } else {
                if (audioConstraint != false && audioConstraint != undefined) {
                  stream.addTrack(audioStream.getAudioTracks()[0]);
                }

                return _this8.gotStream(stream);
              }
            }, true);
          } else {
            return this.gotStream(stream);
          }
        }
        /**
         * Called to get user media (camera and/or mic)
         *
         * @param {*} mediaConstraints : media constaint
         * @param {*} func : callback on success. The stream which is got, is passed as parameter to this function
         * @param {*} catch_error : error is checked if catch_error is true
         */
        ;

        _proto3.navigatorUserMedia = function navigatorUserMedia(mediaConstraints, func, catch_error) {
          var _this9 = this;

          return navigator.mediaDevices.getUserMedia(mediaConstraints).then(function (stream) {
            if (typeof func != "undefined" || func != null) {
              func(stream);
            }

            return stream;
          }).catch(function (error) {
            if (catch_error == true) {
              if (error.name == "NotFoundError") {
                _this9.getDevices();
              } else {
                _this9.callbackError(error.name, error.message);
              }
            } else {
              console.warn(error);
            } //throw error if there is a promise


            throw error;
          });
        }
        /**
         * Called to get display media (screen share)
         *
         * @param {*} mediaConstraints : media constaint
         * @param {*} func : callback on success. The stream which is got, is passed as parameter to this function
         */
        ;

        _proto3.navigatorDisplayMedia = function navigatorDisplayMedia(mediaConstraints, func) {
          var _this10 = this;

          return navigator.mediaDevices.getDisplayMedia(mediaConstraints).then(function (stream) {
            if (typeof func != "undefined") {
              func(stream);
            }

            return stream;
          }).catch(function (error) {
            if (error.name === "NotAllowedError") {
              console.debug("Permission denied error");

              _this10.callbackError("ScreenSharePermissionDenied"); // If error catched then redirect Default Stream Camera


              if (_this10.localStream == null) {
                var mediaConstraints = {
                  video: true,
                  audio: true
                };

                _this10.openStream(mediaConstraints);
              } else {
                _this10.switchVideoCameraCapture(streamId);
              }
            }
          });
        }
        /**
         * Called to get the media (User Media or Display Media)
         * @param {*} mediaConstraints
         * @param {*} audioConstraint
         * @param {*} streamId
         */
        ;

        _proto3.getMedia = function getMedia(mediaConstraints, audioConstraint, streamId) {
          var _this11 = this;

          if (this.desktopCameraCanvasDrawerTimer != null) {
            clearInterval(this.desktopCameraCanvasDrawerTimer);
            this.desktopCameraCanvasDrawerTimer = null;
          } // Check Media Constraint video value screen or screen + camera


          if (this.publishMode == "screen+camera" || this.publishMode == "screen") {
            return this.navigatorDisplayMedia(mediaConstraints).then(function (stream) {
              if (_this11.smallVideoTrack) _this11.smallVideoTrack.stop();
              return _this11.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId);
            });
          } // If mediaConstraints only user camera
          else {
              return this.navigatorUserMedia(mediaConstraints).then(function (stream) {
                if (_this11.smallVideoTrack) _this11.smallVideoTrack.stop();
                return _this11.prepareStreamTracks(mediaConstraints, audioConstraint, stream, streamId);
              }).catch(function (error) {
                if (error.name == "NotFoundError") {
                  _this11.getDevices();
                } else {
                  _this11.callbackError(error.name, error.message);
                }
              });
            }
        }
        /**
         * Open media stream, it may be screen, camera or audio
         */
        ;

        _proto3.openStream = function openStream(mediaConstraints) {
          var _this12 = this;

          this.mediaConstraints = mediaConstraints;
          var audioConstraint = false;

          if (typeof mediaConstraints.audio != "undefined" && mediaConstraints.audio != false) {
            audioConstraint = mediaConstraints.audio;
          }

          if (typeof mediaConstraints.video != "undefined") {
            return this.getMedia(mediaConstraints, audioConstraint);
          } else {
            return new Promise(function (resolve, reject) {
              _this12.callbackError("media_constraint_video_not_defined");

              console.error("MediaConstraint video is not defined");
              reject("media_constraint_video_not_defined");
            });
          }
        }
        /**
         * Closes stream, if you want to stop peer connection, call stop(streamId)
         */
        ;

        _proto3.closeStream = function closeStream() {
          if (this.localStream) {
            this.localStream.getVideoTracks().forEach(function (track) {
              track.onended = null;
              track.stop();
            });
            this.localStream.getAudioTracks().forEach(function (track) {
              track.onended = null;
              track.stop();
            });
          }

          if (this.videoTrack) {
            this.videoTrack.stop();
          }

          if (this.audioTrack) {
            this.audioTrack.stop();
          }

          if (this.smallVideoTrack) {
            this.smallVideoTrack.stop();
          }

          if (this.previousAudioTrack) {
            this.previousAudioTrack.stop();
          }

          if (this.soundLevelProviderId != -1) {
            clearInterval(this.soundLevelProviderId);
            this.soundLevelProviderId = -1;
          }
        }
        /**
         * Checks browser supports screen share feature
         * if exist it calls callback with "browser_screen_share_supported"
         */
        ;

        _proto3.checkBrowserScreenShareSupported = function checkBrowserScreenShareSupported() {
          if (typeof navigator.mediaDevices != "undefined" && navigator.mediaDevices.getDisplayMedia || navigator.getDisplayMedia) {
            this.callback("browser_screen_share_supported");
          }
        }
        /**
         * Changes the secondary stream gain in mixed audio mode
         *
         * @param {*} enable
         */
        ;

        _proto3.enableSecondStreamInMixedAudio = function enableSecondStreamInMixedAudio(enable) {
          if (this.secondaryAudioTrackGainNode != null) {
            if (enable) {
              this.secondaryAudioTrackGainNode.gain.value = 1;
            } else {
              this.secondaryAudioTrackGainNode.gain.value = 0;
            }
          }
        }
        /**
         * Changes local stream when new stream is prepared
         *
         * @param {*} stream
         */
        ;

        _proto3.gotStream = function gotStream(stream) {
          this.localStream = stream;

          if (this.localVideo) {
            this.localVideo.srcObject = stream;
          }

          this.getDevices();
          this.trackDeviceChange();
          return new Promise(function (resolve, reject) {
            resolve();
          });
        }
        /**
         * Changes local video and sets localStream as source
         *
         * @param {*} videoEl
         */
        ;

        _proto3.changeLocalVideo = function changeLocalVideo(videoEl) {
          this.localVideo = videoEl;

          if (this.localStream) {
            this.localVideo.srcObject = this.localStream;
          }
        }
        /**
         * These methods are initialized when the user is muted himself in a publish scenario
         * It will keep track if the user is trying to speak without sending any data to server
         * Please don't forget to disable this function with disableAudioLevelWhenMuted if you use it.
         */
        ;

        _proto3.enableAudioLevelWhenMuted = function enableAudioLevelWhenMuted() {
          var _this13 = this;

          navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          }).then(function (stream) {
            _this13.mutedAudioStream = stream;
            var soundMeter = new SoundMeter(_this13.audioContext);
            soundMeter.connectToSource(_this13.mutedAudioStream, function (value) {
              if (value > 0.1) {
                _this13.callback("speaking_but_muted");
              }
            }, function (e) {
              if (e) {
                alert(e);
                return;
              }

              _this13.meterRefresh = setInterval(function () {
                if (soundMeter.instant.toFixed(2) > 0.1) {
                  _this13.callback("speaking_but_muted");
                }
              }, 200);
            });
          }).catch(function (err) {
            console.log("Can't get the soundlevel on mute");
          });
        };

        _proto3.disableAudioLevelWhenMuted = function disableAudioLevelWhenMuted() {
          if (this.meterRefresh != null) {
            clearInterval(this.meterRefresh);
          }

          if (this.mutedAudioStream != null) {
            this.mutedAudioStream.getTracks().forEach(function (track) {
              track.stop();
            });
          }
        }
        /**
         * This method mixed the first stream audio to the second stream audio and
         * @param {*} stream  : Primary stream that contain video and audio (system audio)
         * @param {*} secondStream :stream has device audio
         * @returns mixed stream.
         */
        ;

        _proto3.mixAudioStreams = function mixAudioStreams(stream, secondStream) {
          //console.debug("audio stream track count: " + audioStream.getAudioTracks().length);
          var composedStream = new MediaStream(); //added the video stream from the screen

          stream.getVideoTracks().forEach(function (videoTrack) {
            composedStream.addTrack(videoTrack);
          });
          this.audioContext = new AudioContext();
          var audioDestionation = this.audioContext.createMediaStreamDestination();

          if (stream.getAudioTracks().length > 0) {
            this.primaryAudioTrackGainNode = this.audioContext.createGain(); //Adjust the gain for screen sound

            this.primaryAudioTrackGainNode.gain.value = 1;
            var audioSource = this.audioContext.createMediaStreamSource(stream);
            audioSource.connect(this.primaryAudioTrackGainNode).connect(audioDestionation);
          } else {
            console.debug("Origin stream does not have audio track");
          }

          if (secondStream.getAudioTracks().length > 0) {
            this.secondaryAudioTrackGainNode = this.audioContext.createGain(); //Adjust the gain for second sound

            this.secondaryAudioTrackGainNode.gain.value = 1;
            var audioSource2 = this.audioContext.createMediaStreamSource(secondStream);
            audioSource2.connect(this.secondaryAudioTrackGainNode).connect(audioDestionation);
          } else {
            console.debug("Second stream does not have audio track");
          }

          audioDestionation.stream.getAudioTracks().forEach(function (track) {
            composedStream.addTrack(track);
            console.log("audio destination add track");
          });
          return composedStream;
        }
        /**
         * This method creates a Gain Node stream to make the audio track adjustable
         *
         * @param {*} stream
         * @returns
         */
        ;

        _proto3.setGainNodeStream = function setGainNodeStream(stream) {
          if (this.mediaConstraints.audio != false && typeof this.mediaConstraints.audio != "undefined") {
            // Get the videoTracks from the stream.
            var videoTracks = stream.getVideoTracks(); // Get the audioTracks from the stream.

            var audioTracks = stream.getAudioTracks();
            /**
             * Create a new audio context and build a stream source,
             * stream destination and a gain node. Pass the stream into
             * the mediaStreamSource so we can use it in the Web Audio API.
             */

            this.audioContext = new AudioContext();
            var mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
            var mediaStreamDestination = this.audioContext.createMediaStreamDestination();
            this.primaryAudioTrackGainNode = this.audioContext.createGain();
            /**
             * Connect the stream to the gainNode so that all audio
             * passes through the gain and can be controlled by it.
             * Then pass the stream from the gain to the mediaStreamDestination
             * which can pass it back to the RTC client.
             */

            mediaStreamSource.connect(this.primaryAudioTrackGainNode);
            this.primaryAudioTrackGainNode.connect(mediaStreamDestination);

            if (this.currentVolume == null) {
              this.primaryAudioTrackGainNode.gain.value = 1;
            } else {
              this.primaryAudioTrackGainNode.gain.value = this.currentVolume;
            }
            /**
             * The mediaStreamDestination.stream outputs a MediaStream object
             * containing a single AudioMediaStreamTrack. Add the video track
             * to the new stream to rejoin the video with the controlled audio.
             */


            var controlledStream = mediaStreamDestination.stream;

            for (var _iterator = _createForOfIteratorHelperLoose(videoTracks), _step; !(_step = _iterator()).done;) {
              var videoTrack = _step.value;
              controlledStream.addTrack(videoTrack);
            }

            for (var _iterator2 = _createForOfIteratorHelperLoose(audioTracks), _step2; !(_step2 = _iterator2()).done;) {
              var audioTrack = _step2.value;
              controlledStream.addTrack(audioTrack);
            }

            if (this.previousAudioTrack !== null) {
              this.previousAudioTrack.stop();
            }

            this.previousAudioTrack = controlledStream.getAudioTracks()[1];
            /**
             * Use the stream that went through the gainNode. This
             * is the same stream but with altered input volume levels.
             */

            return controlledStream;
          }

          return stream;
        }
        /**
         * Called by User
         * to switch the Screen Share mode
         *
         * @param {*} streamId
         */
        ;

        _proto3.switchDesktopCapture = function switchDesktopCapture(streamId) {
          this.publishMode = "screen";
          var audioConstraint = false;

          if (typeof this.mediaConstraints.audio != "undefined" && this.mediaConstraints.audio != false) {
            audioConstraint = this.mediaConstraints.audio;
          }

          if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false) {
            this.mediaConstraints.video = true;
          } //TODO: I don't think we need to get audio again. We just need to switch the video stream


          return this.getMedia(this.mediaConstraints, audioConstraint, streamId);
        }
        /**
         * Called by User
         * to switch the Screen Share with Camera mode
         *
         * @param {*} streamId
         */
        ;

        _proto3.switchDesktopCaptureWithCamera = function switchDesktopCaptureWithCamera(streamId) {
          if (typeof this.mediaConstraints.video != "undefined" && this.mediaConstraints.video != false) {
            this.mediaConstraints.video = true;
          }

          this.publishMode = "screen+camera";
          var audioConstraint = false;

          if (typeof this.mediaConstraints.audio != "undefined" && this.mediaConstraints.audio != false) {
            audioConstraint = this.mediaConstraints.audio;
          } //TODO: I don't think we need to get audio again. We just need to switch the video stream


          return this.getMedia(this.mediaConstraints, audioConstraint, streamId);
        }
        /**
         * This method updates the local stream. It removes existant audio track from the local stream
         * and add the audio track in `stream` parameter to the local stream
         */
        ;

        _proto3.updateLocalAudioStream = function updateLocalAudioStream(stream, onEndedCallback) {
          var newAudioTrack = stream.getAudioTracks()[0];

          if (this.localStream != null && this.localStream.getAudioTracks()[0] != null) {
            var audioTrack = this.localStream.getAudioTracks()[0];
            this.localStream.removeTrack(audioTrack);
            audioTrack.stop();
            this.localStream.addTrack(newAudioTrack);
          } else if (this.localStream != null) {
            this.localStream.addTrack(newAudioTrack);
          } else {
            this.localStream = stream;
          }

          if (this.localVideo != null) {
            //it can be null
            this.localVideo.srcObject = this.localStream;
          }

          if (onEndedCallback != null) {
            stream.getAudioTracks()[0].onended = function (event) {
              onEndedCallback(event);
            };
          }

          if (this.isMuted) {
            this.muteLocalMic();
          } else {
            this.unmuteLocalMic();
          }

          if (this.localStreamSoundMeter != null) {
            this.connectSoundMeterToLocalStream();
          }
        }
        /**
         * This method updates the local stream. It removes existant video track from the local stream
         * and add the video track in `stream` parameter to the local stream
         */
        ;

        _proto3.updateLocalVideoStream = function updateLocalVideoStream(stream, onEndedCallback, stopDesktop) {
          if (stopDesktop && this.desktopStream != null) {
            this.desktopStream.getVideoTracks()[0].stop();
          }

          var newVideoTrack = stream.getVideoTracks()[0];

          if (this.localStream != null && this.localStream.getVideoTracks()[0] != null) {
            var videoTrack = this.localStream.getVideoTracks()[0];
            this.localStream.removeTrack(videoTrack);
            videoTrack.stop();
            this.localStream.addTrack(newVideoTrack);
          } else if (this.localStream != null) {
            this.localStream.addTrack(newVideoTrack);
          } else {
            this.localStream = stream;
          }

          if (this.localVideo) {
            this.localVideo.srcObject = this.localStream;
          }

          if (onEndedCallback != null) {
            stream.getVideoTracks()[0].onended = function (event) {
              onEndedCallback(event);
            };
          }
        }
        /**
         * Called by User
         * to change video source
         *
         * @param {*} streamId
         * @param {*} deviceId
         */
        ;

        _proto3.switchAudioInputSource = function switchAudioInputSource(streamId, deviceId) {
          //stop the track because in some android devices need to close the current camera stream
          var audioTrack = this.localStream.getAudioTracks()[0];

          if (audioTrack) {
            audioTrack.stop();
          } else {
            console.warn("There is no audio track in local stream");
          }

          if (typeof deviceId != "undefined") {
            //Update the media constraints
            if (this.mediaConstraints.audio !== true) this.mediaConstraints.audio.deviceId = deviceId;else this.mediaConstraints.audio = {
              "deviceId": deviceId
            }; //to change only audio track set video false otherwise issue #3826 occurs on Android

            var tempMediaConstraints = {
              "video": false,
              "audio": {
                "deviceId": deviceId
              }
            };
            return this.setAudioInputSource(streamId, tempMediaConstraints, null, deviceId);
          } else {
            return new Promise(function (resolve, reject) {
              reject("There is no device id for audio input source");
            });
          }
        }
        /**
         * This method sets Audio Input Source and called when you change audio device
         * It calls updateAudioTrack function to update local audio stream.
         */
        ;

        _proto3.setAudioInputSource = function setAudioInputSource(streamId, mediaConstraints, onEndedCallback) {
          var _this14 = this;

          return this.navigatorUserMedia(mediaConstraints, function (stream) {
            stream = _this14.setGainNodeStream(stream);
            return _this14.updateAudioTrack(stream, streamId, mediaConstraints, onEndedCallback);
          }, true);
        }
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
        ;

        _proto3.switchVideoCameraCapture = function switchVideoCameraCapture(streamId, deviceId, onEndedCallback) {
          var _this15 = this;

          //stop the track because in some android devices need to close the current camera stream
          if (this.localStream && this.localStream.getVideoTracks().length > 0) {
            var videoTrack = this.localStream.getVideoTracks()[0];
            videoTrack.stop();
          } else {
            console.warn("There is no video track in local stream");
          }

          this.publishMode = "camera";
          return navigator.mediaDevices.enumerateDevices().then(function (devices) {
            for (var i = 0; i < devices.length; i++) {
              if (devices[i].kind == "videoinput") {
                //Adjust video source only if there is a matching device id with the given one.
                //It creates problems if we don't check that since video can be just true to select default cam and it is like that in many cases.
                if (devices[i].deviceId == deviceId) {
                  if (_this15.mediaConstraints.video !== true) _this15.mediaConstraints.video.deviceId = {
                    exact: deviceId
                  };else _this15.mediaConstraints.video = {
                    deviceId: {
                      exact: deviceId
                    }
                  };
                  break;
                }
              }
            } //If no matching device found don't adjust the media constraints let it be true instead of a device ID


            console.debug("Given deviceId = " + deviceId + " - Media constraints video property = " + _this15.mediaConstraints.video);
            return _this15.setVideoCameraSource(streamId, _this15.mediaConstraints, null, true, deviceId);
          });
        }
        /**
         * This method sets Video Input Source and called when you change video device
         * It calls updateVideoTrack function to update local video stream.
         */
        ;

        _proto3.setVideoCameraSource = function setVideoCameraSource(streamId, mediaConstraints, onEndedCallback, stopDesktop) {
          var _this16 = this;

          return this.navigatorUserMedia(mediaConstraints, function (stream) {
            if (stopDesktop && _this16.secondaryAudioTrackGainNode && stream.getAudioTracks().length > 0) {
              //This audio track update is necessary for such a case:
              //If you enable screen share with browser audio and then
              //return back to the camera, the audio should be only from mic.
              //If, we don't update audio with the following lines,
              //the mixed (mic+browser) audio would be streamed in the camera mode.
              _this16.secondaryAudioTrackGainNode = null;
              stream = _this16.setGainNodeStream(stream);

              _this16.updateAudioTrack(stream, streamId, mediaConstraints, onEndedCallback);
            }

            if (_this16.cameraEnabled) {
              return _this16.updateVideoTrack(stream, streamId, onEndedCallback, stopDesktop);
            } else {
              return _this16.turnOffLocalCamera();
            }
          }, true);
        }
        /**
         * Called by User
         * to switch between front and back camera on mobile devices
         *
         * @param {*} streamId Id of the stream to be changed.
         * @param {*} facingMode it can be "user" or "environment"
         *
         * This method is used to switch front and back camera.
         */
        ;

        _proto3.switchVideoCameraFacingMode = function switchVideoCameraFacingMode(streamId, facingMode) {
          //stop the track because in some android devices need to close the current camera stream
          if (this.localStream && this.localStream.getVideoTracks().length > 0) {
            var videoTrack = this.localStream.getVideoTracks()[0];
            videoTrack.stop();
          } else {
            console.warn("There is no video track in local stream");
          } // When device id set, facing mode is not working
          // so, remove device id


          if (this.mediaConstraints.video !== undefined && this.mediaConstraints.video.deviceId !== undefined) {
            delete this.mediaConstraints.video.deviceId;
          }

          var videoConstraint = {
            'facingMode': facingMode
          };
          this.mediaConstraints.video = _extends_1({}, this.mediaConstraints.video, videoConstraint);
          this.publishMode = "camera";
          console.debug("Media constraints video property = " + this.mediaConstraints.video);
          return this.setVideoCameraSource(streamId, {
            video: this.mediaConstraints.video
          }, null, true);
        }
        /**
         * Updates the audio track in the audio sender
         * getSender method is set on MediaManagercreation by WebRTCAdaptor
         *
         * @param {*} stream
         * @param {*} streamId
         * @param {*} onEndedCallback
         */
        ;

        _proto3.updateAudioTrack = function updateAudioTrack(stream, streamId, onEndedCallback) {
          var _this17 = this;

          var audioTrackSender = this.getSender(streamId, "audio");

          if (audioTrackSender) {
            return audioTrackSender.replaceTrack(stream.getAudioTracks()[0]).then(function (result) {
              _this17.updateLocalAudioStream(stream, onEndedCallback);
            }).catch(function (error) {
              console.log(error.name);
            });
          } else {
            this.updateLocalAudioStream(stream, onEndedCallback);
            return new Promise(function (resolve, reject) {
              resolve();
            });
          }
        }
        /**
         * Updates the video track in the video sender
         * getSender method is set on MediaManagercreation by WebRTCAdaptor
         *
         * @param {*} stream
         * @param {*} streamId
         * @param {*} onEndedCallback
         */
        ;

        _proto3.updateVideoTrack = function updateVideoTrack(stream, streamId, onEndedCallback, stopDesktop) {
          var _this18 = this;

          var videoTrackSender = this.getSender(streamId, "video");

          if (videoTrackSender) {
            return videoTrackSender.replaceTrack(stream.getVideoTracks()[0]).then(function (result) {
              _this18.updateLocalVideoStream(stream, onEndedCallback, stopDesktop);
            }).catch(function (error) {
              console.log(error.name);
            });
          } else {
            this.updateLocalVideoStream(stream, onEndedCallback, stopDesktop);
            return new Promise(function (resolve, reject) {
              resolve();
            });
          }
        }
        /**
         * If you mute turn off the camera still some data should be sent
         * Tihs method create a black frame to reduce data transfer
         */
        ;

        _proto3.initializeDummyFrame = function initializeDummyFrame() {
          this.dummyCanvas.getContext('2d').fillRect(0, 0, 320, 240);
          this.replacementStream = this.dummyCanvas.captureStream();
        }
        /**
         * Called by User
         * turns of the camera stream and starts streaming black dummy frame
         */
        ;

        _proto3.turnOffLocalCamera = function turnOffLocalCamera(streamId) {
          var _this19 = this;

          //Initialize the first dummy frame for switching.
          this.initializeDummyFrame(); //We need to send black frames within a time interval, because when the user turn off the camera,
          //player can't connect to the sender since there is no data flowing. Sending a black frame in each 3 seconds resolves it.

          if (this.blackFrameTimer == null) {
            this.blackFrameTimer = setInterval(function () {
              _this19.initializeDummyFrame();
            }, 3000);
          }

          if (this.localStream != null) {
            var choosenId;

            if (streamId != null || typeof streamId != "undefined") {
              choosenId = streamId;
            } else {
              choosenId = this.publishStreamId;
            }

            this.cameraEnabled = false;
            return this.updateVideoTrack(this.replacementStream, choosenId, null, true);
          } else {
            return new Promise(function (resolve, reject) {
              _this19.callbackError("NoActiveConnection");

              reject("NoActiveStream");
            });
          }
        }
        /**
         * Called by User
         * turns of the camera stream and starts streaming camera again instead of black dummy frame
         */
        ;

        _proto3.turnOnLocalCamera = function turnOnLocalCamera(streamId) {
          var _this20 = this;

          if (this.blackFrameTimer != null) {
            clearInterval(this.blackFrameTimer);
            this.blackFrameTimer = null;
          }

          if (this.localStream == null) {
            return this.navigatorUserMedia(this.mediaConstraints, function (stream) {
              _this20.gotStream(stream);
            }, false);
          } //This method will get the camera track and replace it with dummy track
          else {
              return this.navigatorUserMedia(this.mediaConstraints, function (stream) {
                var choosenId;

                if (streamId != null || typeof streamId != "undefined") {
                  choosenId = streamId;
                } else {
                  choosenId = _this20.publishStreamId;
                }

                _this20.cameraEnabled = true;

                _this20.updateVideoTrack(stream, choosenId, null, true);
              }, false);
            }
        }
        /**
         * Called by User
         * to mute local audio streaming
         */
        ;

        _proto3.muteLocalMic = function muteLocalMic() {
          this.isMuted = true;

          if (this.localStream != null) {
            this.localStream.getAudioTracks().forEach(function (track) {
              return track.enabled = false;
            });
          } else {
            this.callbackError("NoActiveConnection");
          }
        }
        /**
         * Called by User
         * to unmute local audio streaming
         *
         * if there is audio it calls callbackError with "AudioAlreadyActive" parameter
         */
        ;

        _proto3.unmuteLocalMic = function unmuteLocalMic() {
          this.isMuted = false;

          if (this.localStream != null) {
            this.localStream.getAudioTracks().forEach(function (track) {
              return track.enabled = true;
            });
          } else {
            this.callbackError("NoActiveConnection");
          }
        }
        /**
         * If we have multiple video tracks in coming versions, this method may cause some issues
         */
        ;

        _proto3.getVideoSender = function getVideoSender(streamId) {
          var videoSender = null;

          if (typeof adapter !== "undefined" && adapter !== null && (adapter.browserDetails.browser === 'chrome' || adapter.browserDetails.browser === 'firefox' || adapter.browserDetails.browser === 'safari' && adapter.browserDetails.version >= 64) && 'RTCRtpSender' in window && 'setParameters' in window.RTCRtpSender.prototype) {
            videoSender = this.getSender(streamId, "video");
          }

          return videoSender;
        }
        /**
         * Called by User
         * to set maximum video bandwidth is in kbps
         */
        ;

        _proto3.changeBandwidth = function changeBandwidth(bandwidth, streamId) {
          var errorDefinition = "";
          var videoSender = this.getVideoSender(streamId);

          if (videoSender != null) {
            var parameters = videoSender.getParameters();

            if (!parameters.encodings) {
              parameters.encodings = [{}];
            }

            if (bandwidth === 'unlimited') {
              delete parameters.encodings[0].maxBitrate;
            } else {
              parameters.encodings[0].maxBitrate = bandwidth * 1000;
            }

            return videoSender.setParameters(parameters);
          } else {
            errorDefinition = "Video sender not found to change bandwidth. Streaming may not be active";
          }

          return Promise.reject(errorDefinition);
        }
        /**
         * Called by user
         * sets the volume level
         *
         * @param {*} volumeLevel : Any number between 0 and 1.
         */
        ;

        _proto3.setVolumeLevel = function setVolumeLevel(volumeLevel) {
          this.currentVolume = volumeLevel;

          if (this.primaryAudioTrackGainNode != null) {
            this.primaryAudioTrackGainNode.gain.value = volumeLevel;
          }

          if (this.secondaryAudioTrackGainNode != null) {
            this.secondaryAudioTrackGainNode.gain.value = volumeLevel;
          }
        }
        /**
         * Called by user
         * To create a sound meter for the local stream
         *
         * @param {*} levelCallback : callback to provide the audio level to user
         * @param {*} period : measurement period
         */
        ;

        _proto3.enableAudioLevelForLocalStream = function enableAudioLevelForLocalStream(levelCallback, period) {
          var _this21 = this;

          this.levelCallback = levelCallback;
          this.localStreamSoundMeter = new SoundMeter(this.audioContext);
          this.localStreamSoundMeter.connectToSource(this.localStream, levelCallback).then(function () {
            _this21.audioContext.resume().then(function (r) {});
          });
        }
        /**
         * Connects the local stream to Sound Meter
         * It should be called when local stream changes
         */
        ;

        _proto3.connectSoundMeterToLocalStream = function connectSoundMeterToLocalStream() {
          this.localStreamSoundMeter.connectToSource(this.localStream, this.levelCallback, function (e) {
            if (e) {
              alert(e);
            } // console.log("Added sound meter for stream: " + streamId + " = " + soundMeter.instant.toFixed(2));

          });
        }
        /**
         * Called by user
         * To change audio/video constraints on the fly
         *
         */
        ;

        _proto3.applyConstraints = function applyConstraints(newConstraints) {
          var constraints = {};

          if (newConstraints.audio === undefined && newConstraints.video === undefined) {
            //if audio or video field is not defined, assume that it's a video constraint
            constraints.video = newConstraints;
            this.mediaConstraints.video = _extends_1({}, this.mediaConstraints.video, constraints.video);
          } else if (newConstraints.video !== undefined) {
            constraints.video = newConstraints.video;
            this.mediaConstraints.video = _extends_1({}, this.mediaConstraints.video, constraints.video);
          }

          if (newConstraints.audio !== undefined) {
            constraints.audio = newConstraints.audio;
            this.mediaConstraints.audio = _extends_1({}, this.mediaConstraints.audio, constraints.audio);
          }

          var promise = null;

          if (constraints.video !== undefined) {
            if (this.localStream && this.localStream.getVideoTracks().length > 0) {
              var videoTrack = this.localStream.getVideoTracks()[0];
              promise = videoTrack.applyConstraints(this.mediaConstraints.video);
            } else {
              promise = new Promise(function (resolve, reject) {
                reject("There is no video track to apply constraints");
              });
            }
          }

          if (constraints.audio !== undefined) {
            //just give the audio constraints not to get video stream
            //we dont call applyContrains for audio because it does not work. I think this is due to gainStream things. This is why we call getUserMedia again
            //use the publishStreamId because we don't have streamId in the parameter anymore 
            promise = this.setAudioInputSource(this.publishStreamId, {
              audio: this.mediaConstraints.audio
            }, null);
          }

          if (this.localStreamSoundMeter != null) {
            this.connectSoundMeterToLocalStream();
          }

          return promise;
        };

        return MediaManager;
      }();
      /**
       * This structure is used to handle large size data channel messages (like image)
       * which should be splitted into chunks while sending and receiving.
       *
       */


      var ReceivingMessage = function ReceivingMessage(size) {
        this.size = size;
        this.received = 0;
        this.data = new ArrayBuffer(size);
      };
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


      var WebRTCAdaptor = /*#__PURE__*/function () {
        /**
         * Register plugins to the WebRTCAdaptor
         * @param {*} plugin
         */
        WebRTCAdaptor.register = function register(pluginInitMethod) {
          WebRTCAdaptor.pluginInitMethods.push(pluginInitMethod);
        };

        function WebRTCAdaptor(initialValues) {
          var _this22 = this;

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
          this.peerconnection_config = {
            'iceServers': [{
              'urls': 'stun:stun1.l.google.com:19302'
            }],
            sdpSemantics: 'unified-plan'
          };
          /**
           * Used while creating SDP (answer or offer)
           * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer#parameters
           */

          this.sdp_constraints = {
            OfferToReceiveAudio: false,
            OfferToReceiveVideo: false
          };
          /**
           * This keeps the PeerConnections for each stream id.
           * It is an array because one @WebRTCAdaptor instance can manage multiple WebRTC connections as in the conference.
           * Its indices are the Stream Ids of each stream
           */

          this.remotePeerConnection = new Array();
          /**
           * This keeps statistics for the each PeerConnection.
           * It is an array because one @WebRTCAdaptor instance can manage multiple WebRTC connections as in the conference.
           * Its indices are the Stream Ids of each stream
           */

          this.remotePeerConnectionStats = new Array();
          /**
           * This keeps the Remote Description (SDP) set status for each PeerConnection.
           * We need to keep this status because sometimes ice candidates from the remote peer
           * may come before the Remote Description (SDP). So we need to store those ice candidates
           * in @iceCandidateList field until we get and set the Remote Description.
           * Otherwise setting ice candidates before Remote description may cause problem.
           */

          this.remoteDescriptionSet = new Array();
          /**
           * This keeps the Ice Candidates which are received before the Remote Description (SDP) received.
           * For details please check @remoteDescriptionSet field.
           */

          this.iceCandidateList = new Array();
          /**
           * This is the name for the room that is desired to join in conference mode.
           */

          this.roomName = null;
          /**
           * This keeps StreamIds for the each playing session.
           * It is an array because one @WebRTCAdaptor instance can manage multiple playing sessions.
           */

          this.playStreamId = new Array();
          /**
           * Audio context to use
           */

          this.audioContext = new AudioContext();
          /**
           * This is the flag indicates if multiple peers will join a peer in the peer to peer mode.
           * This is used only with Embedded SDk
           */

          this.isMultiPeer = false;
          /**
           * This is the stream id that multiple peers can join a peer in the peer to peer mode.
           * This is used only with Embedded SDk
           */

          this.multiPeerStreamId = null;
          /**
           * This is instance of @WebSocketAdaptor and manages to websocket connection.
           * All signalling messages are sent to/recived from
           * the Ant Media Server over this web socket connection
           */

          this.webSocketAdaptor = null;
          /**
           * This flags indicates if this @WebRTCAdaptor instance is used only for playing session(s)
           * You don't need camera/mic access in play mode
           */

          this.isPlayMode = false;
          /**
           * This flags enables/disables debug logging
           */

          this.debug = false;
          /**
           * This is the Stream Id for the publisher. One @WebRCTCAdaptor supports only one publishing
           * session for now (23.02.2022).
           * In conference mode you can join a room with null stream id. In that case
           * Ant Media Server generates a stream id and provides it JoinedTheRoom callback and it is set to this field.
           */

          this.publishStreamId = null;
          /**
           * This is used to keep stream id and track id (which is provided in SDP) mapping
           * in MultiTrack Playback and conference.
           */

          this.idMapping = new Array();
          /**
           * This is used when only data is brodcasted with the same way video and/or audio.
           * The difference is that no video or audio is sent when this field is true
           */

          this.onlyDataChannel = false;
          /**
           * While publishing and playing streams data channel is enabled by default
           */

          this.dataChannelEnabled = true;
          /**
           * This is array of @ReceivingMessage
           * When you receive multiple large size messages @ReceivingMessage simultaneously
           * this map is used to indicate them with its index tokens.
           */

          this.receivingMessages = new Map();
          /**
           * Supported candidate types. Below types are for both sending and receiving candidates.
           * It means if when client receives candidate from STUN server, it sends to the server if candidate's protocol
           * is in the list. Likely, when client receives remote candidate from server, it adds as ice candidate
           * if candidate protocol is in the list below.
           */

          this.candidateTypes = ["udp", "tcp"];
          /**
           * Method to call when there is an event happened
           */

          this.callback = null;
          /**
           * Method to call when there is an error happened
           */

          this.callbackError = null;
          /**
           * Flag to indicate if the stream is published or not after the connection fails
           */

          this.reconnectIfRequiredFlag = true;
          /**
           * websocket url to connect
           * @deprecated use websocketURL
           */

          this.websocket_url = null;
          /**
           * Websocket URL 
           */

          this.websocketURL = null;
          /**
           * PAY ATTENTION: The values of the above fields are provided as this constructor parameter.
           * TODO: Also some other hidden parameters may be passed here
           */

          for (var key in initialValues) {
            if (initialValues.hasOwnProperty(key)) {
              this[key] = initialValues[key];
            }
          }

          if (this.websocketURL == null) {
            this.websocketURL = this.websocket_url;
          }

          if (this.websocketURL == null) {
            throw new Error("WebSocket URL is not defined. It's mandatory");
          }
          /**
           * The html video tag for receiver is got here
           */


          this.remoteVideo = this.remoteVideoElement || document.getElementById(this.remoteVideoId);
          /**
           * Keeps the sound meters for each connection. Its index is stream id
           */

          this.soundMeters = new Array();
          /**
           * Keeps the current audio level for each playing streams in conference mode
           */

          this.soundLevelList = new Array();
          /**
           * This is the event listeners that WebRTC Adaptor calls when there is a new event happened
           */

          this.eventListeners = new Array();
          /**
           * This is the error event listeners that WebRTC Adaptor calls when there is an error happened
           */

          this.errorEventListeners = new Array();
          /**
           * This is token that is being used to publish the stream. It's added here to use in reconnect scenario
           */

          this.publishToken = null;
          /**
           * subscriber id that is being used to publish the stream. It's added here to use in reconnect scenario
           */

          this.publishSubscriberId = null;
          /**
           * subscriber code that is being used to publish the stream. It's added here to use in reconnect scenario
           */

          this.publishSubscriberCode = null;
          /**
           * This is the stream name that is being published. It's added here to use in reconnect scenario
           */

          this.publishStreamName = null;
          /**
           * This is the stream id of the main track that the current publishStreamId is going to be subtrack of it. It's added here to use in reconnect scenario
           */

          this.publishMainTrack = null;
          /**
           * This is the metadata that is being used to publish the stream. It's added here to use in reconnect scenario
           */

          this.publishMetaData = null;
          /**
           * This is the token to play the stream. It's added here to use in reconnect scenario
           */

          this.playToken = null;
          /**
           * This is the room id to play the stream. It's added here to use in reconnect scenario
           * This approach is old conferencing. It's better to use multi track conferencing
           */

          this.playRoomId = null;
          /**
           * These are enabled tracks to play the stream. It's added here to use in reconnect scenario
           */

          this.playEnableTracks = null;
          /**
           * This is the subscriber Id to play the stream. It's added here to use in reconnect scenario
           */

          this.playSubscriberId = null;
          /**
           * This is the subscriber code to play the stream. It's added here to use in reconnect scenario
           */

          this.playSubscriberCode = null;
          /**
           * This is the meta data to play the stream. It's added here to use in reconnect scenario
           */

          this.playMetaData = null;
          /**
           * All media management works for teh local stream are made by @MediaManager class.
           * for details please check @MediaManager
           */

          this.mediaManager = new MediaManager({
            userParameters: initialValues,
            webRTCAdaptor: this,
            callback: function callback(info, obj) {
              _this22.notifyEventListeners(info, obj);
            },
            callbackError: function callbackError(error, message) {
              _this22.notifyErrorEventListeners(error, message);
            },
            getSender: function getSender(streamId, type) {
              return _this22.getSender(streamId, type);
            }
          }); //Initialize the local stream (if needed) and web socket connection

          this.initialize();
        }
        /**
         * Init plugins
         */


        var _proto4 = WebRTCAdaptor.prototype;

        _proto4.initPlugins = function initPlugins() {
          var _this23 = this;

          WebRTCAdaptor.pluginInitMethods.forEach(function (initMethod) {
            initMethod(_this23);
          });
        }
        /**
         * Add event listener to be notified. This is generally for plugins
         * @param {*} listener
         */
        ;

        _proto4.addEventListener = function addEventListener(listener) {
          this.eventListeners.push(listener);
        }
        /**
         * Add error event listener to be notified. Thisis generally for plugins
         * @param {*} errorListener
         */
        ;

        _proto4.addErrorEventListener = function addErrorEventListener(errorListener) {
          this.errorEventListeners.push(errorListener);
        }
        /**
         * Notify event listeners and callback method
         * @param {*} info
         * @param {*} obj
         */
        ;

        _proto4.notifyEventListeners = function notifyEventListeners(info, obj) {
          this.eventListeners.forEach(function (listener) {
            listener(info, obj);
          });

          if (this.callback != null) {
            this.callback(info, obj);
          }
        }
        /**
         * Notify error event listeners and callbackError method
         * @param {*} error
         * @param {*} message
         */
        ;

        _proto4.notifyErrorEventListeners = function notifyErrorEventListeners(error, message) {
          this.errorEventListeners.forEach(function (listener) {
            listener(error, message);
          });

          if (this.callbackError != null) {
            this.callbackError(error, message);
          }
        }
        /**
         * Called by constuctor to
         *    -check local stream unless it is in play mode
         *    -start websocket connection
         */
        ;

        _proto4.initialize = function initialize() {
          var _this24 = this;

          if (!this.isPlayMode && !this.onlyDataChannel && this.mediaManager.localStream == null) {
            //we need local stream because it not a play mode
            this.mediaManager.initLocalStream().then(function () {
              _this24.initPlugins();

              _this24.checkWebSocketConnection();
            }).catch(function (error) {
              console.warn(error);
              throw error;
            }); //return here because initialized message should be delivered after local stream is initialized

            return;
          }

          this.initPlugins();
          this.checkWebSocketConnection();
        }
        /**
         * Called to start a new WebRTC stream. AMS responds with start message.
         * Parameters:
         *     streamId: unique id for the stream
         *     token: required if any stream security (token control) enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Stream-Security-Documentation
         *     subscriberId: required if TOTP enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Time-based-One-Time-Password-(TOTP)
         *     subscriberCode: required if TOTP enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Time-based-One-Time-Password-(TOTP)
         *   streamName: required if you want to set a name for the stream
         *   mainTrack: required if you want to start the stream as a subtrack for a main streamwhich has id of this parameter.
         *                Check:https://antmedia.io/antmediaserver-webrtc-multitrack-playing-feature/
         *                !!! for multitrack conference set this value with roomName
         *   metaData: a free text information for the stream to AMS. It is provided to Rest methods by the AMS
         */
        ;

        _proto4.publish = function publish(streamId, token, subscriberId, subscriberCode, streamName, mainTrack, metaData) {
          var _this25 = this;

          //TODO: should refactor the repeated code
          this.publishStreamId = streamId;
          this.mediaManager.publishStreamId = streamId;
          this.publishToken = token;
          this.publishSubscriberId = subscriberId;
          this.publishSubscriberCode = subscriberCode;
          this.publishStreamName = streamName;
          this.publishMainTrack = mainTrack;
          this.publishMetaData = metaData;

          if (this.onlyDataChannel) {
            this.sendPublishCommand(streamId, token, subscriberId, subscriberCode, streamName, mainTrack, metaData, false, false);
          } //If it started with playOnly mode and wants to publish now
          else if (this.mediaManager.localStream == null) {
              this.mediaManager.initLocalStream().then(function () {
                var videoEnabled = false;
                var audioEnabled = false;

                if (_this25.mediaManager.localStream != null) {
                  videoEnabled = _this25.mediaManager.localStream.getVideoTracks().length > 0 ? true : false;
                  audioEnabled = _this25.mediaManager.localStream.getAudioTracks().length > 0 ? true : false;
                }

                _this25.sendPublishCommand(streamId, token, subscriberId, subscriberCode, streamName, mainTrack, metaData, videoEnabled, audioEnabled);
              }).catch(function (error) {
                console.warn(error);
                throw error;
              });
            } else {
              var videoEnabled = this.mediaManager.localStream.getVideoTracks().length > 0 ? true : false;
              var audioEnabled = this.mediaManager.localStream.getAudioTracks().length > 0 ? true : false;
              this.sendPublishCommand(streamId, token, subscriberId, subscriberCode, streamName, mainTrack, metaData, videoEnabled, audioEnabled);
            } //init peer connection for reconnectIfRequired


          this.initPeerConnection(streamId, "publish");
          setTimeout(function () {
            //check if it is connected or not
            //this resolves if the server responds with some error message
            if (_this25.iceConnectionState(_this25.publishStreamId) != "connected" && _this25.iceConnectionState(_this25.publishStreamId) != "completed") {
              //if it is not connected, try to reconnect
              _this25.reconnectIfRequired(0);
            }
          }, 5000);
        };

        _proto4.sendPublishCommand = function sendPublishCommand(streamId, token, subscriberId, subscriberCode, streamName, mainTrack, metaData, videoEnabled, audioEnabled) {
          var jsCmd = {
            command: "publish",
            streamId: streamId,
            token: token,
            subscriberId: typeof subscriberId !== undefined && subscriberId != null ? subscriberId : "",
            subscriberCode: typeof subscriberCode !== undefined && subscriberCode != null ? subscriberCode : "",
            streamName: typeof streamName !== undefined && streamName != null ? streamName : "",
            mainTrack: typeof mainTrack !== undefined && mainTrack != null ? mainTrack : "",
            video: videoEnabled,
            audio: audioEnabled,
            metaData: typeof metaData !== undefined && metaData != null ? metaData : ""
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to join a room. AMS responds with joinedTheRoom message.
         * Parameters:
         *     roomName: unique id of the room
         *     stream: unique id of the stream belogns to this participant
         *     mode:    legacy for older implementation (default value)
         *            mcu for merging streams
         *            amcu: audio only conferences with mixed audio
         */
        ;

        _proto4.joinRoom = function joinRoom(roomName, streamId, mode) {
          this.roomName = roomName;
          var jsCmd = {
            command: "joinRoom",
            room: roomName,
            streamId: streamId,
            mode: mode
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to start a playing session for a stream. AMS responds with start message.
         * Parameters:
         *  - streamId:(string) unique id for the stream that you want to play
         *  - token:(string) required if any stream security (token control) enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Stream-Security-Documentation
         *  - roomId:(string) required if this stream is belonging to a room participant
         *  - enableTracks:(array) required if the stream is a main stream of multitrack playing. You can pass the the subtrack id list that you want to play.
         *                    you can also provide a track id that you don't want to play by adding ! before the id.
         *   - subscriberId:(string) required if TOTP enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Time-based-One-Time-Password-(TOTP)
         *   - subscriberCode:(string) required if TOTP enabled. Check https://github.com/ant-media/Ant-Media-Server/wiki/Time-based-One-Time-Password-(TOTP)
         *   - metaData:(string, json) a free text information for the stream to AMS. It is provided to Rest methods by the AMS
         */
        ;

        _proto4.play = function play(streamId, token, roomId, enableTracks, subscriberId, subscriberCode, metaData) {
          var _this26 = this;

          this.playStreamId.push(streamId);
          this.playToken = token;
          this.playRoomId = roomId;
          this.playEnableTracks = enableTracks;
          this.playSubscriberId = subscriberId;
          this.playSubscriberCode = subscriberCode;
          this.playMetaData = metaData;
          var jsCmd = {
            command: "play",
            streamId: streamId,
            token: typeof token !== undefined && token != null ? token : "",
            room: typeof roomId !== undefined && roomId != null ? roomId : "",
            trackList: typeof enableTracks !== undefined && enableTracks != null ? enableTracks : [],
            subscriberId: typeof subscriberId !== undefined && subscriberId != null ? subscriberId : "",
            subscriberCode: typeof subscriberCode !== undefined && subscriberId != null ? subscriberCode : "",
            viewerInfo: typeof metaData !== undefined && metaData != null ? metaData : ""
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd)); //init peer connection for reconnectIfRequired

          this.initPeerConnection(streamId, "play");
          setTimeout(function () {
            //check if it is connected or not
            //this resolves if the server responds with some error message
            if (_this26.iceConnectionState(streamId) != "connected" && _this26.iceConnectionState(streamId) != "completed") {
              //if it is not connected, try to reconnect
              _this26.reconnectIfRequired(0);
            }
          }, 5000);
        }
        /**
         * Reconnects to the stream if it is not stopped on purpose
         * @param {*} streamId 
         * @returns 
         */
        ;

        _proto4.reconnectIfRequired = function reconnectIfRequired() {
          var _this27 = this;

          var delayMs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3000;

          if (this.reconnectIfRequiredFlag) {
            //It's important to run the following methods after 3000 ms because the stream may be stopped by the user in the meantime
            if (delayMs > 0) {
              setTimeout(function () {
                _this27.tryAgain();
              }, delayMs);
            } else {
              this.tryAgain();
            }
          }
        };

        _proto4.tryAgain = function tryAgain() {
          //reconnect publish
          //if remotePeerConnection has a peer connection for the stream id, it means that it is not stopped on purpose
          if (this.remotePeerConnection[this.publishStreamId] != null && //check connection status to not stop streaming an active stream
          this.iceConnectionState(this.publishStreamId) != "connected" && this.iceConnectionState(this.publishStreamId) != "completed") {
            this.closePeerConnection(this.publishStreamId);
            console.log("It will try to publish again because it is not stopped on purpose");
            this.publish(this.publishStreamId, this.publishToken, this.publishSubscriberId, this.publishSubscriberCode, this.publishStreamName, this.publishMainTrack, this.publishMetaData);
          } //reconnect play


          for (var index in this.playStreamId) {
            if (this.remotePeerConnection[this.playStreamId[index]] != null && //check connection status to not stop streaming an active stream
            this.iceConnectionState(this.playStreamId[index]) != "connected" && this.iceConnectionState(this.playStreamId[index]) != "connected") {
              console.log("It will try to play again because it is not stopped on purpose");
              this.closePeerConnection(this.playStreamId[index]);
              this.play(this.playStreamId[index], this.playToken, this.playRoomId, this.playEnableTracks, this.playSubscriberId, this.playSubscriberCode, this.playMetaData);
            }
          }
        }
        /**
         * Called to stop a publishing/playing session for a stream. AMS responds with publishFinished or playFinished message.
         * Parameters:
         *     streamId: unique id for the stream that you want to stop publishing or playing
         */
        ;

        _proto4.stop = function stop(streamId) {
          //stop is called on purpose and it deletes the peer connection from remotePeerConnections
          this.closePeerConnection(streamId);

          if (this.webSocketAdaptor != null && this.webSocketAdaptor.isConnected()) {
            var jsCmd = {
              command: "stop",
              streamId: streamId
            };
            this.webSocketAdaptor.send(JSON.stringify(jsCmd));
          }
        }
        /**
         * Called to join a peer-to-peer mode session as peer. AMS responds with joined message.
         * Parameters:
         *     streamId: unique id for the peer-to-peer session
         */
        ;

        _proto4.join = function join(streamId) {
          var jsCmd = {
            command: "join",
            streamId: streamId,
            multiPeer: this.isMultiPeer && this.multiPeerStreamId == null,
            mode: this.isPlayMode ? "play" : "both"
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called by browser when a new track is added to WebRTC connetion. This is used to infor html pages with newStreamAvailable callback.
         * Parameters:
         * 	 event: TODO
         * 	 streamId: unique id for the stream
         */
        ;

        _proto4.onTrack = function onTrack(event, streamId) {
          console.log("onTrack for stream");

          if (this.remoteVideo != null) {
            if (this.remoteVideo.srcObject !== event.streams[0]) {
              this.remoteVideo.srcObject = event.streams[0];
              console.log('Received remote stream');
            }
          } else {
            var dataObj = {
              stream: event.streams[0],
              track: event.track,
              streamId: streamId,
              trackId: this.idMapping[streamId][event.transceiver.mid]
            };
            this.notifyEventListeners("newTrackAvailable", dataObj); //deprecated. Listen newTrackAvailable in callback. It's kept for backward compatibility

            this.notifyEventListeners("newStreamAvailable", dataObj);
          }
        }
        /**
         * Called to leave from a conference room. AMS responds with leavedTheRoom message.
         * Parameters:
         *     roomName: unique id for the conference room
         */
        ;

        _proto4.leaveFromRoom = function leaveFromRoom(roomName) {
          for (var key in this.remotePeerConnection) {
            this.closePeerConnection(key);
          }

          this.roomName = roomName;
          var jsCmd = {
            command: "leaveFromRoom",
            room: roomName
          };
          console.log("leave request is sent for " + roomName);
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to leave from a peer-to-peer mode session. AMS responds with leaved message.
         * Parameters:
         *     streamId: unique id for the peer-to-peer session
         */
        ;

        _proto4.leave = function leave(streamId) {
          var jsCmd = {
            command: "leave",
            streamId: this.isMultiPeer && this.multiPeerStreamId != null ? this.multiPeerStreamId : streamId
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
          this.closePeerConnection(streamId);
          this.multiPeerStreamId = null;
        }
        /**
         * Called to get a stream information for a specific stream. AMS responds with streamInformation message.
         * Parameters:
         *     streamId: unique id for the stream that you want to get info about
         */
        ;

        _proto4.getStreamInfo = function getStreamInfo(streamId) {
          var jsCmd = {
            command: "getStreamInfo",
            streamId: streamId
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to update the meta information for a specific stream.
         * Parameters:
         *     streamId: unique id for the stream that you want to update MetaData
         *   metaData: new free text information for the stream
         */
        ;

        _proto4.upateStreamMetaData = function upateStreamMetaData(streamId, metaData) {
          var jsCmd = {
            command: "updateStreamMetaData",
            streamId: streamId,
            metaData: metaData
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to get the room information for a specific room. AMS responds with roomInformation message
         * which includes the ids and names of the streams in that room.
         * If there is no active streams in the room, AMS returns error `no_active_streams_in_room` in error callback
         * Parameters:
         *     roomName: unique id for the room that you want to get info about
         *     streamId: unique id for the stream that is streamed by this @WebRTCAdaptor
         */
        ;

        _proto4.getRoomInfo = function getRoomInfo(roomName, streamId) {
          var jsCmd = {
            command: "getRoomInfo",
            streamId: streamId,
            room: roomName
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to enable/disable data flow from the AMS for a specific track under a main track.
         * Parameters:
         *     mainTrackId: unique id for the main stream
         *     trackId: unique id for the track that you want to enable/disable data flow for
         *     enabled: true or false
         */
        ;

        _proto4.enableTrack = function enableTrack(mainTrackId, trackId, enabled) {
          var jsCmd = {
            command: "enableTrack",
            streamId: mainTrackId,
            trackId: trackId,
            enabled: enabled
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to get the track ids under a main stream. AMS responds with trackList message.
         * Parameters:
         *     streamId: unique id for the main stream
         *     token: not used
         * TODO: check this function
         */
        ;

        _proto4.getTracks = function getTracks(streamId, token) {
          this.playStreamId.push(streamId);
          var jsCmd = {
            command: "getTrackList",
            streamId: streamId,
            token: token
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called by WebSocketAdaptor when a new ice candidate is received from AMS.
         * Parameters:
         *     event: TODO
         *     streamId: unique id for the stream
         */
        ;

        _proto4.iceCandidateReceived = function iceCandidateReceived(event, streamId) {
          if (event.candidate) {
            var protocolSupported = false;

            if (event.candidate.candidate == "") {
              //event candidate can be received and its value can be "".
              //don't compare the protocols
              protocolSupported = true;
            } else if (typeof event.candidate.protocol == "undefined") {
              this.candidateTypes.forEach(function (element) {
                if (event.candidate.candidate.toLowerCase().includes(element)) {
                  protocolSupported = true;
                }
              });
            } else {
              protocolSupported = this.candidateTypes.includes(event.candidate.protocol.toLowerCase());
            }

            if (protocolSupported) {
              var jsCmd = {
                command: "takeCandidate",
                streamId: streamId,
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
              };

              if (this.debug) {
                console.log("sending ice candiate for stream Id " + streamId);
                console.log(JSON.stringify(event.candidate));
              }

              this.webSocketAdaptor.send(JSON.stringify(jsCmd));
            } else {
              console.log("Candidate's protocol(full sdp: " + event.candidate.candidate + ") is not supported. Supported protocols: " + this.candidateTypes);

              if (event.candidate.candidate != "") {
                //
                this.notifyErrorEventListeners("protocol_not_supported", "Support protocols: " + this.candidateTypes.toString() + " candidate: " + event.candidate.candidate);
              }
            }
          } else {
            console.log("No event.candidate in the iceCandidate event");
          }
        }
        /**
         * Called internally to initiate Data Channel.
         * Note that Data Channel should be enabled fromAMS settings.
         *     streamId: unique id for the stream
         *   dataChannel: provided by PeerConnection
         */
        ;

        _proto4.initDataChannel = function initDataChannel(streamId, dataChannel) {
          var _this28 = this;

          dataChannel.onerror = function (error) {
            console.log("Data Channel Error:", error);
            var obj = {
              streamId: streamId,
              error: error
            };
            console.log("channel status: ", dataChannel.readyState);

            if (dataChannel.readyState != "closed") {
              _this28.notifyErrorEventListeners("data_channel_error", obj);
            }
          };

          dataChannel.onmessage = function (event) {
            var obj = {
              streamId: streamId,
              data: event.data
            };
            var data = obj.data;

            if (typeof data === 'string' || data instanceof String) {
              _this28.notifyEventListeners("data_received", obj);
            } else {
              var length = data.length || data.size || data.byteLength;
              var view = new Int32Array(data, 0, 1);
              var token = view[0];
              var msg = _this28.receivingMessages[token];

              if (msg == undefined) {
                var view = new Int32Array(data, 0, 2);
                var size = view[1];
                msg = new ReceivingMessage(size);
                _this28.receivingMessages[token] = msg;

                if (length > 8) {
                  console.error("something went wrong in msg receiving");
                }

                return;
              }

              var rawData = data.slice(4, length);
              var dataView = new Uint8Array(msg.data);
              dataView.set(new Uint8Array(rawData), msg.received, length - 4);
              msg.received += length - 4;

              if (msg.size == msg.received) {
                obj.data = msg.data;

                _this28.notifyEventListeners("data_received", obj);
              }
            }
          };

          dataChannel.onopen = function () {
            _this28.remotePeerConnection[streamId].dataChannel = dataChannel;
            console.log("Data channel is opened");

            _this28.notifyEventListeners("data_channel_opened", streamId);
          };

          dataChannel.onclose = function () {
            console.log("Data channel is closed");

            _this28.notifyEventListeners("data_channel_closed", streamId);
          };
        }
        /**
         * Called internally to initiate PeerConnection.
         *     streamId: unique id for the stream
         *   dataChannelMode: can be "publish" , "play" or "peer" based on this it is decided which way data channel is created
         */
        ;

        _proto4.initPeerConnection = function initPeerConnection(streamId, dataChannelMode) {
          var _this29 = this;

          //null == undefined -> it's true
          //null === undefined -> it's false
          if (this.remotePeerConnection[streamId] == null) {
            var closedStreamId = streamId;
            console.log("stream id in init peer connection: " + streamId + " close stream id: " + closedStreamId);
            this.remotePeerConnection[streamId] = new RTCPeerConnection(this.peerconnection_config);
            this.remoteDescriptionSet[streamId] = false;
            this.iceCandidateList[streamId] = new Array();

            if (!this.playStreamId.includes(streamId)) {
              if (this.mediaManager.localStream != null) {
                //AddStream is deprecated thus updated to the addTrack after version 2.4.2.1
                this.mediaManager.localStream.getTracks().forEach(function (track) {
                  return _this29.remotePeerConnection[streamId].addTrack(track, _this29.mediaManager.localStream);
                });
              }
            }

            this.remotePeerConnection[streamId].onicecandidate = function (event) {
              _this29.iceCandidateReceived(event, closedStreamId);
            };

            this.remotePeerConnection[streamId].ontrack = function (event) {
              _this29.onTrack(event, closedStreamId);
            };

            this.remotePeerConnection[streamId].onnegotiationneeded = function (event) {
              console.log("onnegotiationneeded");
            };

            if (this.dataChannelEnabled) {
              // skip initializing data channel if it is disabled
              if (dataChannelMode == "publish") {
                //open data channel if it's publish mode peer connection
                var dataChannelOptions = {
                  ordered: true
                };

                if (this.remotePeerConnection[streamId].createDataChannel) {
                  var dataChannel = this.remotePeerConnection[streamId].createDataChannel(streamId, dataChannelOptions);
                  this.initDataChannel(streamId, dataChannel);
                } else {
                  console.warn("CreateDataChannel is not supported");
                }
              } else if (dataChannelMode == "play") {
                //in play mode, server opens the data channel
                this.remotePeerConnection[streamId].ondatachannel = function (ev) {
                  _this29.initDataChannel(streamId, ev.channel);
                };
              } else {
                //for peer mode do both for now
                var _dataChannelOptions = {
                  ordered: true
                };

                if (this.remotePeerConnection[streamId].createDataChannel) {
                  var dataChannelPeer = this.remotePeerConnection[streamId].createDataChannel(streamId, _dataChannelOptions);
                  this.initDataChannel(streamId, dataChannelPeer);

                  this.remotePeerConnection[streamId].ondatachannel = function (ev) {
                    _this29.initDataChannel(streamId, ev.channel);
                  };
                } else {
                  console.warn("CreateDataChannel is not supported");
                }
              }
            }

            this.remotePeerConnection[streamId].oniceconnectionstatechange = function (event) {
              var obj = {
                state: _this29.remotePeerConnection[streamId].iceConnectionState,
                streamId: streamId
              };

              if (obj.state == "failed" || obj.state == "disconnected" || obj.state == "closed") {
                _this29.reconnectIfRequired(obj.streamId);
              }

              _this29.notifyEventListeners("ice_connection_state_changed", obj); //


              if (!_this29.isPlayMode && !_this29.playStreamId.includes(streamId)) {
                if (_this29.remotePeerConnection[streamId].iceConnectionState == "connected") {
                  _this29.mediaManager.changeBandwidth(_this29.mediaManager.bandwidth, streamId).then(function () {
                    console.log("Bandwidth is changed to " + _this29.mediaManager.bandwidth);
                  }).catch(function (e) {
                    return console.warn(e);
                  });
                }
              }
            };
          }
        }
        /**
         * Called internally to close PeerConnection.
         *     streamId: unique id for the stream
         */
        ;

        _proto4.closePeerConnection = function closePeerConnection(streamId) {
          var peerConnection = this.remotePeerConnection[streamId];

          if (peerConnection != null) {
            this.remotePeerConnection[streamId] = null;
            delete this.remotePeerConnection[streamId];

            if (peerConnection.dataChannel != null) {
              peerConnection.dataChannel.close();
            }

            if (peerConnection.signalingState != "closed") {
              peerConnection.close();
            }

            var playStreamIndex = this.playStreamId.indexOf(streamId);

            if (playStreamIndex != -1) {
              this.playStreamId.splice(playStreamIndex, 1);
            }
          } //this is for the stats


          if (this.remotePeerConnectionStats[streamId] != null) {
            clearInterval(this.remotePeerConnectionStats[streamId].timerId);
            delete this.remotePeerConnectionStats[streamId];
          }

          if (this.soundMeters[streamId] != null) {
            delete this.soundMeters[streamId];
          }
        }
        /**
         * Called to get the signalling state for a stream.
         * This information can be used for error handling.
         * Check: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/connectionState
         *     streamId: unique id for the stream
         */
        ;

        _proto4.signallingState = function signallingState(streamId) {
          if (this.remotePeerConnection[streamId] != null) {
            return this.remotePeerConnection[streamId].signalingState;
          }

          return null;
        }
        /**
         * Called to get the ice connection state for a stream.
         * This information can be used for error handling.
         * Check: https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
         *     streamId: unique id for the stream
         */
        ;

        _proto4.iceConnectionState = function iceConnectionState(streamId) {
          if (this.remotePeerConnection[streamId] != null) {
            return this.remotePeerConnection[streamId].iceConnectionState;
          }

          return null;
        }
        /**
         * Called by browser when Local Configuration (SDP) is created successfully.
         * It is set as LocalDescription first then sent to AMS.
         *     configuration: created Local Configuration (SDP)
         *     streamId: unique id for the stream
         */
        ;

        _proto4.gotDescription = function gotDescription(configuration, streamId) {
          var _this30 = this;

          this.remotePeerConnection[streamId].setLocalDescription(configuration).then(function (responose) {
            console.debug("Set local description successfully for stream Id " + streamId);
            var jsCmd = {
              command: "takeConfiguration",
              streamId: streamId,
              type: configuration.type,
              sdp: configuration.sdp
            };

            if (_this30.debug) {
              console.debug("local sdp: ");
              console.debug(configuration.sdp);
            }

            _this30.webSocketAdaptor.send(JSON.stringify(jsCmd));
          }).catch(function (error) {
            console.error("Cannot set local description. Error is: " + error);
          });
        }
        /**
         * Called by WebSocketAdaptor when Remote Configuration (SDP) is received from AMS.
         * It is set as RemoteDescription first then if @iceCandidateList has candidate that
         * is received bfore this message, it is added as ice candidate.
         *     configuration: received Remote Configuration (SDP)
         *     idOfStream: unique id for the stream
         *     typeOfConfiguration: unique id for the stream
         *     idMapping: stream id and track id (which is provided in SDP) mapping in MultiTrack Playback and conference.
         *                It is recorded to match stream id as new tracks are added with @onTrack
         */
        ;

        _proto4.takeConfiguration = function takeConfiguration(idOfStream, configuration, typeOfConfiguration, idMapping) {
          var _this31 = this;

          var streamId = idOfStream;
          var type = typeOfConfiguration;
          var conf = configuration;
          var isTypeOffer = type == "offer";
          var dataChannelMode = "publish";

          if (isTypeOffer) {
            dataChannelMode = "play";
          }

          this.idMapping[streamId] = idMapping;
          this.initPeerConnection(streamId, dataChannelMode);
          this.remotePeerConnection[streamId].setRemoteDescription(new RTCSessionDescription({
            sdp: conf,
            type: type
          })).then(function (response) {
            if (_this31.debug) {
              console.debug("set remote description is succesfull with response: " + response + " for stream : " + streamId + " and type: " + type);
              console.debug(conf);
            }

            _this31.remoteDescriptionSet[streamId] = true;
            var length = _this31.iceCandidateList[streamId].length;
            console.debug("Ice candidate list size to be added: " + length);

            for (var i = 0; i < length; i++) {
              _this31.addIceCandidate(streamId, _this31.iceCandidateList[streamId][i]);
            }

            _this31.iceCandidateList[streamId] = [];

            if (isTypeOffer) {
              //SDP constraints may be different in play mode
              console.log("try to create answer for stream id: " + streamId);

              _this31.remotePeerConnection[streamId].createAnswer(_this31.sdp_constraints).then(function (configuration) {
                console.log("created answer for stream id: " + streamId); //support for stereo

                configuration.sdp = configuration.sdp.replace("useinbandfec=1", "useinbandfec=1; stereo=1");

                _this31.gotDescription(configuration, streamId);
              }).catch(function (error) {
                console.error("create answer error :" + error);
              });
            }
          }).catch(function (error) {
            if (_this31.debug) {
              console.error("set remote description is failed with error: " + error);
            }

            if (error.toString().indexOf("InvalidAccessError") > -1 || error.toString().indexOf("setRemoteDescription") > -1) {
              /**
               * This error generally occurs in codec incompatibility.
               * AMS for a now supports H.264 codec. This error happens when some browsers try to open it from VP8.
               */
              _this31.notifyErrorEventListeners("notSetRemoteDescription");
            }
          });
        }
        /**
         * Called by WebSocketAdaptor when new ice candidate is received from AMS.
         * If Remote Description (SDP) is already set, the candidate is added immediately,
         * otherwise stored in @iceCandidateList to add after Remote Description (SDP) set.
         *     idOfTheStream: unique id for the stream
         *     tmpLabel: sdpMLineIndex
         *     tmpCandidate: ice candidate
         */
        ;

        _proto4.takeCandidate = function takeCandidate(idOfTheStream, tmpLabel, tmpCandidate) {
          var streamId = idOfTheStream;
          var label = tmpLabel;
          var candidateSdp = tmpCandidate;
          var candidate = new RTCIceCandidate({
            sdpMLineIndex: label,
            candidate: candidateSdp
          });
          var dataChannelMode = "peer";
          this.initPeerConnection(streamId, dataChannelMode);

          if (this.remoteDescriptionSet[streamId] == true) {
            this.addIceCandidate(streamId, candidate);
          } else {
            console.debug("Ice candidate is added to list because remote description is not set yet");
            this.iceCandidateList[streamId].push(candidate);
          }
        }
        /**
         * Called internally to add the Ice Candidate to PeerConnection
         *     streamId: unique id for the stream
         *     tmpCandidate: ice candidate
         */
        ;

        _proto4.addIceCandidate = function addIceCandidate(streamId, candidate) {
          var _this32 = this;

          var protocolSupported = false;

          if (candidate.candidate == "") {
            //candidate can be received and its value can be "".
            //don't compare the protocols
            protocolSupported = true;
          } else if (typeof candidate.protocol == "undefined") {
            this.candidateTypes.forEach(function (element) {
              if (candidate.candidate.toLowerCase().includes(element)) {
                protocolSupported = true;
              }
            });
          } else {
            protocolSupported = this.candidateTypes.includes(candidate.protocol.toLowerCase());
          }

          if (protocolSupported) {
            this.remotePeerConnection[streamId].addIceCandidate(candidate).then(function (response) {
              if (_this32.debug) {
                console.log("Candidate is added for stream " + streamId);
              }
            }).catch(function (error) {
              console.error("ice candiate cannot be added for stream id: " + streamId + " error is: " + error);
              console.error(candidate);
            });
          } else {
            if (this.debug) {
              console.log("Candidate's protocol(" + candidate.protocol + ") is not supported." + "Candidate: " + candidate.candidate + " Supported protocols:" + this.candidateTypes);
            }
          }
        }
        /**
         * Called by WebSocketAdaptor when start message is received //TODO: may be changed. this logic shouldn't be in WebSocketAdaptor
         *     idOfStream: unique id for the stream
         */
        ;

        _proto4.startPublishing = function startPublishing(idOfStream) {
          var _this33 = this;

          var streamId = idOfStream;
          this.initPeerConnection(streamId, "publish");
          this.remotePeerConnection[streamId].createOffer(this.sdp_constraints).then(function (configuration) {
            _this33.gotDescription(configuration, streamId);
          }).catch(function (error) {
            console.error("create offer error for stream id: " + streamId + " error: " + error);
          });
        }
        /**
         * Toggle video track on the server side.
         *
         *   streamId: is the id of the stream
         *   trackId: is the id of the track. streamId is also one of the trackId of the stream. If you are having just a single track on your
         *         stream, you need to give streamId as trackId parameter as well.
         *   enabled: is the enable/disable video track. If it's true, server sends video track. If it's false, server does not send video
         */
        ;

        _proto4.toggleVideo = function toggleVideo(streamId, trackId, enabled) {
          var jsCmd = {
            command: "toggleVideo",
            streamId: streamId,
            trackId: trackId,
            enabled: enabled
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Toggle audio track on the server side.
         *
         *   streamId: is the id of the stream
         *   trackId: is the id of the track. streamId is also one of the trackId of the stream. If you are having just a single track on your
         *            stream, you need to give streamId as trackId parameter as well.
         *   enabled: is the enable/disable video track. If it's true, server sends audio track. If it's false, server does not send audio
         *
         */
        ;

        _proto4.toggleAudio = function toggleAudio(streamId, trackId, enabled) {
          var jsCmd = {
            command: "toggleAudio",
            streamId: streamId,
            trackId: trackId,
            enabled: enabled
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to get statistics for a PeerConnection. It can be publisher or player.
         *
         *     streamId: unique id for the stream
         */
        ;

        _proto4.getStats = function getStats(streamId) {
          var _this34 = this;

          console.log("peerstatsgetstats = " + this.remotePeerConnectionStats[streamId]);
          this.remotePeerConnection[streamId].getStats(null).then(function (stats) {
            var bytesReceived = -1;
            var videoPacketsLost = -1;
            var audioPacketsLost = -1;
            var fractionLost = -1;
            var currentTime = -1;
            var bytesSent = -1;
            var videoPacketsSent = -1;
            var audioPacketsSent = -1;
            var audioLevel = -1;
            var qlr = "";
            var framesEncoded = -1;
            var width = -1;
            var height = -1;
            var fps = -1;
            var frameWidth = -1;
            var frameHeight = -1;
            var videoRoundTripTime = -1;
            var videoJitter = -1;
            var audioRoundTripTime = -1;
            var audioJitter = -1;
            var framesDecoded = -1;
            var framesDropped = -1;
            var framesReceived = -1;
            var audioJitterAverageDelay = -1;
            var videoJitterAverageDelay = -1;
            stats.forEach(function (value) {
              //console.log(value);
              if (value.type == "inbound-rtp" && typeof value.kind != "undefined") {
                bytesReceived += value.bytesReceived;

                if (value.kind == "audio") {
                  audioPacketsLost = value.packetsLost;
                } else if (value.kind == "video") {
                  videoPacketsLost = value.packetsLost;
                }

                fractionLost += value.fractionLost;
                currentTime = value.timestamp;
              } else if (value.type == "outbound-rtp") {
                //TODO: SPLIT AUDIO AND VIDEO BITRATES
                if (value.kind == "audio") {
                  audioPacketsSent = value.packetsSent;
                } else if (value.kind == "video") {
                  videoPacketsSent = value.packetsSent;
                }

                bytesSent += value.bytesSent;
                currentTime = value.timestamp;
                qlr = value.qualityLimitationReason;

                if (value.framesEncoded != null) {
                  //audio tracks are undefined here
                  framesEncoded += value.framesEncoded;
                }
              } else if (value.type == "track" && typeof value.kind != "undefined" && value.kind == "audio") {
                if (typeof value.audioLevel != "undefined") {
                  audioLevel = value.audioLevel;
                }

                if (typeof value.jitterBufferDelay != "undefined" && typeof value.jitterBufferEmittedCount != "undefined") {
                  audioJitterAverageDelay = value.jitterBufferDelay / value.jitterBufferEmittedCount;
                }
              } else if (value.type == "track" && typeof value.kind != "undefined" && value.kind == "video") {
                if (typeof value.frameWidth != "undefined") {
                  frameWidth = value.frameWidth;
                }

                if (typeof value.frameHeight != "undefined") {
                  frameHeight = value.frameHeight;
                }

                if (typeof value.framesDecoded != "undefined") {
                  framesDecoded = value.framesDecoded;
                }

                if (typeof value.framesDropped != "undefined") {
                  framesDropped = value.framesDropped;
                }

                if (typeof value.framesReceived != "undefined") {
                  framesReceived = value.framesReceived;
                }

                if (typeof value.jitterBufferDelay != "undefined" && typeof value.jitterBufferEmittedCount != "undefined") {
                  videoJitterAverageDelay = value.jitterBufferDelay / value.jitterBufferEmittedCount;
                }
              } else if (value.type == "remote-inbound-rtp" && typeof value.kind != "undefined") {
                if (typeof value.packetsLost != "undefined") {
                  if (value.kind == "video") {
                    //this is the packetsLost for publishing
                    videoPacketsLost = value.packetsLost;
                  } else if (value.kind == "audio") {
                    //this is the packetsLost for publishing
                    audioPacketsLost = value.packetsLost;
                  }
                }

                if (typeof value.roundTripTime != "undefined") {
                  if (value.kind == "video") {
                    videoRoundTripTime = value.roundTripTime;
                  } else if (value.kind == "audio") {
                    audioRoundTripTime = value.roundTripTime;
                  }
                }

                if (typeof value.jitter != "undefined") {
                  if (value.kind == "video") {
                    videoJitter = value.jitter;
                  } else if (value.kind == "audio") {
                    audioJitter = value.jitter;
                  }
                }
              } else if (value.type == "media-source") {
                if (value.kind == "video") {
                  //returns video source dimensions, not necessarily dimensions being encoded by browser
                  width = value.width;
                  height = value.height;
                  fps = value.framesPerSecond;
                }
              }
            });
            _this34.remotePeerConnectionStats[streamId].totalBytesReceived = bytesReceived;
            _this34.remotePeerConnectionStats[streamId].videoPacketsLost = videoPacketsLost;
            _this34.remotePeerConnectionStats[streamId].audioPacketsLost = audioPacketsLost;
            _this34.remotePeerConnectionStats[streamId].fractionLost = fractionLost;
            _this34.remotePeerConnectionStats[streamId].currentTime = currentTime;
            _this34.remotePeerConnectionStats[streamId].totalBytesSent = bytesSent;
            _this34.remotePeerConnectionStats[streamId].totalVideoPacketsSent = videoPacketsSent;
            _this34.remotePeerConnectionStats[streamId].totalAudioPacketsSent = audioPacketsSent;
            _this34.remotePeerConnectionStats[streamId].audioLevel = audioLevel;
            _this34.remotePeerConnectionStats[streamId].qualityLimitationReason = qlr;
            _this34.remotePeerConnectionStats[streamId].totalFramesEncoded = framesEncoded;
            _this34.remotePeerConnectionStats[streamId].resWidth = width;
            _this34.remotePeerConnectionStats[streamId].resHeight = height;
            _this34.remotePeerConnectionStats[streamId].srcFps = fps;
            _this34.remotePeerConnectionStats[streamId].frameWidth = frameWidth;
            _this34.remotePeerConnectionStats[streamId].frameHeight = frameHeight;
            _this34.remotePeerConnectionStats[streamId].videoRoundTripTime = videoRoundTripTime;
            _this34.remotePeerConnectionStats[streamId].videoJitter = videoJitter;
            _this34.remotePeerConnectionStats[streamId].audioRoundTripTime = audioRoundTripTime;
            _this34.remotePeerConnectionStats[streamId].audioJitter = audioJitter;
            _this34.remotePeerConnectionStats[streamId].framesDecoded = framesDecoded;
            _this34.remotePeerConnectionStats[streamId].framesDropped = framesDropped;
            _this34.remotePeerConnectionStats[streamId].framesReceived = framesReceived;
            _this34.remotePeerConnectionStats[streamId].videoJitterAverageDelay = videoJitterAverageDelay;
            _this34.remotePeerConnectionStats[streamId].audioJitterAverageDelay = audioJitterAverageDelay;

            _this34.notifyEventListeners("updated_stats", _this34.remotePeerConnectionStats[streamId]);
          });
        }
        /**
         * Called to start a periodic timer to get statistics periodically (5 seconds) for a specific stream.
         *
         *     streamId: unique id for the stream
         */
        ;

        _proto4.enableStats = function enableStats(streamId) {
          var _this35 = this;

          if (this.remotePeerConnectionStats[streamId] == null) {
            this.remotePeerConnectionStats[streamId] = new PeerStats(streamId);
            this.remotePeerConnectionStats[streamId].timerId = setInterval(function () {
              _this35.getStats(streamId);
            }, 5000);
          }
        }
        /**
         * Called to stop the periodic timer which is set by @enableStats
         *
         *     streamId: unique id for the stream
         */
        ;

        _proto4.disableStats = function disableStats(streamId) {
          if (this.remotePeerConnectionStats[streamId] != null || typeof this.remotePeerConnectionStats[streamId] != 'undefined') {
            clearInterval(this.remotePeerConnectionStats[streamId].timerId);
          }
        }
        /**
         * Called to check and start Web Socket connection if it is not started
         */
        ;

        _proto4.checkWebSocketConnection = function checkWebSocketConnection() {
          var _this36 = this;

          if (this.webSocketAdaptor == null || this.webSocketAdaptor.isConnected() == false && this.webSocketAdaptor.isConnecting() == false) {
            this.webSocketAdaptor = new WebSocketAdaptor({
              websocket_url: this.websocketURL,
              webrtcadaptor: this,
              callback: function callback(info, obj) {
                if (info == "closed") {
                  _this36.reconnectIfRequired();
                }

                _this36.notifyEventListeners(info, obj);
              },
              callbackError: function callbackError(error, message) {
                _this36.notifyErrorEventListeners(error, message);
              },
              debug: this.debug
            });
          }
        }
        /**
         * Called to stop Web Socket connection
         * After calling this function, create new WebRTCAdaptor instance, don't use the the same object
         * Because all streams are closed on server side as well when websocket connection is closed.
         */
        ;

        _proto4.closeWebSocket = function closeWebSocket() {
          for (var key in this.remotePeerConnection) {
            this.closePeerConnection(key);
          } //free the remote peer connection by initializing again


          this.remotePeerConnection = new Array();
          this.webSocketAdaptor.close();
        }
        /**
         * Called to send a text message to other peer in the peer-to-peer sessionnnection is closed.
         */
        ;

        _proto4.peerMessage = function peerMessage(streamId, definition, data) {
          var jsCmd = {
            command: "peerMessageCommand",
            streamId: streamId,
            definition: definition,
            data: data
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to force AMS to send the video with the specified resolution in case of Adaptive Streaming (ABR) enabled.
         * Normally the resolution is automatically determined by AMS according to the network condition.
         *     streamId: unique id for the stream
         *   resolution: default is auto. You can specify any height value from the ABR list.
         */
        ;

        _proto4.forceStreamQuality = function forceStreamQuality(streamId, resolution) {
          var jsCmd = {
            command: "forceStreamQuality",
            streamId: streamId,
            streamHeight: resolution
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called to send data via DataChannel. DataChannel should be enabled on AMS settings.
         *     streamId: unique id for the stream
         *   data: data that you want to send. It may be a text (may in Json format or not) or binary
         */
        ;

        _proto4.sendData = function sendData(streamId, data) {
          var CHUNK_SIZE = 16000;

          if (this.remotePeerConnection[streamId] !== undefined) {
            var dataChannel = this.remotePeerConnection[streamId].dataChannel;
            var length = data.length || data.size || data.byteLength;
            var sent = 0;

            if (typeof data === 'string' || data instanceof String) {
              dataChannel.send(data);
            } else {
              var token = Math.floor(Math.random() * 999999);
              var header = new Int32Array(2);
              header[0] = token;
              header[1] = length;
              dataChannel.send(header);
              var sent = 0;

              while (sent < length) {
                var size = Math.min(length - sent, CHUNK_SIZE);
                var buffer = new Uint8Array(size + 4);
                var tokenArray = new Int32Array(1);
                tokenArray[0] = token;
                buffer.set(new Uint8Array(tokenArray.buffer, 0, 4), 0);
                var chunk = data.slice(sent, sent + size);
                buffer.set(new Uint8Array(chunk), 4);
                sent += size;
                dataChannel.send(buffer);
              }
            }
          } else {
            console.warn("Send data is called for undefined peer connection with stream id: " + streamId);
          }
        }
        /**
         * Called by user
         * to add SoundMeter to a stream (remote stream)
         * to measure audio level. This sound Meters are added to a map with the key of StreamId.
         * When user called @getSoundLevelList, the instant levels are provided.
         *
         * This list can be used to add a sign to talking participant
         * in conference room. And also to determine the dominant audio to focus that player.
         * @param {*} stream
         * @param {*} streamId
         */
        ;

        _proto4.enableAudioLevel = function enableAudioLevel(stream, streamId) {
          var soundMeter = new SoundMeter(this.audioContext); // Put variables in global scope to make them available to the
          // browser console.

          soundMeter.connectToSource(stream, null, function (e) {
            if (e) {
              alert(e);
              return;
            }

            console.log("Added sound meter for stream: " + streamId + " = " + soundMeter.instant.toFixed(2));
          });
          this.soundMeters[streamId] = soundMeter;
        }
        /**
         * Called by the user
         * to get the audio levels for the streams for the provided StreamIds
         *
         * @param {*} streamsList
         */
        ;

        _proto4.getSoundLevelList = function getSoundLevelList(streamsList) {
          for (var i = 0; i < streamsList.length; i++) {
            this.soundLevelList[streamsList[i]] = this.soundMeters[streamsList[i]].instant.toFixed(2);
          }

          this.notifyEventListeners("gotSoundList", this.soundLevelList);
        }
        /**
         * Called media manaher to get video/audio sender for the local peer connection
         *
         * @param {*} streamId :
         * @param {*} type : "video" or "audio"
         * @returns
         */
        ;

        _proto4.getSender = function getSender(streamId, type) {
          var sender = null;

          if (this.remotePeerConnection[streamId] != null) {
            sender = this.remotePeerConnection[streamId].getSenders().find(function (s) {
              return s.track.kind == type;
            });
          }

          return sender;
        }
        /**
         * Called by user
         *
         * @param {*} videoTrackId : track id associated with pinned video
         * @param {*} streamId : streamId of the pinned video
         * @param {*} enabled : true | false
         * @returns
         */
        ;

        _proto4.assignVideoTrack = function assignVideoTrack(videoTrackId, streamId, enabled) {
          var jsCmd = {
            command: "assignVideoTrackCommand",
            streamId: streamId,
            videoTrackId: videoTrackId,
            enabled: enabled
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called by user
         * video tracks may be less than the participants count
         * so these parameters are used for assigning video tracks to participants.
         * This message is used to make pagination in conference.
         *
         * @param {*} offset : start index for participant list to play
         * @param {*} size : number of the participants to play
         * @returns
         */
        ;

        _proto4.updateVideoTrackAssignments = function updateVideoTrackAssignments(streamId, offset, size) {
          var jsCmd = {
            streamId: streamId,
            command: "updateVideoTrackAssignmentsCommand",
            offset: offset,
            size: size
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called by user
         * This message is used to set max video track count in a conference.
         *
         * @param {*} maxTrackCount : maximum video track count
         * @returns
         */
        ;

        _proto4.setMaxVideoTrackCount = function setMaxVideoTrackCount(streamId, maxTrackCount) {
          var jsCmd = {
            streamId: streamId,
            command: "setMaxVideoTrackCountCommand",
            maxTrackCount: maxTrackCount
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * Called by user
         * This message is used to send audio level in a conference.
         *
         * @param {*} value : audio lavel
         * @returns
         */
        ;

        _proto4.updateAudioLevel = function updateAudioLevel(streamId, value) {
          var jsCmd = {
            streamId: streamId,
            eventType: "UPDATE_AUDIO_LEVEL",
            audioLevel: value
          };
          this.sendData(streamId, JSON.stringify(jsCmd));
        }
        /**
         * Called by user
         * This message is used to get debug data from server for debugging purposes in conference.
         *
         * @returns
         */
        ;

        _proto4.getDebugInfo = function getDebugInfo(streamId) {
          var jsCmd = {
            streamId: streamId,
            command: "getDebugInfo"
          };
          this.webSocketAdaptor.send(JSON.stringify(jsCmd));
        }
        /**
         * The following messages are forwarded to MediaManager. They are also kept here because of backward compatibility.
         * You can find the details about them in media_manager.js
         */
        ;

        _proto4.turnOffLocalCamera = function turnOffLocalCamera(streamId) {
          this.mediaManager.turnOffLocalCamera(streamId);
        };

        _proto4.turnOnLocalCamera = function turnOnLocalCamera(streamId) {
          return this.mediaManager.turnOnLocalCamera(streamId);
        };

        _proto4.muteLocalMic = function muteLocalMic() {
          this.mediaManager.muteLocalMic();
        };

        _proto4.unmuteLocalMic = function unmuteLocalMic() {
          this.mediaManager.unmuteLocalMic();
        };

        _proto4.switchDesktopCapture = function switchDesktopCapture(streamId) {
          return this.mediaManager.switchDesktopCapture(streamId);
        }
        /**
         * Switch to Video camera capture again. Updates the video track on the fly as well.
         * @param {string} streamId
         * @param {string} deviceId
         * @returns {Promise}
         */
        ;

        _proto4.switchVideoCameraCapture = function switchVideoCameraCapture(streamId, deviceId) {
          return this.mediaManager.switchVideoCameraCapture(streamId, deviceId);
        }
        /**
         * Update video track of the stream. Updates the video track on the fly as well.
         * @param {string} stream
         * @param {string} streamId
         * @param {function} onEndedCallback
         * @param {boolean} stopDesktop
         * @returns {Promise}
         */
        ;

        _proto4.updateVideoTrack = function updateVideoTrack(stream, streamId, onEndedCallback, stopDesktop) {
          return this.mediaManager.updateVideoTrack(stream, streamId, onEndedCallback, stopDesktop);
        }
        /**
         * Called by User
         * to switch between front and back camera on mobile devices
         *
         * @param {*} streamId Id of the stream to be changed.
         * @param {*} facingMode it can be ""user" or "environment"
         *
         * This method is used to switch front and back camera.
         */
        ;

        _proto4.switchVideoCameraFacingMode = function switchVideoCameraFacingMode(streamId, facingMode) {
          return this.mediaManager.switchVideoCameraFacingMode(streamId, facingMode);
        };

        _proto4.switchDesktopCaptureWithCamera = function switchDesktopCaptureWithCamera(streamId) {
          return this.mediaManager.switchDesktopCaptureWithCamera(streamId);
        };

        _proto4.switchAudioInputSource = function switchAudioInputSource(streamId, deviceId) {
          return this.mediaManager.switchAudioInputSource(streamId, deviceId);
        };

        _proto4.setVolumeLevel = function setVolumeLevel(volumeLevel) {
          this.mediaManager.setVolumeLevel(volumeLevel);
        };

        _proto4.enableAudioLevelForLocalStream = function enableAudioLevelForLocalStream(levelCallback, period) {
          this.mediaManager.enableAudioLevelForLocalStream(levelCallback, period);
        };

        _proto4.applyConstraints = function applyConstraints(constraints) {
          return this.mediaManager.applyConstraints(constraints);
        };

        _proto4.changeBandwidth = function changeBandwidth(bandwidth, streamId) {
          this.mediaManager.changeBandwidth(bandwidth, streamId);
        };

        _proto4.enableAudioLevelWhenMuted = function enableAudioLevelWhenMuted() {
          this.mediaManager.enableAudioLevelWhenMuted();
        };

        _proto4.disableAudioLevelWhenMuted = function disableAudioLevelWhenMuted() {
          this.mediaManager.disableAudioLevelWhenMuted();
        };

        _proto4.getVideoSender = function getVideoSender(streamId) {
          return this.mediaManager.getVideoSender(streamId);
        };

        _proto4.openStream = function openStream(mediaConstraints) {
          return this.mediaManager.openStream(mediaConstraints);
        };

        _proto4.closeStream = function closeStream() {
          return this.mediaManager.closeStream();
        };

        return WebRTCAdaptor;
      }();
      /* The Information Callbacks Called by This Class */
      //TODO:

      /* The Error Callbacks Called by This Class */
      //TODO:


      _defineProperty(WebRTCAdaptor, "pluginInitMethods", new Array());

      exports.WebRTCAdaptor = WebRTCAdaptor;
    });
  });

  var defaults = {
    sdpConstraints: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true
    },
    mediaConstraints: {
      video: false,
      audio: false
    }
  }; // const Component = videojs.getComponent('Component');

  /**
   * An advanced Video.js plugin for playing WebRTC stream from Ant Media Server
   *
   * Test Scenario #1
   * 1. Publish a stream from a WebRTC endpoint to Ant Media Server
   * 2. Play the stream with WebRTC
   * 3. Restart publishing the stream
   * 4. It should play automatically
   *
   * Test Scenario #2
   * 1. Publish a stream from a WebRTC endpoint to Ant Media Server
   * 2. Let the server return error(highresourceusage, etc.)
   * 3. WebSocket should be disconnected and play should try again
   *
   * Test Scenario #3
   * 1. Show error message if packet lost and jitter and RTT is high
   */

  var WebRTCHandler = /*#__PURE__*/function () {
    /**
     * Create a WebRTC source handler instance.
     *
     * @param  {Object} source
     *         Source object that is given in the DOM, includes the stream URL
     *
     * @param  {Object} [options]
     *         Options include:
     *            ICE Server
     *            Tokens
     *            Subscriber ID
     *            Subscriber code
     */
    function WebRTCHandler(source, tech, options) {
      var _this = this;

      this.player = videojs__default['default'](options.playerId);

      if (!this.player.hasOwnProperty('sendDataViaWebRTC')) {
        Object.defineProperty(this.player, 'sendDataViaWebRTC', {
          value: function value(data) {
            _this.webRTCAdaptor.sendData(_this.source.streamName, data);
          }
        });
      }

      this.isPlaying = false;
      this.disposed = false;
      this.initiateWebRTCAdaptor(source, options);
      this.player.ready(function () {
        _this.player.addClass('videojs-webrtc-plugin');
      });
      this.player.on('playing', function () {
        if (_this.player.el().getElementsByClassName('vjs-custom-spinner').length) {
          _this.player.el().removeChild(_this.player.spinner);
        }
      });
      videojs__default['default'].registerComponent('ResolutionMenuButton', ResolutionMenuButton);
      videojs__default['default'].registerComponent('ResolutionMenuItem', ResolutionMenuItem);
    }
    /**
     * Initiate WebRTCAdaptor.
     *
     * @param  {Object} [options]
     * An optional options object.
     *
     */


    var _proto = WebRTCHandler.prototype;

    _proto.initiateWebRTCAdaptor = function initiateWebRTCAdaptor(source, options) {
      var _this2 = this;

      this.options = videojs__default['default'].mergeOptions(defaults, options);
      this.source = source;
      this.source.pcConfig = {
        iceServers: JSON.parse(source.iceServers)
      }; // replace the stream name with websocket url

      this.source.mediaServerUrl = source.src.replace(source.src.split('/').at(-1), 'websocket'); // get the stream name from the url

      this.source.streamName = source.src.split('/').at(-1).split('.webrtc')[0];
      this.source.token = this.getUrlParameter('token');
      this.source.subscriberId = this.getUrlParameter('subscriberId');
      this.source.subscriberCode = this.getUrlParameter('subscriberCode');
      this.source.reconnect = this.source.reconnect === undefined ? true : this.source.reconnect;
      this.webRTCAdaptor = new webrtc_adaptor.WebRTCAdaptor({
        websocketURL: this.source.mediaServerUrl,
        mediaConstraints: this.source.mediaConstraints,
        pcConfig: this.source.pcConfig,
        isPlayMode: true,
        sdpConstraints: this.source.sdpConstraints,
        reconnectIfRequiredFlag: this.source.reconnect,
        callback: function callback(info, obj) {
          if (_this2.disposed) {
            return;
          }

          _this2.player.trigger('webrtc-info', {
            obj: obj,
            info: info
          });

          switch (info) {
            case ANT_CALLBACKS.INITIALIZED:
              {
                _this2.play();

                break;
              }

            case ANT_CALLBACKS.ICE_CONNECTION_STATE_CHANGED:
              {
                break;
              }

            case ANT_CALLBACKS.PLAY_STARTED:
              {
                _this2.joinStreamHandler(obj);

                _this2.isPlaying = true;

                _this2.player.trigger('play');

                break;
              }

            case ANT_CALLBACKS.PLAY_FINISHED:
              {
                _this2.leaveStreamHandler(obj);

                _this2.isPlaying = false;

                _this2.player.trigger('ended');

                break;
              }

            case ANT_CALLBACKS.STREAM_INFORMATION:
              {
                _this2.streamInformationHandler(obj);

                break;
              }

            case ANT_CALLBACKS.RESOLUTION_CHANGE_INFO:
              {
                _this2.resolutionChangeHandler(obj);

                break;
              }

            case ANT_CALLBACKS.DATA_RECEIVED:
              {
                _this2.player.trigger('webrtc-data-received', {
                  obj: obj
                });

                break;
              }

            case ANT_CALLBACKS.DATACHANNEL_NOT_OPEN:
              {
                break;
              }

            case ANT_CALLBACKS.NEW_TRACK_AVAILABLE:
              {
                var vid = _this2.player.tech().el();

                if (vid.srcObject !== obj.stream) {
                  vid.srcObject = obj.stream;
                }

                break;
              }
          }
        },
        callbackError: function callbackError(error) {
          if (_this2.disposed) {
            return;
          } // some of the possible errors, NotFoundError, SecurityError,PermissionDeniedError


          var ModalDialog = videojs__default['default'].getComponent('ModalDialog');

          if (_this2.errorModal) {
            _this2.errorModal.close();
          }

          _this2.errorModal = new ModalDialog(_this2.player, {
            content: "ERROR: " + JSON.stringify(error),
            temporary: true,
            pauseOnOpen: false,
            uncloseable: true
          });

          _this2.player.addChild(_this2.errorModal);

          _this2.errorModal.open();

          _this2.errorModal.setTimeout(function () {
            return _this2.errorModal.close();
          }, 3000);

          _this2.player.trigger('webrtc-error', {
            error: error
          });
        }
      });
    }
    /**
     * after websocket success connection.
     */
    ;

    _proto.play = function play() {
      this.webRTCAdaptor.play(this.source.streamName, this.source.token, null, null, this.source.subscriberId, this.source.subscriberCode, null);
    }
    /**
     * after joined stream handler
     *
     * @param {Object} obj callback artefacts
     */
    ;

    _proto.joinStreamHandler = function joinStreamHandler(obj) {
      this.webRTCAdaptor.getStreamInfo(this.source.streamName);
    }
    /**
     * after left stream.
     */
    ;

    _proto.leaveStreamHandler = function leaveStreamHandler() {
      // reset stream resolutions in dropdown
      this.player.resolutions = [];
      this.player.controlBar.getChild('ResolutionMenuButton').update();
    }
    /**
     * stream information handler.
     *
     * @param {Object} obj callback artefacts
     */
    ;

    _proto.streamInformationHandler = function streamInformationHandler(obj) {
      var streamResolutions = obj.streamInfo.reduce(function (unique, item) {
        return unique.includes(item.streamHeight) ? unique : [].concat(unique, [item.streamHeight]);
      }, []).sort(function (a, b) {
        return b - a;
      });
      this.player.resolutions = streamResolutions.map(function (resolution) {
        return {
          label: resolution,
          value: resolution
        };
      });
      this.player.selectedResolution = 0;
      this.addResolutionButton();
    };

    _proto.addResolutionButton = function addResolutionButton() {
      var controlBar = this.player.controlBar;
      var fullscreenToggle = controlBar.getChild('fullscreenToggle').el();

      if (controlBar.getChild('ResolutionMenuButton')) {
        controlBar.removeChild('ResolutionMenuButton');
      }

      controlBar.el().insertBefore(controlBar.addChild('ResolutionMenuButton', {
        plugin: this,
        streamName: this.source.streamName
      }).el(), fullscreenToggle);
    }
    /**
     * change resolution handler.
     *
     * @param {Object} obj callback artefacts
     */
    ;

    _proto.resolutionChangeHandler = function resolutionChangeHandler(obj) {
      var _this3 = this;

      // eslint-disable-next-line no-undef
      this.player.spinner = document.createElement('div');
      this.player.spinner.className = 'vjs-custom-spinner';
      this.player.el().appendChild(this.player.spinner);
      this.player.pause();
      this.player.setTimeout(function () {
        if (_this3.player.el().getElementsByClassName('vjs-custom-spinner').length) {
          _this3.player.el().removeChild(_this3.player.spinner);

          _this3.player.play();
        }
      }, 2000);
    };

    _proto.changeStreamQuality = function changeStreamQuality(value) {
      this.webRTCAdaptor.forceStreamQuality(this.source.streamName, value);
      this.player.selectedResolution = value;
      this.player.controlBar.getChild('ResolutionMenuButton').update();
    }
    /**
     * get url parameter
     *
     * @param {string} param callback event info
     */
    ;

    _proto.getUrlParameter = function getUrlParameter(param) {
      if (this.source.src.includes('?')) {
        var urlParams = this.source.src.split('?')[1].split('&').reduce(function (p, e) {
          var a = e.split('=');
          p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
          return p;
        }, {}) || {};
        return urlParams[param];
      }

      return null;
    };

    _proto.dispose = function dispose() {
      this.disposed = true;

      if (this.webRTCAdaptor) {
        this.webRTCAdaptor.stop(this.source.streamName);
        this.webRTCAdaptor.closeWebSocket();
        this.webRTCAdaptor = null;
      }
    };

    return WebRTCHandler;
  }();

  var webRTCSourceHandler = {
    name: 'videojs-webrtc-plugin',
    VERSION: '1.1',
    canHandleSource: function canHandleSource(srcObj, options) {
      if (options === void 0) {
        options = {};
      }

      var localOptions = videojs__default['default'].mergeOptions(videojs__default['default'].options, options);
      localOptions.source = srcObj.src;
      return webRTCSourceHandler.canPlayType(srcObj.type, localOptions);
    },
    handleSource: function handleSource(source, tech, options) {
      if (options === void 0) {
        options = {};
      }

      var localOptions = videojs__default['default'].mergeOptions(videojs__default['default'].options, options); // setting the src already dispose the component, no need to dispose it again

      tech.webrtc = new WebRTCHandler(source, tech, localOptions);
      return tech.webrtc;
    },
    canPlayType: function canPlayType(type, options) {
      if (options === void 0) {
        options = {};
      }

      var mediaUrl = options.source;
      var regex = /\.webrtc.*$/;
      var isMatch = regex.test(mediaUrl);

      if (isMatch) {
        return 'maybe';
      }

      return '';
    }
  }; // register source handlers with the appropriate techs

  videojs__default['default'].getTech('Html5').registerSourceHandler(webRTCSourceHandler, 0);
  var plugin = {
    WebRTCHandler: WebRTCHandler,
    webRTCSourceHandler: webRTCSourceHandler
  };

  return plugin;

})));
