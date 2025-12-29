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
  async createOffer(){ return { type: 'offer' as const, sdp: 'v=0\n' }; }
  async setLocalDescription() {}
}
// @ts-ignore
(global as any).RTCPeerConnection = MockPC;
// @ts-ignore
(global as any).RTCSessionDescription = function(x:any){ return x; };

describe('notifications mapping', () => {
  it('maps server notifications and closed/server_will_stop', async () => {
    const adaptor = new WebRTCClient({ websocketURL: 'wss://x', isPlayMode: false, mediaConstraints: { video: false, audio: false } });
    const events: string[] = [];
    adaptor.on('publish_started', () => events.push('publish_started'));
    adaptor.on('publish_finished', () => events.push('publish_finished'));
    adaptor.on('play_started', () => events.push('play_started'));
    adaptor.on('play_finished', () => events.push('play_finished'));
    adaptor.on('closed', () => events.push('closed'));
    adaptor.on('server_will_stop', () => events.push('server_will_stop'));
    adaptor.on('notification:subscriberCount' as any, () => events.push('notif:subscriberCount'));
    adaptor.on('subscriber_count' as any, () => events.push('evt:subscriber_count'));

    // @ts-ignore
    adaptor['notify']('initialized', undefined as any);
    // @ts-ignore
    adaptor['notify']('notification', { definition: 'publish_started', streamId: 's' } as any);
    // @ts-ignore
    adaptor['notify']('notification', { definition: 'publish_finished', streamId: 's' } as any);
    // @ts-ignore
    adaptor['notify']('notification', { definition: 'play_started', streamId: 's' } as any);
    // @ts-ignore
    adaptor['notify']('notification', { definition: 'play_finished', streamId: 's' } as any);
    // @ts-ignore
    adaptor['notify']('closed', {} as any);
    // @ts-ignore
    adaptor['notify']('server_will_stop', {} as any);
    // dynamic
    // @ts-ignore
    adaptor['notify']('notification', { definition: 'subscriberCount', streamId: 's' } as any);

    expect(events).toEqual([
      'publish_started',
      'publish_finished',
      'play_started',
      'play_finished',
      'closed',
      'server_will_stop',
      'evt:subscriber_count',
      'notif:subscriberCount',
    ]);
  });
});


