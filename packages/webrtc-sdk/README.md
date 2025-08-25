# WebRTC SDK v2 (TypeScript)

Modern, strictly-typed client SDK for Ant Media Server.

## Install

This package is currently private for development. Build locally:

```bash
npm install
npm run build
```

## Usage

```ts
import { WebRTCClient, getWebSocketURL } from 'webrtc-sdk';

// One-liner session helper (recommended for most apps)
const { client } = await WebRTCClient.createSession({
  websocketURL: getWebSocketURL('wss://example.com:5443/LiveApp/websocket'),
  role: 'publisher',
  streamId: 'stream1',
  localVideo: document.getElementById('local') as HTMLVideoElement,
  remoteVideo: document.getElementById('remote') as HTMLVideoElement,
  mediaConstraints: { audio: true, video: true },
  autoPlay: true, // attempt autoplay on the remote element after join
});

client.on('play_started', ({ streamId }) => console.log('playing', streamId));
```

### Convenience

```ts
// Send JSON over data-channel
await client.sendJSON('s1', { type: 'chat', text: 'Hello' });
```

### Reconnect configuration

```ts
client.configureReconnect({ backoff: "exp", baseMs: 500, maxMs: 10000, jitter: 0.3 });
client.on("reconnected", ({ streamId }) => console.log("reconnected", streamId));
```

### Device hot-swap and track controls

```ts
client.on("device_hotswapped", e => console.log("hotswapped", e));

// Pause/resume tracks without renegotiation
client.pauseTrack("audio");
client.resumeTrack("audio");
```

### Remote audio level (viewer)

```ts
await client.enableRemoteAudioLevel("s1", level => console.log(level), 200);
client.disableRemoteAudioLevel("s1");
```

### Data-only publish

```ts
const { client } = await WebRTCClient.createSession({
  websocketURL: getWebSocketURL('wss://example.com:5443/LiveApp/websocket'),
  role: 'publisher',
  streamId: 'data-only',
  onlyDataChannel: true,
});
await client.sendJSON('data-only', { hello: 'world' });
```

### Events quick reference

Common events emitted by the SDK (see TypeDoc for full list):

- `initialized`: signaling is ready
- `publish_started` / `publish_finished`
- `play_started` / `play_finished`
- `newTrackAvailable` { stream, track, streamId }
- `ice_connection_state_changed` { state, streamId }
- `data_channel_opened` / `data_channel_closed`
- `data_received` { streamId, data: string | ArrayBuffer }
- `updated_stats` PeerStats
- `devices_updated` GroupedDevices
- `room_joined` / `room_left`
- `room_information`, `broadcast_object`, `subscriber_count`, `subscriber_list`
- `video_track_assignments`
- `reconnection_attempt_for_publisher` / `reconnection_attempt_for_player`
- `error` { error, message? }

### Listening to events (v2)

```ts
client.on('initialized', () => console.log('ready'));
client.on('publish_started', ({ streamId }) => console.log('publishing', streamId));
client.on('play_started', ({ streamId }) => console.log('playing', streamId));
client.on('data_received', ({ streamId, data }) => console.log('dc <-', streamId, data));
client.on('ice_connection_state_changed', ({ state, streamId }) => console.log('ice', state, streamId));
client.on('reconnected', ({ streamId }) => console.log('reconnected', streamId));

// AMS server notifications exposed as typed events and also under notification:<name>
client.on('broadcast_object', (obj) => console.log('broadcast_object', obj));
client.on('notification:subscriberCount', (payload) => console.log('subscriberCount', payload));
```

### Stats helpers

```ts
// One-off snapshot and event
const stats = await adaptor.getStats('s1');
adaptor.on('updated_stats', (ps) => console.log(ps));

// Poll every 2s
adaptor.enableStats('s1', 2000);
```

## Documentation

Generated API docs are available in the `docs/` folder. To regenerate:

```bash
npm run docs
```

Open `docs/index.html` in a browser.

### Architecture and usage guidance

`WebRTCClient` is the primary API surface. It composes:

- `WebSocketAdaptor`: handles signaling with Ant Media Server (WS commands, notifications).
- `MediaManager`: handles local media (getUserMedia, device switching, screen share).

For most applications, call methods on `WebRTCClient` only. It exposes the common
operations you need: `join()`, `publish()`, `play()`, `stop()`, `listDevices()`,
`selectVideoInput()`, `selectAudioInput()`, `startScreenShare()`, `stopScreenShare()`,
`sendData()`, `enableStats()/disableStats()`, room/multitrack helpers, and emits typed events.

Note: Methods internally wait for signaling readiness; you don't need to call `ready()` yourself.

Only use `WebSocketAdaptor` or `MediaManager` directly if you have advanced
customization needs (e.g., custom signaling transport or bespoke media capture).
Otherwise, prefer the higher-level `WebRTCClient` methods.

### Room / Multitrack quick start

```ts
// Join a room
await adaptor.joinRoom({ roomId: 'my-room', streamId: 'publisher1' });

// Selectively play only some subtracks of a main stream
await adaptor.playSelective({
  streamId: 'mainStreamId',
  enableTracks: ['camera_user1', 'screen_user2'],
  disableTracksByDefault: true,
});

// Enable/disable a specific subtrack
adaptor.enableTrack('mainStreamId', 'camera_user3', true);

// Force quality (ABR)
adaptor.forceStreamQuality('mainStreamId', 720); // or 'auto'
```

### Device management and screen share

```ts
// Switch devices without renegotiation
await adaptor.selectVideoInput('camera-device-id');
await adaptor.selectAudioInput('mic-device-id');

// Camera on/off keeps sender alive (black dummy track)
await adaptor.turnOffLocalCamera();
await adaptor.turnOnLocalCamera();

// Screen share and overlay (PIP camera)
await adaptor.startScreenShare();
await adaptor.stopScreenShare();
await adaptor.startScreenWithCameraOverlay();
await adaptor.stopScreenWithCameraOverlay();
```

### Data channel

```ts
// Text
await adaptor.sendData('s1', 'hello');
// Binary
await adaptor.sendData('s1', new Uint8Array([1,2,3]).buffer);
// Optional sanitize received strings
adaptor.setSanitizeDataChannelStrings(true);
adaptor.on('data_received', ({ data }) => console.log('rx', data));
```

### Legacy v1-style callbacks (optional shim)

If you are migrating from v1 and prefer a single `callback(info, obj)` and `callbackError(err, message)` style, use this small helper:

```ts
function attachLegacyCallbacks(client: WebRTCClient, {
  callback,
  callbackError,
}: { callback?: (info: string, obj?: unknown) => void; callbackError?: (err: string, msg?: unknown) => void; }) {
  const events = [
    'initialized','publish_started','publish_finished','play_started','play_finished',
    'ice_connection_state_changed','updated_stats','data_channel_opened','data_channel_closed',
    'newTrackAvailable','devices_updated','room_joined','room_left','broadcast_object','room_information',
  ] as const;
  events.forEach((ev) => client.on(ev as any, (obj: unknown) => callback && callback(ev as string, obj)));
  // forward common notifications
  client.on('subscriber_count', (obj) => callback && callback('subscriberCount', obj));
  client.on('subscriber_list', (obj) => callback && callback('subscriberList', obj));
  // errors
  client.on('error', (e) => callbackError && callbackError(e.error as string, e.message));
}

// usage
attachLegacyCallbacks(client, {
  callback: (info, obj) => console.log('event', info, obj),
  callbackError: (err, msg) => console.warn('error', err, msg),
});
```

## Examples

- `examples/publish.html`
- `examples/play.html`
- `examples/room.html` (rooms/multitrack, enable/disable subtracks, force quality, selective play)

## Development

- Lint: `npm run lint` (ESLint)
- Format: Prettier (integrated; run `npm run lint:fix` for quick fixes)
- Tests: `npm test`
- Docs: `npm run docs`

