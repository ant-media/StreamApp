import { describe, it, expect, vi } from 'vitest';
import { WebRTCClient } from '../src/core/webrtc-client.js';

if (typeof (global as any).MediaStream === 'undefined') {
  (global as any).MediaStream = class {} as any;
}

// mock MediaStream/getUserMedia
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          const ms = new MediaStream() as any;
          ms.getTracks = () => [
            { kind: 'audio', enabled: true },
            { kind: 'video', enabled: true },
          ];
          ms.getVideoTracks = () => [{ kind: 'video', enabled: true }];
          ms.getAudioTracks = () => [{ kind: 'audio', enabled: true }];
          return ms as MediaStream;
        }),
        enumerateDevices: vi.fn(async () => []),
      },
    },
    configurable: true,
  });
} catch {}

class MockDC {
  readyState = 'open';
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  bufferedAmount = 0;
  bufferedAmountLowThreshold = 0;
  private listeners: Record<string, Function[]> = {};
  send(_d: any) {}
  addEventListener(type: string, fn: any) {
    this.listeners[type] ||= [];
    this.listeners[type].push(fn);
  }
  removeEventListener(type: string, fn: any) {
    this.listeners[type] = (this.listeners[type]||[]).filter(f => f!==fn);
  }
  emit(type: string) {
    (this.listeners[type]||[]).forEach(f => f());
  }
}

class MockPC {
  ondatachannel: ((ev: any) => void) | null = null;
  onicecandidate: ((ev: any) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  iceConnectionState = 'connected';
  getSenders(){ return []; }
  addTrack(){}
  createDataChannel(_label: string){ return new MockDC() as any; }
  async createOffer(){ return { type: 'offer' as const, sdp: 'v=0\n' }; }
  async setLocalDescription(){ }
}
// @ts-ignore
(global as any).RTCPeerConnection = MockPC;
// @ts-ignore
(global as any).RTCSessionDescription = function(x:any){ return x; };

describe('Data channel chunking and reassembly', () => {
  it('reassembles binary chunks into a single ArrayBuffer', async () => {
    const sent: any[] = [];
    const adaptor = new WebRTCClient({ websocketURL: 'wss://x', isPlayMode: false, mediaConstraints: { video: false, audio: false } });
    // @ts-ignore
    adaptor['ws'] = { send: (t: string) => sent.push(JSON.parse(t)) } as any;
    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);

    const streamId = 'sbin';
    await adaptor.publish(streamId);
    // trigger start -> creates DC
    // @ts-ignore
    adaptor['notify']('start', { streamId } as any);

    // wait until data channel is set
    let dc: MockDC | undefined;
    for (let i = 0; i < 10; i++) {
      // @ts-ignore
      const ctx = adaptor['peers'].get(streamId);
      dc = ctx?.dc as unknown as MockDC | undefined;
      if (dc) break;
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(dc).toBeTruthy();

    const received: any[] = [];
    adaptor.on('data_received', (e) => received.push(e));

    // simulate incoming header and chunks
    const payload = new Uint8Array(50000);
    for (let i=0;i<payload.length;i++) payload[i] = i % 251;
    const token = 1234;
    const header = new ArrayBuffer(8);
    const dv = new DataView(header);
    dv.setInt32(0, token, true);
    dv.setInt32(4, payload.byteLength, true);
    dc!.onmessage!({ data: header } as any);

    let sentTotal = 0;
    const CHUNK = 16000;
    while (sentTotal < payload.byteLength) {
      const size = Math.min(CHUNK, payload.byteLength - sentTotal);
      const buf = new Uint8Array(size + 4);
      const dv2 = new DataView(buf.buffer);
      dv2.setInt32(0, token, true);
      buf.set(payload.subarray(sentTotal, sentTotal + size), 4);
      dc!.onmessage!({ data: buf.buffer } as any);
      sentTotal += size;
    }

    expect(received.length).toBe(1);
    const ab = received[0].data as ArrayBuffer;
    expect(ab.byteLength).toBe(payload.byteLength);
    const out = new Uint8Array(ab);
    for (let i=0;i<out.byteLength;i++) {
      if (out[i] !== payload[i]) {
        throw new Error('payload mismatch at ' + i);
      }
    }
  });
});


