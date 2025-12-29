import { describe, it, expect } from 'vitest';
import { WebSocketAdaptor } from '../src/core/websocket-adaptor.js';

// Test ping without creating a real WebSocket

describe('websocket ping', () => {
  it('sends periodic ping after startPing', async () => {
    const sends: any[] = [];
    const wsa = new WebSocketAdaptor({ webrtcadaptor: { notifyEventListeners: () => {} } } as any);
    // @ts-ignore private
    wsa['ws'] = { readyState: 1, send: (t: string) => sends.push(JSON.parse(t)) } as any;
    // @ts-ignore private
    wsa['connected'] = true;
    // @ts-ignore private
    wsa['startPing']();

    await new Promise((r) => setTimeout(r, 3100));
    // @ts-ignore private
    wsa['clearPing']();

    expect(sends.find((m) => m.command === 'ping')).toBeTruthy();
  });
});
