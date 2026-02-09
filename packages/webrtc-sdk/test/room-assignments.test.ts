import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCClient } from '../src/core/webrtc-client.js';

describe('room and assignments signaling', () => {
  beforeEach(() => {
    // @ts-expect-error mock
    global.WebSocket = vi.fn(() => ({ send: vi.fn(), close: vi.fn(), readyState: 1 }));
  });

  it('joinRoom and leaveRoom send expected payloads', async () => {
    const sdk = new WebRTCClient({ websocketURL: 'ws://x' });
    const sent: string[] = [];
    // @ts-expect-error private
    sdk.ws = { send: (m: string) => sent.push(m), close: vi.fn() } as any;

    await sdk.joinRoom({ roomId: 'r1', streamId: 's1', role: 'publisher', metaData: { a: 1 } });
    await sdk.leaveRoom('r1', 's1');

    const cmds = sent.map(s => JSON.parse(s));
    expect(cmds[0].command).toBe('joinRoom');
    expect(cmds[0].room).toBe('r1');
    expect(cmds[1].command).toBe('leaveFromRoom');
    expect(cmds[1].room).toBe('r1');
  });

  it('assignment signals are formatted correctly', () => {
    const sdk = new WebRTCClient({ });
    const sent: string[] = [];
    // @ts-expect-error private
    sdk.ws = { send: (m: string) => sent.push(m) } as any;
    sdk.requestVideoTrackAssignments('main');
    sdk.assignVideoTrack('main', 'trackA', true);
    sdk.updateVideoTrackAssignments({ streamId: 'main', offset: 10, size: 5 });
    sdk.setMaxVideoTrackCount('main', 9);
    const cmds = sent.map(s => JSON.parse(s).command);
    expect(cmds).toEqual([
      'getVideoTrackAssignmentsCommand',
      'assignVideoTrackCommand',
      'updateVideoTrackAssignmentsCommand',
      'setMaxVideoTrackCountCommand',
    ]);
  });
});


