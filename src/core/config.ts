/**
 * Shihab X FCA — Configuration System
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";

import logger from "../func/logger";

/* ═══════════════════════════════════════════════════════════
   🎨 BRAND & CREDITS
   ═══════════════════════════════════════════════════════════ */

export interface FcaBrandConfig {
  /** Display name of the brand/fork */
  name: string;
  /** Fork maintainer's name */
  author: string;
  /** Fork maintainer's GitHub profile */
  authorUrl: string;
  /** Fork repository URL */
  repo: string;
  /** Version of the fork */
  version: string;
  /** Original author's name (preserved for credit) */
  originalAuthor: string;
  /** Original repository URL (preserved for credit) */
  originalRepo: string;
  /** Show animated banner on startup */
  showBanner: boolean;
}

export interface FcaThemeConfig {
  /** Primary brand color (hex) */
  primary: string;
  /** Secondary accent color (hex) */
  secondary: string;
  /** Tertiary accent color (hex) */
  accent: string;
  /** Success color (hex) */
  success: string;
  /** Error color (hex) */
  error: string;
  /** Warning color (hex) */
  warning: string;
  /** Info color (hex) */
  info: string;
  /** Enable colored log output */
  colorize: boolean;
  /** Enable emoji in log output */
  emoji: boolean;
}

/* ═══════════════════════════════════════════════════════════
   📦 UPDATE CHECK
   ═══════════════════════════════════════════════════════════ */

export interface FcaUpdateCheckConfig {
  enabled: boolean;
  install: boolean;
  notifyIfCurrent: boolean;
  packageName: string;
  registryUrl: string;
  timeoutMs: number;
}

/* ═══════════════════════════════════════════════════════════
   ⚙️ MAIN CONFIG
   ═══════════════════════════════════════════════════════════ */

export interface FcaConfig {
  /** Brand & credit info */
  brand: FcaBrandConfig;
  /** Theme colors & logging style */
  theme: FcaThemeConfig;

  /** Auto-update flag (mirrors checkUpdate.enabled) */
  autoUpdate: boolean;
  /** Update check configuration */
  checkUpdate: FcaUpdateCheckConfig;

  /** MQTT realtime settings */
  mqtt: {
    enabled: boolean;
    reconnectInterval: number;
  };

  /** Auto-login configuration */
  autoLogin: boolean;
  /** External API server for token-based login */
  apiServer: string;
  /** API key for external server */
  apiKey: string;
  /** Credentials for auto-login */
  credentials: {
    email: string;
    password: string;
    twofactor: string;
  };

  /** Anti-scraping cache toggles */
  antiGetInfo: {
    AntiGetThreadInfo: boolean;
    AntiGetUserInfo: boolean;
  };

  /** Remote control (WebSocket dashboard) */
  remoteControl: {
    enabled: boolean;
    url: string;
    token: string;
    autoReconnect: boolean;
  };

  /** Allow any extra user-defined keys */
  [key: string]: Loose;
}

export interface LoadedFcaConfig {
  config: FcaConfig;
  configPath: string;
  exists: boolean;
}

/* ═══════════════════════════════════════════════════════════
   🎯 DEFAULTS — SHIHAB X FCA
   ═══════════════════════════════════════════════════════════ */

const DEFAULT_REGISTRY_URL = "https://registry.npmjs.org";
const DEFAULT_PACKAGE_NAME = "@mdshihabhosein777-alt/shihab-x-fca";
const DEFAULT_UPDATE_URL =
  "https://raw.githubusercontent.com/mdshihabhosein777-alt/Sayo-fca-unofficial/main/package.json";

export const defaultBrand: FcaBrandConfig = {
  name: "Shihab X FCA",
  author: "Shihab X",
  authorUrl: "https://github.com/mdshihabhosein777-alt",
  repo: "https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial",
  version: "1.0.0",
  originalAuthor: "DongDev",
  originalRepo: "https://github.com/dongp06/fca-unofficial",
  showBanner: true
};

export const defaultTheme: FcaThemeConfig = {
  primary:   "#a78bfa",  // Purple
  secondary: "#f472b6",  // Pink
  accent:    "#4cc9f0",  // Cyan
  success:   "#06d6a0",  // Green
  error:     "#ef476f",  // Red
  warning:   "#ffd166",  // Gold
  info:      "#4cc9f0",  // Cyan
  colorize:  true,
  emoji:     true
};

export const defaultConfig: FcaConfig = {
  /* 🎨 Brand & credits */
  brand: defaultBrand,

  /* 🎨 Theme */
  theme: defaultTheme,

  /* 🔄 Update */
  autoUpdate: true,
  checkUpdate: {
    enabled: true,
    install: false,
    notifyIfCurrent: false,
    packageName: DEFAULT_PACKAGE_NAME,
    registryUrl: DEFAULT_REGISTRY_URL,
    timeoutMs: 10000
  },

  /* 📡 MQTT */
  mqtt: {
    enabled: true,
    reconnectInterval: 3600
  },

  /* 🔐 Auto-login */
  autoLogin: true,
  apiServer: "",           // ⚠️ Set your own if you use external API
  apiKey: "",
  credentials: {
    email: "",
    password: "",
    twofactor: ""
  },

  /* 💾 Anti-scraping cache */
  antiGetInfo: {
    AntiGetThreadInfo: false,
    AntiGetUserInfo: false
  },

  /* 🎛️ Remote control */
  remoteControl: {
    enabled: false,
    url: "",
    token: "",
    autoReconnect: true
  }
};

/* ═══════════════════════════════════════════════════════════
   🛠️ INTERNAL HELPERS
   ═══════════════════════════════════════════════════════════ */

function isPlainObject(value: Loose): value is Record<string, Loose> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneConfig<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneConfig(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneConfig(item)])
    ) as T;
  }

  return value;
}

function deepMerge<T>(base: T, override?: Loose): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? cloneConfig(base) : cloneConfig(override as T);
  }

  const result = cloneConfig(base) as Record<string, Loose>;
  for (const [key, value] of Object.entries(override)) {
    const current = result[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      result[key] = deepMerge(current, value);
    } else {
      result[key] = cloneConfig(value);
    }
  }
  return result as T;
}

function normalizeBoolean(value: Loose, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return fallback;
}

function normalizeNumber(value: Loose, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function normalizeString(value: Loose, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/* ═══════════════════════════════════════════════════════════
   🎯 RESOLVE CONFIG — Merge + Validate
   ═══════════════════════════════════════════════════════════ */

export function resolveConfig(input?: Loose): FcaConfig {
  const rawInput = isPlainObject(input) ? input : {};
  const rawCheckUpdate = isPlainObject(rawInput.checkUpdate) ? rawInput.checkUpdate : {};

  const merged = deepMerge(defaultConfig, input || {});
  const config = merged as FcaConfig;

  /* ─── Deep merge nested blocks ─── */
  config.brand         = deepMerge(defaultBrand, config.brand || {});
  config.theme         = deepMerge(defaultTheme, config.theme || {});
  config.credentials   = deepMerge(defaultConfig.credentials, config.credentials || {});
  config.mqtt          = deepMerge(defaultConfig.mqtt, config.mqtt || {});
  config.antiGetInfo   = deepMerge(defaultConfig.antiGetInfo, config.antiGetInfo || {});
  config.remoteControl = deepMerge(defaultConfig.remoteControl, config.remoteControl || {});
  config.checkUpdate   = deepMerge(defaultConfig.checkUpdate, config.checkUpdate || {});

  /* ─── Normalize primitives ─── */
  config.autoLogin  = normalizeBoolean(config.autoLogin, defaultConfig.autoLogin);
  config.autoUpdate = normalizeBoolean(rawInput.autoUpdate, defaultConfig.autoUpdate);

  /* ─── Brand normalization ─── */
  config.brand.name           = normalizeString(config.brand.name, defaultBrand.name);
  config.brand.author         = normalizeString(config.brand.author, defaultBrand.author);
  config.brand.authorUrl      = normalizeString(config.brand.authorUrl, defaultBrand.authorUrl);
  config.brand.repo           = normalizeString(config.brand.repo, defaultBrand.repo);
  config.brand.version        = normalizeString(config.brand.version, defaultBrand.version);
  config.brand.originalAuthor = normalizeString(config.brand.originalAuthor, defaultBrand.originalAuthor);
  config.brand.originalRepo   = normalizeString(config.brand.originalRepo, defaultBrand.originalRepo);
  config.brand.showBanner     = normalizeBoolean(config.brand.showBanner, defaultBrand.showBanner);

  /* ─── Theme normalization ─── */
  config.theme.primary   = normalizeString(config.theme.primary, defaultTheme.primary);
  config.theme.secondary = normalizeString(config.theme.secondary, defaultTheme.secondary);
  config.theme.accent    = normalizeString(config.theme.accent, defaultTheme.accent);
  config.theme.success   = normalizeString(config.theme.success, defaultTheme.success);
  config.theme.error     = normalizeString(config.theme.error, defaultTheme.error);
  config.theme.warning   = normalizeString(config.theme.warning, defaultTheme.warning);
  config.theme.info      = normalizeString(config.theme.info, defaultTheme.info);
  config.theme.colorize  = normalizeBoolean(config.theme.colorize, defaultTheme.colorize);
  config.theme.emoji     = normalizeBoolean(config.theme.emoji, defaultTheme.emoji);

  /* ─── MQTT ─── */
  config.mqtt.enabled = normalizeBoolean(config.mqtt.enabled, defaultConfig.mqtt.enabled);
  config.mqtt.reconnectInterval = normalizeNumber(
    config.mqtt.reconnectInterval,
    defaultConfig.mqtt.reconnectInterval
  );

  /* ─── Remote control ─── */
  config.remoteControl.enabled = normalizeBoolean(
    config.remoteControl.enabled,
    defaultConfig.remoteControl.enabled
  );
  config.remoteControl.autoReconnect = normalizeBoolean(
    config.remoteControl.autoReconnect,
    defaultConfig.remoteControl.autoReconnect
  );

  /* ─── Anti-scraping ─── */
  config.antiGetInfo.AntiGetThreadInfo = normalizeBoolean(
    config.antiGetInfo.AntiGetThreadInfo,
    defaultConfig.antiGetInfo.AntiGetThreadInfo
  );
  config.antiGetInfo.AntiGetUserInfo = normalizeBoolean(
    config.antiGetInfo.AntiGetUserInfo,
    defaultConfig.antiGetInfo.AntiGetUserInfo
  );

  /* ─── Update check ─── */
  config.checkUpdate.enabled = normalizeBoolean(rawCheckUpdate.enabled, config.autoUpdate);
  config.checkUpdate.install = normalizeBoolean(
    config.checkUpdate.install,
    defaultConfig.checkUpdate.install
  );
  config.checkUpdate.notifyIfCurrent = normalizeBoolean(
    config.checkUpdate.notifyIfCurrent,
    defaultConfig.checkUpdate.notifyIfCurrent
  );
  config.checkUpdate.packageName = normalizeString(
    config.checkUpdate.packageName,
    defaultConfig.checkUpdate.packageName
  );
  config.checkUpdate.registryUrl = normalizeString(
    config.checkUpdate.registryUrl,
    defaultConfig.checkUpdate.registryUrl
  );
  config.checkUpdate.timeoutMs = Math.max(
    1000,
    normalizeNumber(config.checkUpdate.timeoutMs, defaultConfig.checkUpdate.timeoutMs)
  );

  config.autoUpdate = config.checkUpdate.enabled;
  return config;
}

/* ═══════════════════════════════════════════════════════════
   📂 LOAD / WRITE CONFIG
   ═══════════════════════════════════════════════════════════ */

export function getConfigPath() {
  return path.join(process.cwd(), "fca-config.json");
}

export function loadConfig(): LoadedFcaConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    logger(`Config not found → using Shihab X defaults`, "info");
    return {
      config: resolveConfig(defaultConfig),
      configPath,
      exists: false
    };
  }

  try {
    const fileContent = fs.readFileSync(configPath, "utf8");
    if (fileContent.trim() === "") {
      return {
        config: resolveConfig(defaultConfig),
        configPath,
        exists: true
      };
    }

    const parsed = JSON.parse(fileContent);
    logger(`Config loaded → ${configPath}`, "info");
    return {
      config: resolveConfig(parsed),
      configPath,
      exists: true
    };
  } catch (err: Loose) {
    logger(`Error reading config file, using Shihab X defaults: ${err.message}`, "warn");
    return {
      config: resolveConfig(defaultConfig),
      configPath,
      exists: true
    };
  }
}

export function writeConfigTemplate(
  targetPath = path.join(process.cwd(), "fca-config.example.json")
) {
  /* Build a well-commented template */
  const template = {
    _comment:
      "Shihab X FCA — Configuration File | Forked from @dongdev/fca-unofficial",

    brand: {
      _comment: "🎨 Brand & credit info — change these if you fork further",
      ...defaultBrand
    },

    theme: {
      _comment: "🎨 Theme colors & log style",
      ...defaultTheme
    },

    autoUpdate: true,
    checkUpdate: {
      _comment: "🔄 Auto-update via npm",
      ...defaultConfig.checkUpdate
    },

    mqtt: {
      _comment: "📡 Realtime MQTT settings",
      ...defaultConfig.mqtt
    },

    autoLogin: true,
    apiServer: "",
    apiKey: "",
    credentials: {
      _comment: "🔐 Only fill these if you enable autoLogin",
      ...defaultConfig.credentials
    },

    antiGetInfo: {
      _comment: "💾 SQLite-backed cache to reduce GraphQL calls",
      ...defaultConfig.antiGetInfo
    },

    remoteControl: {
      _comment: "🎛️ WebSocket remote dashboard",
      ...defaultConfig.remoteControl
    }
  };

  const payload = `${JSON.stringify(template, null, 2)}\n`;
  fs.writeFileSync(targetPath, payload, "utf8");
  return targetPath;
}

/* ═══════════════════════════════════════════════════════════
   📌 CREDITS
   ═══════════════════════════════════════════════════════════
 *
 * Shihab X FCA
 * ─────────────────────────────────────────────
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 🧬 Original Author : DongDev (Donix)
 * 📦 Original Project: @dongdev/fca-unofficial
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 */
