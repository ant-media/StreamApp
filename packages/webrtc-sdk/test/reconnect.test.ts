import { describe, it, expect } from 'vitest';
import { WebRTCAdaptor } from '../src/core/webrtc-adaptor.js';

if (typeof (global as any).MediaStream === 'undefined') {
  (global as any).MediaStream = class {} as any;
}

// mock MediaStream/getUserMedia
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: async () => {
          const ms = new MediaStream() as any;
          ms.getTracks = () => [];
          ms.getVideoTracks = () => [];
          ms.getAudioTracks = () => [];
          return ms as MediaStream;
        },
        enumerateDevices: async () => [],
      },
    },
    configurable: true,
  });
} catch {}

class MockPC {
  localDescription: any;
  iceConnectionState = 'connected';
  onicecandidate: ((ev: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  getSenders() { return []; }
  addTrack() {}
  async createOffer(){ return { type: 'offer' as const, sdp: 'v=0\n' }; }
  async setLocalDescription(desc: any) { this.localDescription = desc; }
  close() { this.iceConnectionState = 'closed'; }
}
// @ts-ignore
(global as any).RTCPeerConnection = MockPC;
// @ts-ignore
(global as any).RTCSessionDescription = function(x:any){ return x; };

describe('auto reconnect', () => {
  it('schedules reconnect on ice disconnected/failed', async () => {
    const sent: any[] = [];
    const adaptor = new WebRTCAdaptor({ websocketURL: 'wss://x', isPlayMode: false, mediaConstraints: { audio: false, video: false }, autoReconnect: true });
    // @ts-ignore
    adaptor['ws'] = { send: (t: string) => sent.push(JSON.parse(t)) } as any;
    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);

    await adaptor.publish('s1');
    // Simulate server start to create offer
    // @ts-ignore
    adaptor['notify']('start', { streamId: 's1' } as any);
    await new Promise((r) => setTimeout(r, 0));

    // Flip state to failed (immediate reconnect path) and trigger
    // @ts-ignore
    const ctx = adaptor['peers'].get('s1');
    ctx.pc.iceConnectionState = 'failed';
    ctx.pc.oniceconnectionstatechange && ctx.pc.oniceconnectionstatechange();

    // allow reconnect timers (~500ms + 500ms)
    await new Promise((r) => setTimeout(r, 1400));

    // Should attempt to stop and then publish again -> look for at least another publish after initial
    const pubs = sent.filter(m => m.command === 'publish');
    expect(pubs.length).toBeGreaterThanOrEqual(2);
  });
});


