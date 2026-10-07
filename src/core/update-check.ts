/**
 * Shihab X FCA — Package Update Checker
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Checks the npm registry for a newer version of this package
 * (Shihab X FCA fork). Optionally auto-installs the update.
 *
 * Features:
 *   • Semver comparison (major.minor.patch + pre-release)
 *   • HTTPS fetch from npm registry
 *   • Optional auto-install via `npm i`
 *   • In-flight de-duplication (multiple calls → 1 request)
 */

import https from "node:https";
import { execFile } from "node:child_process";
import packageInfo from "../../package.json";
import type { FcaConfig, FcaUpdateCheckConfig } from "./config";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

export interface PackageUpdateCheckResult {
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  installed: boolean;
}

/* ═══════════════════════════════════════════════════════════
   🔢 SEMVER COMPARISON
   ═══════════════════════════════════════════════════════════ */

/**
 * Compare two numeric-or-string version parts.
 * Numbers compare numerically; non-numeric falls back to string compare.
 */
function compareVersionPart(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    if (leftNumber === rightNumber) return 0;
    return leftNumber > rightNumber ? 1 : -1;
  }

  return left.localeCompare(right);
}

/**
 * Compare two semver strings.
 * Returns `1` if left > right, `-1` if left < right, `0` if equal.
 * Pre-release tags (e.g. `1.0.0-beta`) sort lower than releases.
 */
function compareSemver(left: string, right: string): number {
  const leftParts = left.replace(/^v/i, "").split("-");
  const rightParts = right.replace(/^v/i, "").split("-");

  const leftCore = leftParts[0].split(".");
  const rightCore = rightParts[0].split(".");
  const length = Math.max(leftCore.length, rightCore.length);

  /* ─── Compare core version (major.minor.patch) ─── */
  for (let index = 0; index < length; index++) {
    const result = compareVersionPart(
      leftCore[index] || "0",
      rightCore[index] || "0"
    );
    if (result !== 0) return result;
  }

  /* ─── Handle pre-release suffix ─── */
  if (leftParts.length === 1 && rightParts.length === 1) return 0;
  if (leftParts.length === 1) return 1;   /* left is release, right is pre-release */
  if (rightParts.length === 1) return -1; /* right is release, left is pre-release */

  return compareVersionPart(
    leftParts.slice(1).join("-"),
    rightParts.slice(1).join("-")
  );
}

/* ═══════════════════════════════════════════════════════════
   🛠️ HELPERS
   ═══════════════════════════════════════════════════════════ */

function normalizeRegistryUrl(value: string) {
  return value.replace(/\/+$/, "");
}

/**
 * Read the update-check config from either:
 *   • A full `FcaConfig` (which has `checkUpdate`)
 *   • A raw `FcaUpdateCheckConfig`
 *   • `undefined` (uses safe defaults from `package.json`)
 */
function readUpdateConfig(
  input?: FcaConfig | FcaUpdateCheckConfig
): FcaUpdateCheckConfig {
  if (input && "checkUpdate" in input) {
    return input.checkUpdate;
  }

  const fallback = {
    enabled: true,
    install: false,
    notifyIfCurrent: false,
    packageName: packageInfo.name,
    registryUrl:
      (packageInfo as Loose).publishConfig?.registry || "https://registry.npmjs.org",
    timeoutMs: 10000
  } satisfies FcaUpdateCheckConfig;

  return { ...fallback, ...(input || {}) };
}

/* ═══════════════════════════════════════════════════════════
   🌐 NPM REGISTRY FETCH
   ═══════════════════════════════════════════════════════════ */

/**
 * Fetch the latest published version of `config.packageName` from the
 * npm registry (HTTP GET `/pkg/latest`).
 */
function fetchLatestVersion(config: FcaUpdateCheckConfig): Promise<string> {
  const url = `${normalizeRegistryUrl(config.registryUrl)}/${encodeURIComponent(
    config.packageName
  )}/latest`;

  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": `ShihabX-FCA/1.0.0 (${config.packageName}-update-check)`
        },
        timeout: config.timeoutMs
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            const payload = JSON.parse(body);
            const version = payload?.version;

            if (!version || typeof version !== "string") {
              reject(new Error("[Shihab X FCA] Invalid version payload from registry"));
              return;
            }

            resolve(version);
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("[Shihab X FCA] Update check timed out"));
    });
    request.on("error", reject);
  });
}

/* ═══════════════════════════════════════════════════════════
   📦 AUTO-INSTALL
   ═══════════════════════════════════════════════════════════ */

/**
 * Install the latest package version using `npm i`.
 * Uses `npm.cmd` on Windows, `npm` elsewhere.
 */
function installLatestPackage(
  config: FcaUpdateCheckConfig,
  latestVersion: string
): Promise<void> {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const dependency = `${config.packageName}@${latestVersion}`;

  return new Promise<void>((resolve, reject) => {
    execFile(
      npmCommand,
      ["i", dependency],
      { cwd: process.cwd() },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve();
      }
    );
  });
}

/* ═══════════════════════════════════════════════════════════
   🚀 MAIN UPDATE CHECK
   ═══════════════════════════════════════════════════════════ */

let inflightCheck: Promise<PackageUpdateCheckResult | null> | null = null;

/**
 * Check for a newer version of the package on the npm registry.
 * Multiple concurrent calls share a single in-flight request.
 *
 * @param input   Full `FcaConfig` or a raw `FcaUpdateCheckConfig`
 * @param logger  Optional logger `(message, type) => void`
 */
export async function checkForPackageUpdate(
  input?: FcaConfig | FcaUpdateCheckConfig,
  logger?: (text: string, type?: string) => void
): Promise<PackageUpdateCheckResult | null> {
  const config = readUpdateConfig(input);

  if (!config.enabled) {
    return null;
  }

  if (inflightCheck) {
    return inflightCheck;
  }

  inflightCheck = (async () => {
    const currentVersion = packageInfo.version;
    const latestVersion = await fetchLatestVersion(config);
    const updateAvailable = compareSemver(latestVersion, currentVersion) > 0;

    /* ─── Already up to date ─── */
    if (!updateAvailable) {
      if (config.notifyIfCurrent) {
        logger?.(
          `[Shihab X FCA] You're already on the latest version (${currentVersion})`,
          "info"
        );
      }
      return {
        packageName: config.packageName,
        currentVersion,
        latestVersion,
        updateAvailable: false,
        installed: false
      };
    }

    /* ─── Update found ─── */
    logger?.(
      `[Shihab X FCA] Update available for ${config.packageName}: ${currentVersion} → ${latestVersion}`,
      "warn"
    );

    if (!config.install) {
      return {
        packageName: config.packageName,
        currentVersion,
        latestVersion,
        updateAvailable: true,
        installed: false
      };
    }

    /* ─── Auto-install ─── */
    logger?.(
      `[Shihab X FCA] Installing ${config.packageName}@${latestVersion}`,
      "info"
    );
    await installLatestPackage(config, latestVersion);
    logger?.(
      `[Shihab X FCA] Installed ${config.packageName}@${latestVersion}. Restart to apply.`,
      "info"
    );

    return {
      packageName: config.packageName,
      currentVersion,
      latestVersion,
      updateAvailable: true,
      installed: true
    };
  })().finally(() => {
    inflightCheck = null;
  });

  return inflightCheck;
}

/* ═══════════════════════════════════════════════════════════
   🎯 CONFIG-DRIVEN WRAPPER
   ═══════════════════════════════════════════════════════════ */

/**
 * Wrapper around `checkForPackageUpdate` that reads from an `FcaConfig`
 * object and safely handles network errors.
 */
export async function runConfiguredUpdateCheck(
  config: FcaConfig,
  logger?: (text: string, type?: string) => void
) {
  try {
    return await checkForPackageUpdate(config, logger);
  } catch (error: Loose) {
    logger?.(
      `[Shihab X FCA] Cannot check for updates: ${
        error && error.message ? error.message : String(error)
      }`,
      "warn"
    );
    return null;
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
