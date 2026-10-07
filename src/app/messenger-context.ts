/**
 * Shihab X FCA — Messenger Context
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Per-message context object, similar to Telegraf's `ctx`.
 * Passed to every composer middleware (`use`, `command`, `hears`).
 *
 * Provides:
 *   • Easy access to threadID / senderID / messageID
 *   • Trimmed message text
 *   • Reply helpers — `reply()` (callback) and `replyAsync()` (promise)
 */

import type { MessageEvent } from "../types/events";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

/**
 * Minimal bot interface required by `MessengerContext.reply`.
 * Any object exposing an `api.sendMessage`-compatible surface works.
 */
export interface MessengerBotLike {
  readonly api: Loose;
}

/* ═══════════════════════════════════════════════════════════
   📝 MESSENGER CONTEXT
   ═══════════════════════════════════════════════════════════ */

/**
 * Message context (Telegraf-style `ctx`).
 *
 * Wraps a raw `MessageEvent` and exposes helpers for:
 *   • replying to the current thread
 *   • reading the trimmed `text` / `body`
 *   • accessing `threadID`, `senderID`, `messageID`
 */
export class MessengerContext {
  constructor(
    public readonly bot: MessengerBotLike,
    public readonly event: MessageEvent
  ) {}

  /* ═══════════════════════════════════════════════════════
     🆔 ID ACCESSORS
     ═══════════════════════════════════════════════════════ */

  get threadID(): MessageEvent["threadID"] {
    return this.event.threadID;
  }

  get senderID(): MessageEvent["senderID"] {
    return this.event.senderID;
  }

  get messageID(): string {
    return this.event.messageID;
  }

  /* ═══════════════════════════════════════════════════════
     📄 CONTENT ACCESSORS
     ═══════════════════════════════════════════════════════ */

  /** Trimmed text content — Messenger usually populates `body`. */
  get text(): string {
    return (this.event.body ?? "").trim();
  }

  /** Raw message body (may be `undefined`). */
  get body(): MessageEvent["body"] {
    return this.event.body;
  }

  /** Full raw event payload. */
  get message(): MessageEvent {
    return this.event;
  }

  /* ═══════════════════════════════════════════════════════
     💬 REPLY METHODS
     ═══════════════════════════════════════════════════════ */

  /**
   * Send a message into the current thread.
   * Uses callback-style `sendMessage` (legacy-compatible).
   *
   * @param payload  Message payload (text or `{ body, attachment }`)
   * @param callback Optional Node-style callback
   */
  reply(payload: Loose, callback?: Loose): Loose {
    const tid = this.event.threadID;

    if (tid == null) {
      throw new Error("[Shihab X FCA] MessengerContext.reply: threadID is missing");
    }

    const send = this.bot.api.sendMessage as (
      a: Loose,
      b: Loose,
      c?: Loose
    ) => Loose;

    return send.call(this.bot.api, payload, tid, callback);
  }

  /**
   * Promise-based version of `reply`.
   * Always returns a Promise, even if the underlying `sendMessage`
   * is callback-only.
   */
  async replyAsync(payload: Loose): Promise<Loose> {
    const r = this.reply(payload);

    if (r && typeof (r as Promise<Loose>).then === "function") {
      return r as Promise<Loose>;
    }

    return Promise.resolve(r);
  }
}

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
