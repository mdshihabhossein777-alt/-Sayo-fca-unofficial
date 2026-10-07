/**
 * Shihab X FCA — Legacy Login Helper Wrapper
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Thin CommonJS-compatible wrapper around the legacy login impl.
 * Preserves the classic `require()` signature used by GoatBot-style bots.
 *
 * 🚀 SHIHAB X PREMIUM:
 *   Automatically activates the Shihab X Premium core
 *   (rate-limit, human delay, cache, retry, circuit breaker,
 *   health check, cookie watcher, graceful shutdown) on successful
 *   login. No changes to `login-helper.impl.ts` required.
 */

import type { FcaOptions } from "./state";
import legacyImpl from "./login-helper.impl";
import { activatePremium } from "./premium";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

interface ApiCookie {
  key?: string;
  name?: string;
  value: string;
}

interface TokensApiResponse {
  status?: boolean;
  ok?: boolean;
  uid?: string;
  access_token?: string;
  cookies?: ApiCookie[] | string;
  cookie?: ApiCookie[] | string;
  message?: string;
}

interface LoginApi {
  getCurrentUserID?: () => string;
  getCookies?: () => string;
  [key: string]: Loose;
}

type LoginHelperCallback = (error: Error | null, api?: LoginApi) => void;

/**
 * Legacy login helper function shape — matches the classic FCA `require()`
 * entry point that older bots (GoatBot V1/V2, Mirai-based frameworks)
 * expect.
 */
type LegacyLoginHelper = ((
  appState: Loose,
  cookieInput: string | string[] | Record<string, string> | undefined,
  email: string | undefined,
  password: string | undefined,
  globalOptions: FcaOptions,
  callback: LoginHelperCallback
) => void) & {
  loginHelper: (
    appState: Loose,
    cookieInput: string | string[] | Record<string, string> | undefined,
    email: string | undefined,
    password: string | undefined,
    globalOptions: FcaOptions,
    callback: LoginHelperCallback
  ) => void;
  tokensViaAPI: (
    email: string,
    password: string,
    twoFactor?: string | null,
    apiBaseUrl?: string | null
  ) => Promise<TokensApiResponse>;
  loginViaAPI: (
    email: string,
    password: string,
    twoFactor?: string | null,
    apiBaseUrl?: string | null,
    apiKey?: string | null
  ) => Promise<TokensApiResponse>;
  tokens: (
    email: string,
    password: string,
    twoFactor?: string | null
  ) => Promise<TokensApiResponse>;
  normalizeCookieHeaderString: (cookieHeader: string) => string[];
  setJarFromPairs: (
    jar: {
      setCookieSync?: (cookie: string, url: string) => void;
      setCookie?: (cookie: string, url: string, cb?: (err?: Error | null) => void) => void;
    },
    pairs: string[],
    domain: string
  ) => void;
};

/* ═══════════════════════════════════════════════════════════
   🔧 ORIGINAL IMPL
   ═══════════════════════════════════════════════════════════ */

const originalLegacy = legacyImpl as unknown as LegacyLoginHelper;

/* ═══════════════════════════════════════════════════════════
   💎 PREMIUM ACTIVATOR
   ═══════════════════════════════════════════════════════════ */

/**
 * Try to locate the FCA context on the returned API object.
 * Falls back to a minimal stub so premium features still work.
 */
function resolveContext(api: Loose): Loose {
  if (!api) return {};

  return (
    (api as Loose).ctx ||
    (api as Loose)._ctx ||
    (api as Loose)._context || {
      api,
      jar: null,
      _emitter: null
    }
  );
}

/**
 * Activate all Shihab X Premium features on a freshly logged-in API.
 * Never throws — premium is optional.
 */
function activateShihabXPremium(api: Loose): void {
  try {
    const ctx = resolveContext(api);

    activatePremium(api, ctx, {
      /* ═══ 🛡️ Safety ═══ */
      rateLimitEnabled: true,
      threadLimit: 10, /* per-thread only — per-user is OFF */
      threadWindowMs: 60_000,

      humanDelayEnabled: true,
      humanDelayMinMs: 800,
      humanDelayMaxMs: 3000,

      duplicateBlockerEnabled: true,
      duplicateWindowMs: 10_000,

      cookieWatcherEnabled: true,
      cookieWarnDays: 3,

      /* ═══ ⚡ Speed ═══ */
      cacheEnabled: true,
      cacheTtlMs: 5 * 60_000,

      /* ═══ 🔄 Reliability ═══ */
      retryEnabled: true,
      retryMaxAttempts: 3,
      circuitBreakerEnabled: true,
      circuitFailureThreshold: 5,
      healthCheckEnabled: true,
      healthCheckIntervalMs: 5 * 60_000,
      gracefulShutdownEnabled: true,

      /* ═══ 🐛 Debug ═══ */
      debug: false
    });
  } catch {
    /* silent — premium is optional */
  }
}

/* ═══════════════════════════════════════════════════════════
   🚀 WRAPPED LOGIN HELPER
   ═══════════════════════════════════════════════════════════ */

/**
 * Wrap the original login helper so that, on successful login,
 * Shihab X Premium is activated before the callback fires.
 */
function wrappedLoginHelper(
  appState: Loose,
  cookieInput: string | string[] | Record<string, string> | undefined,
  email: string | undefined,
  password: string | undefined,
  globalOptions: FcaOptions,
  callback: LoginHelperCallback
): void {
  originalLegacy.loginHelper(
    appState,
    cookieInput,
    email,
    password,
    globalOptions,
    function (err, api) {
      if (!err && api) {
        activateShihabXPremium(api as Loose);
      }
      callback(err, api);
    }
  );
}

/* ═══════════════════════════════════════════════════════════
   📌 EXPORT — Preserve static methods
   ═══════════════════════════════════════════════════════════ */

const legacy = Object.assign(wrappedLoginHelper, {
  tokensViaAPI: originalLegacy.tokensViaAPI,
  loginViaAPI: originalLegacy.loginViaAPI,
  tokens: originalLegacy.tokens,
  normalizeCookieHeaderString: originalLegacy.normalizeCookieHeaderString,
  setJarFromPairs: originalLegacy.setJarFromPairs
}) as unknown as LegacyLoginHelper;

/* Self-reference so `legacy.loginHelper(...)` also works */
(legacy as Loose).loginHelper = legacy;

export = legacy;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
