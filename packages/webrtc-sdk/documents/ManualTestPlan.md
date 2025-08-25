## Manual Test Plan (WebRTC SDK v2)

### 1. Publish/Play basics
- Start publisher with camera+mic using `createSession`. Expect initialized → publish_started → ICE connected.
- Start viewer and call `play`/`join`. Expect `play_started`, remote audio/video.
- Stop from publisher and viewer; expect `publish_finished`/`play_finished`.

### 2. Device switching
- `selectVideoInput()` while publishing. Remote video switches without renegotiation.
- `selectAudioInput()` while publishing. Remote audio continues.
- `turnOffLocalCamera()` then `turnOnLocalCamera()`; remote shows black → restores.

### 3. Screen share
- `startScreenShare()`; verify screen video and mixed system+mic audio at remote.
- Call `enableSecondStreamInMixedAudio(false)` via console on `media` to disable mic (if using mix); re-enable to restore.
- `stopScreenShare()` restores camera.

### 4. Screen share with camera overlay
- `startScreenWithCameraOverlay()`; verify PIP camera. Stop; camera restores.

### 5. Data channel
- After publish, `sendData('s1','hello')` and 128KB binary; viewer receives correct data.
- Toggle `setSanitizeDataChannelStrings(true)`; sending `<b>x</b>` arrives escaped.
- `sendJSON('s1',{ type:'chat', text:'hi' })` arrives as string payload on viewer.

### 6. Stats
- `getStats('s1')` returns values; `enableStats('s1',2000)` emits updates; totals increase during activity.

### 7. Reconnect
- Disable and re-enable network. Expect `reconnection_attempt_for_*`, then `reconnected` when session resumes.
- Test `configureReconnect({ backoff:'exp', baseMs:500, maxMs:10000, jitter:0.3 })` and observe delays.

### 8. Rooms / Multitrack
- `joinRoom({ roomId, streamId })`; server responds with `room_information`.
- `playSelective({ streamId:'main', enableTracks:['camera_u1'], disableTracksByDefault:true })`.
- `enableTrack('main','camera_u1',true)` toggles visibility.
- `forceStreamQuality('main', 720)` then `'auto'` and observe quality changes.
- `requestVideoTrackAssignments`, `updateVideoTrackAssignments`, `setMaxVideoTrackCount`; verify notifications/UI pagination.

### 9. Bandwidth/quality controls
- `changeBandwidth('s1',600)` then `'unlimited'`; verify bitrate changes in stats.
- `setDegradationPreference('s1','maintain-framerate')`; observe under load.

### 10. Audio utilities
- `setVolumeLevel(0)` → remote silence; restore >0.
- `enableAudioLevelForLocalStream(cb)`; levels update; disable stops.
- `enableRemoteAudioLevel('s1', cb)` on viewer; levels update; disable stops.

### 11. Audio output selection
- `setAudioOutput(deviceId, remoteVideo)`; verify audio routes to selected output device (if supported). Expect `error:set_sink_id_unsupported` otherwise.

### 12. Track controls
- `pauseTrack('audio')` then `resumeTrack('audio')`; viewer hears silence then audio resumes. Listen for `local_track_paused`/`local_track_resumed`.

### 13. Data-only publish
- `createSession({ onlyDataChannel:true, role:'publisher', streamId:'data' })`.
- Verify no camera/mic prompt, DC opens, and `sendData`/`sendJSON` works.

### 14. Close
- `close()`; peers close, websocket closes, `closed` event fires.


