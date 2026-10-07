/**
 * Shihab X FCA — Startup Banner
 * Forked from @dongdev/fca-unofficial
 * Author: Shihab X (mdshihabhosein777-alt)
 */

let gradient: any;
try {
  gradient = require("gradient-string");
} catch (_) {
  gradient = null;
}

function grad(colors: string[], text: string): string {
  if (gradient) {
    try { return gradient(colors)(text); } catch (_) {}
  }
  return text;
}

/* ═══ ANSI Colors ═══ */
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  pink: "\x1b[38;5;213m",
  purple: "\x1b[38;5;141m",
  cyan: "\x1b[38;5;81m",
  gold: "\x1b[38;5;220m",
  green: "\x1b[38;5;46m",
  red: "\x1b[38;5;196m",
  gray: "\x1b[38;5;245m",
  white: "\x1b[97m",
};

/* ═══════════════════════════════════════════════════════════
   MAIN BANNER — Shihab X hero
   ═══════════════════════════════════════════════════════════ */
export function printBanner(version: string = "1.0.0"): void {
  /* ─── Big "SHIHAB X" ASCII art ─── */
  const art = [
    "",
    "   ███████╗██╗  ██╗██╗██╗  ██╗ █████╗ ██████╗     ██╗  ██╗",
    "   ██╔════╝██║  ██║██║██║  ██║██╔══██╗██╔══██╗    ╚██╗██╔╝",
    "   ███████╗███████║██║███████║███████║██████╔╝     ╚███╔╝ ",
    "   ╚════██║██╔══██║██║██╔══██║██╔══██║██╔══██╗     ██╔██╗ ",
    "   ███████║██║  ██║██║██║  ██║██║  ██║██║  ██║    ██╔╝ ██╗",
    "   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝",
    "",
  ].join("\n");

  console.log(grad(["#a78bfa", "#f472b6", "#4cc9f0"], art));

  /* ─── Big "FCA" tagline ─── */
  console.log(
    grad(
      ["#ffd166", "#ff6ec7", "#a78bfa"],
      `        ╔═══════════════════════════════════════════╗`
    )
  );
  console.log(
    grad(
      ["#ffd166", "#ff6ec7", "#a78bfa"],
      `        ║   ⚡  S H I H A B   X   F C A  ⚡         ║`
    )
  );
  console.log(
    grad(
      ["#ffd166", "#ff6ec7", "#a78bfa"],
      `        ║        Advanced FCA Edition               ║`
    )
  );
  console.log(
    grad(
      ["#ffd166", "#ff6ec7", "#a78bfa"],
      `        ╚═══════════════════════════════════════════╝`
    )
  );

  console.log("");

  /* ─── Info panel ─── */
  console.log(`${C.purple}  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${C.reset}`);
  console.log(`${C.purple}  ┃${C.reset}  ${C.bold}${C.pink}⚡ BRAND${C.reset}   : ${C.bold}${C.gold}Shihab X FCA${C.reset}`);
  console.log(`${C.purple}  ┃${C.reset}  ${C.bold}${C.pink}👤 AUTHOR${C.reset}  : ${C.bold}${C.white}Shihab X${C.reset}`);
  console.log(`${C.purple}  ┃${C.reset}  ${C.bold}${C.pink}📦 VERSION${C.reset} : ${C.bold}${C.cyan}v${version}${C.reset}`);
  console.log(`${C.purple}  ┃${C.reset}  ${C.bold}${C.pink}🧬 BASED ON${C.reset}: ${C.dim}@dongdev/fca-unofficial${C.reset}`);
  console.log(`${C.purple}  ┃${C.reset}  ${C.bold}${C.pink}🌐 GITHUB${C.reset}  : ${C.cyan}github.com/mdshihabhosein777-alt${C.reset}`);
  console.log(`${C.purple}  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${C.reset}`);
  console.log("");
}

/* ═══ Login Success ═══ */
export function printLoginSuccess(userName: string, userID: string): void {
  console.log("");
  console.log(grad(["#06d6a0", "#4cc9f0"], `  ╔═══════════════════════════════════════════╗`));
  console.log(grad(["#06d6a0", "#4cc9f0"], `  ║     ✅  SHIHAB X FCA — LOGIN SUCCESS     ║`));
  console.log(grad(["#06d6a0", "#4cc9f0"], `  ╚═══════════════════════════════════════════╝`));
  console.log(`     ${C.gray}👤 User${C.reset}  : ${C.bold}${C.pink}${userName}${C.reset}`);
  console.log(`     ${C.gray}🆔 BotID${C.reset} : ${C.bold}${C.cyan}${userID}${C.reset}`);
  console.log("");
}

/* ═══ MQTT Connected ═══ */
export function printConnect(): void {
  console.log(grad(["#ff6ec7", "#a78bfa"], `  🔗 Shihab X FCA — MQTT Connected ✅`));
}

/* ═══ Error ═══ */
export function printError(msg: string): void {
  console.log(`  ${C.red}❌ [Shihab X FCA]${C.reset} ${C.gray}${msg}${C.reset}`);
}

/* ═══ Info ═══ */
export function printInfo(msg: string): void {
  console.log(`  ${C.cyan}ℹ️  [Shihab X FCA]${C.reset} ${msg}`);
}

/* ═══ Warning ═══ */
export function printWarn(msg: string): void {
  console.log(`  ${C.gold}⚠️  [Shihab X FCA]${C.reset} ${C.gray}${msg}${C.reset}`);
}

/* ═══ Success ═══ */
export function printSuccess(msg: string): void {
  console.log(`  ${C.green}✅ [Shihab X FCA]${C.reset} ${msg}`);
              }
