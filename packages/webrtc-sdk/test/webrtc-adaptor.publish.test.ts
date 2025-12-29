import { describe, it, expect, vi } from 'vitest';
import { WebRTCClient } from '../src/core/webrtc-client.js';

// Provide MediaStream in Node if missing
if (typeof (global as any).MediaStream === 'undefined') {
  (global as any).MediaStream = class {} as any;
}

// mock MediaStream and getUserMedia for Node
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          const ms = new MediaStream() as any;
          ms.getTracks = () => [];
          ms.getVideoTracks = () => [];
          ms.getAudioTracks = () => [];
          return ms as MediaStream;
        }),
      },
    },
    configurable: true,
  });
} catch {}

// Mock RTCPeerConnection minimal API
class MockPC {
  localDescription: any;
  iceConnectionState = 'new';
  onicecandidate: ((ev: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  getSenders() { return []; }
  addTrack() {}
  async createOffer() { return { type: 'offer' as const, sdp: 'v=0\n' }; }
  async setLocalDescription(desc: any) { this.localDescription = desc; }
}
// @ts-ignore
(global as any).RTCPeerConnection = MockPC;
// @ts-ignore
(global as any).RTCSessionDescription = function (x: any) { return x; };

// Mock WebSocketAdaptor inside instance by monkey patching send

describe('WebRTCClient publish flow', () => {
  it('sends publish then takeConfiguration after start', async () => {
    const sent: any[] = [];
    const adaptor = new WebRTCClient({ websocketURL: 'wss://x', isPlayMode: false, mediaConstraints: { video: false, audio: false } });
    // @ts-ignore access private
    adaptor['ws'] = { send: (t: string) => sent.push(JSON.parse(t)) } as any;

    // Simulate initialized
    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);

    await adaptor.publish('s1');
    // find first publish ignoring the initial getIceServerConfig
    const firstPublish = sent.find((m) => m.command === 'publish');
    expect(firstPublish).toBeTruthy();
    expect(firstPublish.streamId).toBe('s1');

    // Simulate server start
    // @ts-ignore
    adaptor['notify']('start', { streamId: 's1' } as any);

    // wait a tick for async offer path
    await new Promise((r) => setTimeout(r, 0));

    // takeConfiguration should be sent next
    const msg = sent.find((m) => m.command === 'takeConfiguration');
    expect(msg).toBeTruthy();
    expect(msg.streamId).toBe('s1');
    expect(msg.type).toBe('offer');
  });
});
