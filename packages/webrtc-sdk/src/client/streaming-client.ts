import { BaseClient, type ActiveStreamInfo } from "./base-client.js";

import type { EventMap } from "../core/events.js";
import type {
  JoinOptions,
  JoinResult,
  PlaySelectiveOptions,
  StreamingClientOptions,
} from "../core/types.js";

export class StreamingClient extends BaseClient {
  static register(initMethod: (sdk: StreamingClient) => void): void {
    BaseClient.register(initMethod as (sdk: BaseClient) => void);
  }

  protected override onInitialized(): void {
    this.sendCommand({ command: "getIceServerConfig" });
  }

  static async createSession(
    opts: StreamingClientOptions &
      Pick<JoinOptions, "role" | "streamId" | "token" | "timeoutMs"> & {
        autoPlay?: boolean;
      }
  ): Promise<{ client: StreamingClient; result: JoinResult }> {
    const client = new StreamingClient(opts);
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
        // ignore autoplay errors (gesture required)
      }
    }
    return { client, result };
  }

  constructor(opts: StreamingClientOptions) {
    super(opts);
  }

  async publish(streamId: string, token?: string): Promise<void> {
    await this.ready();
    this.log.info("publish %s", streamId);
    this.trackActiveStream(streamId, { mode: "publish", token });

    const stream = this.media.getLocalStream();
    const hasVideo = this.onlyDataChannel ? false : !!stream && stream.getVideoTracks().length > 0;
    const hasAudio = this.onlyDataChannel ? false : !!stream && stream.getAudioTracks().length > 0;

    this.sendCommand({
      command: "publish",
      streamId,
      token: token ?? "",
      video: hasVideo,
      audio: hasAudio,
    });
  }

  async play(streamId: string, token?: string): Promise<void> {
    await this.ready();
    this.log.info("play %s", streamId);
    this.trackActiveStream(streamId, { mode: "play", token });

    const pc = this.createPeer(streamId, "play");
    pc.ondatachannel = ev => this.setupDataChannel(streamId, ev.channel);

    this.sendCommand({
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
    });
  }

  async playSelective(opts: PlaySelectiveOptions): Promise<void> {
    await this.ready();
    this.log.info("playSelective %s", opts.streamId);
    this.trackActiveStream(opts.streamId, { mode: "play", token: opts.token });

    const pc = this.createPeer(opts.streamId);
    pc.ondatachannel = ev => this.setupDataChannel(opts.streamId, ev.channel);

    this.sendCommand({
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
    });
  }

  override stop(streamId: string): void {
    super.stop(streamId);
  }

  async join(options: JoinOptions): Promise<JoinResult> {
    await this.ready();
    const timeout = options.timeoutMs ?? 15000;

    return await new Promise<JoinResult>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("join_timeout")), timeout);

      const cleanup = () => {
        clearTimeout(to);
        this.off("ice_connection_state_changed", onIce);
        this.off("play_started", onPlayStarted);
        this.off("publish_started", onPublishStarted);
        this.off("error", onErr);
      };

      const onIce = (payload: EventMap["ice_connection_state_changed"]) => {
        if (
          payload.streamId === options.streamId &&
          (payload.state === "connected" || payload.state === "completed")
        ) {
          cleanup();
          resolve({
            streamId: options.streamId,
            state: payload.state as "connected" | "completed",
          });
        }
      };
      const onPlayStarted = (payload: EventMap["play_started"]) => {
        cleanup();
        resolve({ streamId: payload.streamId, state: "track_added" });
      };
      const onPublishStarted = (payload: EventMap["publish_started"]) => {
        cleanup();
        resolve({ streamId: payload.streamId, state: "track_added" });
      };
      const onErr = (_payload: EventMap["error"]) => {
        cleanup();
        reject(new Error("join_failed"));
      };

      this.on("ice_connection_state_changed", onIce);
      this.on("play_started", onPlayStarted);
      this.on("publish_started", onPublishStarted);
      this.on("error", onErr);

      if (options.role === "publisher") {
        void this.publish(options.streamId, options.token).catch(onErr);
      } else {
        void this.play(options.streamId, options.token).catch(onErr);
      }
    });
  }

  async forceStreamQuality(streamId: string, height: number | "auto"): Promise<void> {
    await this.ready();
    this.sendCommand({
      command: "forceStreamQuality",
      streamId,
      streamHeight: height === "auto" ? "auto" : height,
    });
  }

  async changeBandwidth(streamId: string, bandwidth: number | "unlimited"): Promise<void> {
    const ctx = this.peers.get(streamId);
    if (!ctx) return;
    const sender = ctx.videoSender || ctx.pc.getSenders().find(s => s.track?.kind === "video");
    if (!sender) return;
    const params = sender.getParameters();
    params.encodings = params.encodings || [{}];
    if (bandwidth === "unlimited") {
      delete (params.encodings[0] as Record<string, unknown>).maxBitrate;
    } else {
      (params.encodings[0] as Record<string, unknown>).maxBitrate = bandwidth * 1000;
    }
    try {
      await sender.setParameters(params);
    } catch (e) {
      this.log.warn("setParameters(maxBitrate) failed", e);
    }
  }

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

  toggleVideo(streamId: string, trackId: string, enabled: boolean): void {
    this.sendCommand({ command: "toggleVideo", streamId, trackId, enabled });
  }

  toggleAudio(streamId: string, trackId: string, enabled: boolean): void {
    this.sendCommand({ command: "toggleAudio", streamId, trackId, enabled });
  }

  async getStreamInfo(streamId: string): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getStreamInfo", streamId });
  }

  async getBroadcastObject(streamId: string): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getBroadcastObject", streamId });
  }

  async getSubscriberCount(streamId: string): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getSubscriberCount", streamId });
  }

  async getSubscriberList(streamId: string, offset = 0, size = 50): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getSubscribers", streamId, offset, size });
  }

  peerMessage(streamId: string, definition: string, data: unknown): void {
    this.sendCommand({ command: "peerMessageCommand", streamId, definition, data });
  }

  registerPushNotificationToken(
    subscriberId: string,
    authToken: string,
    pushToken: string,
    tokenType: "fcm" | "apn"
  ): void {
    this.sendCommand({
      command: "registerPushNotificationToken",
      subscriberId,
      token: authToken,
      pnsRegistrationToken: pushToken,
      pnsType: tokenType,
    });
  }

  sendPushNotification(
    subscriberId: string,
    authToken: string,
    pushNotificationContent: Record<string, unknown>,
    subscriberIdsToNotify: string[]
  ): void {
    if (typeof pushNotificationContent !== "object") {
      throw new Error("pushNotificationContent must be an object");
    }
    if (!Array.isArray(subscriberIdsToNotify)) {
      throw new Error("subscriberIdsToNotify must be an array");
    }
    this.sendCommand({
      command: "sendPushNotification",
      subscriberId,
      token: authToken,
      pushNotificationContent,
      subscriberIdsToNotify,
    });
  }

  sendPushNotificationToTopic(
    subscriberId: string,
    authToken: string,
    pushNotificationContent: Record<string, unknown>,
    topic: string
  ): void {
    if (typeof pushNotificationContent !== "object") {
      throw new Error("pushNotificationContent must be an object");
    }
    this.sendCommand({
      command: "sendPushNotification",
      subscriberId,
      token: authToken,
      pushNotificationContent,
      topic,
    });
  }

  updateStreamMetaData(streamId: string, metaData: unknown): void {
    this.sendCommand({ command: "updateStreamMetaData", streamId, metaData });
  }

  protected override restartStream(streamId: string, info: ActiveStreamInfo): void {
    if (info.mode === "publish") {
      this.log.info("Re-publish attempt for %s", streamId);
      void this.publish(streamId, info.token).catch(e => this.log.warn("republish failed", e));
    } else {
      this.log.info("Re-play attempt for %s", streamId);
      void this.play(streamId, info.token).catch(e => this.log.warn("replay failed", e));
    }
  }
}

