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
 */
export class WebRTCClient extends Emitter<EventMap> {
  private ws?: WebSocketAdaptor;
  private media: MediaManager;
  private isReady = false;
  isPlayMode: boolean;
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
  private activeStreams: Map<string, { mode: "publish" | "play"; token?: string }> = new Map();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private lastReconnectAt: Map<string, number> = new Map();

  /**
   * Create a new adaptor instance.
   * @param opts See {@link WebRTCClientOptions}
   */
  constructor(opts: WebRTCClientOptions) {
    super();
    this.isPlayMode = !!opts.isPlayMode;
    this.autoReconnect = opts.autoReconnect ?? true;
    this.media = new MediaManager({
      mediaConstraints: opts.mediaConstraints,
      localVideo: opts.localVideo,
    });
    this.remoteVideo = opts.remoteVideo ?? null;

    this.media.on("devices_updated", g => this.emit("devices_updated", g));

    if (!this.isPlayMode) {
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
        this.emit("data_received", { streamId, data: raw });
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

    if (!stream) throw new Error("no_local_stream");

    if (pc.getSenders().length === 0) {
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
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
   * await sdk.ready();
   * await sdk.publish('stream1', 'OPTIONAL_TOKEN');
   * sdk.on('publish_started', ({ streamId }) => console.log('publishing', streamId));
   * ```
   */
  async publish(streamId: string, token?: string): Promise<void> {
    await this.ready();

    this.log.info("publish %s", streamId);
    this.activeStreams.set(streamId, { mode: "publish", token });

    const stream = this.media.getLocalStream();
    const hasVideo = !!stream && stream.getVideoTracks().length > 0;
    const hasAudio = !!stream && stream.getAudioTracks().length > 0;

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
   * await sdk.ready();
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

  /**
   * High-level one-liner to start a session. Resolves when ICE connects or first track is added.
   *
   * Examples:
   * ```ts
   * // Publish
   * const sdk = new WebRTCClient({ websocketURL, mediaConstraints: { audio: true, video: true } });
   * await sdk.ready();
   * await sdk.join({ role: 'publisher', streamId: 's1', token: 'OPTIONAL' });
   *
   * // Play
   * const viewer = new WebRTCClient({ websocketURL, isPlayMode: true, remoteVideo });
   * await viewer.ready();
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
    await this.applyLocalTracks();
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
  enableTrack(mainTrackId: string, trackId: string, enabled: boolean): void {
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
  forceStreamQuality(streamId: string, height: number | "auto"): void {
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

  /**
   * Turn off camera hardware: stop local camera track and detach from sender without renegotiation.
   */
  async turnOffLocalCamera(): Promise<void> {
    this.media.turnOffLocalCamera();
    // Detach track and pause sender encoding to avoid sending frames
    for (const ctx of this.peers.values()) {
      const sender = ctx.pc.getSenders().find(s => s.track && s.track.kind === "video");
      if (!sender) continue;
      try {
        await sender.replaceTrack(null);
      } catch (e) {
        this.log.warn("replaceTrack(null) failed", e);
      }
      try {
        const params = sender.getParameters();
        if (params && Array.isArray(params.encodings)) {
          for (const enc of params.encodings) {
            (enc as { active?: boolean }).active = false;
          }
          await sender.setParameters(params);
        }
      } catch (e) {
        this.log.warn("setParameters pause failed", e);
      }
    }
  }

  /**
   * Turn on camera hardware: reacquire a camera track if needed and reattach to sender without renegotiation.
   */
  async turnOnLocalCamera(): Promise<void> {
    await this.media.turnOnLocalCamera();
    await this.applyLocalTracks();
    // Resume encodings
    for (const ctx of this.peers.values()) {
      const sender = ctx.pc.getSenders().find(s => s.track && s.track.kind === "video");
      if (!sender) continue;
      try {
        const params = sender.getParameters();
        if (params && Array.isArray(params.encodings)) {
          for (const enc of params.encodings) {
            (enc as { active?: boolean }).active = true;
          }
          await sender.setParameters(params);
        }
      } catch (e) {
        this.log.warn("setParameters resume failed", e);
      }
    }
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

  private reconnectIfRequired(streamId: string, delayMs = 3000, forceReconnect = false): void {
    if (!this.autoReconnect) return;
    if (!this.activeStreams.has(streamId)) return;
    if (delayMs <= 0) delayMs = 500;
    if (this.reconnectTimers.has(streamId)) return;
    const now = Date.now();
    const last = this.lastReconnectAt.get(streamId) ?? 0;
    if (!forceReconnect && now - last < 1000) {
      delayMs = Math.max(delayMs, 1000);
    }
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(streamId);
      this.tryAgain(streamId, forceReconnect);
    }, delayMs);
    this.reconnectTimers.set(streamId, timer);
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

  private async applyLocalTracks(): Promise<void> {
    const stream = this.media.getLocalStream();
    if (!stream) return;
    for (const ctx of this.peers.values()) {
      const senders = ctx.pc.getSenders();
      for (const track of stream.getTracks()) {
        const sender = senders.find(s => s.track && s.track.kind === track.kind);
        if (sender && sender.replaceTrack) {
          try {
            await sender.replaceTrack(track);
          } catch (e) {
            this.log.warn("replaceTrack failed", e);
          }
        } else {
          try {
            ctx.pc.addTrack(track, stream);
          } catch (e) {
            this.log.warn("addTrack failed", e);
          }
        }
      }
    }
  }
}
