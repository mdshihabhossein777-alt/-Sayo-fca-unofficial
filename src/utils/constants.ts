/**
 * Shihab X FCA — Shared Constants & Helpers
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Cross-cutting constants and small helpers used throughout the FCA
 * codebase:
 *   • getFrom()          — extract substring between two tokens
 *   • isReadableStream() — duck-type check for Readable streams
 *   • BRAND              — brand identity constants
 *   • DEFAULTS           — default values (URLs, timeouts, headers)
 */

import stream from "stream";
import formatModNs from "./format";

/* ═══════════════════════════════════════════════════════════
   🎨 BRAND IDENTITY
   ═══════════════════════════════════════════════════════════ */

export const BRAND = {
  name: "Shihab X FCA",
  shortName: "ShihabX",
  author: "Shihab X",
  authorUrl: "https://github.com/mdshihabhosein777-alt",
  repo: "https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial",
  originalAuthor: "DongDev",
  originalRepo: "https://github.com/dongp06/fca-unofficial",
  version: "1.0.0",
  userAgent: "ShihabX-FCA/1.0.0"
} as const;

/* ═══════════════════════════════════════════════════════════
   ⚙️ DEFAULTS
   ═══════════════════════════════════════════════════════════ */

export const DEFAULTS = {
  /** Facebook domain */
  domain: ".facebook.com",

  /** Facebook base URLs */
  baseUrl: "https://www.facebook.com",
  mBaseUrl: "https://m.facebook.com",
  graphqlUrl: "https://www.facebook.com/api/graphql/",

  /** Cookie TTL (1 year) */
  cookieTtlMs: 1000 * 60 * 60 * 24 * 365,

  /** HTTP timeouts (ms) */
  requestTimeoutMs: 60_000,
  updateCheckTimeoutMs: 10_000,

  /** MQTT defaults */
  mqttReconnectMs: 3_600_000,

  /** Region fallback */
  defaultRegion: "PRN"
} as const;

/* ═══════════════════════════════════════════════════════════
   🛠️ FORMAT MODULE NORMALIZATION
   ═══════════════════════════════════════════════════════════ */

/**
 * `./format` may be exported as a function OR an object with a
 * `getType` method, depending on the build target. Normalize both
 * shapes into a single `getType` function.
 */
const formatMod = formatModNs as
  | ((value: Loose) => string)
  | {
      getType?: (value: Loose) => string;
    };

const getType: (value: Loose) => string =
  typeof formatMod === "function"
    ? formatMod
    : formatMod.getType ||
      ((value: Loose) => Object.prototype.toString.call(value).slice(8, -1));

/* ═══════════════════════════════════════════════════════════
   🔍 HTML TOKEN EXTRACTOR
   ═══════════════════════════════════════════════════════════ */

/**
 * Extract the substring between two tokens in an HTML/string blob.
 *
 * @example
 *   getFrom('<a href="abc">x</a>', '<a href="', '">')
 *   // → "abc"
 *
 * @returns The substring, or `undefined` if either token is missing.
 */
function getFrom(
  html: string,
  startToken: string,
  endToken: string
): string | undefined {
  const i = html.indexOf(startToken);
  if (i < 0) return undefined;

  const start = i + startToken.length;
  const j = html.indexOf(endToken, start);

  return j < 0 ? undefined : html.slice(start, j);
}

/* ═══════════════════════════════════════════════════════════
   🌊 STREAM TYPE GUARD
   ═══════════════════════════════════════════════════════════ */

/**
 * Duck-type check for a Node.js Readable stream.
 *
 * True when the value is:
 *   • An instance of `stream.Stream`
 *   • Has a `_read` function (sync or async)
 *   • Has a `_readableState` object
 */
function isReadableStream(obj: Loose): obj is NodeJS.ReadableStream {
  const maybe = obj as { _read?: Loose; _readableState?: Loose } &
    NodeJS.ReadableStream;

  return Boolean(
    obj instanceof stream.Stream &&
      (getType(maybe._read) === "Function" ||
        getType(maybe._read) === "AsyncFunction") &&
      getType(maybe._readableState) === "Object"
  );
}

/* ═══════════════════════════════════════════════════════════
   📤 EXPORTS
   ═══════════════════════════════════════════════════════════ */

export { getFrom, isReadableStream };

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
