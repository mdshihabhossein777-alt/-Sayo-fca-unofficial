<div align="center">

# 📘 Shihab X FCA — Documentation

**Comprehensive API Reference for version 1.x**

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=16&duration=3000&pause=800&color=FF6EC7&center=true&vCenter=true&width=700&lines=TypeScript+%E2%80%A2+Full+Type+Safety;MQTT+%E2%80%A2+GraphQL+%E2%80%A2+HTTP;Event-Driven+%E2%80%A2+Composer+Middleware" alt="Docs tagline">

</div>

---

> **Shihab X FCA** is written in TypeScript; the published package ships `dist/` only. Source under `src/` is on [GitHub](https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial).
>
> **Forked from:** [@dongdev/fca-unofficial v4.x](https://github.com/dongp06/fca-unofficial) by **DongDev** — original author credits preserved.

---

## 📚 Table of Contents

<div align="center">

| # | Section | # | Section |
|---|---------|---|---------|
| 1 | [Installation & Build](#1-installation--build) | 11 | [API Reference — Users](#11-api-reference--users) |
| 2 | [Authentication](#2-authentication) | 12 | [API Reference — Account](#12-api-reference--account) |
| 3 | [The Two API Layers](#3-the-two-api-layers) | 13 | [API Reference — HTTP](#13-api-reference--http) |
| 4 | [Realtime — MQTT Listener](#4-realtime--mqtt-listener) | 14 | [API Reference — Scheduler](#14-api-reference--scheduler) |
| 5 | [MessengerBot — Event-Driven](#5-messengerbot--event-driven-interface) | 15 | [Events Reference](#15-events-reference) |
| 6 | [Configuration File](#6-configuration-file-fca-configjson) | 16 | [Exports Summary](#16-exports-summary) |
| 7 | [Thread Cache & Realtime Sync](#7-thread-cache--realtime-sync) | 17 | [Debugging MQTT](#17-debugging-mqtt) |
| 8 | [Database (Optional)](#8-database-optional) | 18 | [Security & Ethics](#18-security--ethics) |
| 9 | [API Reference — Messages](#9-api-reference--messages) | 19 | [License & Credits](#19-license--credits) |
| 10 | [API Reference — Threads](#10-api-reference--threads) | | |

</div>

---

## 1. Installation & Build

### 📦 From npm

```bash
npm install @mdshihabhosein777-alt/shihab-x-fca@latest
