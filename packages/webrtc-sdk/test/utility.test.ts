import { describe, it, expect } from 'vitest';
import { generateRandomString, getWebSocketURL } from '../src/utils/utility.js';

describe('utility', () => {
  it('generates string of length', () => {
    const s = generateRandomString(8);
    expect(s).toHaveLength(8);
  });
  it('builds ws URL', () => {
    const loc = {
      protocol: 'https:',
      hostname: 'example.com',
      port: '5443',
      pathname: '/LiveApp/index.html',
    } as unknown as Location;
    const url = getWebSocketURL(loc);
    expect(url).toBe('wss://example.com:5443/LiveApp/websocket');
  });
});
