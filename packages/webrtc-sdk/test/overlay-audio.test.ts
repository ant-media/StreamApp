import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCClient } from '../src/core/webrtc-client.js';

// Minimal DOM/media mocks
class MockTrack {
  kind: 'audio' | 'video';
  enabled = true;
  onended: (() => void) | null = null;
  constructor(kind: 'audio' | 'video') { this.kind = kind; }
  stop() { /* noop */ }
}
class MockStream {
  private tracks: MediaStreamTrack[];
  constructor(tracks: MediaStreamTrack[]) { this.tracks = tracks; }
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
  getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
  addTrack(t: MediaStreamTrack) { this.tracks.push(t); }
  removeTrack(t: MediaStreamTrack) { this.tracks = this.tracks.filter(x => x !== t); }
}

describe('overlay and audio utilities', () => {
  beforeEach(() => {
    // @ts-expect-error mock
    global.RTCPeerConnection = vi.fn(() => ({
      addTrack: vi.fn(),
      getSenders: vi.fn(() => []),
      close: vi.fn(),
      createDataChannel: vi.fn(() => ({
        send: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
      createOffer: vi.fn(async () => ({ type: 'offer', sdp: 'v=0' })),
      setLocalDescription: vi.fn(async () => {}),
      onicecandidate: null,
      oniceconnectionstatechange: null,
      ontrack: null,
    }));

    const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
      const v = constraints.video ? [new MockTrack('video') as unknown as MediaStreamTrack] : [];
      const a = constraints.audio ? [new MockTrack('audio') as unknown as MediaStreamTrack] : [];
      return new MockStream([...v, ...a]) as unknown as MediaStream;
    });
    const getDisplayMedia = vi.fn(async () => {
      return new MockStream([new MockTrack('video') as unknown as MediaStreamTrack]) as unknown as MediaStream;
    });
    // @ts-expect-error mock
    global.navigator = Object.defineProperty(global, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia,
          getDisplayMedia,
          enumerateDevices: vi.fn(async () => []),
        },
      },
      configurable: true,
    });

    // @ts-expect-error mock
    global.WebSocket = vi.fn(() => ({
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
      addEventListener: vi.fn(),
    }));
  });

  it('starts and stops screen+camera overlay without throwing', async () => {
    const local = { srcObject: null } as unknown as HTMLVideoElement;
    const sdk = new WebRTCClient({ websocketURL: 'ws://x', localVideo: local, mediaConstraints: { audio: true, video: true } });
    // we don’t exercise ws init here
    await sdk['media'].initLocalStream();
    await expect(sdk.startScreenWithCameraOverlay()).resolves.toBeUndefined();
    await expect(sdk.stopScreenWithCameraOverlay()).resolves.toBeUndefined();
  });

  it('enables and disables audio level meter', async () => {
    const local = { srcObject: null } as unknown as HTMLVideoElement;
    const sdk = new WebRTCClient({ websocketURL: 'ws://x', localVideo: local, mediaConstraints: { audio: true, video: true } });
    await sdk['media'].initLocalStream();
    let last = 0;
    await expect(sdk.enableAudioLevelForLocalStream(v => { last = v; }, 50)).resolves.toBeUndefined();
    // let a couple of intervals tick
    await new Promise(r => setTimeout(r, 120));
    expect(typeof last).toBe('number');
    sdk.disableAudioLevelForLocalStream();
  });
});


