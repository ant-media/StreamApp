import { describe, it, expect } from 'vitest';
import { WebRTCClient } from '../src/core/webrtc-client.js';

if (typeof (global as any).MediaStream === 'undefined') {
  (global as any).MediaStream = class {} as any;
}

class MockPC {
  async getStats() {
    const base = Date.now();
    return new Map<string, any>([
      ['out1', { type: 'outbound-rtp', kind: 'video', bytesSent: 5000, packetsSent: 50, frameWidth: 1280, frameHeight: 720, framesEncoded: 100, timestamp: base }],
      ['in1', { type: 'inbound-rtp', kind: 'audio', bytesReceived: 3000, packetsReceived: 30, timestamp: base }],
      ['rin1', { type: 'remote-inbound-rtp', kind: 'video', packetsLost: 2, roundTripTime: 0.06, jitter: 0.003 }],
      ['trk1', { type: 'track', kind: 'video', frameWidth: 1280, frameHeight: 720, framesDecoded: 90, framesDropped: 3, framesReceived: 95 }],
      ['pair', { type: 'candidate-pair', state: 'succeeded', availableOutgoingBitrate: 4000000, currentRoundTripTime: 0.08 }],
    ]);
  }
}
// @ts-ignore
(global as any).RTCPeerConnection = MockPC;

describe('stats parity', () => {
  it('collects extended fields similar to v1', async () => {
    const adaptor = new WebRTCClient({ websocketURL: 'wss://x', isPlayMode: true });
    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);
    // @ts-ignore
    adaptor['peers'].set('s1', { pc: new RTCPeerConnection() as any });
    const ps = await adaptor.getStats('s1');
    expect(ps).toBeTruthy();
    // @ts-ignore
    expect(ps.frameWidth).toBe(1280);
    // @ts-ignore
    expect(ps.videoPacketsSent).toBe(50);
    // @ts-ignore
    expect(ps.totalBytesSent).toBe(5000);
    // @ts-ignore
    expect(ps.availableOutgoingBitrateKbps).toBe(4000);
  });
});


