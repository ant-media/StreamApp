import type { GroupedDevices } from "./types";
import type { PeerStats } from "./peer-stats";

/**
 * Typed events emitted by {@link WebRTCClient} and helpers.
 */
export interface EventMap {
  [key: string]: unknown;
  initialized: void;
  closed: unknown;
  server_will_stop: unknown;
  /** Emitted when new local tracks are attached or replaced; used internally to refresh senders */
  publish_started: { streamId: string };
  publish_finished: { streamId: string };
  play_started: { streamId: string };
  play_finished: { streamId: string };
  ice_connection_state_changed: { state: string; streamId: string };
  reconnected?: { streamId: string };
  updated_stats: PeerStats;
  data_received: { streamId: string; data: string | ArrayBuffer };
  data_channel_opened: { streamId: string };
  data_channel_closed: { streamId: string };
  newTrackAvailable: { stream: MediaStream; track: MediaStreamTrack; streamId: string };
  devices_updated: GroupedDevices;
  local_tracks_changed: void;
  device_hotswapped?: { kind: "audioinput" | "videoinput"; deviceId?: string };
  local_track_paused?: { kind: "audio" | "video" };
  local_track_resumed?: { kind: "audio" | "video" };
  error: { error: string; message?: unknown };
  // dynamic notification channel e.g. notification:subscriberCount -> payload from server
  [k: `notification:${string}`]: unknown;
  // commonly used server notifications as first-class events
  subscriber_count?: { streamId?: string; count?: number } | unknown;
  subscriber_list?: unknown;
  room_information?: unknown;
  broadcast_object?: unknown;
  room_joined?: unknown;
  room_left?: unknown;
  video_track_assignments?: unknown;
  // additional common notifications
  stream_information?: unknown;
  track_list?: unknown;
  subtrack_list?: unknown;
  subtrack_count?: unknown;
  reconnection_attempt_for_publisher?: string | { streamId: string };
  reconnection_attempt_for_player?: string | { streamId: string };
}

export interface TypedEmitter<M extends Record<string, unknown>> {
  on<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void;
  off<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void;
  once<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void;
}
