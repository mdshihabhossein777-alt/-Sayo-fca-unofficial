/**
 * Shihab X FCA — MessengerBot (Event-Driven Client)
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Discord.js / Telegraf-style bot client built on top of FCA.
 *
 * Features:
 *   • Named events — messageCreate, messageReactionAdd, typingStart/Stop, …
 *   • Composer pipeline — `use`, `command`, `hears`, `catch`
 *   • Signal handling — graceful shutdown on SIGINT/SIGTERM
 *   • Namespaced client facade — `bot.client`
 */

import { EventEmitter } from "node:events";
import { login, type LoginCredentials } from "../core/auth";
import type { FcaContext, FcaOptions } from "../core/state";
import type { ListenMqttError, MessageEvent, MqttEvent, TypingEvent } from "../types/events";
import { createFcaClient } from "./create-client";
import type { FcaClientFacade } from "../types/client";
import { MessengerContext, type MessengerBotLike } from "./messenger-context";

/* ═══════════════════════════════════════════════════════════
   🎯 PUBLIC TYPES
   ═══════════════════════════════════════════════════════════ */

export interface MessengerBotOptions extends FcaOptions {
  /** Call `listenMqtt` immediately after login. Default: `true`. */
  autoListen?: boolean;

  /** Enable the `use` / `command` / `hears` middleware chain. Default: `true`. */
  enableComposer?: boolean;

  /** Command prefix for `command()`. Default: `/`. */
  commandPrefix?: string;

  /** On SIGINT/SIGTERM → call `stop()`. Default: `false`. */
  stopOnSignals?: boolean;

  /**
   * Max event listeners on the bot (EventEmitter). Default: `64`.
   * Use `0` for unlimited (more RAM when attaching many handlers).
   */
  maxEventListeners?: number;
}

export type MessengerNext = () => Promise<void>;

export type MessengerMiddleware = (
  ctx: MessengerContext,
  next: MessengerNext
) => void | Promise<void>;

/* ═══════════════════════════════════════════════════════════
   🔧 INTERNAL TYPES
   ═══════════════════════════════════════════════════════════ */

interface MessengerBotRuntimeOptions {
  enableComposer: boolean;
  commandPrefix: string;
  stopOnSignals: boolean;
  maxEventListeners: number;
}

interface MqttEmitterLike {
  on(event: string | symbol, listener: (...args: Loose[]) => void): this;
  removeAllListeners?(event?: string | symbol): this;
  stopListening?: (cb?: () => void) => void;
  stopListeningAsync?: () => Promise<void>;
}

/* ═══════════════════════════════════════════════════════════
   🛠️ HELPERS
   ═══════════════════════════════════════════════════════════ */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Emit only when there is at least one subscriber.
 * Reduces overhead and keeps `_events` lean when aliases are rarely used.
 */
function emitIf(bot: MessengerBot, channel: string, payload: MqttEvent): void {
  if (bot.listenerCount(channel) > 0) {
    bot.emit(channel, payload);
  }
}

/**
 * Fan out a raw MQTT event to all named channels the bot exposes.
 * Fires at most one "primary" channel per event type, plus the
 * universal `update` / `raw` streams.
 */
function emitGatewayEvents(bot: MessengerBot, event: MqttEvent): void {
  emitIf(bot, "update", event);
  emitIf(bot, "raw", event);

  const t = event.type;
  if (!t) return;

  /* ─── Message-related ─── */
  if (t === "message" || t === "message_reply") {
    emitIf(bot, "message", event);
    emitIf(bot, "messageCreate", event);
  }

  if (t === "message_reply") {
    emitIf(bot, "message_reply", event);
  } else if (t !== "message") {
    emitIf(bot, t, event);
  }

  /* ─── Special-case channels ─── */
  switch (t) {
    case "message_reaction":
      emitIf(bot, "messageReactionAdd", event);
      break;

    case "message_unsend":
      emitIf(bot, "messageDelete", event);
      break;

    case "typ": {
      const te = event as TypingEvent;
      emitIf(bot, te.isTyping ? "typingStart" : "typingStop", event);
      break;
    }

    case "event":
      emitIf(bot, "threadUpdate", event);
      break;

    case "ready":
      emitIf(bot, "ready", event);
      emitIf(bot, "shardReady", event);
      break;

    default:
      break;
  }
}

/* ═══════════════════════════════════════════════════════════
   🤖 MESSENGER BOT CLASS
   ═══════════════════════════════════════════════════════════ */

/**
 * Discord.js / Telegraf-style client for Facebook Messenger.
 *
 * Events:
 *   `messageCreate`, `message_reply`, `messageReactionAdd`,
 *   `messageDelete`, `typingStart`, `typingStop`, `threadUpdate`,
 *   `ready`, `raw`, `update`, `error`
 *
 * Composer:
 *   `use`, `command`, `hears`, `catch` — middleware chain plus
 *   command / text matching.
 */
export class MessengerBot extends EventEmitter implements MessengerBotLike {
  readonly ctx: FcaContext;
  readonly api: Loose;

  private _facade: FcaClientFacade | null = null;
  private _mqtt: MqttEmitterLike | null = null;
  private _listening = false;

  private readonly _enableComposer: boolean;
  private _commandPrefix: string;
  private readonly _stopOnSignals: boolean;
  private readonly _middlewares: MessengerMiddleware[] = [];
  private _catchHandler?: (err: unknown, ctx?: MessengerContext) => void;
  private _signalsBound = false;
  private _onStopSignal?: () => void;

  /* ─── Private constructor — use `MessengerBot.connect()` ─── */
  private constructor(ctx: FcaContext, runtime: MessengerBotRuntimeOptions) {
    super();
    const cap = runtime.maxEventListeners;
    this.setMaxListeners(cap === 0 ? 0 : cap);
    this.ctx = ctx;
    this.api = (ctx as Loose).api;
    this._enableComposer = runtime.enableComposer;
    this._commandPrefix = runtime.commandPrefix;
    this._stopOnSignals = runtime.stopOnSignals;
  }

  /* ═══════════════════════════════════════════════════════
     🎛️ COMMAND PREFIX
     ═══════════════════════════════════════════════════════ */

  get commandPrefix(): string {
    return this._commandPrefix;
  }

  set commandPrefix(value: string) {
    this._commandPrefix = value || "/";
  }

  /* ═══════════════════════════════════════════════════════
     🌐 CLIENT FACADE (lazy)
     ═══════════════════════════════════════════════════════ */

  get client(): FcaClientFacade {
    if (!this._facade) {
      this._facade = createFcaClient(this.api as Loose);
    }
    return this._facade;
  }

  /* ═══════════════════════════════════════════════════════
     🎼 COMPOSER MIDDLEWARE
     ═══════════════════════════════════════════════════════ */

  /**
   * Register global middleware (Telegraf-style).
   * Call `next()` to pass control to the next layer.
   */
  use(middleware: MessengerMiddleware): this {
    this._middlewares.push(middleware);
    return this;
  }

  /**
   * Register a command handler.
   * Matches `/{name}` or `{prefix}{name}` at the start of the message
   * (case-insensitive on the command name).
   */
  command(
    name: string,
    handler: (ctx: MessengerContext) => void | Promise<void>
  ): this {
    const n = name.toLowerCase();

    this.use(async (ctx, next) => {
      const text = ctx.text;
      if (!text) {
        await next();
        return;
      }

      const prefix = escapeRegex(this._commandPrefix);
      const re = new RegExp(`^${prefix}${escapeRegex(n)}(?:\\s|$)`, "i");

      if (re.test(text)) {
        await handler(ctx);
        return;
      }

      await next();
    });

    return this;
  }

  /**
   * Register a text-match handler.
   * `string` → case-insensitive substring match.
   * `RegExp` → full pattern test.
   */
  hears(
    trigger: string | RegExp,
    handler: (ctx: MessengerContext) => void | Promise<void>
  ): this {
    const match =
      typeof trigger === "string"
        ? (text: string) => text.toLowerCase().includes(trigger.toLowerCase())
        : (text: string) => trigger.test(text);

    this.use(async (ctx, next) => {
      const text = ctx.text;
      if (!text) {
        await next();
        return;
      }

      if (match(text)) {
        await handler(ctx);
        return;
      }

      await next();
    });

    return this;
  }

  /**
   * Register a composer error handler.
   * Catches errors thrown inside `use` / `command` / `hears` handlers.
   */
  catch(handler: (err: unknown, ctx?: MessengerContext) => void): this {
    this._catchHandler = handler;
    return this;
  }

  /* ═══════════════════════════════════════════════════════
     📡 MQTT LISTENING
     ═══════════════════════════════════════════════════════ */

  /**
   * Start MQTT listening (idempotent — safe to call multiple times).
   */
  startListening(): this {
    if (this._listening) return this;

    const listen = this.api.listenMqtt as undefined | (() => MqttEmitterLike);
    if (typeof listen !== "function") {
      throw new Error("[Shihab X FCA] listenMqtt is not available on API");
    }

    const mqtt = listen.call(this.api);
    this._mqtt = mqtt;
    this._listening = true;

    mqtt.on("message", (event: MqttEvent) => {
      emitGatewayEvents(this, event);
      this.enqueueComposerIfNeeded(event);
    });

    mqtt.on("error", (err: ListenMqttError) => {
      this.emit("error", err);
    });

    return this;
  }

  /**
   * Start listening + optionally bind SIGINT/SIGTERM shutdown.
   * Roughly equivalent to Telegraf's `launch()`.
   */
  async launch(opts?: { stopOnSignals?: boolean }): Promise<this> {
    this.startListening();

    const bind = opts?.stopOnSignals ?? this._stopOnSignals;
    if (bind) {
      this.attachStopSignals();
    }

    return this;
  }

  /* ═══════════════════════════════════════════════════════
     🛑 SIGNAL HANDLING
     ═══════════════════════════════════════════════════════ */

  private attachStopSignals(): void {
    if (this._signalsBound) return;
    this._signalsBound = true;

    this._onStopSignal = () => {
      void this.stop()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    };

    process.once("SIGINT", this._onStopSignal);
    process.once("SIGTERM", this._onStopSignal);
  }

  /**
   * Remove SIGINT/SIGTERM handlers so the process doesn't hold a
   * bot reference (RAM optimization when stopping early).
   */
  private detachStopSignals(): void {
    if (!this._signalsBound || !this._onStopSignal) return;

    process.off("SIGINT", this._onStopSignal);
    process.off("SIGTERM", this._onStopSignal);

    this._signalsBound = false;
    this._onStopSignal = undefined;
  }

  /* ═══════════════════════════════════════════════════════
     🛑 STOP
     ═══════════════════════════════════════════════════════ */

  async stop(): Promise<void> {
    this.detachStopSignals();

    if (!this._mqtt) return;

    const mqtt = this._mqtt;
    const asyncStop = mqtt.stopListeningAsync;

    if (typeof asyncStop === "function") {
      await asyncStop();
    } else {
      mqtt.stopListening?.();
    }

    mqtt.removeAllListeners?.();
    this._mqtt = null;
    this._listening = false;
  }

  /* ═══════════════════════════════════════════════════════
     🎼 COMPOSER DISPATCH
     ═══════════════════════════════════════════════════════ */

  private enqueueComposerIfNeeded(event: MqttEvent): void {
    if (!this._enableComposer || this._middlewares.length === 0) return;
    if (event.type !== "message" && event.type !== "message_reply") return;

    const ctx = new MessengerContext(this, event as MessageEvent);

    queueMicrotask(() => {
      void this.runComposer(ctx);
    });
  }

  private async runComposer(ctx: MessengerContext): Promise<void> {
    const dispatch = async (index: number): Promise<void> => {
      if (index >= this._middlewares.length) return;

      const mw = this._middlewares[index];
      await mw(ctx, () => dispatch(index + 1));
    };

    try {
      await dispatch(0);
    } catch (err) {
      if (this._catchHandler) {
        this._catchHandler(err, ctx);
      } else {
        this.emit("error", err);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════
     🚀 STATIC FACTORY
     ═══════════════════════════════════════════════════════ */

  static async connect(
    credentials: LoginCredentials,
    options?: MessengerBotOptions
  ): Promise<MessengerBot> {
    const {
      autoListen = true,
      enableComposer = true,
      commandPrefix = "/",
      stopOnSignals = false,
      maxEventListeners = 64,
      ...fcaOptions
    } = options ?? {};

    const ctx = await login(credentials, fcaOptions);

    const bot = new MessengerBot(ctx, {
      enableComposer,
      commandPrefix,
      stopOnSignals,
      maxEventListeners
    });

    if (autoListen) {
      await bot.launch({ stopOnSignals });
    } else if (stopOnSignals) {
      bot.attachStopSignals();
    }

    return bot;
  }
}

/* ═══════════════════════════════════════════════════════════
   🏭 FACTORY FUNCTION
   ═══════════════════════════════════════════════════════════ */

/**
 * Create and connect a `MessengerBot` instance.
 * Shorthand for `MessengerBot.connect(credentials, options)`.
 */
export function createMessengerBot(
  credentials: LoginCredentials,
  options?: MessengerBotOptions
): Promise<MessengerBot> {
  return MessengerBot.connect(credentials, options);
}

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
