export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

export interface ILogger {
  level: LogLevel;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const order: Record<Exclude<LogLevel, "none">, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger implements ILogger {
  level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  private enabled(target: Exclude<LogLevel, "none">): boolean {
    if (this.level === "none") return false;
    if (this.level === target) return true;
    // allow higher-severity logs when level is lower number (debug < info < warn < error)
    const min = order[this.level as Exclude<LogLevel, "none">];
    const cur = order[target];
    return cur >= min;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.enabled("debug")) console.debug(`[AMS][DEBUG] ${message}`, ...args);
  }
  info(message: string, ...args: unknown[]): void {
    if (this.enabled("info")) console.info(`[AMS][INFO] ${message}`, ...args);
  }
  warn(message: string, ...args: unknown[]): void {
    if (this.enabled("warn")) console.warn(`[AMS][WARN] ${message}`, ...args);
  }
  error(message: string, ...args: unknown[]): void {
    if (this.enabled("error")) console.error(`[AMS][ERROR] ${message}`, ...args);
  }
}
