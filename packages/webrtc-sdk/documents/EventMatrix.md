## Event Matrix

### Core SDK events
- initialized: void
- closed: unknown
- server_will_stop: unknown
- publish_started: { streamId }
- publish_finished: { streamId }
- play_started: { streamId }
- play_finished: { streamId }
- ice_connection_state_changed: { state, streamId }
- reconnected: { streamId }
- updated_stats: PeerStats
- data_channel_opened: { streamId }
- data_channel_closed: { streamId }
- data_received: { streamId, data }
- newTrackAvailable: { stream, track, streamId }
- devices_updated: GroupedDevices
- device_hotswapped: { kind: "audioinput"|"videoinput", deviceId? }
- local_track_paused: { kind: "audio"|"video" }
- local_track_resumed: { kind: "audio"|"video" }
- error: { error, message? }

### Common AMS notifications (forwarded)
- room_information → room_information
- broadcastObject → broadcast_object
- subscriberCount → subscriber_count
- subscriberList → subscriber_list
- videoTrackAssignmentList → video_track_assignments
- streamInformation → stream_information
- trackList → track_list
- subtrackList → subtrack_list
- subtrackCount → subtrack_count

All notifications are also emitted under `notification:<definition>`.


