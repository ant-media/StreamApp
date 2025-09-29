import { Logger } from "../utils/logger.js";

import { Emitter } from "../core/emitter.js";
import type { EventMap } from "../core/events.js";
import { MediaManager } from "../core/media-manager.js";
import type { BaseClientOptions, GroupedDevices } from "../core/types.js";
import { WebSocketAdaptor } from "../core/websocket-adaptor.js";

export interface PeerContext {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  videoSender?: RTCRtpSender;
  audioSender?: RTCRtpSender;
  mode?: StreamMode;
}

export type StreamMode = "publish" | "play";

export interface ActiveStreamInfo {
  mode: StreamMode;
  token?: string;
  roomId?: string;
  streamName?: string;
  metaData?: unknown;
  role?: string;
  subscriberId?: string;
  subscriberCode?: string;
  userPublishId?: string;
  enableTracks?: string[];
  disableTracksByDefault?: boolean;
}

interface ChunkState {
  expected: number;
  received: number;
  buffers: Uint8Array[];
}

interface RemoteAudioMeter {
  analyser: AnalyserNode;
  timer: ReturnType<typeof setInterval>;
  data: Uint8Array;
  source: MediaStreamAudioSourceNode;
}

interface ReconnectConfig {
  backoff: "fixed" | "exp";
  baseMs: number;
  maxMs: number;
  jitter: number;
}

/**
 * BaseClient
 *
 * Low-level WebRTC signaling and media management foundation used by higher-level clients
 * (e.g., {@link ConferenceClient}, {@link StreamingClient}).
 *
 * Responsibilities:
 * - Manages WebSocket signaling to Ant Media Server
 * - Creates/maintains per-stream RTCPeerConnections and DataChannels
 * - Applies local media tracks and exposes helpers to control devices and screen share
 * - Emits typed events described by {@link EventMap}
 * - Provides reconnection with backoff and per-stream tracking
 *
 * Consumers typically use concrete subclasses rather than instantiating this class directly.
 */
export abstract class BaseClient extends Emitter<EventMap> {
  static pluginInitMethods: Array<(sdk: BaseClient) => void> = [];

  static register(init: (sdk: BaseClient) => void): void {
    BaseClient.pluginInitMethods.push(init);
  }

  protected ws?: WebSocketAdaptor;
  protected media: MediaManager;
  protected get mediaManager(): MediaManager {
    return this.media;
  }
  protected log: Logger;
  protected isReady = false;
  protected isPlayMode: boolean;
  protected onlyDataChannel: boolean;
  protected sanitizeDcStrings: boolean;
  protected autoReconnect: boolean;
  protected reconnectConfig: ReconnectConfig = {
    backoff: "exp",
    baseMs: 500,
    maxMs: 8000,
    jitter: 0.2,
  };
  protected peers: Map<string, PeerContext> = new Map();
  protected peerConfig: RTCConfiguration = {
    iceServers: [{ urls: "stun:stun1.l.google.com:19302" }],
  };
  protected remoteDescriptionSet: Map<string, boolean> = new Map();
  protected candidateQueue: Map<string, RTCIceCandidateInit[]> = new Map();
  protected remoteVideo: HTMLVideoElement | null;
  protected candidateTypes: Array<"udp" | "tcp"> = ["udp", "tcp"];
  protected rxChunks: Map<number, ChunkState> = new Map();
  protected activeStreams: Map<string, ActiveStreamInfo> = new Map();
  protected reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  protected lastReconnectAt: Map<string, number> = new Map();
  protected remoteStreams: Map<string, MediaStream> = new Map();
  protected audioContext: AudioContext | null = null;
  protected remoteMeters: Map<string, RemoteAudioMeter> = new Map();
  protected idMapping: Record<string, Record<string, string>> = Object.create(null);

  constructor(opts: BaseClientOptions) {
    super();
    this.isPlayMode = !!opts.isPlayMode;
    this.onlyDataChannel = !!opts.onlyDataChannel;
    this.sanitizeDcStrings = !!opts.sanitizeDataChannelStrings;
    this.autoReconnect = opts.autoReconnect ?? true;
    this.remoteVideo = opts.remoteVideo ?? null;
    this.log = new Logger(opts.debug ? "debug" : "info");

    if (opts.reconnectConfig) {
      this.reconnectConfig = {
        backoff: opts.reconnectConfig.backoff ?? this.reconnectConfig.backoff,
        baseMs: opts.reconnectConfig.baseMs ?? this.reconnectConfig.baseMs,
        maxMs: opts.reconnectConfig.maxMs ?? this.reconnectConfig.maxMs,
        jitter: opts.reconnectConfig.jitter ?? this.reconnectConfig.jitter,
      };
    }

    this.media = opts.mediaManager ??
      new MediaManager({ mediaConstraints: opts.mediaConstraints, localVideo: opts.localVideo });

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
          notifyEventListeners: (info: string, obj?: unknown) => this.handleTransportEvent(info, obj),
        },
        debug: opts.debug,
      });
    }
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

  /**
   * Stop an active stream (publish or play) and close its peer connection.
   */
  stop(streamId: string): void {
    const ctx = this.peers.get(streamId);
    const active = this.activeStreams.get(streamId);
    const mode = (ctx && ctx.mode) || (active && active.mode);
    if (ctx) {
      try {
        ctx.pc.close();
      } catch (e) {
        this.log.warn("pc.close failed", e);
      }
      this.peers.delete(streamId);
    }
    this.clearActiveStream(streamId);

    if (this.ws) {
      this.sendCommand({ command: "stop", streamId });
    }
    if (mode === "publish") {
      this.emit("publish_finished", { streamId });
    } else if (mode === "play") {
      this.emit("play_finished", { streamId });
    } else {
      // fallback: emit both to preserve backward behavior when mode is unknown
      this.emit("publish_finished", { streamId });
      this.emit("play_finished", { streamId });
    }
  }

  /** Configure reconnect backoff at runtime. */
  configureReconnect(cfg: Partial<ReconnectConfig>): void {
    this.reconnectConfig = { ...this.reconnectConfig, ...cfg } as ReconnectConfig;
  }

  /** Enumerate and group available media devices. */
  async listDevices(): Promise<GroupedDevices> {
    return this.media.listDevices();
  }

  async setAudioOutput(deviceId: string, element?: HTMLMediaElement | null): Promise<void> {
    await this.media.setAudioOutput(deviceId, element);
  }

  async selectVideoInput(source: string | { facingMode: "user" | "environment" }): Promise<void> {
    await this.media.selectVideoInput(source);
    await this.applyLocalTracks();
  }

  async selectAudioInput(deviceId: string): Promise<void> {
    await this.media.selectAudioInput(deviceId);
    await this.applyLocalTracks();
  }

  pauseTrack(kind: "audio" | "video"): void {
    this.media.pauseLocalTrack(kind);
  }

  resumeTrack(kind: "audio" | "video"): void {
    this.media.resumeLocalTrack(kind);
  }

  async startScreenShare(): Promise<void> {
    await this.media.startScreenShare();
    await this.applyLocalTracks();
  }

  async stopScreenShare(): Promise<void> {
    await this.media.stopScreenShare();
    await this.applyLocalTracks();
  }

  async startScreenWithCameraOverlay(): Promise<void> {
    await this.media.startScreenWithCameraOverlay();
    await this.applyLocalTracks();
  }

  async stopScreenWithCameraOverlay(): Promise<void> {
    await this.media.stopScreenWithCameraOverlay();
    await this.applyLocalTracks();
  }

  async turnOffLocalCamera(): Promise<void> {
    this.media.turnOffLocalCamera();
    for (const ctx of this.peers.values()) {
      const primary = ctx.videoSender;
      let sender = primary ?? ctx.pc.getSenders().find(s => s.track?.kind === "video");
      if (!sender) continue;
      try {
        const stream = this.media.getLocalStream();
        const blackTrack = stream?.getVideoTracks()[0] ?? null;
        await sender.replaceTrack(blackTrack);
      } catch (e) {
        this.log.warn("replaceTrack(black) failed", e);
      }
    }
  }

  async turnOnLocalCamera(): Promise<void> {
    await this.media.turnOnLocalCamera();
    await this.applyLocalTracks();
  }

  muteLocalMic(): void {
    this.media.muteLocalMic();
  }

  unmuteLocalMic(): void {
    this.media.unmuteLocalMic();
  }

  setVolumeLevel(level: number): void {
    this.media.setVolumeLevel(level);
  }

  async enableAudioLevelForLocalStream(callback: (level: number) => void, periodMs = 200): Promise<void> {
    await this.media.enableAudioLevelForLocalStream(callback, periodMs);
  }

  disableAudioLevelForLocalStream(): void {
    this.media.disableAudioLevelForLocalStream();
  }

  async enableAudioLevelWhenMuted(callback: (speaking: boolean) => void, threshold = 0.1): Promise<void> {
    await this.media.enableAudioLevelWhenMuted(callback, threshold);
  }

  disableAudioLevelWhenMuted(): void {
    this.media.disableAudioLevelWhenMuted();
  }

  async getStats(streamId: string): Promise<import("../core/peer-stats.js").PeerStats | false> {
    const ctx = this.peers.get(streamId);
    if (!ctx) return false;
    try {
      const stats = await ctx.pc.getStats();
      const ps = new (await import("../core/peer-stats.js")).PeerStats(streamId);
      let bytesSent = 0;
      let bytesRecv = 0;
      let now = 0;
      stats.forEach(r => {
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
          if ((r as any).availableOutgoingBitrate != null) {
            ps.availableOutgoingBitrateKbps = ((r as any).availableOutgoingBitrate as number) / 1000;
          }
          if ((r as any).currentRoundTripTime != null) {
            ps.currentRoundTripTime = (r as any).currentRoundTripTime as number;
          }
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

  enableStats(streamId: string, periodMs = 5000): void {
    const key = `__stats_${streamId}`;
    if ((this as any)[key]) return;
    (this as any)[key] = setInterval(() => {
      void this.getStats(streamId);
    }, periodMs);
  }

  disableStats(streamId: string): void {
    const key = `__stats_${streamId}`;
    const timer = (this as unknown as Record<string, unknown>)[key] as ReturnType<typeof setInterval> | undefined;
    if (timer) {
      clearInterval(timer);
      delete (this as unknown as Record<string, unknown>)[key];
    }
  }

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
    const CHUNK_SIZE = 16000;
    const binary = data as ArrayBuffer;
    const length = binary.byteLength;
    const token = Math.floor(Math.random() * 999999) | 0;
    const header = new Int32Array(2);
    header[0] = token;
    header[1] = length;
    dc.send(header);

    let sent = 0;
    dc.bufferedAmountLowThreshold = 1 << 20;
    while (sent < length) {
      const size = Math.min(length - sent, CHUNK_SIZE);
      const buffer = new Uint8Array(size + 4);
      const tokenArray = new Int32Array(1);
      tokenArray[0] = token;
      buffer.set(new Uint8Array(tokenArray.buffer, 0, 4), 0);
      const chunk = new Uint8Array(binary, sent, size);
      buffer.set(chunk, 4);
      if (dc.bufferedAmount > dc.bufferedAmountLowThreshold) {
        await new Promise<void>(resolve => {
          const onlow = () => {
            (dc as any).removeEventListener("bufferedamountlow", onlow);
            resolve();
          };
          (dc as any).addEventListener("bufferedamountlow", onlow, { once: true });
        });
      }
      dc.send(buffer);
      sent += size;
    }
  }

  async sendJSON(streamId: string, obj: unknown): Promise<void> {
    const text = JSON.stringify(obj);
    await this.sendData(streamId, text);
  }

  close(): void {
    for (const streamId of Array.from(this.peers.keys())) {
      this.stop(streamId);
    }
    try {
      this.ws?.close();
    } catch (e) {
      this.log.warn("ws close failed", e);
    }
    this.emit("closed", undefined as never);
  }

  setSanitizeDataChannelStrings(enabled: boolean): void {
    this.sanitizeDcStrings = !!enabled;
  }

  async enableRemoteAudioLevel(streamId: string, callback: (level: number) => void, periodMs = 200): Promise<void> {
    const stream = this.remoteStreams.get(streamId) ?? (this.remoteVideo?.srcObject as MediaStream | null) ?? null;
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

  protected abstract restartStream(streamId: string, info: ActiveStreamInfo): void;

  protected trackActiveStream(streamId: string, info: ActiveStreamInfo): void {
    this.activeStreams.set(streamId, info);
  }

  protected clearActiveStream(streamId: string): void {
    this.activeStreams.delete(streamId);
  }

  protected getActiveStream(streamId: string): ActiveStreamInfo | undefined {
    return this.activeStreams.get(streamId);
  }

  protected sendCommand(payload: Record<string, unknown>): void {
    if (!this.ws) return;
    this.ws.send(JSON.stringify(payload));
  }

  protected onInitialized(): void {
    // subclasses can extend; default no-op
  }

  protected onTransportEvent(_info: string, _obj?: unknown): void {
    // subclasses override as needed
  }

  protected onStartCommand(streamId: string): void {
    void this.startPublishing(streamId);
  }

  protected onRemoteOfferAnswered(streamId: string): void {
    this.emit("play_started", { streamId });
  }

  protected onRemoteAnswerApplied(_streamId: string): void {
    // subclasses may override
  }

  protected onNotification(_payload: Record<string, unknown>): void {
    // subclasses may override
  }

  protected createPeer(streamId: string, mode: StreamMode = "publish"): RTCPeerConnection {
    const existingCtx = this.peers.get(streamId);
    if (existingCtx && existingCtx.pc) {
      existingCtx.mode = mode;
      this.peers.set(streamId, existingCtx);
      return existingCtx.pc;
    }
    const pc = new RTCPeerConnection(this.peerConfig);
    pc.onicecandidate = ev => {
      if (ev.candidate && this.ws) {
        const cand = ev.candidate.candidate ?? "";
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
        this.sendCommand(msg);
      }
    };
    pc.oniceconnectionstatechange = () => {
      this.log.info("ice state %s %s", streamId, pc.iceConnectionState);
      this.emit("ice_connection_state_changed", { state: pc.iceConnectionState, streamId });
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

      const mid = event.transceiver && event.transceiver.mid;
      const mapping = this.idMapping[streamId] || {};
      const mappedId = typeof mid === "string" ? mapping[mid] : undefined;
      const trackId = mappedId || event.track.id;
      const payload = { stream, track: event.track, streamId, trackId };
      this.emit("newTrackAvailable", payload as never);
      this.emit("newStreamAvailable" as keyof EventMap, payload as never);
    };

    const existing = this.peers.get(streamId) ?? { pc };
    existing.pc = pc;
    existing.mode = mode;
    this.peers.set(streamId, existing as PeerContext);
    return pc;
  }

  protected setupDataChannel(streamId: string, dc: RTCDataChannel): void {
    const ctx = this.peers.get(streamId);
    if (ctx) ctx.dc = dc;
    try {
      (dc as any).binaryType = "arraybuffer";
    } catch (e) {
      this.log.warn("setting binaryType failed", e);
    }
    dc.onerror = error => {
      this.log.warn("data channel error", error);
      if (dc.readyState !== "closed") {
        this.emit("error", { error: "data_channel_error", message: error });
      }
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
      if (typeof Blob !== "undefined" && raw instanceof Blob) {
        raw.arrayBuffer()
          .then(ab => processBuffer(new Uint8Array(ab)))
          .catch(() => {
            this.emit("error", { error: "data_channel_blob_parse_failed", message: raw });
          });
        return;
      }
      if (raw instanceof ArrayBuffer) {
        processBuffer(new Uint8Array(raw));
        return;
      }
      if (ArrayBuffer.isView(raw)) {
        const view = raw as ArrayBufferView;
        processBuffer(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
        return;
      }
      this.emit("data_received", { streamId, data: raw });
    };
  }

  protected async startPublishing(streamId: string): Promise<void> {
    const pc = this.peers.get(streamId)?.pc ?? this.createPeer(streamId);
    const stream = this.media.getLocalStream();
    if (!stream && !this.onlyDataChannel) throw new Error("no_local_stream");

    if (!this.onlyDataChannel && pc.getSenders().length === 0 && stream) {
      for (const track of stream.getTracks()) {
        const sender = pc.addTrack(track, stream);
        if (track.kind === "video") this.peers.get(streamId)!.videoSender = sender;
        if (track.kind === "audio") this.peers.get(streamId)!.audioSender = sender;
      }
    } else {
      const ctx = this.peers.get(streamId);
      if (ctx) {
        const senders = pc.getSenders();
        ctx.videoSender = ctx.videoSender || senders.find(s => s.track?.kind === "video");
        ctx.audioSender = ctx.audioSender || senders.find(s => s.track?.kind === "audio");
      }
    }

    try {
      const dc = pc.createDataChannel ? pc.createDataChannel(streamId, { ordered: true }) : undefined;
      if (dc) this.setupDataChannel(streamId, dc);
    } catch (e) {
      this.log.warn("createDataChannel not supported", e);
    }
    const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
    await pc.setLocalDescription(offer);
    this.sendTakeConfiguration(streamId, offer.type, offer.sdp ?? "");
  }

  protected sendTakeConfiguration(streamId: string, type: RTCSdpType, sdp: string): void {
    const msg = { command: "takeConfiguration", streamId, type, sdp };
    this.sendCommand(msg);
    if (type === "offer") {
      this.emit("publish_started", { streamId });
    }
  }

  protected async applyLocalTracks(): Promise<void> {
    const stream = this.media.getLocalStream();
    if (!stream) return;
    for (const ctx of this.peers.values()) {
      const senders = ctx.pc.getSenders();
      const videoTracks = stream.getVideoTracks();
      for (const track of videoTracks) {
        let sender = (track.kind === "video" ? ctx.videoSender : ctx.audioSender) || senders.find(s => s.track && s.track.kind === track.kind);
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

  private handleTransportEvent(info: string, obj?: unknown): void {
    if (info === "initialized") {
      this.isReady = true;
      this.log.info("adaptor initialized");
      for (const init of BaseClient.pluginInitMethods) {
        try {
          init(this);
        } catch (e) {
          this.log.warn("plugin init failed", e);
        }
      }
      this.onInitialized();
      return;
    } else if (info === "start") {
      const { streamId } = obj as { streamId: string };
      this.log.debug("start received for %s", streamId);
      this.onStartCommand(streamId);
    } else if (info === "takeConfiguration") {
      const payload = obj as { streamId: string; sdp: string; type: RTCSdpType; idMapping?: Record<string, string>; streamTrackIds?: Record<string, string> };
      const { streamId, sdp, type } = payload;
      this.log.debug("takeConfiguration %s %s", streamId, type);
      const mapping = payload.idMapping || payload.streamTrackIds;
      if (mapping) {
        this.idMapping[streamId] = mapping;
      }
      if (type === "answer") {
        const ctx = this.peers.get(streamId);
        if (ctx) {
          ctx.pc.setRemoteDescription(new RTCSessionDescription({ type, sdp })).then(() => {
            this.remoteDescriptionSet.set(streamId, true);
            const queued = this.candidateQueue.get(streamId) ?? [];
            queued.forEach(c => ctx.pc.addIceCandidate(new RTCIceCandidate(c)));
            this.candidateQueue.set(streamId, []);
            this.onRemoteAnswerApplied(streamId);
          });
        }
      } else if (type === "offer") {
        const pc = this.createPeer(streamId, "play");
        // Set up data channel for play mode like the original WebRTCAdaptor
        pc.ondatachannel = ev => {
          this.setupDataChannel(streamId, ev.channel);
        };
        pc.setRemoteDescription(new RTCSessionDescription({ type, sdp }))
          .then(async () => {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.sendTakeConfiguration(streamId, answer.type, answer.sdp ?? "");
            this.remoteDescriptionSet.set(streamId, true);
            const queued = this.candidateQueue.get(streamId) ?? [];
            queued.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)));
            this.candidateQueue.set(streamId, []);
            this.onRemoteOfferAnswered(streamId);
          })
          .catch(e => this.log.warn("setRemoteDescription failed", e));
      }
    } else if (info === "takeCandidate") {
      const { streamId, label, id, candidate } = obj as { streamId: string; label: number | null; id?: string; candidate: string };
      this.log.debug("takeCandidate %s", streamId);
      const ice: RTCIceCandidateInit = { sdpMLineIndex: label ?? undefined, sdpMid: id, candidate };
      const ctx = this.peers.get(streamId);
      if (ctx) {
        if (this.remoteDescriptionSet.get(streamId)) {
          ctx.pc.addIceCandidate(new RTCIceCandidate(ice)).catch(e => this.log.warn("addIceCandidate failed", e));
        } else {
          const q = this.candidateQueue.get(streamId) ?? [];
          q.push(ice);
          this.candidateQueue.set(streamId, q);
        }
      }
    } else if (info === "iceServerConfig") {
      const cfg = obj as { stunServerUri?: string; turnServerUsername?: string; turnServerCredential?: string };
      if (cfg.stunServerUri) {
        if (cfg.stunServerUri.startsWith("turn:")) {
          this.peerConfig.iceServers = [
            { urls: "stun:stun1.l.google.com:19302" },
            {
              urls: cfg.stunServerUri,
              username: cfg.turnServerUsername ?? "",
              credential: cfg.turnServerCredential ?? "",
            },
          ];
        } else if (cfg.stunServerUri.startsWith("stun:")) {
          this.peerConfig.iceServers = [{ urls: cfg.stunServerUri }];
        }
        this.log.info("updated ice servers");
      }
    } else if (info === "stop") {
      const { streamId } = obj as { streamId: string };
      this.log.info("stop received for %s", streamId);
      this.stop(streamId);
    } else if (info === "notification") {
      const payload = obj as Record<string, unknown>;
      const def = (payload.definition as string) || "";
      const streamId = (payload.streamId as string) || "";
      if (def === "publish_started") this.emit("publish_started", { streamId });
      if (def === "publish_finished") this.emit("publish_finished", { streamId });
      if (def === "play_started") this.emit("play_started", { streamId });
      if (def === "play_finished") this.emit("play_finished", { streamId });
      if (def === "subscriberCount") this.emit("subscriber_count" as keyof EventMap, obj as never);
      if (def === "subscriberList") this.emit("subscriber_list" as keyof EventMap, obj as never);
      if (def === "roomInformation") this.emit("room_information" as keyof EventMap, obj as never);
      if (def === "broadcastObject") this.emit("broadcast_object" as keyof EventMap, obj as never);
      if (def === "videoTrackAssignmentList") this.emit("video_track_assignments" as keyof EventMap, obj as never);
      if (def === "streamInformation") this.emit("stream_information" as keyof EventMap, obj as never);
      if (def === "trackList") this.emit("track_list" as keyof EventMap, obj as never);
      if (def === "subtrackList") this.emit("subtrack_list" as keyof EventMap, obj as never);
      if (def === "subtrackCount") this.emit("subtrack_count" as keyof EventMap, obj as never);
      if (def === "joinedTheRoom") this.emit("room_joined" as keyof EventMap, obj as never);
      if (def === "leavedTheRoom") this.emit("room_left" as keyof EventMap, obj as never);
      if (def) this.emit(`notification:${def}` as keyof EventMap, obj as never);
      this.onNotification(payload);
    } else if (info === "closed") {
      this.emit("closed", obj as never);
      return;
    } else if (info === "server_will_stop") {
      this.emit("server_will_stop", obj as never);
      return;
    }

    this.onTransportEvent(info, obj);
    this.emit(info as keyof EventMap, obj as never);
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
    const mode = this.activeStreams.get(streamId)?.mode;
    if (mode === "publish") {
      this.emit("reconnection_attempt_for_publisher" as keyof EventMap, { streamId } as never);
    } else if (mode === "play") {
      this.emit("reconnection_attempt_for_player" as keyof EventMap, { streamId } as never);
    }
    const nextDelay = this.computeNextDelay(delayMs);
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(streamId);
      this.tryAgain(streamId, forceReconnect);
    }, nextDelay);
    this.reconnectTimers.set(streamId, timer);
  }

  private computeNextDelay(lastDelay: number): number {
    const { backoff, baseMs, maxMs, jitter } = this.reconnectConfig;
    let next = backoff === "exp" ? Math.min(maxMs, Math.max(baseMs, lastDelay * 2)) : Math.min(maxMs, baseMs);
    if (jitter > 0) {
      const rand = 1 + (Math.random() * 2 - 1) * jitter;
      next = Math.max(0, Math.floor(next * rand));
    }
    return next;
  }

  private tryAgain(streamId: string, forceReconnect: boolean): void {
    const active = this.activeStreams.get(streamId);
    if (!active) return;
    this.lastReconnectAt.set(streamId, Date.now());
    if (forceReconnect) {
      this.log.info("Force reconnect requested for %s", streamId);
    }
    try {
      this.stop(streamId);
    } catch (e) {
      this.log.warn("stop during reconnect failed", e);
    }
    setTimeout(() => {
      this.restartStream(streamId, active);
    }, 500);
  }
}

