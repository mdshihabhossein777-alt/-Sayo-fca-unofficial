<div align="center">

# 📋 Changelog

**Shihab X FCA** — Advanced Facebook Chat API for Node.js

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=16&duration=3000&pause=800&color=FF6EC7&center=true&vCenter=true&width=700&lines=All+notable+changes+documented;Format+based+on+Keep+a+Changelog;Versioning+via+Semantic+Versioning" alt="Changelog tagline">

</div>

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where applicable.

---

## 🎨 Fork Notice

> **Shihab X FCA** is an **enhanced fork** of **[@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial)**.
>
> - **Original Author:** [DongDev](https://github.com/dongp06) (Donix)
> - **Fork Maintainer:** [Shihab X](https://github.com/mdshihabhosein777-alt)
> - **Fork Repository:** [mdshihabhosein777-alt/Sayo-fca-unofficial](https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial)
>
> **Shihab X FCA fork** starts its own versioning from `v1.0.0`. The original DongDev changelog is preserved below for full transparency.

---

## [Unreleased]

### Planned
- 🎨 Additional banner themes (neon, matrix, cyberpunk)
- 🌐 Multi-language startup messages (English, বাংলা, हिन्दी)
- 📊 Built-in stats dashboard
- 🔔 Webhook support for external alerts

---

## [1.0.0] — 2026-10-08

### 🚀 Shihab X FCA — Initial Fork Release

Enhanced fork of [@dongdev/fca-unofficial v4.0.2](https://github.com/dongp06/fca-unofficial).

#### ✨ Added

- **🎨 Shihab X Branding**
  - Custom animated ASCII banner on module load
  - Gradient-colored login success message
  - MQTT connection status with themed output
  - Custom `[Shihab X FCA]` logger prefix throughout

- **🎯 New Utilities**
  - `src/utils/banner.ts` — Animated startup banner with gradient
  - `src/utils/colors.ts` — Centralized theme color palette
  - `src/utils/logger.ts` — Colored logger with emoji support
  - `src/utils/emoji.ts` — Custom emoji set for status messages

- **⚡ Branded Messages**
  - `printBanner()` — Startup ASCII art + info panel
  - `printLoginSuccess()` — Login success with user info
  - `printConnect()` — MQTT connection confirmation
  - `printError()`, `printWarn()`, `printInfo()`, `printSuccess()` — Themed status helpers

- **📝 Documentation**
  - Premium animated `README.md` with Shihab X branding
  - Rewritten `SECURITY.md` with fork transparency
  - Updated `CHANGELOG.md` (this file)
  - Credit sections preserving DongDev attribution

- **🔧 Configuration**
  - `fca-config.example.json` with brand name + theme colors
  - Update check URL points to fork repository
  - Custom `brandName`, `brandAuthor`, `brandRepo` fields

#### 🧬 Based On

- **Original:** [@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial)
- **Original Version:** `v4.0.2`
- **Original License:** Apache-2.0
- **Original Author:** DongDev (Donix)

#### 👥 Credits

| Role | Person |
|------|--------|
| 🎨 **Forked & Enhanced By** | [Shihab X](https://github.com/mdshihabhosein777-alt) (mdshihabhosein777-alt) |
| 🧬 **Original Author** | [DongDev](https://github.com/dongp06) (Donix) |
| 📜 **License** | Apache-2.0 |

#### 🔗 Links

- **npm:** [@mdshihabhosein777-alt/shihab-x-fca](https://www.npmjs.com/package/@mdshihabhosein777-alt/shihab-x-fca)
- **GitHub:** [mdshihabhosein777-alt/Sayo-fca-unofficial](https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial)

---

<div align="center">

## 🧬 Original DongDev Changelog

**Preserved for transparency — all original history below.**

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="divider">

</div>

---

## [4.0.2] — 2026-04-11

### Changed

- **Startup log:** Removed the `@dongdev/fca-unofficial v…` banner line on login. **`logger.showBanner()`** is now a no-op (call sites unchanged).
- Dropped the **`boxen`** dependency (it was only used for the old framed banner).

---

## [4.0.1] — 2026-04-11

### Fixed

- **CommonJS default export:** `require("@dongdev/fca-unofficial")` is now the callable **`login`** function (via `dist/cjs.cjs` and `exports.require`), fixing `TypeError: login is not a function` in Mirai-style bots.

### Added

- **`login(credentials, callback)`** and **`login(credentials, options, callback)`** — classic FCA callback shape; the callback receives **`api`** (flat legacy API), not `FcaContext`.
- **`loginAsync(credentials, options?)`** — explicit `Promise<FcaContext>` when you do not want callback overloads.
- **`scripts/cjs-bridge.cjs`** — runs after `tsup` to generate `dist/cjs.cjs`.
- Test: CJS entry is a function and exposes `login` / `createMessengerBot` on the same export.

### Changed

- **`package.json`:** `main` and `exports.require` point to **`dist/cjs.cjs`**; ESM default remains `dist/index.mjs`.
- **README** and **docs/DOCS.md** — document classic `require`, callback `(err, api)`, and build artifacts.

---

## [4.0.0] — 2026-04-11

### Breaking changes

- **License:** The package is now distributed under the **Apache License 2.0** instead of MIT. Review [LICENSE](./LICENSE) before upgrading if your compliance or redistribution policy depends on the previous license.

### Documentation

- Rewrote **README.md**, **DOCS.md**, and **docs/ARCHITECTURE.md** in English with full coverage of the public API: `createMessengerBot`, MQTT realtime, thread cache, namespaced client facade, composer middleware, events reference, and configuration.
- Added API reference tables for all domains: messages, threads, users, account, HTTP, scheduler.

---

## [3.0.30] — 2026-02-26

### Security & supply chain

- Removed legacy/self-dependency and old HTTP stack (`request`, `sqlite3`, `npmlog`), pinned `axios` to a secure version, and cleaned up `npm audit` findings (no Critical/High CVEs in runtime deps).
- Added `SECURITY.md`, restricted the published files via `package.json.files` (no Horizon refs, no bundled node_modules) and wired `npm publish --provenance` into CI for verifiable builds.

### Event-driven core

- Promoted the `api` object to an `EventEmitter` with lifecycle events: `sessionExpired`, `autoLoginSuccess`, `autoLoginFailed`, `checkpoint`/`checkpoint_282`/`checkpoint_956`, `loginBlocked`, `rateLimit`, `networkError`.
- Hooked these into `loginParser` and the HTTP layer so consumers can react to login, checkpoint, and network conditions without brittle error-string matching.

### Thread/User info & DB-backed anti-get-info

- Refactored `getThreadInfo` and `getUserInfo` to use GraphQL batch calls with optional SQLite caching (via Sequelize models), reducing repeated Facebook requests and aligning with Horizon-style anti-get-info behavior.
- Added configuration toggles in `fca-config.json` (`antiGetInfo.AntiGetThreadInfo`, `antiGetInfo.AntiGetUserInfo`) to switch between DB-backed and legacy behaviors when needed.

### Remote control & analytics

- Introduced a lightweight WebSocket **remote control client** (`src/remote/remoteClient.js`) driven by `remoteControl` config, emitting `remoteConnected`, `remoteDisconnected`, `remoteStop`, `remoteBroadcast`, and `remoteMessage` events for integration with external dashboards.
- Taught the MQTT layer to update per-thread statistics in SQLite via an atomic `Thread.increment("messageCount")` on each message, enabling future analytics (e.g. "most active threads") without impacting message latency.

### Docs & utilities

- Updated `README.md`, `DOCS.md`, and `docs/ARCHITECTURE.md` to document the new event system, DB caching behavior, remote control, proxy configuration, and the optional `broadcast` helper.

---

## [3.0.29] — 2026-02-22

- Maintenance release (hotfix / version bump).

## [3.0.28] — 2026-02-22

- Maintenance release (hotfix / version bump).

## [3.0.27] — 2026-02-22

- Maintenance release (hotfix / version bump).

## [3.0.25] — 2026-02-05

- Maintenance release (hotfix / version bump).

## [3.0.23] — 2026-01-30

- Maintenance release (hotfix / version bump).

## [3.0.22] — 2026-01-07

- Maintenance release (hotfix / version bump).

## [3.0.21] — 2025-12-31

- Maintenance release (hotfix / version bump).

## [3.0.20] — 2025-12-31

- Maintenance release (hotfix / version bump).

## [3.0.19] — 2025-12-31

- Maintenance release (hotfix / version bump).

## [3.0.17] — 2025-12-16

- Maintenance release (hotfix / version bump).

## [3.0.15] — 2025-12-12

- Maintenance release (hotfix / version bump).

## [3.0.12] — 2025-12-05

- Maintenance release (hotfix / version bump).

## [3.0.11] — 2025-12-05

- Maintenance release (hotfix / version bump).

## [3.0.10] — 2025-12-05

- Maintenance release (hotfix / version bump).

## [3.0.9] — 2025-12-05

- Maintenance release (hotfix / version bump).

## [3.0.8] — 2025-11-27

- Maintenance release (hotfix / version bump).

## [3.0.7] — 2025-11-27

- Maintenance release (hotfix / version bump).

## [3.0.6] — 2025-11-27

- Maintenance release (hotfix / version bump).

## [3.0.5] — 2025-11-27

- Maintenance release (hotfix / version bump).

## [3.0.4] — 2025-11-27

- Maintenance release (hotfix / version bump).

## [3.0.3] — 2025-11-27

- Maintenance release (hotfix / version bump).

## [3.0.2] — 2025-11-27

- Maintenance release (hotfix / version bump).

## [2.0.32] — 2025-10-30

- Maintenance release (hotfix / version bump).

## [2.0.31] — 2025-10-27

- Maintenance release (hotfix / version bump).

## [2.0.30] — 2025-10-19

- Maintenance release (hotfix / version bump).

## [2.0.29] — 2025-10-19

- Maintenance release (hotfix / version bump).

## [2.0.28] — 2025-10-18

- Maintenance release (hotfix / version bump).

## [2.0.27] — 2025-10-18

- Maintenance release (hotfix / version bump).

## [2.0.26] — 2025-10-16

- Maintenance release (hotfix / version bump).

## [2.0.25] — 2025-10-12

- Maintenance release (hotfix / version bump).

## [2.0.24] — 2025-10-11

- Maintenance release (hotfix / version bump).

## [2.0.23] — 2025-10-11

- Maintenance release (hotfix / version bump).

## [2.0.22] — 2025-10-09

- Maintenance release (hotfix / version bump).

## [2.0.21] — 2025-10-08

- Maintenance release (hotfix / version bump).

## [2.0.20] — 2025-10-08

- **Added:** Config option to enable/disable `autoLogin`.
- **Added:** Auto-update feature (configurable).

## [2.0.19] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.18] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.17] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.16] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.15] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.14] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.13] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.12] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.11] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.10] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.9] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.8] — 2025-10-07

- Maintenance release (hotfix / version bump).

## [2.0.7] — 2025-10-06

- Maintenance release (hotfix / version bump).

## [2.0.6-beta] — 2025-10-06

- Beta release (hotfix / version bump).

## [2.0.5] — 2025-10-06

- **Added:** Toggle for `autoLogin` in config.
- **Added:** Auto-update feature.

## [2.0.4] — 2025-10-05

- Maintenance release (hotfix / version bump).

## [2.0.3] — 2025-10-05

- Maintenance release (hotfix / version bump).

## [2.0.2] — 2025-10-05

- Maintenance release (hotfix / version bump).

## [2.0.1] — 2025-10-05

- Maintenance release (hotfix / version bump).

## [2.0.0] — 2025-10-05

- Major version bump (hotfix / version bump).

## [1.0.19] — 2025-05-23

- Maintenance release (hotfix / version bump).

## [1.0.18] — 2025-05-22

- Maintenance release (hotfix / version bump).

## [1.0.17] — 2025-05-07

- Maintenance release (hotfix / version bump).

## [1.0.16] — 2025-05-07

- Maintenance release (hotfix / version bump).

## [1.0.15] — 2025-05-03

- Maintenance release (hotfix / version bump).

## [1.0.14] — 2025-04-28

- Maintenance release (hotfix / version bump).

## [1.0.13] — 2025-04-28

- Maintenance release (hotfix / version bump).

## [1.0.12] — 2025-04-28

- Maintenance release (hotfix / version bump).

## [1.0.11] — 2025-04-24

- Maintenance release (hotfix / version bump).

## [1.0.10] — 2025-04-24

- Maintenance release (hotfix / version bump).

---

## 🔗 Version Links

### Shihab X FCA (Fork)

- [1.0.0]: https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial/releases/tag/v1.0.0

### Original DongDev FCA

- [4.0.2]: https://github.com/dongp06/fca-unofficial/compare/v4.0.1...v4.0.2
- [4.0.1]: https://github.com/dongp06/fca-unofficial/compare/v4.0.0...v4.0.1
- [4.0.0]: https://github.com/dongp06/fca-unofficial/compare/v3.0.31...v4.0.0
- [3.0.29]: https://github.com/Donix-VN/fca-unofficial/compare/v3.0.28...v3.0.29
- [3.0.28]: https://github.com/Donix-VN/fca-unofficial/compare/v3.0.27...v3.0.28
- [3.0.27]: https://github.com/Donix-VN/fca-unofficial/compare/v3.0.25...v3.0.27
- [1.0.10]: https://github.com/Donix-VN/fca-unofficial/releases/tag/v1.0.10

---

<div align="center">

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="divider">

**⚡ Shihab X FCA ⚡**

**© 2026 Shihab X** — Based on [@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial) by **DongDev**

<sub>Made with ❤️ for the Bangladesh Facebook bot community</sub>

</div>
