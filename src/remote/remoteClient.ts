/**
 * Shihab X FCA — Remote Control Client
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * WebSocket client for external remote control dashboards.
 *
 * Features:
 *   • Auto-reconnect (with configurable delay)
 *   • Heartbeat (ping/pong)
 *   • Broadcast / stop / custom message commands
 *   • Event emission through the FCA context emitter:
 *       remoteConnected, remoteDisconnected, remoteStop,
 *       remoteBroadcast, remoteMessage
 *
 * Configuration (from `fca-config.json` → `remoteControl`):
 *   { enabled, url, token, autoReconnect }
 */

"use strict";

import WebSocket from "ws";
import pkg from "../../package.json";
import logger from "../func/logger";
import { BRAND } from "../utils/constants";

/* ═══════════════════════════════════════════════════════════
   🔧 CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const RECONNECT_DELAY_MS = 5000;

/* ═══════════════════════════════════════════════════════════
   🏭 FACTORY
   ═══════════════════════════════════════════════════════════ */

/**
 * Create a remote control WebSocket client bound to the given FCA
 * context. Returns `null` if remote control is disabled or misconfigured.
 *
 * @param api   FCA API object
 * @param ctx   FCA context (must expose `_emitter` to receive events)
 * @param cfg   Remote control configuration block
 */
export function createRemoteClient(api: Loose, ctx: Loose, cfg: Loose) {
  /* ─── Early exit: disabled or missing URL ─── */
  if (!cfg || !cfg.enabled || !cfg.url) return null;

  const url = String(cfg.url);
  const token = cfg.token ? String(cfg.token) : null;
  const autoReconnect = cfg.autoReconnect !== false;
  const emitter = ctx && ctx._emitter;

  /* ─── Internal state ─── */
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     📝 HELPERS
     ═══════════════════════════════════════════════════════ */

  function log(message: string, level: string = "info") {
    logger(`[Shihab X FCA · remote] ${message}`, level);
  }

  /** Schedule a reconnect attempt after the backoff delay. */
  function scheduleReconnect() {
    if (!autoReconnect || closed) return;
    if (reconnectTimer) return;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!closed) connect();
    }, RECONNECT_DELAY_MS);
  }

  /** Emit a remote event safely (never throws). */
  function safeEmit(event: string, payload?: Loose) {
    try {
      if (emitter && typeof emitter.emit === "function") {
        emitter.emit(event, payload);
      }
    } catch {
      /* silent */
    }
  }

  /* ═══════════════════════════════════════════════════════
     🔌 CONNECTION
     ═══════════════════════════════════════════════════════ */

  function connect() {
    try {
      ws = new WebSocket(url, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              "User-Agent": BRAND.userAgent
            }
          : { "User-Agent": BRAND.userAgent }
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`connect error: ${msg}`, "warn");
      scheduleReconnect();
      return;
    }

    const socket = ws;

    /* ─── On connect ─── */
    socket.on("open", () => {
      log("connected", "info");

      const payload = {
        type: "hello",
        userID: ctx && ctx.userID,
        region: ctx && ctx.region,
        version: pkg.version,
        brand: BRAND.name
      };

      try {
        socket.send(JSON.stringify(payload));
      } catch {
        /* silent */
      }

      safeEmit("remoteConnected", payload);
    });

    /* ─── On message ─── */
    socket.on("message", (data) => {
      let msg: Loose;
      try {
        msg = JSON.parse(data.toString()) as Loose;
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;

      switch (msg.type) {
        case "ping":
          try {
            socket.send(JSON.stringify({ type: "pong" }));
          } catch {
            /* silent */
          }
          break;

        case "stop":
          safeEmit("remoteStop", msg);
          break;

        case "broadcast":
          safeEmit("remoteBroadcast", msg.payload || {});
          break;

        default:
          safeEmit("remoteMessage", msg);
          break;
      }
    });

    /* ─── On close ─── */
    socket.on("close", () => {
      log("disconnected", "warn");
      safeEmit("remoteDisconnected", undefined);
      if (!closed) scheduleReconnect();
    });

    /* ─── On error ─── */
    socket.on("error", (err: Error) => {
      log(`error: ${err && err.message ? err.message : String(err)}`, "warn");
    });
  }

  /* ─── Kick off initial connection ─── */
  connect();

  /* ═══════════════════════════════════════════════════════
     🛑 PUBLIC API
     ═══════════════════════════════════════════════════════ */

  return {
    /** Close the connection and stop reconnection. */
    close() {
      closed = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch {
        /* silent */
      }
    }
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
