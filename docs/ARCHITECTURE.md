
### 📋 Domains

| Domain | Commands | Queries |
|--------|----------|---------|
| 💬 `messages` | send, edit, unsend, delete, setReaction, sendTyping, markRead, markDelivered, markSeen, markReadAll, upload, forward, shareContact, changeColor, changeEmoji | getMessage, getEmojiUrl, resolvePhotoUrl, getThreadColors |
| 🧵 `threads` | createGroup, addUser, removeUser, changeAdmin, changeImage, changeNickname, setTitle, createPoll, createThemeAI, delete, archive, mute, handleRequest | getInfo, getList, getHistory, getPictures, getThemePictures, search |
| 👤 `users` | — | getInfo, getInfoV2, getID, getFriendsList |
| ⚙️ `account` | changeAvatar, changeBio, changeBlocked, handleFriendReq, unfriend, setPostReaction, refreshDtsg, logout, addModule, enableAutoSave | getCurrentUserID |
| ⚡ `realtime` | *(listener lifecycle, emit-auth, middleware)* | *(parse-delta)* |
| 🌐 `http` | httpPost, postFormData | httpGet |
| ⏰ `scheduler` | *(scheduling primitives)* | — |

---

## 🎨 Application Layer

**`src/app/`** provides the high-level constructs that consumers interact with directly.

| File | What it does |
|------|--------------|
| 🧩 `attach-legacy-api.ts` | Attaches all flat methods + domain namespaces onto the `api` object |
| 🎯 `create-client.ts` | `createFcaClient(api)` — wraps flat API into a `FcaClientFacade` |
| 🤖 `messenger-bot.ts` | `MessengerBot` class — EventEmitter + composer middleware engine |
| 💬 `messenger-context.ts` | `MessengerContext` — per-message context with `reply()` / `replyAsync()` |

---

## 🔄 Compatibility Layer

**`src/compat/`** ensures older code keeps working.

| File | Purpose |
|------|---------|
| 🔗 `api-registry.ts` | `attachClientFacade(ctx)` — adds `ctx.client` lazily |
| 📞 `callbackify.ts` | Convert promise-returning functions to Node-style callbacks |
| ⏳ `legacy-promise.ts` | Wrap callbacks in a Promise for dual-mode support |

---

## 💾 Database Layer

**`src/database/`** is entirely optional. When SQLite + Sequelize are available:

- **Models:** `Thread` (stores JSON thread data + `messageCount`) and `User` (stores user profile cache).
- **`threadData.ts`** / **`userData.ts`** provide a data access layer with freshness-based reads and writes.
- **`helpers.ts`** handles Sequelize initialization and model synchronization.

When the database is absent, all cache features **gracefully degrade** to in-memory or no-op behavior.

---

## 🛠️ Utilities

**`src/utils/`** contains cross-cutting concerns:

| Subdirectory / File | Purpose |
|---------------------|---------|
| 📐 `format/` | Transform raw Facebook data into normalized structures (attachments, deltas, messages, threads, presence, IDs, dates) |
| 🔐 `loginParser/` | Parse login HTTP responses, handle auto-login, extract tokens |
| 🌐 `request/` | HTTP client setup, default headers, proxy configuration |
| 📢 `broadcast.ts` | Broadcast helper for multi-thread messaging |
| 🎯 `client.ts` | Client-level utility functions |
| 📌 `constants.ts` | Shared constant values |
| 🍪 `cookies.ts` | Cookie parsing and manipulation |
| 📨 `headers.ts` | HTTP header construction for Facebook API requests |

---

## 📘 Type System

**`src/types/`** contains all publicly exported TypeScript interfaces and type aliases:

| File | Contents |
|------|----------|
| 🎯 `client.ts` | `FcaClientFacade`, `FcaClientNamespace`, `LegacyApiLike` |
| 🔢 `core.ts` | `FcaID` and other primitive types |
| 📦 `core-modules.ts` | Core module interface types |
| 📡 `events.ts` | `MqttEvent` union, `MessageEvent`, `ReactionEvent`, `TypingEvent`, etc. |
| 💬 `messaging.ts` | Messaging-related types |
| 🧵 `threads.ts` | Thread-related types |
| ⏰ `scheduler.ts` | Scheduler types |

`src/global-types.d.ts` declares the global `Loose` type (alias for `any`) used throughout the codebase for dynamic Facebook API payloads.

---

## ⚡ Realtime Subsystem (Deep Dive)

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=15&duration=2500&pause=800&color=4CC9F0&center=true&vCenter=true&width=600&lines=MQTT+WebSocket+%E2%80%A2+Auto-Reconnect;Subscribe+%E2%86%92+Sync+%E2%86%92+Parse;Thread+Cache+Sync+on+Events" alt="Realtime tagline">

</div>

### 🔌 Connection lifecycle

1. **`domains/realtime/listener.ts`** orchestrates the full lifecycle:
   - Calls `getSeqID` (GraphQL) to obtain the latest sequence number.
   - Invokes `listenMqtt` which delegates to `transport/realtime/connect-mqtt.ts`.
   - Manages auto-cycle (periodic reconnection) and retry logic with debounced `getSeqID`.

2. **`transport/realtime/connect-mqtt.ts`** handles the wire protocol:
   - Opens a WebSocket to Facebook's MQTT endpoint.
   - Subscribes to topics in a batch (`/t_ms`, `/thread_typing`, `/orca_presence`, etc.).
   - **Only after subscriptions complete** does it publish the sync queue.
   - On disconnect, the old client is fully cleaned up before creating a new one.

3. **`domains/realtime/parse-delta.ts`** transforms raw MQTT deltas into typed event objects and dispatches them through the callback chain. It also fires `emitThreadInfoEvent` to trigger cache synchronization.

### 📡 Topics

Defined in `transport/realtime/topics.ts`. Key topics include:

| Topic | Purpose |
|-------|---------|
| `/t_ms` | Thread messages |
| `/thread_typing` | Typing indicators |
| `/orca_presence` | Presence updates |
| `/ls_req` | Lightspeed requests |
| `/ls_resp` | Lightspeed responses |

---

## 🤖 MessengerBot (Deep Dive)

### 📢 Event dispatch

`MessengerBot` listens on the MQTT emitter's `"message"` event and maps each `MqttEvent` to named channels:

| Channel | Event |
|---------|-------|
| 💬 `message` / `messageCreate` | Chat messages and replies |
| 😍 `messageReactionAdd` | Reaction added |
| 🗑️ `messageDelete` | Message unsent |
| ⌨️ `typingStart` / `typingStop` | Typing indicators |
| 🔄 `threadUpdate` | Thread metadata changes |
| 🟢 `ready` / `shardReady` | MQTT connection established |
| 📡 `raw` / `update` | Every delta |

> ⚡ The `emitIf` helper only fires `emit()` when there are active listeners, keeping overhead minimal.

### 🎼 Composer engine

The composer is a **Koa-style middleware chain** that runs only for `message` and `message_reply` events.

**Execution order:**

1. 🌐 Global `use()` middlewares in registration order
2. 🎯 `command()` handlers check for `{prefix}{name}` at the start of the message
3. 📡 `hears()` handlers match by regex or substring
4. ⚠️ If any middleware throws, the `catch()` handler receives the error

> ⚡ Middleware is dispatched via `queueMicrotask` to avoid blocking the MQTT event loop.

---

## 🔄 Thread Cache & Realtime Sync

**`core/thread-info-realtime-sync.ts`** subscribes to MQTT events of type `"event"` and performs:

| Log message type | Action |
|------------------|--------|
| `log:subscribe` | ➕ Add participant to cache, fetch fresh `userInfo` |
| `log:unsubscribe` | ➖ Remove participant from cache |
| Thread metadata changes | 🔄 Invalidate the cached `data` (set to `null`) |
| Unknown/unhandled types | ⚠️ Invalidate as a safety measure |

This keeps the SQLite cache consistent with the actual thread state **without requiring periodic full refetches**.

---

## 📖 Related Documentation

<div align="center">

| Document | Contents |
|----------|----------|
| 📘 [README.md](../README.md) | Installation and quick start guide |
| 📚 [DOCS.md](./DOCS.md) | Full API reference and usage guide |
| 🔐 [SECURITY.md](../SECURITY.md) | Security & trust model |
| 📝 [CHANGELOG.md](../CHANGELOG.md) | Version history |
| 📜 [LICENSE](../LICENSE) | Apache-2.0 license |

</div>

---

<div align="center">

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="divider">

## 👥 Credits

<table>
<tr>
<td align="center">
<a href="https://github.com/mdshihabhosein777-alt">
  <img src="https://github.com/mdshihabhosein777-alt.png" width="80" alt="Shihab X">
  <br>
  <b>Shihab X</b>
  <br>
  <sub>Fork Maintainer</sub>
</a>
</td>
<td align="center">
<a href="https://github.com/dongp06">
  <img src="https://github.com/dongp06.png" width="80" alt="DongDev">
  <br>
  <b>DongDev</b>
  <br>
  <sub>Original Author</sub>
</a>
</td>
</tr>
</table>

**Forked & Enhanced By:** [Shihab X](https://github.com/mdshihabhosein777-alt)
**Original Author:** [DongDev](https://github.com/dongp06) (Donix)
**Original Project:** [@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial)

<br>

**⚡ Shihab X FCA ⚡**

**© 2026 Shihab X** — Based on [@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial) by **DongDev**

<sub>Made with ❤️ for the Bangladesh Facebook bot community</sub>

</div>
