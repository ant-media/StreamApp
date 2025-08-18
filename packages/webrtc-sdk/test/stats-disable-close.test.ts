import { describe, it, expect, vi } from 'vitest';
import { WebRTCAdaptor } from '../src/core/webrtc-adaptor.js';

if (typeof (global as any).MediaStream === 'undefined') {
  (global as any).MediaStream = class {} as any;
}

class MockPC {
  onicecandidate: ((ev: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  getSenders() { return []; }
  addTrack() {}
}
// @ts-ignore
(global as any).RTCPeerConnection = MockPC;

describe('disableStats and close', () => {
  it('stops stats timer and emits closed on close()', async () => {
    const adaptor = new WebRTCAdaptor({ websocketURL: 'wss://x', isPlayMode: true });
    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);

    // Fake ws close
    // @ts-ignore
    adaptor['ws'] = { close: vi.fn() } as any;

    // install a dummy timer
    adaptor.enableStats('s1', 10);
    adaptor.disableStats('s1');
    // @ts-ignore check private map
    expect((adaptor as any)['__stats_s1']).toBeUndefined();

    let sawClosed = false;
    adaptor.on('closed', () => { sawClosed = true; });
    adaptor.close();
    expect(sawClosed).toBe(true);
  });
});


