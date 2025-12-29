/**
 * The role of the client in a session.
 * - `publisher`: sends local media to Ant Media Server
 * - `viewer`: receives remote media from Ant Media Server
 */
export type Role = "publisher" | "viewer";

/**
 * Common configuration shared across client implementations.
 */
export interface BaseClientOptions {
  /** WebSocket signaling URL (e.g. wss://host:5443/App/websocket) */
  websocketURL?: string;
  /** HTTP REST endpoint of Ant Media (used as fallback by signaling layer) */
  httpEndpointUrl?: string;
  /** If true, initializes in play-only mode and skips getUserMedia */
  isPlayMode?: boolean;
  /** If true, creates data-only sessions without capturing audio/video locally */
  onlyDataChannel?: boolean;
  /** Default media constraints used for getUserMedia */
  mediaConstraints?: MediaStreamConstraints;
  /** Local preview element for publisher (srcObject will be assigned) */
  localVideo?: HTMLVideoElement | null;
  /** Remote element to render incoming media (viewer side) */
  remoteVideo?: HTMLVideoElement | null;
  /** Optional preconfigured MediaManager instance for advanced integrations */
  mediaManager?: import("./media-manager.js").MediaManager;
  /** Enable verbose logging */
  debug?: boolean;
  /** Enable automatic reconnection on ICE failure/disconnect (default: true) */
  autoReconnect?: boolean;
  /** Configure reconnect backoff; defaults used when omitted */
  reconnectConfig?: {
    backoff?: "fixed" | "exp";
    baseMs?: number;
    maxMs?: number;
    jitter?: number; // 0..1
  };
  /** If true, sanitize string data-channel messages by escaping HTML brackets */
  sanitizeDataChannelStrings?: boolean;
}

/**
 * Options to configure {@link WebRTCClient}.
 */
export interface WebRTCClientOptions extends BaseClientOptions {}

export interface StreamingClientOptions extends BaseClientOptions {}

export interface ConferenceClientOptions extends BaseClientOptions {}

export interface ConferencePublishOptions {
  streamId: string;
  roomId: string;
  token?: string;
  subscriberId?: string;
  subscriberCode?: string;
  streamName?: string;
  metaData?: unknown;
  role?: string;
}

export interface ConferencePlayOptions {
  streamId: string;
  roomId?: string;
  token?: string;
  enableTracks?: string[];
  subscriberId?: string;
  subscriberCode?: string;
  subscriberName?: string;
  metaData?: unknown;
  role?: string;
  userPublishId?: string;
  disableTracksByDefault?: boolean;
}

/**
 * Options for the one-liner {@link WebRTCClient.join} flow.
 */
export interface JoinOptions {
  /** Whether to publish or view a stream */
  role: Role;
  /** Unique stream identifier */
  streamId: string;
  /** Optional JWT/token for secured streams */
  token?: string;
  /** Optional subscriber identification fields */
  subscriberId?: string;
  subscriberCode?: string;
  /** Optional metadata fields propagated to server */
  streamName?: string;
  mainTrack?: string;
  metaData?: unknown;
  roomId?: string;
  /** Track configuration helpers */
  enableTracks?: string[];
  disableTracksByDefault?: boolean;
  /** Timeout for join to resolve before rejecting */
  timeoutMs?: number;
}

/**
 * Result returned by {@link WebRTCClient.join} when connection is established.
 */
export interface JoinResult {
  /** Stream identifier */
  streamId: string;
  /**
   * ICE state or first-track state observed that marks the session ready.
   * - `connected` | `completed`: ICE connected
   * - `track_added`: first remote or local track became active
   */
  state: "connected" | "completed" | "track_added";
}

/**
 * Convenience structure of media devices grouped by kind.
 */
export interface GroupedDevices {
  videoInputs: Array<{ deviceId: string; label: string }>;
  audioInputs: Array<{ deviceId: string; label: string }>;
  audioOutputs: Array<{ deviceId: string; label: string }>;
  /** Currently selected input device ids, when available */
  selectedVideoInputId?: string;
  selectedAudioInputId?: string;
  selectedAudioOutputId?: string;
}

export interface RoomJoinOptions {
  roomId: string;
  streamId?: string;
  role?: string;
  metaData?: unknown;
  streamName?: string;
  mode?: "mcu" | "amcu" | "multitrack";
  timeoutMs?: number;
}

export interface UpdateVideoTrackAssignmentsOptions {
  streamId: string;
  offset: number;
  size: number;
}

export interface PlaySelectiveOptions {
  streamId: string;
  token?: string;
  roomId?: string;
  enableTracks?: string[];
  subscriberId?: string;
  subscriberCode?: string;
  metaData?: unknown;
  role?: string;
  disableTracksByDefault?: boolean;
}
