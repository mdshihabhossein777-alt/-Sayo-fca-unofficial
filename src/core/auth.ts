/**
 * Shihab X FCA — Main Authentication Entry
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Public authentication surface:
 *   • login()            — classic FCA + Promise (dual-mode)
 *   • loginAsync()       — Promise-only, returns FcaContext
 *   • loginLegacy()      — callback receives FcaContext
 *   • loginViaAPI()      — token-based login via external API
 *   • tokensViaAPI()     — fetch tokens from external API
 *   • normalizeCookieHeaderString()
 *   • setJarFromPairs()
 */

import logger from "../func/logger";
import format from "../utils/format";
import { createDefaultContext, type FcaContext, type FcaOptions } from "./state";
import { createRequestHelper } from "./request";
import { setOptions } from "./options";
import { loadConfig } from "./config";
import { runConfiguredUpdateCheck } from "./update-check";
import loginHelper from "./login-helper";

const { getType } = format;

/* ═══════════════════════════════════════════════════════════
   🎯 PUBLIC TYPES
   ═══════════════════════════════════════════════════════════ */

export interface LoginCredentials {
  appState?: Loose[];
  email?: string;
  password?: string;
  Cookie?: string | string[] | Record<string, string>;
}

export interface TokensApiResponse {
  status?: boolean;
  ok?: boolean;
  uid?: string;
  access_token?: string;
  cookies?: Loose[] | string;
  cookie?: Loose[] | string;
  message?: string;
}

/** Classic FCA-style callback receives the flat `api` object (same as `ctx.api`). */
export type LoginApiCallback = (err: Error | null | undefined, api?: Loose) => void;

/* ═══════════════════════════════════════════════════════════
   🌐 GLOBAL SETUP — Shihab X Config + Error Handlers
   ═══════════════════════════════════════════════════════════ */

const g: Loose = global as Loose;
const initialConfig = loadConfig().config;

g.fca = g.fca || {};
g.fca.config = initialConfig;

/* ─── Install global error handlers (only once) ─── */
if (!g.fca._errorHandlersInstalled) {
  g.fca._errorHandlersInstalled = true;

  /* Unhandled promise rejections */
  process.on("unhandledRejection", (reason: Loose) => {
    try {
      if (reason && typeof reason === "object") {
        const errorCode = reason.code || reason.cause?.code;
        const errorMessage = reason.message || String(reason);

        if (errorMessage.includes("No Sequelize instance passed")) {
          return;
        }

        if (
          errorCode === "UND_ERR_CONNECT_TIMEOUT" ||
          errorCode === "ETIMEDOUT" ||
          errorMessage.includes("Connect Timeout") ||
          errorMessage.includes("fetch failed")
        ) {
          logger(`[Shihab X FCA] Network timeout (non-fatal): ${errorMessage}`, "warn");
          return;
        }

        if (
          errorCode === "ECONNREFUSED" ||
          errorCode === "ENOTFOUND" ||
          errorCode === "ECONNRESET" ||
          errorMessage.includes("ECONNREFUSED") ||
          errorMessage.includes("ENOTFOUND")
        ) {
          logger(`[Shihab X FCA] Network connection error (non-fatal): ${errorMessage}`, "warn");
          return;
        }
      }

      logger(
        `[Shihab X FCA] Unhandled promise rejection (non-fatal): ${
          reason && reason.message ? reason.message : String(reason)
        }`,
        "error"
      );
    } catch {
      /* silent */
    }
  });

  /* Uncaught exceptions */
  process.on("uncaughtException", (error: Loose) => {
    try {
      const errorMessage = error.message || String(error);
      const errorCode = error.code;

      if (errorMessage.includes("No Sequelize instance passed")) {
        return;
      }

      if (
        errorCode === "UND_ERR_CONNECT_TIMEOUT" ||
        errorCode === "ETIMEDOUT" ||
        errorMessage.includes("Connect Timeout") ||
        errorMessage.includes("fetch failed")
      ) {
        logger(`[Shihab X FCA] Uncaught network timeout (non-fatal): ${errorMessage}`, "warn");
        return;
      }

      logger(`[Shihab X FCA] Uncaught exception (continuing): ${errorMessage}`, "error");
    } catch {
      /* silent */
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   🍪 APPSTATE HELPERS
   ═══════════════════════════════════════════════════════════ */

/**
 * Convert an AppState cookie array into a `key=value; key=value` string.
 */
function appStateToCookieString(appState: Loose[] | undefined): string {
  if (!Array.isArray(appState)) return "";

  return appState
    .map((c) => {
      const key = c?.key || c?.name;
      const value = c?.value;
      if (!key || value === undefined || value === null) return null;
      return `${key}=${value}`;
    })
    .filter(Boolean)
    .join("; ");
}

/**
 * Extract the logged-in user's FBID from AppState (`c_user` or `i_user`).
 */
function appStateToFbid(appState: Loose[] | undefined): string {
  if (!Array.isArray(appState)) return "";

  const cUser = appState.find((c) => c?.key === "c_user" || c?.name === "c_user");
  const iUser = appState.find((c) => c?.key === "i_user" || c?.name === "i_user");

  return String((cUser && cUser.value) || (iUser && iUser.value) || "");
}

/* ═══════════════════════════════════════════════════════════
   🎛️ DEFAULT LOGIN OPTIONS
   ═══════════════════════════════════════════════════════════ */

const DEFAULT_LOGIN_OPTIONS: Required<
  Pick<
    FcaOptions,
    | "selfListen"
    | "selfListenEvent"
    | "listenEvents"
    | "listenTyping"
    | "updatePresence"
    | "forceLogin"
    | "autoMarkRead"
    | "autoReconnect"
    | "online"
    | "emitReady"
    | "userAgent"
  >
> = {
  selfListen: false,
  selfListenEvent: false,
  listenEvents: false,
  listenTyping: false,
  updatePresence: false,
  forceLogin: false,
  autoMarkRead: false,
  autoReconnect: true,
  online: true,
  emitReady: false,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
};

/* ═══════════════════════════════════════════════════════════
   🚀 loginAsync — Promise, returns FcaContext
   ═══════════════════════════════════════════════════════════ */

export async function loginAsync(
  credentials: LoginCredentials,
  customOptions: FcaOptions = {}
): Promise<FcaContext> {
  const { config } = loadConfig();
  g.fca = g.fca || {};
  g.fca.config = config;

  const ctx = createDefaultContext();
  const globalOptions: FcaOptions = { ...DEFAULT_LOGIN_OPTIONS };

  setOptions(globalOptions, customOptions || {});

  ctx.options = { ...ctx.options, ...globalOptions };
  ctx.globalOptions = globalOptions;
  ctx.cookieString = appStateToCookieString(credentials.appState);
  ctx.fbid = appStateToFbid(credentials.appState);
  (ctx as Loose)._request = createRequestHelper(ctx);

  /* ─── Run the login helper ─── */
  const runLogin = () =>
    new Promise<Loose>((resolve, reject) => {
      loginHelper(
        credentials.appState,
        credentials.Cookie,
        credentials.email,
        credentials.password,
        globalOptions,
        (error: Loose, api: Loose) => {
          if (error) return reject(error);
          return resolve(api);
        }
      );
    });

  let api: Loose;

  /* ─── Optional update check ─── */
  if (config.checkUpdate.enabled) {
    await runConfiguredUpdateCheck(config, logger);
  }

  api = await runLogin();

  (ctx as Loose).api = api;

  /* ─── Enrich context with bot info ─── */
  try {
    if (typeof api.getCurrentUserID === "function") {
      ctx.fbid = String(api.getCurrentUserID() || ctx.fbid || "");
      ctx.userID = ctx.fbid;
    }
    if (typeof api.getCookies === "function") {
      ctx.cookieString = String(api.getCookies() || ctx.cookieString || "");
    }
  } catch {
    /* ignore enrichment errors */
  }

  return ctx;
}

/* ═══════════════════════════════════════════════════════════
   🎯 login — Dual-mode (Promise + classic callback)
   ═══════════════════════════════════════════════════════════ */

/**
 * Login: Promise API, or legacy `login(credentials, (err, api) => …)`
 * like classic FCA. For `const login = require('@mdshihabhosein777-alt/shihab-x-fca')`,
 * use the published `dist/cjs.cjs` entry.
 */
export function login(
  credentials: LoginCredentials,
  callback: LoginApiCallback
): void;
export function login(
  credentials: LoginCredentials,
  options: FcaOptions,
  callback: LoginApiCallback
): void;
export function login(
  credentials: LoginCredentials,
  customOptions?: FcaOptions
): Promise<FcaContext>;
export function login(
  credentials: LoginCredentials,
  optionsOrCallback?: FcaOptions | LoginApiCallback,
  callback?: LoginApiCallback
): Promise<FcaContext> | void {
  /* ─── Callback-only form ─── */
  if (typeof optionsOrCallback === "function") {
    const cb = optionsOrCallback;
    void loginAsync(credentials, {})
      .then((ctx) => {
        cb(null, (ctx as Loose).api);
      })
      .catch((err: Loose) => {
        cb(err instanceof Error ? err : new Error(String(err?.message ?? err)));
      });
    return;
  }

  /* ─── Options + callback form ─── */
  if (typeof callback === "function") {
    const opts = (optionsOrCallback || {}) as FcaOptions;
    void loginAsync(credentials, opts)
      .then((ctx) => {
        callback!(null, (ctx as Loose).api);
      })
      .catch((err: Loose) => {
        callback!(err instanceof Error ? err : new Error(String(err?.message ?? err)));
      });
    return;
  }

  /* ─── Promise-only form ─── */
  return loginAsync(credentials, (optionsOrCallback || {}) as FcaOptions);
}

/* ═══════════════════════════════════════════════════════════
   🎯 loginLegacy — Callback receives FcaContext
   ═══════════════════════════════════════════════════════════ */

export function loginLegacy(
  credentials: LoginCredentials,
  options?: FcaOptions | ((err: Error | null, ctx?: FcaContext) => void),
  callback?: (err: Error | null, ctx?: FcaContext) => void
) {
  /* ─── Shift arguments if callback passed as 2nd param ─── */
  if (getType(options) === "Function" || getType(options) === "AsyncFunction") {
    callback = options as (err: Error | null, ctx?: FcaContext) => void;
    options = {};
  }

  const p = loginAsync(credentials, (options || {}) as FcaOptions);

  if (typeof callback === "function") {
    p.then((res) => callback?.(null, res)).catch((err) => callback?.(err));
    return;
  }

  return p;
}

/* ═══════════════════════════════════════════════════════════
   🎫 TOKEN-BASED LOGIN (via external API)
   ═══════════════════════════════════════════════════════════ */

export const tokensViaAPI = (
  email: string,
  password: string,
  twoFactor?: string | null,
  apiBaseUrl?: string | null
): Promise<TokensApiResponse> =>
  loginHelper.tokensViaAPI(email, password, twoFactor, apiBaseUrl);

export const loginViaAPI = (
  email: string,
  password: string,
  twoFactor?: string | null,
  apiBaseUrl?: string | null,
  apiKey?: string | null
): Promise<TokensApiResponse> =>
  loginHelper.loginViaAPI(email, password, twoFactor, apiBaseUrl, apiKey);

/* ═══════════════════════════════════════════════════════════
   🍪 COOKIE UTILITIES
   ═══════════════════════════════════════════════════════════ */

export const normalizeCookieHeaderString = (cookieHeader: string) =>
  loginHelper.normalizeCookieHeaderString(cookieHeader);

export const setJarFromPairs = (
  jar: {
    setCookieSync?: (cookie: string, url: string) => void;
    setCookie?: (cookie: string, url: string, cb?: (err?: Error | null) => void) => void;
  },
  pairs: string[],
  domain: string
) => loginHelper.setJarFromPairs(jar, pairs, domain);

/* ═══════════════════════════════════════════════════════════
   📌 DEFAULT EXPORT
   ═══════════════════════════════════════════════════════════ */

export default login;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
