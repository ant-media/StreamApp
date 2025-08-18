import { describe, it, expect } from 'vitest';
import { WebRTCAdaptor } from '../src/core/webrtc-adaptor.js';

if (typeof (global as any).MediaStream === 'undefined') {
  (global as any).MediaStream = class {} as any;
}

// Mock PC with answer
class MockPC {
  localDescription: any;
  iceConnectionState = 'new';
  onicecandidate: ((ev: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((ev: any) => void) | null = null;
  getSenders() { return []; }
  addTrack() {}
  async createAnswer() { return { type: 'answer' as const, sdp: 'v=0\n' }; }
  async setLocalDescription(desc: any) { this.localDescription = desc; }
  async setRemoteDescription() {}
}
// @ts-ignore
(global as any).RTCPeerConnection = MockPC;
// @ts-ignore
(global as any).RTCSessionDescription = function (x: any) { return x; };


describe('WebRTCAdaptor play flow', () => {
  it('answers on server offer', async () => {
    const sent: any[] = [];
    const adaptor = new WebRTCAdaptor({ websocketURL: 'wss://x', isPlayMode: true });
    // @ts-ignore
    adaptor['ws'] = { send: (t: string) => sent.push(JSON.parse(t)) } as any;
    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);

    await adaptor.play('v1');

    // server sends offer
    // @ts-ignore
    adaptor['notify']('takeConfiguration', { streamId: 'v1', sdp: 'v=0\n', type: 'offer' } as any);
    await new Promise((r) => setTimeout(r, 0));

    // next should send takeConfiguration answer
    const msg = sent.find((m) => m.command === 'takeConfiguration' && m.type === 'answer');
    expect(msg).toBeTruthy();
    expect(msg.streamId).toBe('v1');
  });
});
