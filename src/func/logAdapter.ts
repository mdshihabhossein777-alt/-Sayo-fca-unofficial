/**
 * Shihab X FCA — Log Adapter
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Thin wrapper around the main logger. Accepts flexible argument shapes
 * (tag + message, Error objects, plain strings) and forwards them to the
 * Shihab X FCA logger with the correct log level.
 *
 * Examples:
 *   log.info("SESSION", "Bot started");
 *   log.warn("MQTT", new Error("Disconnected"));
 *   log.error(new Error("Login failed"));
 *   log.success("READY", "All systems go");
 */

import logger from "./logger";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPE HELPERS
   ═══════════════════════════════════════════════════════════ */

type LogLevel = "info" | "warn" | "error" | "success" | "sys" | "debug";

/* ═══════════════════════════════════════════════════════════
   📝 ARGUMENT FORMATTER
   ═══════════════════════════════════════════════════════════ */

/**
 * Normalize flexible logger arguments into a single string.
 *
 * Supported shapes:
 *   formatArgs(["message"])                     → "message"
 *   formatArgs(["TAG", "message"])              → "TAG: message"
 *   formatArgs([new Error("boom")])             → "boom\n    at ..."
 *   formatArgs(["TAG", new Error("boom")])      → "TAG: boom"
 *   formatArgs([null, "message"])               → "message"
 *   formatArgs([undefined])                     → "undefined"
 */
function formatArgs(args: unknown[]): string {
  const [prefix, msg] = args;

  /* ─── Single argument ─── */
  if (msg === undefined) {
    if (prefix instanceof Error) {
      return prefix.stack || prefix.message || String(prefix);
    }
    return String(prefix);
  }

  /* ─── Two arguments ─── */
  const tag = prefix == null ? "" : String(prefix);

  if (msg instanceof Error) {
    const base = msg.message || String(msg);
    return tag ? `${tag}: ${base}` : base;
  }

  const text = msg == null ? "" : String(msg);
  return tag ? `${tag}: ${text}` : text;
}

/* ═══════════════════════════════════════════════════════════
   🚀 LOGGER FACADE
   ═══════════════════════════════════════════════════════════ */

const log = {
  /** Informational messages */
  info: (...args: unknown[]) => logger(formatArgs(args), "info"),

  /** Non-critical warnings */
  warn: (...args: unknown[]) => logger(formatArgs(args), "warn"),

  /** Critical errors */
  error: (...args: unknown[]) => logger(formatArgs(args), "error"),

  /** Success / completion messages */
  success: (...args: unknown[]) => logger(formatArgs(args), "success"),

  /** System / core-level messages */
  sys: (...args: unknown[]) => logger(formatArgs(args), "sys"),

  /** Verbose — routed to info */
  verbose: (...args: unknown[]) => logger(formatArgs(args), "info"),

  /** Silly — routed to info (legacy Winston-style) */
  silly: (...args: unknown[]) => logger(formatArgs(args), "info"),

  /** Debug — only when DEBUG env is set */
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG || process.env.FCA_DEBUG) {
      logger(formatArgs(args), "info");
    }
  }
};

/* ═══════════════════════════════════════════════════════════
   📌 EXPORT
   ═══════════════════════════════════════════════════════════ */

export default log;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
