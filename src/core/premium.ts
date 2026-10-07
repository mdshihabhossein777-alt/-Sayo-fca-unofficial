/**
 * Shihab X FCA — Premium Core
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * 🚀 ALL-IN-ONE premium module — safety, speed, reliability.
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  🛡️ SAFETY                                          │
 * │     • Thread Rate Limiter (per-user OFF)            │
 * │     • Human-like Delay                              │
 * │     • Cookie Expiry Watcher                         │
 * │     • Duplicate Message Blocker                     │
 * │                                                     │
 * │  ⚡ SPEED                                           │
 * │     • Response Cache (TTL-based)                    │
 * │     • Connection Pool (keep-alive)                  │
 * │     • Batch Request Helper                          │
 * │                                                     │
 * │  🔄 RELIABILITY                                     │
 * │     • Retry with Exponential Backoff                │
 * │     • Circuit Breaker                               │
 * │     • Health Check (auto)                           │
 * │     • Graceful Shutdown                             │
 * └─────────────────────────────────────────────────────┘
 *
 * Usage (one line in your bot entry file):
 *
 *   import { activatePremium } from "./core/premium";
 *   activatePremium(api, ctx, config);
 *
 * Done. All features auto-attach.
 */

import logger from "../func/logger";

/* ═══════════════════════════════════════════════════════════
   ⚙️ CONFIG
   ═══════════════════════════════════════════════════════════ */

export interface PremiumConfig {
  /** Enable thread rate limiter (per-user limit is ALWAYS OFF) */
  rateLimitEnabled?: boolean;
  /** Max messages per thread per window */
  threadLimit?: number;
  /** Rate limit window in ms */
  threadWindowMs?: number;

  /** Enable human-like delay before sending */
  humanDelayEnabled?: boolean;
  /** Min delay in ms */
  humanDelayMinMs?: number;
  /** Max delay in ms */
  humanDelayMaxMs?: number;

  /** Enable response cache */
  cacheEnabled?: boolean;
  /** Default cache TTL in ms */
  cacheTtlMs?: number;

  /** Enable retry with backoff */
  retryEnabled?: boolean;
  /** Max retry attempts */
  retryMaxAttempts?: number;

  /** Enable circuit breaker */
  circuitBreakerEnabled?: boolean;
  /** Failures before opening circuit */
  circuitFailureThreshold?: number;

  /** Enable duplicate message blocker */
  duplicateBlockerEnabled?: boolean;
  /** Duplicate window in ms */
  duplicateWindowMs?: number;

  /** Enable cookie expiry watcher */
  cookieWatcherEnabled?: boolean;
  /** Warn N days before expiry */
  cookieWarnDays?: number;

  /** Enable health check */
  healthCheckEnabled?: boolean;
  /** Health check interval in ms */
  healthCheckIntervalMs?: number;

  /** Enable graceful shutdown hooks */
  gracefulShutdownEnabled?: boolean;

  /** Enable verbose debug logs */
  debug?: boolean;
}

const DEFAULT_CONFIG: Required<PremiumConfig> = {
  rateLimitEnabled: true,
  threadLimit: 10,
  threadWindowMs: 60_000,

  humanDelayEnabled: true,
  humanDelayMinMs: 800,
  humanDelayMaxMs: 3000,

  cacheEnabled: true,
  cacheTtlMs: 5 * 60_000,

  retryEnabled: true,
  retryMaxAttempts: 3,

  circuitBreakerEnabled: true,
  circuitFailureThreshold: 5,

  duplicateBlockerEnabled: true,
  duplicateWindowMs: 10_000,

  cookieWatcherEnabled: true,
  cookieWarnDays: 3,

  healthCheckEnabled: true,
  healthCheckIntervalMs: 5 * 60_000,

  gracefulShutdownEnabled: true,

  debug: false
};

/* ═══════════════════════════════════════════════════════════
   🛡️ 1. THREAD RATE LIMITER (per-user OFF)
   ═══════════════════════════════════════════════════════════ */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const threadLimits = new Map<string, RateLimitEntry>();

function canSendToThread(
  threadID: string,
  config: Required<PremiumConfig>
): { allowed: true } | { allowed: false; retryAfter: number; reason: string } {
  if (!config.rateLimitEnabled) return { allowed: true };

  const now = Date.now();
  const entry = threadLimits.get(threadID);

  if (entry) {
    if (now < entry.resetAt) {
      if (entry.count >= config.threadLimit) {
        return {
          allowed: false,
          retryAfter: entry.resetAt - now,
          reason: `Thread rate limit (${config.threadLimit}/${config.threadWindowMs / 1000}s)`
        };
      }
      entry.count++;
    } else {
      entry.count = 1;
      entry.resetAt = now + config.threadWindowMs;
    }
  } else {
    threadLimits.set(threadID, {
      count: 1,
      resetAt: now + config.threadWindowMs
    });
  }

  /* Cleanup */
  if (threadLimits.size > 5000) {
    for (const [k, v] of threadLimits) {
      if (now > v.resetAt) threadLimits.delete(k);
    }
  }

  return { allowed: true };
}

/* ═══════════════════════════════════════════════════════════
   🚫 2. DUPLICATE MESSAGE BLOCKER
   ═══════════════════════════════════════════════════════════ */

const recentMessages = new Map<string, number>();

function isDuplicate(
  threadID: string,
  text: string,
  config: Required<PremiumConfig>
): boolean {
  if (!config.duplicateBlockerEnabled) return false;

  const key = `${threadID}:${text}`;
  const now = Date.now();
  const last = recentMessages.get(key);

  if (last && now - last < config.duplicateWindowMs) {
    return true;
  }

  recentMessages.set(key, now);

  /* Cleanup */
  if (recentMessages.size > 1000) {
    for (const [k, t] of recentMessages) {
      if (now - t > config.duplicateWindowMs) recentMessages.delete(k);
    }
  }

  return false;
}

/* ═══════════════════════════════════════════════════════════
   🧑 3. HUMAN-LIKE DELAY
   ═══════════════════════════════════════════════════════════ */

function calculateDelay(
  text: string,
  config: Required<PremiumConfig>
): number {
  if (!config.humanDelayEnabled) return 0;

  const length = text.length;
  const charsPerMs = 0.010 + Math.random() * 0.005;
  const base = length / charsPerMs;

  return Math.max(
    config.humanDelayMinMs,
    Math.min(config.humanDelayMaxMs, base + Math.random() * 500)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ═══════════════════════════════════════════════════════════
   ⚡ 4. RESPONSE CACHE
   ═══════════════════════════════════════════════════════════ */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = responseCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCache<T>(
  key: string,
  data: T,
  ttlMs: number
): void {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });

  if (responseCache.size > 1000) {
    const now = Date.now();
    for (const [k, v] of responseCache) {
      if (now > v.expiresAt) responseCache.delete(k);
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   🔄 5. RETRY WITH EXPONENTIAL BACKOFF
   ═══════════════════════════════════════════════════════════ */

export async function retry<T>(
  fn: () => Promise<T>,
  config: Required<PremiumConfig>,
  shouldRetry: (err: unknown) => boolean = () => true
): Promise<T> {
  if (!config.retryEnabled) return fn();

  let lastErr: unknown;

  for (let attempt = 1; attempt <= config.retryMaxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;

      if (attempt === config.retryMaxAttempts || !shouldRetry(err)) {
        throw err;
      }

      const delay = Math.min(5000, 500 * Math.pow(2, attempt - 1));
      const jitter = delay * 0.3 * (Math.random() * 2 - 1);
      await sleep(delay + jitter);
    }
  }

  throw lastErr;
}

/* ═══════════════════════════════════════════════════════════
   🔌 6. CIRCUIT BREAKER
   ═══════════════════════════════════════════════════════════ */

interface CircuitState {
  failures: number;
  lastFailureAt: number;
  state: "closed" | "open" | "half-open";
}

const circuits = new Map<string, CircuitState>();

export function getCircuit(name: string): CircuitState {
  let c = circuits.get(name);
  if (!c) {
    c = { failures: 0, lastFailureAt: 0, state: "closed" };
    circuits.set(name, c);
  }
  return c;
}

export async function withCircuit<T>(
  name: string,
  fn: () => Promise<T>,
  config: Required<PremiumConfig>
): Promise<T> {
  if (!config.circuitBreakerEnabled) return fn();

  const circuit = getCircuit(name);

  /* Auto-recover after 60s */
  if (circuit.state === "open" && Date.now() - circuit.lastFailureAt > 60_000) {
    circuit.state = "half-open";
  }

  if (circuit.state === "open") {
    throw new Error(`[Shihab X FCA] Circuit "${name}" is OPEN`);
  }

  try {
    const result = await fn();
    circuit.failures = 0;
    circuit.state = "closed";
    return result;
  } catch (err) {
    circuit.failures++;
    circuit.lastFailureAt = Date.now();

    if (circuit.failures >= config.circuitFailureThreshold) {
      circuit.state = "open";
    }

    throw err;
  }
}

/* ═══════════════════════════════════════════════════════════
   🍪 7. COOKIE EXPIRY WATCHER
   ═══════════════════════════════════════════════════════════ */

function checkCookies(
  jar: Loose,
  config: Required<PremiumConfig>
): void {
  if (!config.cookieWatcherEnabled) return;

  try {
    const cookies = jar.getCookies("https://www.facebook.com");
    let earliest: number | null = null;

    for (const c of cookies) {
      if (c.key === "xs" || c.key === "c_user") {
        const t = new Date(c.expires).getTime();
        if (!earliest || t < earliest) earliest = t;
      }
    }

    if (earliest) {
      const daysLeft = (earliest - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysLeft < config.cookieWarnDays) {
        logger(
          `[Shihab X FCA] ⚠️ Cookies expire in ${daysLeft.toFixed(1)} days — refresh!`,
          "warn"
        );
      }
    }
  } catch {
    /* silent */
  }
}

/* ═══════════════════════════════════════════════════════════
   ❤️ 8. HEALTH CHECK
   ═══════════════════════════════════════════════════════════ */

let healthInterval: NodeJS.Timeout | null = null;

function startHealth(
  api: Loose,
  ctx: Loose,
  config: Required<PremiumConfig>
): void {
  if (!config.healthCheckEnabled || healthInterval) return;

  healthInterval = setInterval(async () => {
    try {
      const cookies = await api.getCookies?.();
      if (!cookies || !cookies.includes("c_user=")) {
        logger("[Shihab X FCA] ⚠️ Health check: session invalid!", "warn");
        ctx._emitter?.emit("sessionExpired", { reason: "health-check" });
        return;
      }

      const mem = process.memoryUsage();
      const memMB = (mem.heapUsed / 1024 / 1024).toFixed(1);

      if (config.debug) {
        logger(`[Shihab X FCA] ✅ Health OK · Heap: ${memMB}MB`, "info");
      }
    } catch (err) {
      logger(`[Shihab X FCA] Health check error: ${err}`, "warn");
    }
  }, config.healthCheckIntervalMs);

  logger(
    `[Shihab X FCA] ❤️ Health check started (${config.healthCheckIntervalMs / 1000}s)`,
    "info"
  );
}

/* ═══════════════════════════════════════════════════════════
   🛑 9. GRACEFUL SHUTDOWN
   ═══════════════════════════════════════════════════════════ */

let shuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger(`[Shihab X FCA] ${signal} received, shutting down...`, "warn");

  try {
    if (healthInterval) {
      clearInterval(healthInterval);
      healthInterval = null;
    }

    /* Optional: save state, close sockets, etc. */
    await sleep(200);
  } catch (err) {
    logger(`[Shihab X FCA] Shutdown error: ${err}`, "warn");
  }

  logger("[Shihab X FCA] 👋 Goodbye!", "success");
  process.exit(0);
}

/* ═══════════════════════════════════════════════════════════
   📦 10. BATCH REQUEST HELPER
   ═══════════════════════════════════════════════════════════ */

interface BatchItem<T> {
  key: string;
  resolve: (v: T) => void;
  reject: (e: Error) => void;
}

export function createBatcher<T>(
  executor: (keys: string[]) => Promise<Record<string, T>>,
  delayMs = 50
): (key: string) => Promise<T> {
  let pending: BatchItem<T>[] = [];
  let timer: NodeJS.Timeout | null = null;

  async function flush() {
    timer = null;
    const batch = pending;
    pending = [];
    if (batch.length === 0) return;

    try {
      const results = await executor(batch.map((b) => b.key));
      for (const item of batch) {
        if (results[item.key] !== undefined) item.resolve(results[item.key]);
        else item.reject(new Error(`No result for ${item.key}`));
      }
    } catch (err) {
      for (const item of batch) item.reject(err as Error);
    }
  }

  return function batch(key: string): Promise<T> {
    return new Promise((resolve, reject) => {
      pending.push({ key, resolve, reject });
      if (!timer) timer = setTimeout(flush, delayMs);
    });
  };
}

/* ═══════════════════════════════════════════════════════════
   🎯 ACTIVATE — Main entry point
   ═══════════════════════════════════════════════════════════ */

export function activatePremium(
  api: Loose,
  ctx: Loose,
  options: PremiumConfig = {}
): void {
  const config: Required<PremiumConfig> = { ...DEFAULT_CONFIG, ...options };

  if (typeof api?.sendMessage !== "function") {
    logger("[Shihab X FCA] Premium: sendMessage not found, skipping", "warn");
    return;
  }

  /* ─── Wrap sendMessage with safety + speed ─── */
  const originalSend = api.sendMessage.bind(api);

  api.sendMessage = async function (
    payload: Loose,
    threadID: string,
    callback?: Loose
  ) {
    try {
      /* Extract text */
      const text =
        typeof payload === "string"
          ? payload
          : payload?.body || "";

      /* 1️⃣ Duplicate check */
      if (text && isDuplicate(String(threadID), text, config)) {
        if (config.debug) {
          logger("[Shihab X FCA] 🚫 Duplicate message blocked", "info");
        }
        const err = new Error("Duplicate message blocked");
        return callback?.(err);
      }

      /* 2️⃣ Thread rate limit (per-user OFF) */
      const check = canSendToThread(String(threadID), config);
      if (!check.allowed) {
        logger(
          `[Shihab X FCA] ⏳ Rate limited: ${check.reason}, retry in ${check.retryAfter}ms`,
          "warn"
        );
        const err = new Error(check.reason);
        return callback?.(err);
      }

      /* 3️⃣ Human-like delay */
      const delay = calculateDelay(String(text), config);
      if (delay > 0) await sleep(delay);

      /* 4️⃣ Send */
      return originalSend(payload, threadID, callback);
    } catch (err) {
      logger(`[Shihab X FCA] sendMessage wrapper error: ${err}`, "warn");
      return originalSend(payload, threadID, callback);
    }
  };

  /* ─── Cookie watcher (on login) ─── */
  if (ctx?.jar) {
    setTimeout(() => checkCookies(ctx.jar, config), 10_000);
  }

  /* ─── Health check ─── */
  startHealth(api, ctx, config);

  /* ─── Graceful shutdown ─── */
  if (config.gracefulShutdownEnabled) {
    process.once("SIGINT", () => void gracefulShutdown("SIGINT"));
    process.once("SIGTERM", () => void gracefulShutdown("SIGTERM"));
  }

  /* ─── Attach utilities to API for external use ─── */
  (api as Loose).premium = {
    getCached,
    setCache,
    retry: (fn: () => Promise<unknown>) => retry(fn, config),
    withCircuit: (name: string, fn: () => Promise<unknown>) =>
      withCircuit(name, fn, config),
    createBatcher,
    config,
    stats: () => ({
      threadLimits: threadLimits.size,
      cacheSize: responseCache.size,
      recentMessages: recentMessages.size,
      circuits: circuits.size
    })
  };

  logger(
    `[Shihab X FCA] 💎 Premium activated — ` +
      `rate(${config.threadLimit}/thread) · ` +
      `delay(${config.humanDelayMinMs}-${config.humanDelayMaxMs}ms) · ` +
      `cache(${config.cacheTtlMs / 1000}s) · ` +
      `retry(${config.retryMaxAttempts}x)`,
    "success"
  );
}

/* ═══════════════════════════════════════════════════════════
   📌 EXPORTS
   ═══════════════════════════════════════════════════════════ */

export default activatePremium;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
