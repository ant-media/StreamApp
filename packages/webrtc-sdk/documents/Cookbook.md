## WebRTC SDK v2 Cookbook

### 1) Publish/Play with one-liner
```ts
const { client } = await WebRTCClient.createSession({ websocketURL, role: 'publisher', streamId: 's1', localVideo, remoteVideo, mediaConstraints: { audio: true, video: true }, autoPlay: true });
```

### 2) Device switching
```ts
await client.selectVideoInput(cameraId);
await client.selectAudioInput(micId);
```

### 3) Screen share and PIP overlay
```ts
await client.startScreenShare();
// later
await client.stopScreenShare();

await client.startScreenWithCameraOverlay();
await client.stopScreenWithCameraOverlay();
```

### 4) Data channel helpers
```ts
await client.sendData('s1', 'hello');
await client.sendJSON('s1', { type: 'chat', text: 'hi' });
```

### 5) Reconnect policy and events
```ts
client.configureReconnect({ backoff: 'exp', baseMs: 500, maxMs: 10000, jitter: 0.3 });
client.on('reconnected', ({ streamId }) => console.log('reconnected', streamId));
```

### 6) Room / multitrack helpers
```ts
await client.joinRoom({ roomId: 'room1', streamId: 'pub1' });
await client.playSelective({ streamId: 'main', enableTracks: ['camera_u1'], disableTracksByDefault: true });
client.enableTrack('main', 'camera_u1', true);
client.forceStreamQuality('main', 720); // or 'auto'
```

### 7) Bandwidth/quality
```ts
await client.changeBandwidth('s1', 600);
await client.changeBandwidth('s1', 'unlimited');
await client.setDegradationPreference('s1', 'maintain-framerate');
```

### 8) Stats
```ts
client.on('updated_stats', ps => console.log(ps));
client.enableStats('s1', 2000);
```

### 9) Audio output (sinkId) and meters
```ts
await client.setAudioOutput(deviceId, remoteVideo);
await client.enableRemoteAudioLevel('s1', level => console.log(level));
```

### 10) Track controls
```ts
client.pauseTrack('audio');
client.resumeTrack('audio');
```

### 11) Data-only publish
```ts
const { client } = await WebRTCClient.createSession({ websocketURL, role: 'publisher', streamId: 'data', onlyDataChannel: true });
await client.sendJSON('data', { ping: true });
```


