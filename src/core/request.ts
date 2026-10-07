/**
 * Shihab X FCA — Request Helper
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Context-aware HTTP request helpers.
 *
 *   • createRequestHelper(ctx) — per-context request wrapper
 *   • createRequestCore()      — legacy request core (overridable)
 *
 * Headers are built from `ctx.cookieString`, `ctx.options.userAgent`,
 * and the shared `getHeaders()` utility. The Shihab X User-Agent is
 * used by default when no custom UA is set.
 */

import type { FcaContext } from "./state";

import { getHeaders } from "../utils/headers";
import * as requestUtils from "../utils/request";
import { BRAND } from "../utils/constants";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

export interface RequestHelper {
  get: (url: string, config?: Loose) => Promise<Loose>;
  post: (url: string, data?: Loose, config?: Loose) => Promise<Loose>;
  postFormData: (url: string, formData: Loose, config?: Loose) => Promise<Loose>;
}

/* ═══════════════════════════════════════════════════════════
   🔐 HEADER BUILDER
   ═══════════════════════════════════════════════════════════ */

/**
 * Build the final HTTP headers for a request, injecting:
 *   1. Shared headers from `getHeaders()`
 *   2. `ctx.cookieString` if no Cookie header is present
 *   3. `ctx.options.userAgent` (falls back to Shihab X default UA)
 */
function contextToHeaders(
  ctx: FcaContext,
  url: string,
  config?: Loose
): Record<string, string> {
  const base = getHeaders(
    url,
    ctx.options as Loose,
    ctx as Loose,
    (config && config.headers) || {}
  );

  /* Inject session cookies */
  if (ctx.cookieString && !base.Cookie && !base.cookie) {
    base.Cookie = ctx.cookieString;
  }

  /* Inject User-Agent (Shihab X default if none) */
  if (!base["User-Agent"]) {
    base["User-Agent"] = ctx.options?.userAgent || BRAND.userAgent;
  }

  return base;
}

/* ═══════════════════════════════════════════════════════════
   🏭 CONTEXT-AWARE REQUEST HELPER
   ═══════════════════════════════════════════════════════════ */

/**
 * Create a request helper bound to a specific FCA context.
 * Uses `ctx.jar` (or the shared jar) for cookie persistence.
 */
export const createRequestHelper = (ctx: FcaContext): RequestHelper => {
  const reqJar = ctx.jar || requestUtils.jar;

  return {
    /* ─── GET ─── */
    get: async (url, config) => {
      const headers = contextToHeaders(ctx, url, config);
      return requestUtils.get(
        url,
        reqJar,
        (config && config.params) || null,
        ctx.options,
        ctx,
        headers
      );
    },

    /* ─── POST (JSON) ─── */
    post: async (url, data, config) => {
      const headers = contextToHeaders(ctx, url, config);
      return requestUtils.post(
        url,
        reqJar,
        data || {},
        ctx.options,
        ctx,
        headers
      );
    },

    /* ─── POST (multipart/form-data) ─── */
    postFormData: async (url, formData, config) => {
      const headers = contextToHeaders(ctx, url, config);
      return requestUtils.postFormData(
        url,
        reqJar,
        formData || {},
        (config && config.params) || null,
        { ...(ctx.options || {}), headers },
        ctx
      );
    }
  };
};

/* ═══════════════════════════════════════════════════════════
   🔄 LEGACY REQUEST CORE
   ═══════════════════════════════════════════════════════════ */

/**
 * Backward-compatible request core used by legacy modules.
 * Accepts optional overrides for testing or custom transports.
 */
export function createRequestCore(overrides: Record<string, Loose> = {}) {
  return {
    get:
      (overrides.get as Function) ||
      requestUtils.get,

    post:
      (overrides.post as Function) ||
      requestUtils.post,

    postFormData:
      (overrides.postFormData as Function) ||
      requestUtils.postFormData,

    jar:
      overrides.jar ||
      requestUtils.jar,

    makeDefaults:
      (overrides.makeDefaults as Function) ||
      requestUtils.makeDefaults,

    client:
      overrides.client ||
      requestUtils.client,

    setProxy:
      (overrides.setProxy as Function) ||
      requestUtils.setProxy
  };
}

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
