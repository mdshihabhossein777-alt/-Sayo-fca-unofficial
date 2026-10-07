/**
 * Shihab X FCA — Client Utilities (Barrel)
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Barrel re-export that surfaces the most commonly used client
 * helpers under a single module path:
 *
 *   • getAppState()          — export cookies as AppState array
 *   • saveCookies()          — persist cookies to the jar
 *   • parseAndCheckLogin()   — parse login response + retry logic
 *
 * Types:
 *   • AppStateCookie         — single cookie object shape
 *   • CookieJarLike          — minimal jar interface
 */

import { getAppState, saveCookies } from "./cookies";
import * as loginParser from "./loginParser";

/* ═══════════════════════════════════════════════════════════
   🎯 RE-EXPORTS — RUNTIME
   ═══════════════════════════════════════════════════════════ */

export { getAppState, saveCookies };

/**
 * Parse a Facebook login response, extract cookies, and check if
 * the session is valid. Handles checkpoint detection and retry logic
 * internally.
 */
export const parseAndCheckLogin = loginParser.parseAndCheckLogin;

/* ═══════════════════════════════════════════════════════════
   🎯 RE-EXPORTS — TYPES
   ═══════════════════════════════════════════════════════════ */

export type { AppStateCookie, CookieJarLike } from "./cookies";

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
