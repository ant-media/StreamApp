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
  /** HTTP endpoint URL (e.g. Lambda URL) that returns the websocket URL for auto-managed instances */
  httpEndpointUrl?: string;
  /** Access token sent as a query parameter when resolving the HTTP endpoint */
  httpEndpointAccessToken?: string;
  /** Maximum time (ms) to wait for endpoint resolution + instance readiness (default: 120000) */
  endpointTimeoutMs?: number;
  /** Interval (ms) between retry attempts when polling the endpoint or instance (default: 3000) */
  endpointRetryMs?: number;
  webrtcadaptor: { notifyEventListeners: (info: string, obj?: unknown) => void };
  debug?: boolean | LogLevel;
}

/** Response shape returned by the auto-managed HTTP endpoint (Lambda). */
interface EndpointResponse {
  fqdn?: string;
  websocket_url: string;
  http_url: string;
}

/**
 * Thin wrapper around WebSocket that adapts Ant Media's signaling protocol
 * and emits typed events to the adaptor.
 *
 * Supports two connection modes:
 * 1. **Direct WebSocket** — when `websocketURL` is provided, connects immediately.
 * 2. **Auto-managed endpoint** — when `httpEndpointUrl` is provided, resolves the
 *    actual WebSocket URL via the HTTP endpoint (e.g. AWS Lambda), polls until the
 *    instance is ready, then connects.
 */
export class WebSocketAdaptor extends Emitter<EventMap> implements IWebSocketAdaptor {
  private ws?: WebSocket;
  private connecting = false;
  private connected = false;
  private opts: WebSocketAdaptorOptions;
  private log: Logger;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private endpointAborted = false;

  /**
   * Create a new WebSocket adaptor.
   */
  constructor(opts: WebSocketAdaptorOptions) {
    super();
    this.opts = opts;
    this.log = new Logger(
      typeof opts.debug === "string" ? opts.debug : opts.debug ? "debug" : "info"
    );
    if (opts.websocketURL) {
      this.initWebSocket(opts.websocketURL);
    } else if (opts.httpEndpointUrl) {
      void this.resolveEndpointAndConnect();
    }
  }

  /**
   * Resolves the actual WebSocket URL from the HTTP endpoint (Lambda) and waits
   * for the backend instance to become ready before opening the WebSocket.
   */
  private async resolveEndpointAndConnect(): Promise<void> {
    const maxWaitMs = this.opts.endpointTimeoutMs ?? 120_000;
    const retryMs = this.opts.endpointRetryMs ?? 3000;
    const startedAt = Date.now();
    let attempt = 0;

    this.connecting = true;
    this.connected = false;

    const endpointUrl = this.buildEndpointUrl();

    while (!this.endpointAborted) {
      const elapsedMs = Date.now() - startedAt;
      if (elapsedMs >= maxWaitMs) {
        this.connecting = false;
        this.log.error("endpoint resolution timed out after %dms", elapsedMs);
        this.opts.webrtcadaptor.notifyEventListeners("endpoint_timeout", {
          elapsedMs,
          maxMs: maxWaitMs,
        });
        this.opts.webrtcadaptor.notifyEventListeners("error", {
          error: "EndpointTimeout",
          message: `Auto-managed endpoint did not become ready within ${maxWaitMs}ms`,
        });
        return;
      }

      attempt++;

      // Phase 1: Resolve endpoint
      let data: EndpointResponse | null = null;
      try {
        this.opts.webrtcadaptor.notifyEventListeners("endpoint_resolving");
        this.log.info("resolving endpoint (attempt %d): %s", attempt, endpointUrl);
        const response = await fetch(endpointUrl, { method: "GET" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        data = (await response.json()) as EndpointResponse;
        this.log.info(
          "endpoint resolved -> fqdn: %s, websocket_url: %s, http_url: %s",
          data.fqdn ?? "N/A",
          data.websocket_url,
          data.http_url
        );
        this.opts.webrtcadaptor.notifyEventListeners("endpoint_resolved", {
          websocketUrl: data.websocket_url,
          httpUrl: data.http_url,
        });
      } catch (e) {
        this.log.warn(
          "endpoint resolution failed (attempt %d), retrying in %dms",
          attempt,
          retryMs
        );
        this.log.debug("endpoint error:", e);
        this.opts.webrtcadaptor.notifyEventListeners("instance_waiting", {
          attempt,
          elapsedMs: Date.now() - startedAt,
        });
        await this.delay(retryMs);
        continue;
      }

      // Phase 2: Wait for instance readiness
      if (this.endpointAborted) return;
      try {
        this.opts.webrtcadaptor.notifyEventListeners("instance_waiting", {
          attempt,
          elapsedMs: Date.now() - startedAt,
        });
        this.log.info("checking instance readiness: %s", data.http_url);
        const healthResp = await fetch(data.http_url, { method: "HEAD" });
        if (healthResp.status >= 200 && healthResp.status < 400) {
          this.log.info("instance is ready, opening WebSocket");
          this.initWebSocket(data.websocket_url);
          return;
        }
        this.log.warn("instance not ready (HTTP %d), retrying in %dms", healthResp.status, retryMs);
      } catch (e) {
        this.log.warn(
          "instance health check failed (attempt %d), retrying in %dms",
          attempt,
          retryMs
        );
        this.log.debug("health check error:", e);
      }

      await this.delay(retryMs);
    }
  }

  /**
   * Builds the endpoint URL with query parameters (source=sdk, optional accessToken).
   */
  private buildEndpointUrl(): string {
    const url = new URL(this.opts.httpEndpointUrl!);
    url.searchParams.set("source", "sdk");
    if (this.opts.httpEndpointAccessToken) {
      url.searchParams.set("accessToken", this.opts.httpEndpointAccessToken);
    }
    return url.toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── WebSocket connection ────────────────────────────────────────────

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

  /**
   * Opens a WebSocket connection to the given URL and wires up event handlers.
   */
  private initWebSocket(websocketURL: string): void {
    this.connecting = true;
    this.connected = false;
    this.log.info("connecting to websocket %s", websocketURL);
    const ws = new WebSocket(websocketURL);
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

  // ─── Public API ──────────────────────────────────────────────────────

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
    this.endpointAborted = true;
    this.clearPing();
    this.ws?.close();
  }
}
