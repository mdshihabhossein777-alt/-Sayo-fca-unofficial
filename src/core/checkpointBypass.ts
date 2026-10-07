/**
 * Shihab X FCA — Advanced Checkpoint Bypass
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * 🛡️ ALL-IN-ONE Checkpoint Bypass System
 *
 * ┌───────────────────────────────────────────────────────┐
 * │  Detects:                                             │
 * │    • checkpoint_282  (login approval)                 │
 * │    • checkpoint_956  (identity verification)          │
 * │    • scraping_warning (automation detection)          │
 * │    • checkpoint/block  (temporary lock)               │
 * │    • consent / privacy updates                        │
 * │                                                       │
 * │  Actions:                                             │
 * │    • Auto-bypass scraping warning via GraphQL         │
 * │    • Extract & apply fresh cookies                    │
 * │    • Retry with backoff on transient checkpoints      │
 * │    • Emit events for external handlers                │
 * │    • Save session snapshot before risky operations    │
 * └───────────────────────────────────────────────────────┘
 *
 * Usage:
 *
 *   import { activateCheckpointBypass } from "./core/checkpointBypass";
 *   activateCheckpointBypass(api, ctx, { autoBypass: true });
 */

import logger from "../func/logger";
import { BRAND } from "../utils/constants";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

export type CheckpointType =
  | "checkpoint_282"
  | "checkpoint_956"
  | "scraping_warning"
  | "checkpoint_block"
  | "consent"
  | "unknown";

export interface CheckpointEvent {
  type: CheckpointType;
  threadID?: string;
  messageID?: string;
  detectedAt: number;
  raw?: string;
  action: "bypassed" | "detected" | "failed" | "skipped";
}

export interface CheckpointConfig {
  /** Auto-bypass scraping warnings */
  autoBypass?: boolean;
  /** Retry on transient checkpoints */
  retryOnTransient?: boolean;
  /** Max retry attempts */
  maxRetries?: number;
  /** Retry backoff base (ms) */
  retryBaseMs?: number;
  /** Auto-extract fresh cookies after bypass */
  refreshCookies?: boolean;
  /** Save AppState snapshot before risky ops */
  snapshotBeforeBypass?: boolean;
  /** Enable verbose debug logs */
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<CheckpointConfig> = {
  autoBypass: true,
  retryOnTransient: true,
  maxRetries: 3,
  retryBaseMs: 2000,
  refreshCookies: true,
  snapshotBeforeBypass: true,
  debug: false
};

/* ═══════════════════════════════════════════════════════════
   🧠 PATTERNS
   ═══════════════════════════════════════════════════════════ */

const PATTERNS: { type: CheckpointType; re: RegExp }[] = [
  { type: "checkpoint_282", re: /checkpoint_?282|checkpoint\/282/i },
  { type: "checkpoint_956", re: /checkpoint_?956|checkpoint\/956/i },
  { type: "scraping_warning", re: /scraping_warning|FBScrapingWarningMutation/i },
  { type: "checkpoint_block", re: /checkpoint\/block|checkpoint\/601051028565049/i },
  { type: "consent", re: /consent|privacy_policy_update|terms_of_service/i }
];

function detectType(text: string): CheckpointType {
  for (const { type, re } of PATTERNS) {
    if (re.test(text)) return type;
  }
  return "unknown";
}

/* ═══════════════════════════════════════════════════════════
   🛠️ HELPERS
   ═══════════════════════════════════════════════════════════ */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractToken(
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
   🎯 DETECTOR
   ═══════════════════════════════════════════════════════════ */

/**
 * Scan a string (HTML response, error message, etc.) for checkpoint
 * patterns.
 */
export function detectCheckpoint(text: string): CheckpointType | null {
  if (!text || typeof text !== "string") return null;
  return detectType(text);
}

/**
 * Wrap an async function so it auto-detects checkpoint errors.
 * Returns `{ ok: true, value }` or `{ ok: false, checkpoint }`.
 */
export async function withCheckpointGuard<T>(
  fn: () => Promise<T>,
  config: CheckpointConfig = {}
): Promise<
  | { ok: true; value: T }
  | { ok: false; checkpoint: CheckpointType; error: unknown }
> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  try {
    const value = await fn();
    return { ok: true, value };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const checkpoint = detectCheckpoint(msg);

    if (checkpoint && cfg.debug) {
      logger(
        `[${BRAND.name}] 🚨 Checkpoint detected: ${checkpoint}`,
        "warn"
      );
    }

    if (!checkpoint) throw err;
    return { ok: false, checkpoint, error: err };
  }
}

/* ═══════════════════════════════════════════════════════════
   🚀 SCRAPING WARNING BYPASS
   ═══════════════════════════════════════════════════════════ */

/**
 * Bypass Facebook's scraping warning mutation.
 * Requires `api.httpPost` + a valid session.
 */
async function bypassScrapingWarning(api: Loose, html: string): Promise<boolean> {
  try {
    const fb_dtsg =
      extractToken(html, '"DTSGInitData",[],{"token":"', '",') ||
      extractToken(html, 'name="fb_dtsg" value="', '"');
    const jazoest =
      extractToken(html, 'name="jazoest" value="', '"') ||
      extractToken(html, "jazoest=", '",');
    const lsd =
      extractToken(html, '["LSD",[],{"token":"', '"}') ||
      extractToken(html, 'name="lsd" value="', '"');
    const userId =
      extractToken(html, '"USER_ID":"', '"') ||
      extractToken(html, '"actorID":"', '"');

    if (!fb_dtsg || !userId) {
      if (DEFAULT_CONFIG.debug) {
        logger(
          `[${BRAND.name}] ⚠️ Scraping bypass: missing tokens`,
          "warn"
        );
      }
      return false;
    }

    const form = {
      av: userId,
      fb_dtsg,
      jazoest,
      lsd,
      fb_api_caller_class: "RelayModern",
      fb_api_req_friendly_name: "FBScrapingWarningMutation",
      variables: "{}",
      server_timestamps: true,
      doc_id: "6339492849481770"
    };

    if (typeof api.httpPost !== "function") {
      return false;
    }

    await api.httpPost(
      "https://www.facebook.com/api/graphql/",
      form
    );

    logger(
      `[${BRAND.name}] ✅ Scraping warning bypassed`,
      "success"
    );
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger(
      `[${BRAND.name}] ❌ Scraping bypass failed: ${msg}`,
      "warn"
    );
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   🔄 RETRY WRAPPER
   ═══════════════════════════════════════════════════════════ */

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Required<CheckpointConfig>
): Promise<T> {
  if (!config.retryOnTransient) return fn();

  let lastErr: unknown;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const checkpoint = detectCheckpoint(msg);

      /* Only retry on transient */
      if (
        checkpoint !== "checkpoint_block" &&
        checkpoint !== "scraping_warning"
      ) {
        throw err;
      }

      if (attempt === config.maxRetries) throw err;

      const delay = config.retryBaseMs * Math.pow(2, attempt - 1);
      const jitter = delay * 0.3 * (Math.random() * 2 - 1);

      logger(
        `[${BRAND.name}] ⏳ Retrying (${attempt}/${config.maxRetries}) after ${Math.round(
          delay + jitter
        )}ms — checkpoint: ${checkpoint || "unknown"}`,
        "warn"
      );

      await sleep(delay + jitter);
    }
  }

  throw lastErr;
}

/* ═══════════════════════════════════════════════════════════
   🎯 ACTIVATOR
   ═══════════════════════════════════════════════════════════ */

export interface CheckpointBypassHandle {
  /** Manually trigger a bypass on a response body */
  handle: (text: string) => Promise<CheckpointEvent>;
  /** Wrap an async call with full checkpoint protection */
  wrap: <T>(fn: () => Promise<T>) => Promise<T>;
  /** Snapshot current session state */
  snapshot: () => Promise<Loose | null>;
  /** Detection helper */
  detect: (text: string) => CheckpointType | null;
  /** Configuration */
  config: Required<CheckpointConfig>;
}

/**
 * Attach the Checkpoint Bypass system to an API + context.
 * Returns a handle you can use throughout your bot.
 */
export function activateCheckpointBypass(
  api: Loose,
  ctx: Loose,
  options: CheckpointConfig = {}
): CheckpointBypassHandle {
  const config: Required<CheckpointConfig> = {
    ...DEFAULT_CONFIG,
    ...options
  };

  const emitter = ctx?._emitter;
  let bypassCount = 0;

  /* ═══ Snapshot session state ═══ */
  async function snapshot(): Promise<Loose | null> {
    try {
      const cookies = await api.getCookies?.();
      const appState = await api.getAppState?.();
      return { cookies, appState, at: Date.now() };
    } catch {
      return null;
    }
  }

  /* ═══ Handle a checkpoint detection ═══ */
  async function handle(text: string): Promise<CheckpointEvent> {
    const type = detectCheckpoint(text);

    const event: CheckpointEvent = {
      type: type || "unknown",
      detectedAt: Date.now(),
      raw: text.slice(0, 200),
      action: "detected"
    };

    if (!type) {
      event.action = "skipped";
      return event;
    }

    logger(
      `[${BRAND.name}] 🚨 Checkpoint detected: ${type}`,
      "warn"
    );

    /* Emit to listener */
    try {
      emitter?.emit?.("checkpoint", event);
      if (type === "checkpoint_282") emitter?.emit?.("checkpoint_282", event);
      if (type === "checkpoint_956") emitter?.emit?.("checkpoint_956", event);
    } catch {
      /* silent */
    }

    if (!config.autoBypass) return event;

    /* Snapshot before bypass */
    if (config.snapshotBeforeBypass) {
      await snapshot();
    }

    /* Try to bypass */
    try {
      if (type === "scraping_warning") {
        const ok = await bypassScrapingWarning(api, text);
        event.action = ok ? "bypassed" : "failed";
        if (ok) bypassCount++;
      } else if (type === "checkpoint_block") {
        logger(
          `[${BRAND.name}] 🛑 Checkpoint block — manual intervention required`,
          "error"
        );
        event.action = "failed";
      } else {
        logger(
          `[${BRAND.name}] ⚠️ Checkpoint ${type} — login with fresh AppState`,
          "warn"
        );
        event.action = "failed";
      }

      /* Refresh cookies after successful bypass */
      if (event.action === "bypassed" && config.refreshCookies) {
        try {
          await api.getCookies?.();
        } catch {
          /* silent */
        }
      }
    } catch (err) {
      event.action = "failed";
      logger(
        `[${BRAND.name}] ❌ Bypass error: ${
          err instanceof Error ? err.message : String(err)
        }`,
        "warn"
      );
    }

    /* Emit result */
    try {
      emitter?.emit?.("checkpointResult", event);
    } catch {
      /* silent */
    }

    return event;
  }

  /* ═══ Wrap an async call with checkpoint + retry protection ═══ */
  async function wrap<T>(fn: () => Promise<T>): Promise<T> {
    return retryWithBackoff(async () => {
      const result = await withCheckpointGuard(fn, config);

      if (result.ok) {
        return result.value;
      }

      /* Try to bypass, then retry once */
      const event = await handle(String(result.error));
      if (event.action === "bypassed") {
        return fn(); /* Retry once after bypass */
      }

      throw result.error;
    }, config);
  }

  const handle_: CheckpointBypassHandle = {
    handle,
    wrap,
    snapshot,
    detect: detectCheckpoint,
    config
  };

  /* Attach to API for external access */
  (api as Loose).checkpoint = handle_;

  logger(
    `[${BRAND.name}] 🛡️ Checkpoint bypass activated (autoBypass=${
      config.autoBypass ? "ON" : "OFF"
    }, retries=${config.maxRetries})`,
    "success"
  );

  return handle_;
}

/* ═══════════════════════════════════════════════════════════
   📌 EXPORTS
   ═══════════════════════════════════════════════════════════ */

export default activateCheckpointBypass;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
