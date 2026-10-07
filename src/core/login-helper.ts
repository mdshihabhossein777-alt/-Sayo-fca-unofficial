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
 * This module is a thin CommonJS-compatible wrapper around the legacy
 * login implementation. It exists to preserve the classic `require()`
 * signature (`module.exports = loginHelper`) used by GoatBot-style bots
 * and other legacy consumers.
 *
 * The modern TypeScript entry (`./auth.ts`) provides typed named exports
 * for new code.
 */

import type { FcaOptions } from "./state";
import legacyImpl from "./login-helper.impl";

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
   📌 EXPORT
   ═══════════════════════════════════════════════════════════ */

const legacy = legacyImpl as unknown as LegacyLoginHelper;

export = legacy;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
