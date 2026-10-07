/**
 * Shihab X FCA — Client Facade Registry
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Attaches the namespaced client facade (`FcaClientFacade`) to the
 * flat FCA API object as `api.client`, and mirrors the individual
 * namespaces (`api.messages`, `api.threads`, …) for consumers who
 * prefer direct property access.
 *
 * Existing API members with the same name are preserved — only
 * missing keys are populated.
 */

import {
  createFcaClient,
  createFcaClientFromNamespaces
} from "../app/create-client";
import type {
  FcaClientFacade,
  FcaClientNamespaces,
  LegacyApiLike
} from "../types/client";

/* ═══════════════════════════════════════════════════════════
   🛠️ HELPERS
   ═══════════════════════════════════════════════════════════ */

/**
 * Attach a namespace to the API only if:
 *   • The value is defined
 *   • The API does not already have a member with that name
 *
 * This preserves any runtime overrides the host application may
 * have installed.
 */
function attachNamespace(api: LegacyApiLike, key: string, value: Loose) {
  if (typeof value === "undefined") return;

  if (typeof api[key] === "undefined") {
    api[key] = value;
  }
}

/* ═══════════════════════════════════════════════════════════
   🏭 MAIN — Attach Client Facade
   ═══════════════════════════════════════════════════════════ */

/**
 * Attach the Shihab X FCA client facade to the API.
 *
 * - When `namespaces` is provided, uses the exact namespaces
 *   (typically from `attachLegacyApiSurface`).
 * - Otherwise, builds the facade from the flat API surface.
 *
 * After attachment, consumers can use:
 *
 *   ```typescript
 *   api.client.messages.send("Hello!", threadID);
 *   api.messages.send("Hello!", threadID);          // alias
 *   api.threads.getInfo(threadID);                  // alias
 *   ```
 *
 * @param api        — FCA API object (mutated in place)
 * @param namespaces — Optional pre-computed namespaces
 * @returns The created `FcaClientFacade`
 */
export function attachClientFacade(
  api: LegacyApiLike,
  namespaces?: FcaClientNamespaces
): FcaClientFacade {
  const client = namespaces
    ? createFcaClientFromNamespaces(api, namespaces)
    : createFcaClient(api);

  /* ─── Main facade ─── */
  api.client = client;

  /* ─── Namespace shortcuts ─── */
  attachNamespace(api, "messages", client.messages);
  attachNamespace(api, "threads", client.threads);
  attachNamespace(api, "users", client.users);
  attachNamespace(api, "account", client.account);
  attachNamespace(api, "realtime", client.realtime);
  attachNamespace(api, "http", client.http);
  attachNamespace(api, "scheduler", client.scheduler);

  return client;
}

/* ═══════════════════════════════════════════════════════════
   📌 DEFAULT EXPORT
   ═══════════════════════════════════════════════════════════ */

export default attachClientFacade;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
