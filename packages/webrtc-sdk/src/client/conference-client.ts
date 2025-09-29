import type { EventMap } from "../core/events.js";
import type {
  ConferenceClientOptions,
  ConferencePlayOptions,
  ConferencePublishOptions,
  JoinOptions,
  JoinResult,
  PlaySelectiveOptions,
  RoomJoinOptions,
  UpdateVideoTrackAssignmentsOptions,
} from "../core/types.js";

import { BaseClient, type ActiveStreamInfo } from "./base-client.js";

export class ConferenceClient extends BaseClient {
  private currentRoom?: string;
  private currentPublishId?: string;

  static register(initMethod: (sdk: ConferenceClient) => void): void {
    BaseClient.register(initMethod as (sdk: BaseClient) => void);
  }

  constructor(opts: ConferenceClientOptions) {
    super(opts);
  }

  protected override onInitialized(): void {
    this.sendCommand({ command: "getIceServerConfig" });
  }

  async publish(opts: ConferencePublishOptions): Promise<void> {
    await this.ready();
    this.trackActiveStream(opts.streamId, {
      mode: "publish",
      token: opts.token,
      roomId: opts.roomId,
      streamName: opts.streamName,
      metaData: opts.metaData,
      role: opts.role,
      subscriberId: opts.subscriberId,
      subscriberCode: opts.subscriberCode,
    });
    this.currentPublishId = opts.streamId;
    this.currentRoom = opts.roomId;
    const stream = this.media.getLocalStream();
    const hasVideo = this.onlyDataChannel ? false : !!stream && stream.getVideoTracks().length > 0;
    const hasAudio = this.onlyDataChannel ? false : !!stream && stream.getAudioTracks().length > 0;
    this.sendCommand({
      command: "publish",
      streamId: opts.streamId,
      token: opts.token ?? "",
      mainTrack: opts.roomId,
      streamName: opts.streamName ?? "",
      metaData: opts.metaData ?? "",
      role: opts.role ?? "",
      subscriberId: opts.subscriberId ?? "",
      subscriberCode: opts.subscriberCode ?? "",
      video: hasVideo,
      audio: hasAudio,
    });
  }

  async play(opts: ConferencePlayOptions): Promise<void> {
    await this.ready();
    this.trackActiveStream(opts.streamId, {
      mode: "play",
      token: opts.token,
      roomId: opts.roomId,
      enableTracks: opts.enableTracks,
      userPublishId: opts.userPublishId,
      role: opts.role,
      subscriberId: opts.subscriberId,
      subscriberCode: opts.subscriberCode,
      disableTracksByDefault: opts.disableTracksByDefault,
    });
    if (opts.roomId) this.currentRoom = opts.roomId;
    const pc = this.createPeer(opts.streamId, "play");
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
      subscriberName: opts.subscriberName ?? "",
      userPublishId: opts.userPublishId ?? "",
      disableTracksByDefault: opts.disableTracksByDefault ?? false,
    });
  }

  async playSelective(opts: PlaySelectiveOptions): Promise<void> {
    await this.ready();
    this.trackActiveStream(opts.streamId, {
      mode: "play",
      token: opts.token,
      roomId: opts.roomId ?? opts.streamId,
    });
    this.createPeer(opts.streamId, "play");
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

  async join(options: JoinOptions): Promise<JoinResult> {
    await this.ready();
    const timeout = options.timeoutMs ?? 20000;
    return await new Promise<JoinResult>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error("join_timeout")), timeout);
      const cleanup = () => {
        clearTimeout(to);
        this.off("ice_connection_state_changed", onIce);
        this.off("play_started", onPlayStarted);
        this.off("publish_started", onPublishStarted);
        this.off("error", onError);
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
      const onError = () => {
        cleanup();
        reject(new Error("join_failed"));
      };
      this.on("ice_connection_state_changed", onIce);
      this.on("play_started", onPlayStarted);
      this.on("publish_started", onPublishStarted);
      this.on("error", onError);
      if (options.role === "publisher") {
        void this.publish({
          streamId: options.streamId,
          roomId: options.roomId ?? "",
          token: options.token,
        }).catch(onError);
      } else {
        void this.play({
          streamId: options.streamId,
          roomId: options.roomId,
          token: options.token,
        }).catch(onError);
      }
    });
  }

  async joinRoom(opts: RoomJoinOptions): Promise<void> {
    await this.ready();
    const payload = {
      command: "joinRoom",
      room: opts.roomId,
      mainTrack: opts.roomId,
      streamId: opts.streamId ?? "",
      mode: opts.mode ?? "multitrack",
      streamName: opts.streamName ?? "",
      role: opts.role ?? "",
      metadata: opts.metaData ?? "",
    } as Record<string, unknown>;
    this.sendCommand(payload);
  }

  async leaveRoom(roomId: string, streamId?: string): Promise<void> {
    await this.ready();
    this.sendCommand({
      command: "leaveFromRoom",
      room: roomId,
      mainTrack: roomId,
      streamId: streamId ?? "",
    });
  }

  async enableTrack(mainTrackId: string, trackId: string, enabled: boolean): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "enableTrack", streamId: mainTrackId, trackId, enabled });
  }

  async getTracks(streamId: string, token = ""): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getTrackList", streamId, token });
  }

  async getSubtracks(streamId: string, role = "", offset = 0, size = 50): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getSubtracks", streamId, role, offset, size });
  }

  async getSubtrackCount(streamId: string, role = "", status = ""): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getSubtracksCount", streamId, role, status });
  }

  async requestVideoTrackAssignments(streamId: string): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getVideoTrackAssignmentsCommand", streamId });
  }

  async updateVideoTrackAssignments(opts: UpdateVideoTrackAssignmentsOptions): Promise<void> {
    await this.ready();
    this.sendCommand({
      command: "updateVideoTrackAssignmentsCommand",
      streamId: opts.streamId,
      offset: opts.offset,
      size: opts.size,
    });
  }

  async setMaxVideoTrackCount(streamId: string, maxTrackCount: number): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "setMaxVideoTrackCountCommand", streamId, maxTrackCount });
  }

  async forceStreamQuality(streamId: string, height: number | "auto"): Promise<void> {
    await this.ready();
    this.sendCommand({
      command: "forceStreamQuality",
      streamId,
      streamHeight: height === "auto" ? "auto" : height,
    });
  }

  toggleVideo(streamId: string, trackId: string, enabled: boolean): void {
    this.sendCommand({ command: "toggleVideo", streamId, trackId, enabled });
  }

  toggleAudio(streamId: string, trackId: string, enabled: boolean): void {
    this.sendCommand({ command: "toggleAudio", streamId, trackId, enabled });
  }

  async getRoomInfo(roomId: string, streamId = ""): Promise<void> {
    await this.ready();
    this.sendCommand({ command: "getRoomInfo", room: roomId, streamId });
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

  protected override onTransportEvent(info: string, obj?: unknown): void {
    if (info === "notification") {
      const payload = obj as Record<string, unknown> | undefined;
      const def = (payload?.definition as string) || "";
      if (def === "roomInformation") this.emit("room_information", obj as never);
      if (def === "joinedTheRoom") this.emit("room_joined", obj as never);
      if (def === "leavedTheRoom") this.emit("room_left", obj as never);
      if (def === "videoTrackAssignmentList") this.emit("video_track_assignments", obj as never);
      if (def === "subscriberList") this.emit("subscriber_list", obj as never);
      if (def === "subscriberCount") this.emit("subscriber_count", obj as never);
      if (def === "trackList") this.emit("track_list", obj as never);
      if (def === "subtrackList") this.emit("subtrack_list", obj as never);
      if (def === "subtrackCount") this.emit("subtrack_count", obj as never);
    }
    super.onTransportEvent(info, obj);
  }

  protected override restartStream(streamId: string, info: ActiveStreamInfo): void {
    if (info.mode === "publish") {
      this.log.info("Re-publish attempt for %s", streamId);
      void this.publish({
        streamId,
        roomId: info.roomId ?? this.currentRoom ?? "",
        token: info.token,
        streamName: info.streamName,
        metaData: info.metaData,
        role: info.role,
        subscriberId: info.subscriberId,
        subscriberCode: info.subscriberCode,
      }).catch(e => this.log.warn("republish failed", e));
    } else {
      this.log.info("Re-play attempt for %s", streamId);
      void this.play({
        streamId,
        roomId: info.roomId ?? this.currentRoom,
        token: info.token,
        enableTracks: info.enableTracks,
        subscriberId: info.subscriberId,
        subscriberCode: info.subscriberCode,
        role: info.role,
        disableTracksByDefault: info.disableTracksByDefault,
        userPublishId: info.userPublishId,
      }).catch(e => this.log.warn("replay failed", e));
    }
  }
}
