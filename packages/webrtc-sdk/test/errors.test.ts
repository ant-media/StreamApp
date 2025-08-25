import { describe, it, expect } from 'vitest';
import { WebRTCClient } from '../src/core/webrtc-client.js';

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

describe('error codes', () => {
  it('emits structured error events for data channel parse failures', async () => {
    const adaptor = new WebRTCClient({ websocketURL: 'wss://x', isPlayMode: true });
    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);

    // install fake peer and dc (trigger onmessage parsing path)
    const dc: any = { readyState: 'open', onerror: null, onopen: null, onclose: null, onmessage: null, addEventListener(){}, removeEventListener(){} };
    // @ts-ignore
    adaptor['peers'].set('s1', { pc: new RTCPeerConnection() as any, dc });
    // @ts-ignore
    adaptor['setupDataChannel']('s1', dc);

    let err: any = null;
    adaptor.on('error', (e) => { err = e; });
    // simulate blob parse failure path
    class FakeBlob {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(public _v: any) {}
      async arrayBuffer(): Promise<ArrayBuffer> {
        return Promise.reject(new Error('fail'));
      }
    }
    // @ts-ignore
    globalThis.Blob = FakeBlob as any;
    const blob = new FakeBlob('x') as unknown as Blob;
    dc.onmessage({ data: blob });
    await new Promise((r) => setTimeout(r, 0));
    expect(err).toBeTruthy();
  });
});


