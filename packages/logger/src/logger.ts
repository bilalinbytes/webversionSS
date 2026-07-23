/**
 * @o2plus/logger
 *
 * Lightweight, portable logging interface.
 * Web uses this on the server (Next.js). Mobile uses this on device (React Native).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  name: string;
  minLevel?: LogLevel;
}

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Creates a simple JSON/console logger.
 * In a real app, this might forward to Datadog/Sentry in production.
 */
export function createConsoleLogger(options: LoggerOptions): Logger {
  const minLevelValue = levels[options.minLevel ?? "info"];

  const log = (level: LogLevel, message: string, data?: unknown) => {
    if (levels[level] < minLevelValue) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${options.name}] [${level.toUpperCase()}]`;

    if (data !== undefined) {
      console[level === "error" ? "error" : level === "warn" ? "warn" : level === "debug" ? "debug" : "info"](prefix, message, data);
    } else {
      console[level === "error" ? "error" : level === "warn" ? "warn" : level === "debug" ? "debug" : "info"](prefix, message);
    }
  };

  return {
    debug: (msg, ctx) => log("debug", msg, ctx),
    info: (msg, ctx) => log("info", msg, ctx),
    warn: (msg, ctx) => log("warn", msg, ctx),
    error: (msg, err, ctx) => log("error", msg, { error: err, ...ctx }),
  };
}
