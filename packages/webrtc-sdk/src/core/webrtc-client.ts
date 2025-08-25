/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger } from "../utils/logger.js";

import { Emitter } from "./emitter.js";
import type { EventMap } from "./events.js";
import type {
  GroupedDevices,
  JoinOptions,
  JoinResult,
  WebRTCClientOptions,
  RoomJoinOptions,
  PlaySelectiveOptions,
} from "./types.js";
import { WebSocketAdaptor } from "./websocket-adaptor.js";
import { MediaManager } from "./media-manager.js";

interface PeerContext {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  mode?: "publish" | "play";
  videoSender?: RTCRtpSender;
  audioSender?: RTCRtpSender;
}

/**
 * Ant Media Server WebRTC client SDK (v2).
 *
 * This class is the primary entry point you should use in applications. It
 * orchestrates local media (via {@link MediaManager}), signaling (via
 * {@link WebSocketAdaptor}), and peer connections, and exposes a modern,
 * promise-based API with typed events.
 *
 * Guidance:
 * - Prefer using the methods on {@link WebRTCClient} (publish, play, join,
 *   listDevices, selectVideoInput, startScreenShare, sendData, getStats, …).
 * - The lower-level classes {@link WebSocketAdaptor} and {@link MediaManager}
 *   are composed internally. Use them directly only for advanced
 *   customizations (e.g., custom signaling transport, bespoke media capture
 *   flows). For most apps, you should never need to instantiate or call them
 *   yourself.
 *
 * Quick start:
 * ```ts
 * const sdk = new WebRTCClient({ websocketURL, mediaConstraints: { audio: true, video: true }, localVideo });
 * await sdk.join({ role: 'publisher', streamId: 's1' });
 * sdk.on('publish_started', ({ streamId }) => console.log('publishing', streamId));
 * ```
 */
export class WebRTCClient extends Emitter<EventMap> {
  // ===== Plugin API (v2 style) =====
  static pluginInitMethods: Array<(sdk: WebRTCClient) => void> = [];
  static register(initMethod: (sdk: WebRTCClient) => void): void {
    WebRTCClient.pluginInitMethods.push(initMethod);
  }
  /**
   * One-liner session helper. Creates a client, awaits ready, joins, and returns both.
   * Example:
   * ```ts
   * const { client } = await WebRTCClient.createSession({
   *   websocketURL: getWebSocketURL('wss://host:5443/App/websocket'),
   *   role: 'viewer',
   *   streamId: 's1',
   *   remoteVideo,
   *   autoPlay: true,
   * });
   * ```
   */
  static async createSession(
    opts: import("./types.js").WebRTCClientOptions &
      Pick<import("./types.js").JoinOptions, "role" | "streamId" | "token" | "timeoutMs"> & {
        /** Attempt to play() on the provided media element after join */
        autoPlay?: boolean;
      }
  ): Promise<{ client: WebRTCClient; result: import("./types.js").JoinResult }> {
    const client = new WebRTCClient(opts);
    await client.ready();
    const result = await client.join({
      role: opts.role,
      streamId: opts.streamId,
      token: opts.token,
      timeoutMs: opts.timeoutMs,
    });
    if (opts.autoPlay && opts.remoteVideo) {
      try {
        await opts.remoteVideo.play();
      } catch {
        // ignore autoplay errors (e.g., user gesture required)
      }
    }
    return { client, result };
  }
  private ws?: WebSocketAdaptor;
  private media: MediaManager;
  private isReady = false;
  isPlayMode: boolean;
  private onlyDataChannel = false;
  private peers: Map<string, PeerContext> = new Map();
  private log = new Logger("debug");
  private peerConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun1.l.google.com:19302" }],
  };
  private remoteDescriptionSet: Map<string, boolean> = new Map();
  private candidateQueue: Map<string, RTCIceCandidateInit[]> = new Map();
  private remoteVideo: HTMLVideoElement | null;
  private candidateTypes: Array<"udp" | "tcp"> = ["udp", "tcp"];
  private rxChunks: Map<number, { expected: number; received: number; buffers: Uint8Array[] }> =
    new Map();
  private autoReconnect = true;
  private reconnectConfig: {
    backoff: "fixed" | "exp";
    baseMs: number;
    maxMs: number;
    jitter: number;
  } = {
    backoff: "exp",
    baseMs: 500,
    maxMs: 8000,
    jitter: 0.2,
  };
  private sanitizeDcStrings = false;
  private activeStreams: Map<string, { mode: "publish" | "play"; token?: string }> = new Map();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private lastReconnectAt: Map<string, number> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private audioContext: AudioContext | null = null;
  private remoteMeters: Map<
    string,
    {
      analyser: AnalyserNode;
      timer: ReturnType<typeof setInterval>;
      data: Uint8Array;
      source: MediaStreamAudioSourceNode;
    }
  > = new Map();

  /**
   * Create a new adaptor instance.
   * @param opts See {@link WebRTCClientOptions}
   */
  constructor(opts: WebRTCClientOptions) {
    super();
    this.isPlayMode = !!opts.isPlayMode;
    this.autoReconnect = opts.autoReconnect ?? true;
    this.sanitizeDcStrings = !!opts.sanitizeDataChannelStrings;
    this.onlyDataChannel = !!opts.onlyDataChannel;
    if (opts.reconnectConfig) {
      this.reconnectConfig = {
        backoff: opts.reconnectConfig.backoff ?? this.reconnectConfig.backoff,
        baseMs: opts.reconnectConfig.baseMs ?? this.reconnectConfig.baseMs,
        maxMs: opts.reconnectConfig.maxMs ?? this.reconnectConfig.maxMs,
        jitter: opts.reconnectConfig.jitter ?? this.reconnectConfig.jitter,
      };
    }
    this.media = new MediaManager({
      mediaConstraints: opts.mediaConstraints,
      localVideo: opts.localVideo,
    });
    this.remoteVideo = opts.remoteVideo ?? null;

    this.media.on("devices_updated", g => this.emit("devices_updated", g));
    this.media.on("local_tracks_changed", () => {
      void this.applyLocalTracks();
    });

    if (!this.isPlayMode && !this.onlyDataChannel) {
      this.media.initLocalStream().catch(() => {
        this.emit("error", { error: "getUserMediaIsNotAllowed" });
      });
    }

    if (opts.websocketURL || opts.httpEndpointUrl) {
      this.ws = new WebSocketAdaptor({
        websocketURL: opts.websocketURL,
        httpEndpointUrl: opts.httpEndpointUrl,
        webrtcadaptor: {
          notifyEventListeners: (info: string, obj?: unknown) =>
            this.notify(info as keyof EventMap, obj as never),
        },
        debug: opts.debug,
      });
      this.on("initialized", () => {
        this.isReady = true;
        this.log.info("adaptor initialized");
        this.ws?.send(JSON.stringify({ command: "getIceServerConfig" }));
      });
    }

    // Initialize plugins
    for (const init of WebRTCClient.pluginInitMethods) {
      try {
        init(this);
      } catch (e) {
        this.log.warn("plugin init failed", e);
      }
    }
  }

  private notify<E extends keyof EventMap>(info: E, obj: EventMap[E]): void {
    if (info === "initialized") this.isReady = true;

    if (info === "start") {
      const { streamId } = obj as unknown as { streamId: string };

      this.log.debug("start received for %s", streamId);
      void this.startPublishing(streamId);
    } else if (info === "takeConfiguration") {
      const { streamId, sdp, type } = obj as unknown as {
        streamId: string;
        sdp: string;
        type: RTCSdpType;
      };

      this.log.debug("takeConfiguration %s %s", streamId, type);
      if (type === "answer") {
        const ctx = this.peers.get(streamId);

        if (ctx) {
          ctx.pc.setRemoteDescription(new RTCSessionDescription({ type, sdp })).then(() => {
            this.remoteDescriptionSet.set(streamId, true);
            const queued = this.candidateQueue.get(streamId) || [];
            queued.forEach(c => ctx.pc.addIceCandidate(new RTCIceCandidate(c)));
            this.candidateQueue.set(streamId, []);
          });
        }
      } else if (type === "offer") {
        const pc = this.createPeer(streamId);
        pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }))
          .then(async () => {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.sendTakeConfiguration(streamId, answer.type, answer.sdp ?? "");
            this.remoteDescriptionSet.set(streamId, true);

            const queued = this.candidateQueue.get(streamId) || [];
            queued.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
            this.candidateQueue.set(streamId, []);
            this.emit("play_started", { streamId });
          })
          .catch(e => this.log.warn("setRemoteDescription failed", e));
      }
    } else if (info === "takeCandidate") {
      const { streamId, label, candidate } = obj as unknown as {
        streamId: string;
        label: number | null;
        candidate: string;
      };

      this.log.debug("takeCandidate %s", streamId);
      const ice: RTCIceCandidateInit = { sdpMLineIndex: label ?? undefined, candidate };
      const ctx = this.peers.get(streamId);

      if (ctx) {
        if (this.remoteDescriptionSet.get(streamId)) {
          ctx.pc
            .addIceCandidate(new RTCIceCandidate(ice))
            .catch(e => this.log.warn("addIceCandidate failed", e));
        } else {
          const q = this.candidateQueue.get(streamId) || [];
          q.push(ice);
          this.candidateQueue.set(streamId, q);
        }
      }
    } else if (info === "iceServerConfig") {
      const cfg = obj as unknown as {
        stunServerUri?: string;
        turnServerUsername?: string;
        turnServerCredential?: string;
      };

      if (cfg.stunServerUri) {
        if (cfg.stunServerUri.startsWith("turn:")) {
          this.peerConfig.iceServers = [
            { urls: "stun:stun1.l.google.com:19302" },
            {
              urls: cfg.stunServerUri,
              username: cfg.turnServerUsername || "",
              credential: cfg.turnServerCredential || "",
            },
          ];
        } else if (cfg.stunServerUri.startsWith("stun:")) {
          this.peerConfig.iceServers = [{ urls: cfg.stunServerUri }];
        }
        this.log.info("updated ice servers");
      }
    } else if (info === "stop") {
      const { streamId } = obj as unknown as { streamId: string };

      this.log.info("stop received for %s", streamId);
      this.stop(streamId);
    } else if (info === "notification") {
      const payload = obj as unknown as {
        definition?: string;
        streamId?: string;
        [k: string]: unknown;
      };
      const def = payload.definition || "";
      const streamId = payload.streamId || "";

      if (def === "publish_started") this.emit("publish_started", { streamId });
      if (def === "publish_finished") this.emit("publish_finished", { streamId });
      if (def === "play_started") this.emit("play_started", { streamId });
      if (def === "play_finished") this.emit("play_finished", { streamId });
      if (def === "subscriberCount") this.emit("subscriber_count" as keyof EventMap, obj as never);
      if (def === "subscriberList") this.emit("subscriber_list" as keyof EventMap, obj as never);
      if (def === "roomInformation") this.emit("room_information" as keyof EventMap, obj as never);
      if (def === "broadcastObject") this.emit("broadcast_object" as keyof EventMap, obj as never);
      if (def === "videoTrackAssignmentList")
        this.emit("video_track_assignments" as keyof EventMap, obj as never);
      if (def === "streamInformation")
        this.emit("stream_information" as keyof EventMap, obj as never);
      if (def === "trackList") this.emit("track_list" as keyof EventMap, obj as never);
      if (def === "subtrackList") this.emit("subtrack_list" as keyof EventMap, obj as never);
      if (def === "subtrackCount") this.emit("subtrack_count" as keyof EventMap, obj as never);
      if (def === "joinedTheRoom") this.emit("room_joined" as keyof EventMap, obj as never);
      if (def === "leavedTheRoom") this.emit("room_left" as keyof EventMap, obj as never);
      // Also emit dynamic channel for other notifications
      if (def) this.emit(`notification:${def}` as keyof EventMap, obj as never);
    } else if (info === "closed") {
      this.emit("closed", obj);
      return; // prevent double-emit below
    } else if (info === "server_will_stop") {
      this.emit("server_will_stop", obj);
      return; // prevent double-emit below
    }

    this.emit(info, obj);
  }

  /**
   * Resolves when underlying signaling is initialized and ready.
   */
  async ready(): Promise<void> {
    if (this.isReady) return;
    await new Promise<void>(resolve => {
      this.once("initialized", () => resolve());
    });
  }

  private createPeer(streamId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.peerConfig);
    pc.onicecandidate = ev => {
      if (ev.candidate && this.ws) {
        const cand = ev.candidate.candidate || "";
        // protocol filtering similar to v1
        const protocolSupported = this.candidateTypes.some(p => cand.toLowerCase().includes(p));
        if (!protocolSupported && cand !== "") {
          this.log.debug("Skipping candidate due to protocol filter: %s", cand);
          return;
        }
        const msg = {
          command: "takeCandidate",
          streamId,
          label: ev.candidate.sdpMLineIndex ?? 0,
          id: ev.candidate.sdpMid,
          candidate: ev.candidate.candidate,
        };
        this.log.debug("send candidate %s", streamId);
        this.ws.send(JSON.stringify(msg));
      }
    };
    pc.oniceconnectionstatechange = () => {
      this.log.info("ice state %s %s", streamId, pc.iceConnectionState);
      this.emit("ice_connection_state_changed", { state: pc.iceConnectionState, streamId });
      // Reconnect strategy similar to v1
      if (!this.autoReconnect) return;

      if (!this.activeStreams.has(streamId)) return;
      const state = pc.iceConnectionState;

      if (state === "failed" || state === "closed") {
        this.reconnectIfRequired(streamId, 0, false);
      } else if (state === "disconnected") {
        this.reconnectIfRequired(streamId, 3000, false);
      }
    };

    pc.ontrack = (event: RTCTrackEvent) => {
      this.log.debug("ontrack %s", streamId);
      const stream = event.streams[0];
      if (this.remoteVideo && this.remoteVideo.srcObject !== stream) {
        this.remoteVideo.srcObject = stream;
      }
      if (stream) this.remoteStreams.set(streamId, stream);
      this.emit("newTrackAvailable", { stream, track: event.track, streamId });
    };

    this.peers.set(streamId, { pc });
    return pc;
  }

  private setupDataChannel(streamId: string, dc: RTCDataChannel): void {
    const ctx = this.peers.get(streamId);
    if (ctx) ctx.dc = dc;
    // Prefer ArrayBuffer delivery for binary frames
    try {
      (dc as unknown as { binaryType?: string }).binaryType = "arraybuffer";
    } catch (e) {
      this.log.warn("setting binaryType failed", e);
    }
    dc.onerror = error => {
      this.log.warn("data channel error", error);
      if (dc.readyState !== "closed")
        this.emit("error", { error: "data_channel_error", message: error });
    };
    dc.onopen = () => {
      this.log.debug("data channel opened %s", streamId);
      this.emit("data_channel_opened", { streamId });
    };
    dc.onclose = () => {
      this.log.debug("data channel closed %s", streamId);
      this.emit("data_channel_closed", { streamId });
    };
    dc.onmessage = event => {
      const raw = event.data;
      const processBuffer = (u8: Uint8Array) => {
        if (u8.byteLength === 8) {
          // header [token:int32, total:int32]
          const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
          const token = view.getInt32(0, true);
          const total = view.getInt32(4, true);
          this.rxChunks.set(token, { expected: total, received: 0, buffers: [] });
          return;
        }

        if (u8.byteLength >= 4) {
          const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
          const token = view.getInt32(0, true);
          const dataPart = u8.subarray(4);
          const st = this.rxChunks.get(token);

          if (!st) {
            // Not a chunked transfer we know; pass through
            this.emit("data_received", {
              streamId,
              data: u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength),
            });
            return;
          }
          st.buffers.push(dataPart);
          st.received += dataPart.byteLength;

          if (st.received >= st.expected) {
            const full = new Uint8Array(st.expected);
            let offset = 0;
            for (const b of st.buffers) {
              full.set(b, offset);
              offset += b.byteLength;
            }
            this.rxChunks.delete(token);
            this.emit("data_received", { streamId, data: full.buffer });
          }
          return;
        }
        // Fallback
        this.emit("data_received", {
          streamId,
          data: u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength),
        });
      };

      if (typeof raw === "string") {
        const text = this.sanitizeDcStrings ? raw.replace(/</g, "&lt;").replace(/>/g, "&gt;") : raw;
        this.emit("data_received", { streamId, data: text });
        return;
      }
      // Blob (WebKit) → ArrayBuffer
      if (typeof Blob !== "undefined" && raw instanceof Blob) {
        raw
          .arrayBuffer()
          .then(ab => processBuffer(new Uint8Array(ab)))
          .catch(() => {
            this.emit("error", { error: "data_channel_blob_parse_failed", message: raw });
          });
        return;
      }
      // ArrayBuffer
      if (raw instanceof ArrayBuffer) {
        processBuffer(new Uint8Array(raw));
        return;
      }
      // TypedArray/DataView
      if (ArrayBuffer.isView(raw)) {
        const view = raw as ArrayBufferView;
        processBuffer(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
        return;
      }
      // Unknown type, forward as-is
      this.emit("data_received", { streamId, data: raw });
    };
  }

  private async startPublishing(streamId: string): Promise<void> {
    const pc = this.peers.get(streamId)?.pc ?? this.createPeer(streamId);
    const stream = this.media.getLocalStream();
    if (!stream && !this.onlyDataChannel) throw new Error("no_local_stream");

    if (!this.onlyDataChannel && pc.getSenders().length === 0 && stream) {
      for (const track of stream.getTracks()) {
        const sender = pc.addTrack(track, stream);
        if (track.kind === "video") (this.peers.get(streamId) as any).videoSender = sender;
        if (track.kind === "audio") (this.peers.get(streamId) as any).audioSender = sender;
      }
    } else {
      // Refresh cached senders if missing
      const ctx = this.peers.get(streamId);
      if (ctx) {
        const senders = pc.getSenders();
        ctx.videoSender = ctx.videoSender || senders.find(s => s.track?.kind === "video");
        ctx.audioSender = ctx.audioSender || senders.find(s => s.track?.kind === "audio");
      }
    }

    // create data channel in publish mode like v1
    try {
      const dc = pc.createDataChannel
        ? pc.createDataChannel(streamId, { ordered: true })
        : undefined;
      if (dc) this.setupDataChannel(streamId, dc);
    } catch (e) {
      this.log.warn("createDataChannel not supported", e);
    }
    const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    this.sendTakeConfiguration(streamId, offer.type, offer.sdp ?? "");
  }

  private sendTakeConfiguration(streamId: string, type: RTCSdpType, sdp: string): void {
    if (!this.ws) return;
    const msg = { command: "takeConfiguration", streamId, type, sdp };
    this.log.debug("send takeConfiguration %s %s", streamId, type);
    this.ws.send(JSON.stringify(msg));
    if (type === "offer") {
      this.emit("publish_started", { streamId });
    }
  }

  /**
   * Start publishing local tracks to the server for the given stream.
   * Sends a `publish` command first; upon `start` from server, creates SDP offer.
   *
   * Example:
   * ```ts
   * const sdk = new WebRTCClient({ websocketURL, mediaConstraints: { audio: true, video: true } });
   * await sdk.publish('stream1', 'OPTIONAL_TOKEN');
   * sdk.on('publish_started', ({ streamId }) => console.log('publishing', streamId));
   * ```
   */
  async publish(streamId: string, token?: string): Promise<void> {
    await this.ready();

    this.log.info("publish %s", streamId);
    this.activeStreams.set(streamId, { mode: "publish", token });

    const stream = this.media.getLocalStream();
    const hasVideo = this.onlyDataChannel ? false : !!stream && stream.getVideoTracks().length > 0;
    const hasAudio = this.onlyDataChannel ? false : !!stream && stream.getAudioTracks().length > 0;

    if (this.ws) {
      const jsCmd = {
        command: "publish",
        streamId,
        token: token ?? "",
        video: hasVideo,
        audio: hasAudio,
      };
      this.log.debug("send publish %s", streamId);
      this.ws.send(JSON.stringify(jsCmd));
    }
  }

  /**
   * Start playing the given stream. The server will send an SDP offer that we answer.
   *
   * Example:
   * ```ts
   * const sdk = new WebRTCClient({ websocketURL, isPlayMode: true, remoteVideo });
   * await sdk.play('stream1');
   * sdk.on('play_started', ({ streamId }) => console.log('playing', streamId));
   * ```
   */
  async play(streamId: string, token?: string): Promise<void> {
    await this.ready();

    this.log.info("play %s", streamId);
    this.activeStreams.set(streamId, { mode: "play", token });

    const pc = this.createPeer(streamId);
    // data channel for player: server opens it
    pc.ondatachannel = ev => this.setupDataChannel(streamId, ev.channel);
    const ctx = this.peers.get(streamId);
    if (ctx) ctx.mode = "play";

    if (this.ws) {
      const jsCmd = {
        command: "play",
        streamId,
        token: token ?? "",
        room: "",
        trackList: [],
        subscriberId: "",
        subscriberCode: "",
        viewerInfo: "",
        role: "",
        userPublishId: "",
      };
      this.ws.send(JSON.stringify(jsCmd));
    }
  }

  /**
   * Selective play helper to fetch only specific subtracks and/or default-disable tracks.
   *
   * Example:
   * ```ts
   * await sdk.playSelective({
   *   streamId: 'mainStreamId',
   *   enableTracks: ['camera_user1', 'screen_user2'],
   *   disableTracksByDefault: true,
   * });
   * ```
   */
  async playSelective(opts: PlaySelectiveOptions): Promise<void> {
    await this.ready();

    this.log.info("playSelective %s", opts.streamId);
    this.activeStreams.set(opts.streamId, { mode: "play", token: opts.token });

    const pc = this.createPeer(opts.streamId);
    pc.ondatachannel = ev => this.setupDataChannel(opts.streamId, ev.channel);

    if (this.ws) {
      const jsCmd = {
        command: "play",
        streamId: opts.streamId,
        token: opts.token ?? "",
        room: opts.roomId ?? "",
        trackList: opts.enableTracks ?? [],
        subscriberId: opts.subscriberId ?? "",
        subscriberCode: opts.subscriberCode ?? "",
        viewerInfo: opts.metaData ?? "",
        role: opts.role ?? "",
        userPublishId: "",
        disableTracksByDefault: opts.disableTracksByDefault ?? false,
      } as any;
      this.ws.send(JSON.stringify(jsCmd));
    }
  }

  /**
   * Stop an active stream (publish or play) and close its peer connection.
   */
  stop(streamId: string): void {
    const ctx = this.peers.get(streamId);
    if (ctx) {
      try {
        ctx.pc.close();
      } catch (e) {
        this.log.warn("pc.close failed", e);
      }
      this.peers.delete(streamId);
    }
    // mark as intentionally stopped; prevents reconnect
    this.activeStreams.delete(streamId);

    if (this.ws) {
      this.ws.send(JSON.stringify({ command: "stop", streamId }));
    }
    // optimistic finish events
    this.emit("publish_finished", { streamId });
    this.emit("play_finished", { streamId });
  }

  /** Configure reconnect backoff at runtime. */
  configureReconnect(
    cfg: Partial<{ backoff: "fixed" | "exp"; baseMs: number; maxMs: number; jitter: number }>
  ): void {
    this.reconnectConfig = { ...this.reconnectConfig, ...cfg } as typeof this.reconnectConfig;
  }

  /**
   * High-level one-liner to start a session. Resolves when ICE connects or first track is added.
   *
   * Examples:
   * ```ts
   * // Publish
   * const sdk = new WebRTCClient({ websocketURL, mediaConstraints: { audio: true, video: true } });
   * await sdk.join({ role: 'publisher', streamId: 's1', token: 'OPTIONAL' });
   *
   * // Play
   * const viewer = new WebRTCClient({ websocketURL, isPlayMode: true, remoteVideo });
   * await viewer.join({ role: 'viewer', streamId: 's1' });
   * ```
   */
  async join(options: JoinOptions): Promise<JoinResult> {
    await this.ready();
    const timeout = options.timeoutMs ?? 15000;

    return await new Promise<JoinResult>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("join_timeout")), timeout);
      const onIce = (obj: EventMap["ice_connection_state_changed"]) => {
        if (
          obj.streamId === options.streamId &&
          (obj.state === "connected" || obj.state === "completed")
        ) {
          cleanup();
          resolve({ streamId: options.streamId, state: obj.state });
        }
      };
      const onPlayStarted = (obj: EventMap["play_started"]) => {
        cleanup();
        resolve({ streamId: obj.streamId, state: "track_added" });
      };
      const onPublishStarted = (obj: EventMap["publish_started"]) => {
        cleanup();
        resolve({ streamId: obj.streamId, state: "track_added" });
      };
      const onErr = () => {
        cleanup();
        reject(new Error("join_failed"));
      };
      const cleanup = () => {
        clearTimeout(to);
        this.off("ice_connection_state_changed", onIce);
        this.off("play_started", onPlayStarted);
        this.off("publish_started", onPublishStarted);
        this.off("error", onErr);
      };
      this.on("ice_connection_state_changed", onIce);
      this.on("play_started", onPlayStarted);
      this.on("publish_started", onPublishStarted);
      this.on("error", onErr);

      if (options.role === "publisher") {
        this.publish(options.streamId, options.token).catch(onErr);
      } else {
        this.play(options.streamId, options.token).catch(onErr);
      }
    });
  }

  /**
   * Enumerate and group available media devices.
   */
  async listDevices(): Promise<GroupedDevices> {
    return this.media.listDevices();
  }

  /**
   * Set audio output device (sinkId) for a media element (or local preview by default).
   * If the browser does not support sinkId, an `error` event with code `set_sink_id_unsupported` is emitted.
   */
  async setAudioOutput(deviceId: string, element?: HTMLMediaElement | null): Promise<void> {
    await this.media.setAudioOutput(deviceId, element);
  }

  /**
   * Switch the active camera. Uses replaceTrack under the hood for ongoing sessions.
   *
   * Examples:
   * ```ts
   * // By deviceId
   * await sdk.selectVideoInput('abcd-device-id');
   *
   * // By facingMode (mobile)
   * await sdk.selectVideoInput({ facingMode: 'environment' });
   * ```
   */
  async selectVideoInput(source: string | { facingMode: "user" | "environment" }): Promise<void> {
    await this.media.selectVideoInput(source);
    await this.applyLocalTracks();
  }

  /**
   * Switch the active microphone. Uses replaceTrack under the hood for ongoing sessions.
   *
   * Example:
   * ```ts
   * await sdk.selectAudioInput('mic-device-id');
   * ```
   */
  async selectAudioInput(deviceId: string): Promise<void> {
    await this.media.selectAudioInput(deviceId);
    // If camera is disabled, there may be no video track; still ensure audio sender gets replaced
    await this.applyLocalTracks();
  }

  /** Pause sending local track(s) without renegotiation. */
  pauseTrack(kind: "audio" | "video"): void {
    this.media.pauseLocalTrack(kind);
  }

  /** Resume sending local track(s) without renegotiation. */
  resumeTrack(kind: "audio" | "video"): void {
    this.media.resumeLocalTrack(kind);
  }

  /**
   * Join a room for conference/multitrack scenarios.
   *
   * Example:
   * ```ts
   * await sdk.joinRoom({ roomId: 'my-room', streamId: 'publisher1' });
   * ```
   */
  async joinRoom(opts: RoomJoinOptions): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    const jsCmd = {
      command: "joinRoom",
      room: opts.roomId,
      mainTrack: opts.roomId,
      streamId: opts.streamId ?? "",
      mode: "mcu",
      streamName: "",
      role: opts.role ?? "",
      metadata: opts.metaData ?? "",
    };
    this.ws.send(JSON.stringify(jsCmd));
  }

  /**
   * Leave a previously joined room.
   *
   * Example:
   * ```ts
   * await sdk.leaveRoom('my-room', 'publisher1');
   * ```
   */
  async leaveRoom(roomId: string, streamId?: string): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    const jsCmd = {
      command: "leaveFromRoom",
      room: roomId,
      mainTrack: roomId,
      streamId: streamId ?? "",
    };
    this.ws.send(JSON.stringify(jsCmd));
  }

  /**
   * Enable/disable a specific track under a main track on the server.
   *
   * Example:
   * ```ts
   * sdk.enableTrack('mainStreamId', 'camera_user3', true);
   * ```
   */
  async enableTrack(mainTrackId: string, trackId: string, enabled: boolean): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    const jsCmd = {
      command: "enableTrack",
      streamId: mainTrackId,
      trackId,
      enabled,
    };
    this.ws.send(JSON.stringify(jsCmd));
  }

  /**
   * Force the stream quality to a given height for ABR scenarios.
   *
   * Example:
   * ```ts
   * sdk.forceStreamQuality('mainStreamId', 720); // or 'auto'
   * ```
   */
  async forceStreamQuality(streamId: string, height: number | "auto"): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    const jsCmd = {
      command: "forceStreamQuality",
      streamId,
      streamHeight: height === "auto" ? "auto" : height,
    };
    this.ws.send(JSON.stringify(jsCmd));
  }

  /**
   * Begin screen sharing by replacing the outgoing video track; auto-restores when the share ends.
   *
   * Example:
   * ```ts
   * await sdk.startScreenShare();
   * ```
   */
  async startScreenShare(): Promise<void> {
    await this.media.startScreenShare();
    await this.applyLocalTracks();
  }

  /**
   * Stop screen sharing and restore the camera track.
   */
  async stopScreenShare(): Promise<void> {
    await this.media.stopScreenShare();
    await this.applyLocalTracks();
  }

  /** Begin screen share with camera overlay (canvas composition). */
  async startScreenWithCameraOverlay(): Promise<void> {
    await this.media.startScreenWithCameraOverlay();
    await this.applyLocalTracks();
  }

  /** Stop screen+camera overlay and restore camera track. */
  async stopScreenWithCameraOverlay(): Promise<void> {
    await this.media.stopScreenWithCameraOverlay();
    await this.applyLocalTracks();
  }

  /**
   * Turn off camera hardware: stop local camera track and detach from sender without renegotiation.
   */
  async turnOffLocalCamera(): Promise<void> {
    this.media.turnOffLocalCamera();
    // Replace with black dummy track similar to v1 (keeps sender alive)
    for (const ctx of this.peers.values()) {
      const primary = ctx.videoSender;
      let sender = primary as RTCRtpSender | undefined;
      if (!sender) sender = ctx.pc.getSenders().find(s => s.track && s.track.kind === "video");
      if (!sender) continue;
      try {
        const stream = this.media.getLocalStream();
        const blackTrack = stream?.getVideoTracks()[0] || null;
        await sender.replaceTrack(blackTrack);
      } catch (e) {
        this.log.warn("replaceTrack(black) failed", e);
      }
    }
  }

  /**
   * Turn on camera hardware: reacquire a camera track if needed and reattach to sender without renegotiation.
   */
  async turnOnLocalCamera(): Promise<void> {
    await this.media.turnOnLocalCamera();
    await this.applyLocalTracks();
  }

  /** Mute local microphone (pause audio track). */
  muteLocalMic(): void {
    this.media.muteLocalMic();
  }

  /** Unmute local microphone (resume audio track). */
  unmuteLocalMic(): void {
    this.media.unmuteLocalMic();
  }

  /**
   * Set outgoing audio volume for the published stream (0..1).
   * This controls what remote peers hear by applying a GainNode to the audio track.
   * @param level Value between 0.0 (mute) and 1.0 (full volume)
   */
  setVolumeLevel(level: number): void {
    this.media.setVolumeLevel(level);
  }

  /**
   * Enable local audio level metering.
   * Emits sampled RMS levels to the provided callback at the specified interval.
   * @param callback Function receiving a level value (0..1 approx)
   * @param periodMs Sampling interval in milliseconds (default 200ms)
   */
  async enableAudioLevelForLocalStream(
    callback: (level: number) => void,
    periodMs = 200
  ): Promise<void> {
    await this.media.enableAudioLevelForLocalStream(callback, periodMs);
  }

  /** Disable the local audio level metering started by enableAudioLevelForLocalStream. */
  disableAudioLevelForLocalStream(): void {
    this.media.disableAudioLevelForLocalStream();
  }

  /**
   * Enable speaking detection while muted.
   * Useful to notify users when they are speaking but their mic is muted.
   * @param callback Called with true when level > threshold, else false
   * @param threshold Sensitivity threshold (default 0.1)
   */
  async enableAudioLevelWhenMuted(
    callback: (speaking: boolean) => void,
    threshold = 0.1
  ): Promise<void> {
    await this.media.enableAudioLevelWhenMuted(callback, threshold);
  }

  /** Disable speaking detection started by enableAudioLevelWhenMuted. */
  disableAudioLevelWhenMuted(): void {
    this.media.disableAudioLevelWhenMuted();
  }

  /**
   * Get a snapshot of WebRTC stats for a given stream and emit `updated_stats`.
   *
   * Example:
   * ```ts
   * const stats = await sdk.getStats('s1');
   * if (stats) {
   *   console.log('bytes sent', stats.totalBytesSent);
   * }
   * ```
   */
  async getStats(streamId: string): Promise<import("./peer-stats.js").PeerStats | false> {
    const ctx = this.peers.get(streamId);
    if (!ctx) return false;
    try {
      const stats = await ctx.pc.getStats();
      const ps = new (await import("./peer-stats.js")).PeerStats(streamId);
      let bytesSent = 0,
        bytesRecv = 0,
        now = 0;
      // iterate RTCStats entries and collect parity fields similar to v1
      stats.forEach(r => {
        // totals
        if (r.type === "outbound-rtp") {
          bytesSent += (r as any).bytesSent || 0;
          if ((r as any).packetsSent) {
            if ((r as any).kind === "audio") ps.audioPacketsSent = (r as any).packetsSent;
            if ((r as any).kind === "video") {
              ps.videoPacketsSent = (r as any).packetsSent;
              ps.frameWidth = (r as any).frameWidth ?? ps.frameWidth;
              ps.frameHeight = (r as any).frameHeight ?? ps.frameHeight;
              if ((r as any).framesEncoded != null) ps.framesEncoded = (r as any).framesEncoded;
            }
          }
          now = (r as any).timestamp || now;
        } else if (r.type === "inbound-rtp") {
          bytesRecv += (r as any).bytesReceived || 0;
          if ((r as any).packetsReceived) {
            if ((r as any).kind === "audio") ps.audioPacketsReceived = (r as any).packetsReceived;
            if ((r as any).kind === "video") ps.videoPacketsReceived = (r as any).packetsReceived;
          }
          now = (r as any).timestamp || now;
        } else if (r.type === "remote-inbound-rtp") {
          if ((r as any).kind === "audio") {
            if ((r as any).packetsLost != null) ps.audioPacketsLost = (r as any).packetsLost;
            if ((r as any).roundTripTime != null) ps.audioRoundTripTime = (r as any).roundTripTime;
            if ((r as any).jitter != null) ps.audioJitter = (r as any).jitter;
          } else if ((r as any).kind === "video") {
            if ((r as any).packetsLost != null) ps.videoPacketsLost = (r as any).packetsLost;
            if ((r as any).roundTripTime != null) ps.videoRoundTripTime = (r as any).roundTripTime;
            if ((r as any).jitter != null) ps.videoJitter = (r as any).jitter;
          }
        } else if (r.type === "track") {
          if ((r as any).kind === "video") {
            if ((r as any).frameWidth != null) ps.frameWidth = (r as any).frameWidth;
            if ((r as any).frameHeight != null) ps.frameHeight = (r as any).frameHeight;
            if ((r as any).framesDecoded != null) ps.framesDecoded = (r as any).framesDecoded;
            if ((r as any).framesDropped != null) ps.framesDropped = (r as any).framesDropped;
            if ((r as any).framesReceived != null) ps.framesReceived = (r as any).framesReceived;
          }
        } else if (r.type === "candidate-pair" && (r as any).state === "succeeded") {
          if ((r as any).availableOutgoingBitrate != null)
            ps.availableOutgoingBitrateKbps =
              ((r as any).availableOutgoingBitrate as number) / 1000;
          if ((r as any).currentRoundTripTime != null)
            ps.currentRoundTripTime = (r as any).currentRoundTripTime as number;
        }
      });
      ps.totalBytesSent = bytesSent;
      ps.totalBytesReceived = bytesRecv;
      ps.currentTimestamp = now;
      this.emit("updated_stats", ps);
      return ps;
    } catch {
      return false;
    }
  }

  /**
   * Periodically poll stats for the given stream and emit `updated_stats`.
   *
   * Example:
   * ```ts
   * sdk.on('updated_stats', (ps) => console.log('stats', ps));
   * sdk.enableStats('s1', 2000);
   * ```
   */
  enableStats(streamId: string, periodMs = 5000): void {
    const key = `__stats_${streamId}`;

    if ((this as any)[key]) return;

    (this as any)[key] = setInterval(() => {
      this.getStats(streamId);
    }, periodMs);
  }

  /** Stop periodic stats polling previously enabled by enableStats. */
  disableStats(streamId: string): void {
    const key = `__stats_${streamId}`;
    const timer = (this as unknown as Record<string, unknown>)[key] as unknown as
      | ReturnType<typeof setInterval>
      | undefined;
    if (timer) {
      clearInterval(timer);
      delete (this as unknown as Record<string, unknown>)[key];
    }
  }

  /**
   * Send data over the data channel. Strings are sent as-is; ArrayBuffers are chunked with backpressure.
   *
   * Examples:
   * ```ts
   * // Text message
   * sdk.sendData('s1', 'hello world');
   *
   * // Binary (ArrayBuffer)
   * const bytes = new Uint8Array([1,2,3,4]).buffer;
   * await sdk.sendData('s1', bytes);
   *
   * // Listen
   * sdk.on('data_received', ({ streamId, data }) => {
   *   if (typeof data === 'string') console.log('text', data);
   *   else console.log('binary', new Uint8Array(data));
   * });
   * ```
   */
  async sendData(streamId: string, data: string | ArrayBuffer): Promise<void> {
    const ctx = this.peers.get(streamId);
    if (!ctx || !ctx.dc) {
      this.log.warn("sendData: data channel not available for %s", streamId);
      throw new Error("data_channel_not_available");
    }
    const dc = ctx.dc;
    if (typeof data === "string") {
      dc.send(data);
      return;
    }
    // chunked binary similar to v1
    const CHUNK_SIZE = 16000;
    const length = (data as ArrayBuffer).byteLength;
    const token = Math.floor(Math.random() * 999999) | 0;
    const header = new Int32Array(2);
    header[0] = token;
    header[1] = length;
    dc.send(header);

    let sent = 0;
    // backpressure
    dc.bufferedAmountLowThreshold = 1 << 20; // 1MB
    while (sent < length) {
      const size = Math.min(length - sent, CHUNK_SIZE);
      const buffer = new Uint8Array(size + 4);
      const tokenArray = new Int32Array(1);
      tokenArray[0] = token;
      buffer.set(new Uint8Array(tokenArray.buffer, 0, 4), 0);
      const chunk = new Uint8Array(data as ArrayBuffer, sent, size);
      buffer.set(chunk, 4);
      // wait if congested
      if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
        await new Promise<void>(resolve => {
          const onlow = () => {
            (
              dc as unknown as {
                removeEventListener: (type: string, listener: (...args: unknown[]) => void) => void;
              }
            ).removeEventListener("bufferedamountlow", onlow);
            resolve();
          };
          (
            dc as unknown as {
              addEventListener: (
                type: string,
                listener: (...args: unknown[]) => void,
                options?: unknown
              ) => void;
            }
          ).addEventListener("bufferedamountlow", onlow, { once: true } as unknown);
        });
      }
      dc.send(buffer);
      sent += size;
    }
  }

  /** Convenience: send JSON over data channel (stringifies safely). */
  async sendJSON(streamId: string, obj: unknown): Promise<void> {
    try {
      const text = JSON.stringify(obj);
      await this.sendData(streamId, text);
    } catch (e) {
      this.log.warn("sendJSON stringify failed", e);
      throw e;
    }
  }

  /** Close signaling and all peers; emit closed. */
  close(): void {
    for (const streamId of Array.from(this.peers.keys())) {
      this.stop(streamId);
    }
    try {
      this.ws?.close();
    } catch (e) {
      this.log.warn("ws close failed", e);
    }
    this.emit("closed", undefined as unknown as never);
  }

  /** Toggle sanitization for incoming data-channel strings at runtime. */
  setSanitizeDataChannelStrings(enabled: boolean): void {
    this.sanitizeDcStrings = !!enabled;
  }

  private reconnectIfRequired(streamId: string, delayMs = 3000, forceReconnect = false): void {
    if (!this.autoReconnect) return;
    if (!this.activeStreams.has(streamId)) return;
    if (delayMs <= 0) delayMs = this.reconnectConfig.baseMs;
    if (this.reconnectTimers.has(streamId)) return;
    const now = Date.now();
    const last = this.lastReconnectAt.get(streamId) ?? 0;
    if (!forceReconnect && now - last < 1000) {
      delayMs = Math.max(delayMs, 1000);
    }
    // notify reconnection attempt similar to v1
    const mode = this.activeStreams.get(streamId)?.mode;
    if (mode === "publish")
      this.emit("reconnection_attempt_for_publisher" as keyof EventMap, { streamId } as never);
    else if (mode === "play")
      this.emit("reconnection_attempt_for_player" as keyof EventMap, { streamId } as never);
    const nextDelay = this.computeNextDelay(delayMs);
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(streamId);
      this.tryAgain(streamId, forceReconnect);
    }, nextDelay);
    this.reconnectTimers.set(streamId, timer);
  }

  private computeNextDelay(lastDelay: number): number {
    const { backoff, baseMs, maxMs, jitter } = this.reconnectConfig;
    let next =
      backoff === "exp"
        ? Math.min(maxMs, Math.max(baseMs, lastDelay * 2))
        : Math.min(maxMs, baseMs);
    if (jitter > 0) {
      const rand = 1 + (Math.random() * 2 - 1) * jitter; // 1±jitter
      next = Math.max(0, Math.floor(next * rand));
    }
    return next;
  }

  private tryAgain(streamId: string, _forceReconnect: boolean): void {
    this.lastReconnectAt.set(streamId, Date.now());
    if (_forceReconnect) {
      this.log.info("Force reconnect requested for %s", streamId);
    }
    const active = this.activeStreams.get(streamId);
    if (!active) return;
    // stop first to clean up
    try {
      this.stop(streamId);
    } catch (e) {
      this.log.warn("stop during reconnect failed", e);
    }
    setTimeout(() => {
      if (active.mode === "publish") {
        this.log.info("Re-publish attempt for %s", streamId);
        void this.publish(streamId, active.token).catch(e => this.log.warn("republish failed", e));
      } else {
        this.log.info("Re-play attempt for %s", streamId);
        void this.play(streamId, active.token).catch(e => this.log.warn("replay failed", e));
      }
    }, 500);
  }

  // ===== Parity signaling helpers (v1 compatibility) =====
  /** Instruct server to enable/disable a remote video track. */
  toggleVideo(streamId: string, trackId: string, enabled: boolean): void {
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "toggleVideo", streamId, trackId, enabled }));
  }

  /** Instruct server to enable/disable a remote audio track. */
  toggleAudio(streamId: string, trackId: string, enabled: boolean): void {
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "toggleAudio", streamId, trackId, enabled }));
  }

  /** Request stream info; listen on 'notification:streamInformation' or stream_information. */
  async getStreamInfo(streamId: string): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getStreamInfo", streamId }));
  }

  /** Request broadcast object; listen on 'notification:broadcastObject' or broadcast_object. */
  async getBroadcastObject(streamId: string): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getBroadcastObject", streamId }));
  }

  /** Request room info of roomId; optionally include streamId for context. */
  async getRoomInfo(roomId: string, streamId = ""): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getRoomInfo", room: roomId, streamId }));
  }

  /** Request track list under a main stream. */
  async getTracks(streamId: string, token = ""): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getTrackList", streamId, token }));
  }

  /** Request subtracks for a main stream with optional paging and role filter. */
  async getSubtracks(streamId: string, role = "", offset = 0, size = 50): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getSubtracks", streamId, role, offset, size }));
  }

  /** Request subtrack count for a main stream with optional role/status. */
  async getSubtrackCount(streamId: string, role = "", status = ""): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getSubtracksCount", streamId, role, status }));
  }

  /** Request current subscriber count; listen on subscriber_count. */
  async getSubscriberCount(streamId: string): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getSubscriberCount", streamId }));
  }

  /** Request current subscriber list; listen on subscriber_list. */
  async getSubscriberList(streamId: string, offset = 0, size = 50): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getSubscribers", streamId, offset, size }));
  }

  /** Peer-to-peer messaging helper. */
  peerMessage(streamId: string, definition: string, data: unknown): void {
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "peerMessageCommand", streamId, definition, data }));
  }

  /** Register a push notification token with AMS. */
  registerPushNotificationToken(
    subscriberId: string,
    authToken: string,
    pushToken: string,
    tokenType: "fcm" | "apn"
  ): void {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        command: "registerPushNotificationToken",
        subscriberId,
        token: authToken,
        pnsRegistrationToken: pushToken,
        pnsType: tokenType,
      })
    );
  }

  /** Send a push notification to specific subscribers. */
  sendPushNotification(
    subscriberId: string,
    authToken: string,
    pushNotificationContent: Record<string, unknown>,
    subscriberIdsToNotify: string[]
  ): void {
    if (!this.ws) return;
    if (typeof pushNotificationContent !== "object") {
      throw new Error("pushNotificationContent must be an object");
    }
    if (!Array.isArray(subscriberIdsToNotify)) {
      throw new Error("subscriberIdsToNotify must be an array");
    }
    this.ws.send(
      JSON.stringify({
        command: "sendPushNotification",
        subscriberId,
        token: authToken,
        pushNotificationContent,
        subscriberIdsToNotify,
      })
    );
  }

  /** Send a push notification to a topic. */
  sendPushNotificationToTopic(
    subscriberId: string,
    authToken: string,
    pushNotificationContent: Record<string, unknown>,
    topic: string
  ): void {
    if (!this.ws) return;
    if (typeof pushNotificationContent !== "object") {
      throw new Error("pushNotificationContent must be an object");
    }
    this.ws.send(
      JSON.stringify({
        command: "sendPushNotification",
        subscriberId,
        token: authToken,
        pushNotificationContent,
        topic,
      })
    );
  }

  /** Request video track assignments list for a main stream. */
  async requestVideoTrackAssignments(streamId: string): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "getVideoTrackAssignmentsCommand", streamId }));
  }

  /**
   * Assign/unassign a specific video track under a main stream.
   *
   * Example:
   * ```ts
   * // Show only a specific participant's camera
   * sdk.assignVideoTrack('mainStreamId', 'camera_user3', true);
   * // Hide it again
   * sdk.assignVideoTrack('mainStreamId', 'camera_user3', false);
   * ```
   */
  assignVideoTrack(streamId: string, videoTrackId: string, enabled: boolean): void {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        command: "assignVideoTrackCommand",
        streamId,
        videoTrackId,
        enabled,
      })
    );
  }

  /**
   * Update paginated video track assignments for UI pagination scenarios.
   *
   * Example:
   * ```ts
   * // Fetch next page of assignments (offset 20, size 10)
   * sdk.updateVideoTrackAssignments({ streamId: 'main', offset: 20, size: 10 });
   * ```
   */
  async updateVideoTrackAssignments(
    opts: import("./types.js").UpdateVideoTrackAssignmentsOptions
  ): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        command: "updateVideoTrackAssignmentsCommand",
        streamId: opts.streamId,
        offset: opts.offset,
        size: opts.size,
      })
    );
  }

  /**
   * Set the maximum number of video tracks for a main stream (conference pagination).
   *
   * Example:
   * ```ts
   * sdk.setMaxVideoTrackCount('mainStreamId', 9);
   * ```
   */
  async setMaxVideoTrackCount(streamId: string, maxTrackCount: number): Promise<void> {
    await this.ready();
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        command: "setMaxVideoTrackCountCommand",
        streamId,
        maxTrackCount,
      })
    );
  }

  /**
   * Change outbound video bandwidth (kbps) or 'unlimited' via RTCRtpSender.setParameters.
   *
   * Example:
   * ```ts
   * await sdk.changeBandwidth('s1', 600);     // limit to 600 kbps
   * await sdk.changeBandwidth('s1', 'unlimited');
   * ```
   */
  async changeBandwidth(streamId: string, bandwidth: number | "unlimited"): Promise<void> {
    const ctx = this.peers.get(streamId);
    if (!ctx) return;
    const sender = ctx.videoSender || ctx.pc.getSenders().find(s => s.track?.kind === "video");
    if (!sender) return;
    const params = sender.getParameters();
    params.encodings = params.encodings || [{}];
    if (bandwidth === "unlimited")
      delete (params.encodings[0] as Record<string, unknown>).maxBitrate;
    else (params.encodings[0] as Record<string, unknown>).maxBitrate = bandwidth * 1000;
    try {
      await sender.setParameters(params);
    } catch (e) {
      this.log.warn("setParameters(maxBitrate) failed", e);
    }
  }

  /**
   * Set degradationPreference for the video sender.
   *
   * Example:
   * ```ts
   * await sdk.setDegradationPreference('s1', 'maintain-framerate');
   * ```
   */
  async setDegradationPreference(
    streamId: string,
    preference: "maintain-framerate" | "maintain-resolution" | "balanced"
  ): Promise<void> {
    const ctx = this.peers.get(streamId);
    if (!ctx) return;
    const sender = ctx.videoSender || ctx.pc.getSenders().find(s => s.track?.kind === "video");
    if (!sender) return;
    const params = sender.getParameters();
    try {
      (params as unknown as { degradationPreference?: string }).degradationPreference = preference;
      await sender.setParameters(params);
      this.log.info("Degradation Preference set to %s", preference);
    } catch (e) {
      this.log.warn("setParameters(degradationPreference) failed", e);
    }
  }

  /** Update stream metadata on the server side. */
  updateStreamMetaData(streamId: string, metaData: unknown): void {
    if (!this.ws) return;
    this.ws.send(JSON.stringify({ command: "updateStreamMetaData", streamId, metaData }));
  }

  private async applyLocalTracks(): Promise<void> {
    const stream = this.media.getLocalStream();
    if (!stream) return;
    for (const ctx of this.peers.values()) {
      const senders = ctx.pc.getSenders();
      // v1 parity: update video first, then audio
      const videoTracks = stream.getVideoTracks();
      for (const track of videoTracks) {
        let sender =
          (track.kind === "video" ? ctx.videoSender : ctx.audioSender) ||
          senders.find(s => s.track && s.track.kind === track.kind);
        if (sender && sender.replaceTrack) {
          try {
            await sender.replaceTrack(track);
            if (track.kind === "video") ctx.videoSender = sender;
            if (track.kind === "audio") ctx.audioSender = sender;
          } catch (e) {
            this.log.warn("replaceTrack failed", e);
          }
        } else {
          try {
            sender = ctx.pc.addTrack(track, stream);
            if (track.kind === "video") ctx.videoSender = sender;
            if (track.kind === "audio") ctx.audioSender = sender;
          } catch (e) {
            this.log.warn("addTrack failed", e);
          }
        }
      }
      const audioTracks = stream.getAudioTracks();
      for (const track of audioTracks) {
        let sender = ctx.audioSender || senders.find(s => s.track && s.track.kind === "audio");
        if (sender && sender.replaceTrack) {
          try {
            await sender.replaceTrack(track);
            ctx.audioSender = sender;
          } catch (e) {
            this.log.warn("replaceTrack failed", e);
          }
        } else {
          try {
            sender = ctx.pc.addTrack(track, stream);
            ctx.audioSender = sender;
          } catch (e) {
            this.log.warn("addTrack failed", e);
          }
        }
      }
    }
  }

  // ===== Remote audio level metering (viewer side) =====
  /** Measure audio level for remote stream and invoke callback periodically. */
  async enableRemoteAudioLevel(
    streamId: string,
    callback: (level: number) => void,
    periodMs = 200
  ): Promise<void> {
    const stream =
      this.remoteStreams.get(streamId) ||
      (this.remoteVideo?.srcObject as MediaStream | null) ||
      null;
    if (!stream) return;
    if (!this.audioContext) this.audioContext = new AudioContext();
    const ctx = this.audioContext;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    if (this.remoteMeters.has(streamId)) this.disableRemoteAudioLevel(streamId);
    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      try {
        callback(rms);
      } catch (e) {
        this.log.warn("remote audio level callback failed", e);
      }
    }, periodMs);
    this.remoteMeters.set(streamId, { analyser, timer, data, source });
  }

  /** Stop remote audio level metering. */
  disableRemoteAudioLevel(streamId: string): void {
    const meter = this.remoteMeters.get(streamId);
    if (!meter) return;
    clearInterval(meter.timer);
    try {
      meter.source.disconnect();
    } catch (e) {
      this.log.warn("remote audio source disconnect failed", e);
    }
    try {
      meter.analyser.disconnect();
    } catch (e) {
      this.log.warn("remote audio analyser disconnect failed", e);
    }
    this.remoteMeters.delete(streamId);
  }
}
