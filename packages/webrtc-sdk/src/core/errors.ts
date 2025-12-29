/**
 * Well-known error codes emitted by the SDK.
 */
export type ErrorCode =
  | "WebSocketNotConnected"
  | "WebSocketNotSupported"
  | "UnsecureContext"
  | "getUserMediaIsNotAllowed"
  | "ScreenSharePermissionDenied"
  | "notSetRemoteDescription"
  | "protocol_not_supported"
  | "data_channel_error"
  | "data_channel_blob_parse_failed"
  | "join_timeout"
  | "join_failed";

/**
 * Standardized error type produced by the SDK. Use {@link code} for programmatic handling.
 */
export class SDKError extends Error {
  readonly code: ErrorCode;
  readonly info?: unknown;

  constructor(code: ErrorCode, message?: string, info?: unknown) {
    super(message ?? code);
    this.name = "SDKError";
    this.code = code;
    this.info = info;
  }
}
