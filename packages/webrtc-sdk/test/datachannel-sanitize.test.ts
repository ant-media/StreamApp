import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCClient } from '../src/core/webrtc-client.js';

describe('data channel sanitize option', () => {
  beforeEach(() => {
    // @ts-expect-error mock
    global.RTCPeerConnection = vi.fn(() => ({
      addTrack: vi.fn(),
      getSenders: vi.fn(() => []),
      close: vi.fn(),
      onicecandidate: null,
      oniceconnectionstatechange: null,
      ontrack: null,
      createDataChannel: vi.fn(() => ({
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
      })),
    }));
    // @ts-expect-error mock
    global.WebSocket = vi.fn(() => ({ send: vi.fn(), close: vi.fn(), readyState: 1 }));
  });

  it('escapes angle brackets in text messages when enabled', async () => {
    const sdk = new WebRTCClient({ websocketURL: 'ws://x', sanitizeDataChannelStrings: true, mediaConstraints: { audio: true, video: true } });
    const dc: any = { addEventListener: vi.fn(), removeEventListener: vi.fn(), send: vi.fn(), onmessage: null };
    // create a peer and inject data channel handler
    (sdk as any).peers.set('s1', { pc: new (global as any).RTCPeerConnection({}) });
    (sdk as any).setupDataChannel('s1', dc);

    let received: string | ArrayBuffer | null = null;
    sdk.on('data_received', ({ data }) => { received = data as any; });

    dc.onmessage({ data: '<b>tag</b>' });
    expect(received).toBe('&lt;b&gt;tag&lt;/b&gt;');
  });
});


