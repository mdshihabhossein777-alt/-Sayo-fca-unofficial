<div align="center">

# 🔐 Shihab X FCA — Security & Trust Model

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=16&duration=3000&pause=800&color=FF6EC7&center=true&vCenter=true&width=700&lines=Transparent+%E2%80%A2+Auditable+%E2%80%A2+Secure+by+default" alt="Security tagline">

**Enhanced fork of [@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial) by DongDev**

</div>

---

## 🛡️ Overview

**Shihab X FCA** is designed to be **transparent, auditable, and secure by default**. It is an unofficial client for Facebook Messenger and works by emulating browser requests.

This document covers:
- 🧬 Supply chain & release integrity
- 🔑 Secrets & credentials handling
- ⚠️ Account safety & checkpoints
- 🔐 2FA & npm account security
- 🚨 Vulnerability reporting

---

## 🧬 Supply Chain & Release Integrity

### ✅ Source of Truth
- All code lives in this public GitHub repository:
  **https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial**
- This is an **enhanced fork** of [@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial).
- Original author: **DongDev** ([@dongp06](https://github.com/dongp06))

### ✅ npm Provenance
Releases are published via GitHub Actions using `npm publish --provenance` so that:
- The tarball on npm can be **cryptographically tied back** to a specific commit in this repo.
- You (and scanners like **socket.dev**) can verify the artifacts were not tampered with after CI.

### ✅ No Obfuscated Core Logic
- The runtime code in `src/` is **readable TypeScript**.
- The `dist/` build output is generated from `src/` via `tsup` — no hidden code.
- Legacy/bundled forks are kept only as **reference** and are **not** shipped in the published package.

### ✅ Independent Fork — No Hidden Changes
Since this is an independent fork, all modifications made by **Shihab X** are:
- Listed publicly in [CHANGELOG.md](./CHANGELOG.md).
- Visible in the Git commit history.
- **Limited to UI/branding/enhancement** — no changes to the core API or credential handling logic.

---

## 🔑 Secrets & Credentials

### ✅ Never Phones Home
- The library **never phones home** or sends your credentials / AppState to any external host.
- **No telemetry**, no analytics, no hidden tracking.

### ✅ External API Usage (Optional)
Any external API usage (such as your own login API) is:
- **Explicitly configurable** via `fca-config.json` (`apiServer`, `apiKey`, etc.).
- Performed through standard HTTP clients (`axios`), which you can inspect in `src/utils/request.js`.

### ⚠️ Your Responsibilities
You are responsible for:
- Keeping your `fca-config.json`, AppState, and API keys **out of version control**.
- **Rotating credentials** immediately if you suspect compromise.
- Not sharing your `appstate.json` with anyone.
- Using a **burner Facebook account** — never your primary account.

### 🚨 Warning
**Never** paste your `appstate.json`, `cookies.txt`, or `fca-config.json` into:
- GitHub issues
- Discord/Slack chats
- Public forums
- ChatGPT / AI tools

If you do, **immediately** change your Facebook password and invalidate all sessions.

---

## ⚠️ Account Safety & Checkpoints

Facebook **can and will** block or checkpoint accounts for:
- Excessive messaging / spam patterns
- Automation that trips anti-scraping or abuse detectors
- Too many login attempts from different IPs
- Using known bot behaviors

### 🔍 Detection & Surfacing
This library detects and surfaces checkpoints via:
- **Error codes**: `checkpoint_282`, `checkpoint_956`, scraping warnings
- **Events** (see README): `checkpoint`, `checkpoint_282`, `checkpoint_956`

### ✅ What This Library Does
- Implements **auto-login** logic **only when you explicitly configure** it (`autoLogin` + `credentials` in `fca-config.json`).
- **Does NOT** attempt to brute-force or bypass unknown checkpoint flows.
- Where automated handling is possible (e.g. scraping warnings), the logic is implemented in **clear, reviewable code**.

### ❌ What This Library Does NOT Do
- Does not bypass 2FA
- Does not solve CAPTCHAs
- Does not use proxies to evade detection (unless you configure them)
- Does not hide account activity from Facebook

### 🛡️ Best Practices
1. Use a **dedicated bot account** — never your personal account
2. Add **frequent delays** between messages
3. Don't send the **same message** repeatedly
4. Avoid **mass friend requests** or group joins
5. Enable **2FA** on the bot account
6. Monitor logs for **checkpoint warnings**

---

## 🔐 2FA & npm Account Security

### For Original Author (DongDev)
The npm account used to publish `@dongdev/fca-unofficial` is protected with:
- **Two-factor authentication (2FA)**
- **Automation tokens** dedicated to CI publishing

### For This Fork (Shihab X FCA)
The npm account `@mdshihabhosein777-alt` is protected with:
- **Two-factor authentication (2FA)** ✅
- **Scoped access tokens** for CI publishing
- **Provenance attestation** for every release

### 🎯 What This Means for You
- Every release is **verifiable** — you can trace the exact commit
- Any malicious update would require:
  - Compromising 2FA
  - Compromising CI tokens
  - Re-writing Git history
- **Supply chain attacks are significantly harder** than unprotected packages

---

## 🚨 Reporting Vulnerabilities

If you discover a security issue:

### 1️⃣ DO NOT Open a Public Issue
Public disclosure gives attackers time to exploit before a fix is available.

### 2️⃣ Contact Maintainer Privately
Report to **Shihab X** via:
- **GitHub**: [@mdshihabhosein777-alt](https://github.com/mdshihabhosein777-alt)
- **Private Security Advisory**: [GitHub Security Advisory](https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial/security/advisories/new)

### 3️⃣ Include in Your Report
- 📝 **Clear description** of the issue
- 🔁 **Steps or code** needed to reproduce
- ⚠️ **Potential impact** you have identified
- 🔧 **Suggested fix** (if you have one)

### 4️⃣ Response Timeline
- **Within 48 hours**: Acknowledgment of receipt
- **Within 7 days**: Initial assessment and severity rating
- **Within 30 days**: Patch released (for confirmed vulnerabilities)

Reasonable, good-faith reports will be investigated, and fixes will be shipped as soon as practical.

---

## 👥 Credit & Attribution

<div align="center">

### 🙏 Original Project

This project is an **enhanced fork** of **[@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial)**.

- **Original Author:** [DongDev](https://github.com/dongp06) (Donix)
- **Original License:** Apache-2.0
- **Original Security Model:** This document is based on DongDev's original `SECURITY.md`

### 💎 Enhanced By

- **Fork Maintainer:** [Shihab X](https://github.com/mdshihabhosein777-alt)
- **Fork Repository:** [mdshihabhosein777-alt/Sayo-fca-unofficial](https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial)

</div>

---

## 📜 License

**Apache License 2.0** — See [LICENSE](./LICENSE) for full text.

- Original work Copyright © DongDev
- Modifications Copyright © Shihab X (mdshihabhosein777-alt)

---

## 🔗 Related Documents

| Document | Description |
|----------|-------------|
| 📘 [README.md](./README.md) | Full project overview |
| 📝 [CHANGELOG.md](./CHANGELOG.md) | Version history |
| 🔐 [SECURITY.md](./SECURITY.md) | This document |
| 📚 [docs/DOCS.md](./docs/DOCS.md) | Full API reference |

---

<div align="center">

**🛡️ Stay safe. Use responsibly. Respect the original author.**

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="divider">

**© 2026 Shihab X FCA** — Based on [@dongdev/fca-unofficial](https://github.com/dongp06/fca-unofficial) by DongDev

</div>
