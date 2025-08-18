import type { GroupedDevices } from "./types";
import type { PeerStats } from "./peer-stats";

/**
 * Typed events emitted by {@link WebRTCAdaptor} and helpers.
 */
export interface EventMap {
  [key: string]: unknown;
  initialized: void;
  closed: unknown;
  server_will_stop: unknown;
  publish_started: { streamId: string };
  publish_finished: { streamId: string };
  play_started: { streamId: string };
  play_finished: { streamId: string };
  ice_connection_state_changed: { state: string; streamId: string };
  updated_stats: PeerStats;
  data_received: { streamId: string; data: string | ArrayBuffer };
  data_channel_opened: { streamId: string };
  data_channel_closed: { streamId: string };
  newTrackAvailable: { stream: MediaStream; track: MediaStreamTrack; streamId: string };
  devices_updated: GroupedDevices;
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
}

export interface TypedEmitter<M extends Record<string, unknown>> {
  on<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void;
  off<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void;
  once<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void;
}
