/**
 * Shihab X FCA — MQTT Compatibility Layer
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * MQTT compatibility helpers:
 *   • listenMqtt()           — typed wrapper around api.listenMqtt
 *   • attachMqttCompatibility() — legacy api.listen alias + fb_dtsg auto-refresh
 */

import type { FcaContext } from "./state";
import type { ListenMqttError, MqttEvent } from "../types/events";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

export type MqttStreamEvent =
  | MqttEvent
  | { type: "error"; error: ListenMqttError };

/* ═══════════════════════════════════════════════════════════
   📡 listenMqtt — Typed wrapper around api.listenMqtt
   ═══════════════════════════════════════════════════════════ */

/**
 * Listen to MQTT realtime events via the FCA context's API.
 *
 * Wraps `api.listenMqtt` to provide a simpler callback signature
 * where errors and events are both delivered to the same callback
 * (errors arrive as `{ type: "error", error }`).
 */
export const listenMqtt = (
  ctx: FcaContext,
  callback?: (event: MqttStreamEvent) => void
): Loose => {
  const api = (ctx as Loose).api;

  if (!api || typeof api.listenMqtt !== "function") {
    throw new Error("[Shihab X FCA] listenMqtt is not available on current context");
  }

  const listener = api.listenMqtt(
    (err: ListenMqttError | null, event: MqttEvent) => {
      if (err) {
        callback?.({ type: "error", error: err });
        return;
      }
      callback?.(event);
    }
  );

  ctx.mqttClient = (ctx as Loose).mqttClient || ctx.mqttClient;
  return listener;
};

/* ═══════════════════════════════════════════════════════════
   🔌 attachMqttCompatibility — Legacy aliases + auto-refresh
   ═══════════════════════════════════════════════════════════ */

/**
 * Attach MQTT compatibility shims to the API object:
 *
 *   1. Alias `api.listen` → `api.listenMqtt` (for legacy bots).
 *   2. Schedule a periodic `api.refreshFb_dtsg()` call to keep
 *      the fb_dtsg token fresh (default: every 24 hours).
 *
 * Returns the `setInterval` handle, or `null` if refresh isn't
 * supported by the underlying API.
 */
export function attachMqttCompatibility(
  api: Record<string, Loose>,
  options: {
    logger?: (text: string, type?: string) => void;
    refreshIntervalMs?: number;
  } = {}
) {
  const logger = options.logger;
  const refreshIntervalMs = options.refreshIntervalMs || 86400000;

  const log = (message: string, type = "info") => {
    try {
      if (typeof logger === "function") {
        logger(message, type);
      }
    } catch {
      /* silent */
    }
  };

  /* ─── Legacy alias: api.listen → api.listenMqtt ─── */
  if (api.listenMqtt && !api.listen) {
    api.listen = api.listenMqtt;
  }

  /* ─── Skip refresh if not supported ─── */
  if (typeof api.refreshFb_dtsg !== "function") {
    return null;
  }

  /* ─── Schedule periodic fb_dtsg refresh ─── */
  return setInterval(function () {
    api
      .refreshFb_dtsg()
      .then(function () {
        log("[Shihab X FCA] Successfully refreshed fb_dtsg");
      })
      .catch(function () {
        log("[Shihab X FCA] An error occurred while refreshing fb_dtsg", "error");
      });
  }, refreshIntervalMs);
}

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
