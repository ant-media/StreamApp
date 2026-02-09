import { Logger, type LogLevel } from "../utils/logger.js";

import { Emitter } from "./emitter.js";
import type { EventMap } from "./events.js";

/**
 * Minimal interface implemented by the signaling transport.
 */
export interface IWebSocketAdaptor {
  isConnected(): boolean;
  isConnecting(): boolean;
  send(text: string): void;
  close(): void;
}

/**
 * Configuration options for {@link WebSocketAdaptor}.
 */
export interface WebSocketAdaptorOptions {
  websocketURL?: string;
  httpEndpointUrl?: string;
  webrtcadaptor: { notifyEventListeners: (info: string, obj?: unknown) => void };
  debug?: boolean | LogLevel;
}

/**
 * Thin wrapper around WebSocket that adapts Ant Media's signaling protocol
 * and emits typed events to the adaptor.
 */
export class WebSocketAdaptor extends Emitter<EventMap> implements IWebSocketAdaptor {
  private ws?: WebSocket;
  private connecting = false;
  private connected = false;
  private opts: WebSocketAdaptorOptions;
  private log: Logger;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Create a new WebSocket adaptor.
   */
  constructor(opts: WebSocketAdaptorOptions) {
    super();
    this.opts = opts;
    this.log = new Logger(
      typeof opts.debug === "string" ? opts.debug : opts.debug ? "debug" : "info"
    );
    if (opts.websocketURL || opts.httpEndpointUrl) {
      this.init();
    }
  }

  private startPing(): void {
    this.clearPing();
    this.pingTimer = setInterval(() => {
      this.send(JSON.stringify({ command: "ping" }));
    }, 3000);
  }

  private clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private init(): void {
    if (!this.opts.websocketURL) return;
    this.connecting = true;
    this.connected = false;
    this.log.info("connecting to websocket %s", this.opts.websocketURL);
    const ws = new WebSocket(this.opts.websocketURL);
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this.connecting = false;
      this.log.info("websocket connected");
      this.startPing();
      this.opts.webrtcadaptor.notifyEventListeners("initialized");
    };

    ws.onmessage = ev => {
      this.log.debug("ws message: %s", ev.data);
      try {
        const obj = JSON.parse(ev.data);
        if (obj && obj.command) {
          this.opts.webrtcadaptor.notifyEventListeners(obj.command, obj);
        }
      } catch (e) {
        this.log.warn("ws message parse failed", e);
      }
    };

    ws.onerror = e => {
      this.connected = false;
      this.connecting = false;
      this.clearPing();
      this.log.error("websocket error", e);
      this.opts.webrtcadaptor.notifyEventListeners("error", {
        error: "WebSocketNotConnected",
        message: "websocket error",
      });
    };

    ws.onclose = ev => {
      this.connected = false;
      this.connecting = false;
      this.clearPing();
      this.log.warn("websocket closed");
      this.opts.webrtcadaptor.notifyEventListeners("closed", ev);
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  isConnecting(): boolean {
    return this.connecting;
  }

  send(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log.warn("send while not connected");
      try {
        this.ws?.send(text);
      } catch {}
      this.opts.webrtcadaptor.notifyEventListeners("error", {
        error: "WebSocketNotConnected",
        message: text,
      });
      return;
    }
    this.log.debug("send: %s", text);
    this.ws.send(text);
  }

  close(): void {
    this.clearPing();
    this.ws?.close();
  }
}
