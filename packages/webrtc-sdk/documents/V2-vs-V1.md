## WebRTC SDK v2 vs v1

### TL;DR
- v2 provides a modern, type-safe, promise-based API with clear, high-level methods and typed events. It reduces boilerplate and "footguns" while keeping parity with core AMS features.
- v1 is powerful but callback-heavy, loosely typed, and exposes a very broad low-level surface that is harder to use correctly.

### Why v2 is better
- **TypeScript-first**: strict types, better IDE help, fewer runtime mistakes.
- **Promise-based flow**: `await ready()` / `await join()` vs ad-hoc callbacks.
- **Typed events**: ergonomic `on('event', payload => { ... })` rather than stringly-typed callback fanout.
- **Single primary API**: `WebRTCClient` composes media and signaling with safe defaults.
- **Safer media operations**: device switching via `replaceTrack`, black dummy track when camera is turned off (no renegotiation hiccups).
- **Data channel**: chunking with backpressure, optional input sanitization.
- **QoS controls**: bandwidth, degradation preferences, stats helpers.
- **Rooms/Multitrack helpers**: `playSelective`, `enableTrack`, track assignment APIs.
- **New v2 features**: plugin API, data-only publish, audio output selection (sinkId), remote audio level metering, stream metadata update.

### Quick usage comparison

#### Initialize and publish
```js
// v1 (JS)
const adaptor = new WebRTCAdaptor({
  websocketURL,
  mediaConstraints: { audio: true, video: true },
  callback: (info, obj) => { /* handle events */ },
  callbackError: (err, msg) => { /* handle errors */ },
});
// wait for 'initialized' callback
adaptor.publish('s1', 'OPTIONAL_TOKEN');
```

```ts
// v2 (TS)
import { WebRTCClient } from './src';
const sdk = new WebRTCClient({ websocketURL, mediaConstraints: { audio: true, video: true }, localVideo });
await sdk.ready();
await sdk.join({ role: 'publisher', streamId: 's1', token: 'OPTIONAL_TOKEN' });
```

#### Play
```js
// v1
adaptor.play('s1');
```

```ts
// v2
const viewer = new WebRTCClient({ websocketURL, isPlayMode: true, remoteVideo });
await viewer.ready();
await viewer.join({ role: 'viewer', streamId: 's1' });
```

#### Device selection
```js
// v1
adaptor.switchVideoCameraCapture('s1', deviceId);
adaptor.switchAudioInputSource('s1', micId);
```

```ts
// v2
await sdk.selectVideoInput(deviceId);
await sdk.selectAudioInput(micId);
```

#### Screen share (+ overlay)
```js
// v1
adaptor.switchDesktopCapture('s1');
```

```ts
// v2
await sdk.startScreenShare();
await sdk.startScreenWithCameraOverlay();
```

#### Data channel
```js
// v1
adaptor.sendData('s1', 'hello');
```

```ts
// v2
await sdk.sendData('s1', 'hello');
```

### New v2 capabilities (not in v1 by default)
- **Plugin API**: `WebRTCClient.register(sdk => { /* augment */ })` to extend behavior cleanly.
- **Data-only publish**: `new WebRTCClient({ websocketURL, onlyDataChannel: true })` to publish with DC only (no A/V capture).
- **Audio output selection (sinkId)**: `await sdk.setAudioOutput(deviceId, mediaElement?)` for routing playback to chosen output.
- **Remote audio levels (viewer)**: `enableRemoteAudioLevel('s1', cb)` to meter incoming audio.
- **Stream metadata update**: `updateStreamMetaData('s1', obj)` to push metadata to AMS.
- **One-liner sessions**: `WebRTCClient.createSession({ role, streamId, autoPlay })` simplifies startup.
- **Convenience helpers**: `publishAuto`, `playAuto`, `sendJSON` for common cases.
- **Reconnect backoff config**: `configureReconnect({ backoff, baseMs, maxMs, jitter })` with `reconnected` event.
- **Device hot-swap**: automatic default device re-acquisition on `devicechange`, emits `device_hotswapped`.
- **Track controls**: `pauseTrack('audio'|'video')` and `resumeTrack(...)`, emitting `local_track_paused/resumed`.

### Rooms / multitrack
```js
// v1 selective play
adaptor.play({ streamId: 'main', enableTracks: ['camera_u1'], disableTracksByDefault: true });
adaptor.enableTrack('main', 'camera_u1', true);
```

```ts
// v2 selective play
await viewer.playSelective({ streamId: 'main', enableTracks: ['camera_u1'], disableTracksByDefault: true });
viewer.enableTrack('main', 'camera_u1', true);
```

### What still differs from v1
- **Peer-to-peer multi-peer mode**: v1 supports `join(streamId)`/`isMultiPeer`; v2 focuses on publish/play/rooms and does not expose multi-peer.
- **Low-level media helpers**: v1 exposes `applyConstraints`, `openStream`, `updateVideoTrack`, etc.; v2 favors higher-level APIs.
- **DataChannel enable flag**: v1 `dataChannelEnabled`; v2 enables DC by default (no flag).
- **Play parameters**: v1 includes `subscriberName` and sets `userPublishId`; v2 does not send those fields.
- **ICE protocol list**: v1 exposes mutable `candidateTypes`; v2 keeps an internal list.
- **Stats detail**: v1 exposes extra fields (`fractionLost`, jitter averages, full inbound lists); v2 focuses on the common metrics.

### Migration tips
- Publishing: `adaptor.publish(...)` → `await sdk.publish(streamId)` or `await sdk.join({ role: 'publisher', ... })`.
- Play: `adaptor.play(...)` → `await sdk.play(streamId)` or `await sdk.join({ role: 'viewer', ... })`.
- Device switching: `switchVideoCameraCapture` → `selectVideoInput`; `switchAudioInputSource` → `selectAudioInput`.
- Track toggling: `toggleVideo/toggleAudio` → `enableTrack(main, trackId, enabled)`.
- ABR: `forceStreamQuality` is available in both.
- Stats: `getStats`/`enableStats` available in both (types differ in v2).
- Data-only: v1 `onlyDataChannel` → v2 `{ onlyDataChannel: true }` in constructor.
- Metadata: v2 `updateStreamMetaData(streamId, obj)`.
- Audio output: new in v2 `setAudioOutput(deviceId, element?)`.

### Bottom line
v2 streamlines common workflows, improves safety and DX, and adds modern capabilities, while keeping AMS feature parity for publish/play/rooms. Prefer v2 for new work; adopt it incrementally by mapping v1 calls to v2’s higher-level methods.


