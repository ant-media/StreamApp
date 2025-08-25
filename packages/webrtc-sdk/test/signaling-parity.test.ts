import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebRTCClient } from '../src/core/webrtc-client.js';

describe('signaling parity sends correct commands', () => {
  beforeEach(() => {
    // minimal PC mock
    // @ts-expect-error mock
    global.RTCPeerConnection = vi.fn(() => ({
      addTrack: vi.fn(),
      getSenders: vi.fn(() => []),
      close: vi.fn(),
      onicecandidate: null,
      oniceconnectionstatechange: null,
      ontrack: null,
      createDataChannel: vi.fn(),
    }));
  });

  it('toggleVideo/Audio and info APIs send expected payloads', async () => {
    const sdk = new WebRTCClient({ mediaConstraints: { audio: true, video: true } });
    const sent: string[] = [];
    // inject mock ws
    (sdk as unknown as { ws: { send: (m: string) => void } }).ws = { send: (m: string) => sent.push(m) };

    sdk.toggleVideo('s1', 't1', true);
    sdk.toggleAudio('s1', 't1', false);
    sdk.getStreamInfo('s1');
    sdk.getBroadcastObject('s1');
    sdk.getRoomInfo('roomA', 's1');
    sdk.getTracks('s1');
    sdk.getSubtracks('s1', 'role', 0, 10);
    sdk.getSubtrackCount('s1', 'role', 'active');
    sdk.getSubscriberCount('s1');
    sdk.getSubscriberList('s1', 0, 5);
    sdk.peerMessage('s1', 'PING', { x: 1 });
    sdk.requestVideoTrackAssignments('s1');
    sdk.assignVideoTrack('s1', 'vId', true);
    sdk.updateVideoTrackAssignments({ streamId: 's1', offset: 0, size: 10 });
    sdk.setMaxVideoTrackCount('s1', 6);

    const cmds = sent.map(s => JSON.parse(s).command);
    expect(cmds).toEqual([
      'toggleVideo',
      'toggleAudio',
      'getStreamInfo',
      'getBroadcastObject',
      'getRoomInfo',
      'getTrackList',
      'getSubtracks',
      'getSubtracksCount',
      'getSubscriberCount',
      'getSubscribers',
      'peerMessageCommand',
      'getVideoTrackAssignmentsCommand',
      'assignVideoTrackCommand',
      'updateVideoTrackAssignmentsCommand',
      'setMaxVideoTrackCountCommand',
    ]);
  });
});


