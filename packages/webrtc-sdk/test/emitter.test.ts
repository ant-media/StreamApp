import { describe, it, expect, vi } from 'vitest';
import { Emitter } from '../src/core/emitter.js';

interface Map {
  a: { x: number };
  b: void;
  error: { error: string };
}

describe('Emitter', () => {
  it('emits and listens', () => {
    const e = new Emitter<Map>();
    const fn = vi.fn();
    e.on('a', fn);
    e.emit('a', { x: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ x: 1 });
  });

  it('once only fires once', () => {
    const e = new Emitter<Map>();
    const fn = vi.fn();
    e.once('a', fn);
    e.emit('a', { x: 1 });
    e.emit('a', { x: 2 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('off removes handler', () => {
    const e = new Emitter<Map>();
    const fn = vi.fn();
    e.on('a', fn);
    e.off('a', fn);
    e.emit('a', { x: 3 });
    expect(fn).not.toHaveBeenCalled();
  });
});
