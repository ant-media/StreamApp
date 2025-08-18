import { describe, it, expect } from 'vitest';
import { WebRTCAdaptor } from '../src/core/webrtc-adaptor.js';

class MockPC {
  localDescription: any;
  iceConnectionState = 'new';
  onicecandidate: ((ev: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((ev: any) => void) | null = null;
  addCount = 0;
  getSenders() { return []; }
  addTrack() {}
  async createAnswer() { return { type: 'answer' as const, sdp: 'v=0\n' }; }
  async setLocalDescription(desc: any) { this.localDescription = desc; }
  async setRemoteDescription() {}
  async addIceCandidate() { this.addCount++; }
}
// @ts-ignore
(global as any).RTCPeerConnection = MockPC;
// @ts-ignore
(global as any).RTCSessionDescription = function (x: any) { return x; };
// @ts-ignore
(global as any).RTCIceCandidate = function (x: any) { return x; };


describe('candidate queueing', () => {
  it('queues until remote description set then flushes', async () => {
    const sent: any[] = [];
    const adaptor = new WebRTCAdaptor({ websocketURL: 'wss://x', isPlayMode: true });
    // @ts-ignore
    adaptor['ws'] = { send: (t: string) => sent.push(JSON.parse(t)) } as any;
    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);

    await adaptor.play('q1');

    // Before remote description, deliver candidate
    // @ts-ignore
    adaptor['notify']('takeCandidate', { streamId: 'q1', label: 0, candidate: 'candidate udp 0' } as any);

    // Now deliver offer to trigger setRemote and answer
    // @ts-ignore
    adaptor['notify']('takeConfiguration', { streamId: 'q1', sdp: 'v=0\n', type: 'offer' } as any);

    await new Promise((r) => setTimeout(r, 0));

    const pc: MockPC = (adaptor as any)['peers'].get('q1').pc;
    expect(pc.addCount).toBe(1);
  });
});
