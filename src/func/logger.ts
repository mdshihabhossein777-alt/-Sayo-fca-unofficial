/**
 * Shihab X FCA — Premium Logger
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Colored, themed, animated logger for Shihab X FCA.
 * Supports cyberpunk & minimal themes, spinners, progress bars,
 * and a startup banner with gradient ASCII art.
 */

import pc from "picocolors";
import gradient from "gradient-string";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

export type LoggerFn = (text: string, type?: string) => void;

type LogLevel =
  | "info"
  | "success"
  | "warn"
  | "error"
  | "sys"
  | "system"
  | "core";

type ThemeName = "cyberpunk" | "minimal" | "shihab";

type GradientFns = {
  cyberpunk: (s: string) => string;
  blueToRed: (s: string) => string;
  coolStatus: (s: string) => string;
  shihabBrand: (s: string) => string;
  shihabAccent: (s: string) => string;
};

type SpinnerLike = {
  text?: string;
  start?: () => SpinnerLike;
  stop?: () => SpinnerLike;
  stopAndPersist?: (opts: { symbol: string; text: string }) => SpinnerLike;
  succeed?: (text?: string) => SpinnerLike;
  fail?: (text?: string) => SpinnerLike;
  info?: (text?: string) => SpinnerLike;
  warn?: (text?: string) => SpinnerLike;
};

type ProgressLike = {
  start: (total: number, startValue: number, payload?: Record<string, unknown>) => void;
  update: (value: number, payload?: Record<string, unknown>) => void;
  stop: () => void;
};

type LoggerApi = LoggerFn & {
  fca: (text: string) => void;
  sys: (text: string) => void;
  success: (text: string) => void;
  warn: (text: string) => void;
  error: (text: string) => void;
  showBanner: () => Promise<void>;
  startSpinner: (text: string) => Promise<SpinnerLike | null>;
  runMethodLoadProgress: (loaded: number) => Promise<void>;
  persistCheckpointOk: (spinner: SpinnerLike | null) => void;
  persistLoginSuccess: (spinner: SpinnerLike | null) => void;
  persistLoginFail: (spinner: SpinnerLike | null) => void;
};

/* ═══════════════════════════════════════════════════════════
   🎨 BRAND CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const BRAND = {
  name: "Shihab X FCA",
  shortName: "ShihabX",
  author: "Shihab X",
  authorUrl: "https://github.com/mdshihabhosein777-alt",
  repo: "https://github.com/mdshihabhosein777-alt/Sayo-fca-unofficial",
  originalAuthor: "DongDev",
  originalRepo: "https://github.com/dongp06/fca-unofficial",
  version: "1.0.0"
} as const;

/* ═══════════════════════════════════════════════════════════
   🔧 INTERNAL STATE
   ═══════════════════════════════════════════════════════════ */

let oraFactory: ((options: Record<string, unknown>) => SpinnerLike) | null = null;
let progressCtor:
  | (new (
      options: Record<string, unknown>,
      preset?: Record<string, unknown>
    ) => ProgressLike)
  | null = null;
let progressPreset: unknown = null;

let gradientFns: GradientFns | null | undefined;

/* ═══════════════════════════════════════════════════════════
   🖨️ STDIO HELPERS
   ═══════════════════════════════════════════════════════════ */

function writeStdout(message: string) {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message: string) {
  process.stderr.write(`${message}\n`);
}

function padLabel(label: string, width = 8) {
  return label.length >= width ? label : `${label}${" ".repeat(width - label.length)}`;
}

function getTimestamp() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/* ═══════════════════════════════════════════════════════════
   🎨 THEME
   ═══════════════════════════════════════════════════════════ */

function getTheme(): ThemeName {
  const fromEnv = String(process.env.FCA_LOG_THEME || "").toLowerCase();
  if (fromEnv === "minimal") return "minimal";
  if (fromEnv === "shihab") return "shihab";
  return "cyberpunk";
}

function makeStyles(theme: ThemeName) {
  if (theme === "minimal") {
    return {
      time: (v: string) => pc.dim(v),
      text: (v: string) => pc.white(v),
      info: (v: string) => pc.cyan(v),
      warn: (v: string) => pc.yellow(v),
      error: (v: string) => pc.red(v),
      sys: (v: string) => pc.blue(v)
    };
  }

  if (theme === "shihab") {
    return {
      time: (v: string) => pc.dim(v),
      text: (v: string) => pc.magenta(v),
      info: (v: string) => pc.magenta(v),
      warn: (v: string) => pc.yellow(v),
      error: (v: string) => pc.red(v),
      sys: (v: string) => pc.cyan(v)
    };
  }

  /* cyberpunk (default) */
  return {
    time: (v: string) => pc.dim(v),
    text: (v: string) => pc.white(v),
    info: (v: string) => pc.cyan(v),
    warn: (v: string) => pc.yellow(v),
    error: (v: string) => pc.red(v),
    sys: (v: string) => pc.blue(v)
  };
}

/* ═══════════════════════════════════════════════════════════
   🎨 GRADIENTS
   ═══════════════════════════════════════════════════════════ */

function loadGradientFns(): GradientFns | null {
  if (gradientFns !== undefined) return gradientFns;

  try {
    const g =
      typeof gradient === "function"
        ? gradient
        : (gradient as { default: typeof gradient }).default;

    if (typeof g !== "function") {
      gradientFns = null;
      return gradientFns;
    }

    gradientFns = {
      cyberpunk:    g("magenta", "cyan"),
      blueToRed:    g("#3b82f6", "#ef4444"),
      coolStatus:   g("#86efac", "#22d3ee"),
      shihabBrand:  g("#a78bfa", "#f472b6", "#4cc9f0"),
      shihabAccent: g("#ffd166", "#ff6ec7")
    };
  } catch {
    gradientFns = null;
  }
  return gradientFns;
}

function formatSuccessBody(
  body: string,
  grad: GradientFns | null,
  fallbackPaint: (s: string) => string
) {
  const m = body.match(/^Loaded (\d+) API methods(.*)$/i);
  if (m && grad) {
    return `${pc.dim("Loaded ")}${grad.blueToRed(m[1])}${pc.dim(
      ` API methods${m[2]}`
    )}`;
  }
  return fallbackPaint(body);
}

/* ═══════════════════════════════════════════════════════════
   📦 LAZY UI LIBS
   ═══════════════════════════════════════════════════════════ */

async function ensureUiLibs() {
  if (!oraFactory) {
    try {
      const oraMod = await import("ora");
      oraFactory = (oraMod.default ?? oraMod) as (
        options: Record<string, unknown>
      ) => SpinnerLike;
    } catch {
      /* ignore */
    }
  }

  if (!progressCtor || !progressPreset) {
    try {
      const progressMod = await import("cli-progress");
      progressCtor = (progressMod.SingleBar ??
        progressMod.default?.SingleBar) as new (
        options: Record<string, unknown>,
        preset?: Record<string, unknown>
      ) => ProgressLike;
      progressPreset =
        progressMod.Presets?.shades_classic ??
        progressMod.default?.Presets?.shades_classic ??
        null;
    } catch {
      /* ignore */
    }
  }
}

/* ═══════════════════════════════════════════════════════════
   📝 LOG LINE PARSER
   ═══════════════════════════════════════════════════════════ */

function parseLabel(message: string, fallback: string) {
  const m = message.match(/^([A-Z][A-Z0-9 _-]{1,14})\s*:\s*(.+)$/);
  if (!m) return { label: fallback, body: message };
  return { label: m[1].trim(), body: m[2] };
}

/* ═══════════════════════════════════════════════════════════
   🎯 MAIN LOGGER
   ═══════════════════════════════════════════════════════════ */

function logLine(text: string, type?: string) {
  const level = String(type || "info").toLowerCase() as LogLevel;
  const message = String(text ?? "");
  const styles = makeStyles(getTheme());
  const ts = styles.time(`[${getTimestamp()}]`);
  const theme = getTheme();
  const grad = theme === "cyberpunk" || theme === "shihab" ? loadGradientFns() : null;

  /* ✅ SUCCESS */
  if (level === "success") {
    const parts = parseLabel(message, "READY");
    const bodyOut =
      parts.label === "READY"
        ? formatSuccessBody(parts.body, grad, styles.text)
        : grad
          ? grad.coolStatus(parts.body)
          : styles.text(parts.body);
    const labelOut = grad
      ? grad.coolStatus(padLabel(parts.label))
      : styles.text(padLabel(parts.label));

    writeStdout(
      `${ts} ${pc.bgGreen(pc.black(pc.bold(" SUCCESS ")))} ${labelOut} : ${bodyOut}`
    );
    return;
  }

  /* ⚠️ WARN */
  if (level === "warn") {
    const parts = parseLabel(message, "WARN");
    writeStderr(
      `${ts} ${styles.text(padLabel(parts.label))} : ${styles.warn(parts.body)}`
    );
    return;
  }

  /* ❌ ERROR */
  if (level === "error") {
    const parts = parseLabel(message, "ERROR");
    writeStderr(
      `${ts} ${styles.text(padLabel(parts.label))} : ${styles.error(parts.body)}`
    );
    return;
  }

  /* 🔧 SYSTEM / CORE */
  if (level === "sys" || level === "system" || level === "core") {
    const parts = parseLabel(message, "SYSTEM");
    const labelOut = grad
      ? grad.blueToRed(padLabel(parts.label))
      : styles.text(padLabel(parts.label));
    const bodyOut = grad ? pc.dim(pc.blue(parts.body)) : styles.sys(parts.body);
    writeStdout(`${ts} ${labelOut} : ${bodyOut}`);
    return;
  }

  /* ℹ️ INFO (default) */
  const parts = parseLabel(message, "SESSION");
  const labelOut = grad
    ? grad.coolStatus(padLabel(parts.label))
    : styles.text(padLabel(parts.label));
  const bodyOut = grad ? grad.coolStatus(parts.body) : styles.info(parts.body);
  writeStdout(`${ts} ${labelOut} : ${bodyOut}`);
}

/* ═══════════════════════════════════════════════════════════
   🔌 API FACADE
   ═══════════════════════════════════════════════════════════ */

const baseLogger = logLine as LoggerApi;

baseLogger.fca = (text: string) => baseLogger(`SESSION: ${text}`, "info");
baseLogger.sys = (text: string) => baseLogger(`SYSTEM: ${text}`, "sys");
baseLogger.success = (text: string) => baseLogger(text, "success");
baseLogger.warn = (text: string) => baseLogger(text, "warn");
baseLogger.error = (text: string) => baseLogger(text, "error");

/* ═══════════════════════════════════════════════════════════
   ✨ STARTUP BANNER — SHIHAB X FCA
   ═══════════════════════════════════════════════════════════ */

baseLogger.showBanner = async () => {
  const grad = loadGradientFns();

  /* Big ASCII "SHIHAB X" */
  const ascii = [
    "",
    "  ███████╗██╗  ██╗██╗██╗  ██╗ █████╗ ██████╗     ██╗  ██╗",
    "  ██╔════╝██║  ██║██║██║  ██║██╔══██╗██╔══██╗    ╚██╗██╔╝",
    "  ███████╗███████║██║███████║███████║██████╔╝     ╚███╔╝ ",
    "  ╚════██║██╔══██║██║██╔══██║██╔══██║██╔══██╗     ██╔██╗ ",
    "  ███████║██║  ██║██║██║  ██║██║  ██║██║  ██║    ██╔╝ ██╗",
    "  ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝",
    ""
  ].join("\n");

  if (grad) {
    writeStdout(grad.shihabBrand(ascii));
    writeStdout(grad.shihabAccent(`              ⚡ ${BRAND.name} — v${BRAND.version} ⚡`));
  } else {
    writeStdout(ascii);
    writeStdout(`              ⚡ ${BRAND.name} — v${BRAND.version} ⚡`);
  }

  writeStdout(pc.magenta("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  writeStdout(`  ${pc.bold(pc.magenta("🎨 FORK"))}       : ${pc.bold(pc.white(BRAND.author))}`);
  writeStdout(`  ${pc.bold(pc.magenta("🌐 GITHUB"))}     : ${pc.cyan(BRAND.repo)}`);
  writeStdout(`  ${pc.bold(pc.magenta("🧬 BASED ON"))}   : ${pc.dim("fca-unofficial by " + BRAND.originalAuthor)}`);
  writeStdout(`  ${pc.bold(pc.magenta("📦 VERSION"))}    : ${pc.cyan("v" + BRAND.version)}`);
  writeStdout(pc.magenta("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  writeStdout("");
};

/* ═══════════════════════════════════════════════════════════
   🎡 SPINNER
   ═══════════════════════════════════════════════════════════ */

baseLogger.startSpinner = async (text: string) => {
  await ensureUiLibs();
  if (!oraFactory || !process.stdout.isTTY) return null;

  const grad = getTheme() !== "minimal" ? loadGradientFns() : null;
  const line = grad ? grad.cyberpunk(text) : pc.cyan(text);
  const spinner = oraFactory({
    text: line,
    color: "cyan"
  });

  return typeof spinner.start === "function" ? spinner.start() : spinner;
};

/* ═══════════════════════════════════════════════════════════
   📊 PROGRESS BAR
   ═══════════════════════════════════════════════════════════ */

baseLogger.runMethodLoadProgress = async (loaded: number) => {
  await ensureUiLibs();
  if (!progressCtor || !process.stdout.isTTY || loaded <= 0) return;

  const grad = getTheme() !== "minimal" ? loadGradientFns() : null;
  const prefix = grad
    ? grad.cyberpunk("shihab-x · methods")
    : pc.cyan("shihab-x · methods");

  const bar = new progressCtor(
    {
      format: `${prefix} |{bar}| {percentage}% | {value}/{total}`,
      barCompleteChar: "\u2588",
      barIncompleteChar: "\u2591",
      hideCursor: true
    },
    (progressPreset as Record<string, unknown> | undefined) ?? undefined
  );

  bar.start(loaded, 0);
  for (let i = 1; i <= loaded; i += 1) {
    bar.update(i);
  }
  bar.stop();
};

/* ═══════════════════════════════════════════════════════════
   🎯 SPINNER PERSISTERS
   ═══════════════════════════════════════════════════════════ */

baseLogger.persistCheckpointOk = (spinner: SpinnerLike | null) => {
  if (spinner && typeof spinner.stop === "function") {
    spinner.stop();
  }
  baseLogger("SESSION: ✅ No checkpoint detected", "info");
};

baseLogger.persistLoginSuccess = (spinner: SpinnerLike | null) => {
  if (spinner && typeof spinner.stop === "function") {
    spinner.stop();
  }
};

baseLogger.persistLoginFail = (spinner: SpinnerLike | null) => {
  if (spinner && typeof spinner.stop === "function") {
    spinner.stop();
  }
};

/* ═══════════════════════════════════════════════════════════
   📌 EXPORT
   ═══════════════════════════════════════════════════════════ */

export default baseLogger;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
