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

const adaptor = new WebRTCClient({
  websocketURL: getWebSocketURL('wss://example.com:5443/LiveApp/websocket'),
  localVideo: document.getElementById('local') as HTMLVideoElement,
  remoteVideo: document.getElementById('remote') as HTMLVideoElement,
  mediaConstraints: { audio: true, video: true },
});

await adaptor.ready();
await adaptor.join({ role: 'publisher', streamId: 'stream1' });

adaptor.on('play_started', ({ streamId }) => console.log('playing', streamId));
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
- `error` { error, message? }

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
operations you need: `ready()`, `join()`, `publish()`, `play()`, `stop()`, `listDevices()`,
`selectVideoInput()`, `selectAudioInput()`, `startScreenShare()`, `stopScreenShare()`,
`sendData()`, `enableStats()/disableStats()`, room/multitrack helpers, and emits typed events.

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

## Examples

- `examples/publish.html`
- `examples/play.html`
- `examples/room.html` (rooms/multitrack, enable/disable subtracks, force quality, selective play)

## Development

- Lint: `npm run lint`
- Tests: `npm test`
- Docs: `npm run docs`

