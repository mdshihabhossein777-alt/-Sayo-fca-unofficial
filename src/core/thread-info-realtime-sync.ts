/**
 * Shihab X FCA — Thread Info Realtime Sync
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Sync the `getThreadInfo` cache (Thread.data table) with realtime `type: "event"` deltas.
 *
 * - Patch immediately when the payload allows (name, participants, group image,
 *   theme, admins, nickname, approval mode, invite link, …).
 * - When uncertain → set `data: null` so the next `getThreadInfo` call refetches GraphQL.
 */

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

type ThreadModel = {
  findOne: (opts: Loose) => Promise<Loose | null>;
  update: (values: Loose, opts: Loose) => Promise<Loose>;
};

/* ═══════════════════════════════════════════════════════════
   🛠️ PARSING HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Parse the `data` column (may be JSON string, object, or null). */
function parseRowData(raw: Loose): Record<string, Loose> | null {
  if (raw == null) return null;

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, Loose>;
  }

  if (typeof raw === "string") {
    try {
      const o = JSON.parse(raw) as Loose;
      return typeof o === "object" && o !== null
        ? (o as Record<string, Loose>)
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

/** Normalize a participant entry (string, number, or `{ id }`) to a string ID. */
function normalizeParticipantId(v: Loose): string {
  if (v == null) return "";
  if (typeof v === "object" && v && "id" in v) {
    return String((v as { id: Loose }).id);
  }
  return String(v);
}

/** Extract a flat list of participant IDs from a raw array. */
function normalizeAddedParticipants(raw: Loose): string[] {
  if (!raw || !Array.isArray(raw)) return [];

  const out: string[] = [];
  for (const x of raw) {
    const id = normalizeParticipantId(x);
    if (id) out.push(id);
  }
  return out;
}

/** Merge `logMessageData` + `eventData` (some sources use `eventData`). */
function mergedEventData(ev: Loose): Record<string, Loose> {
  const a = (ev.logMessageData || {}) as Record<string, Loose>;
  const b = (ev.eventData || {}) as Record<string, Loose>;
  return { ...b, ...a };
}

/** Force cache invalidation for a thread row. */
async function invalidateThreadCacheRow(
  Thread: ThreadModel,
  threadID: string
): Promise<void> {
  await Thread.update({ data: null }, { where: { threadID } });
}

/* ═══════════════════════════════════════════════════════════
   🧑 PARTICIPANT HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Map an entry from `getUserInfo` / `UserInfoEntry` to `ThreadInfoParticipant`. */
function toThreadParticipant(
  entry: Loose,
  idFallback: string
): Record<string, Loose> {
  const id = String(entry?.id ?? idFallback ?? "");
  return {
    id,
    name: entry?.name ?? null,
    firstName: entry?.firstName ?? null,
    vanity: entry?.vanity ?? null,
    url: entry?.profileUrl ?? entry?.url ?? null,
    thumbSrc: entry?.thumbSrc ?? null,
    profileUrl: entry?.profileUrl ?? null,
    gender: entry?.gender ?? null,
    type: entry?.type ?? null,
    isFriend: Boolean(entry?.isFriend),
    isBirthday: Boolean(entry?.isBirthday)
  };
}

/** Minimal placeholder participant — used when info is missing. */
function minimalParticipant(id: string): Record<string, Loose> {
  return {
    id,
    name: null,
    firstName: null,
    vanity: null,
    url: null,
    thumbSrc: null,
    profileUrl: null,
    gender: null,
    type: null,
    isFriend: false,
    isBirthday: false
  };
}

/**
 * Call `api.getUserInfo(ids)` and merge fresh user info into `info.userInfo`,
 * preserving the previous entry when a specific ID is missing in the response.
 */
async function fetchAndMergeParticipants(
  api: Loose | undefined,
  info: Record<string, Loose>,
  idsToFetch: string[],
  log?: (msg: string, level?: string) => void
): Promise<boolean> {
  const uniq = [...new Set(idsToFetch.map(String).filter(Boolean))];

  if (!uniq.length || !api || typeof api.getUserInfo !== "function") {
    return false;
  }

  try {
    const map = (await api.getUserInfo(uniq)) as Record<string, Loose>;
    if (!map || typeof map !== "object") return false;

    /* Snapshot previous user info by ID */
    const prev = new Map<string, Loose>();
    for (const u of Array.isArray(info.userInfo) ? info.userInfo : []) {
      if (u?.id != null) prev.set(String(u.id), u as Loose);
    }

    /* Update from fresh fetch */
    for (const id of uniq) {
      const entry = map[id];
      if (entry && typeof entry === "object") {
        prev.set(id, toThreadParticipant(entry, id));
      }
    }

    /* Rebuild `userInfo` in `participantIDs` order */
    const pids = (info.participantIDs || []).map(String);
    info.userInfo = pids.map((pid: string) => {
      const fresh = map[pid];
      if (fresh && typeof fresh === "object") {
        return toThreadParticipant(fresh, pid);
      }
      const old = prev.get(pid);
      if (old) return old;
      return minimalParticipant(pid);
    });

    return true;
  } catch (e: Loose) {
    const msg = e && e.message ? e.message : String(e);
    log?.(`Shihab X FCA · thread-info-realtime-sync getUserInfo: ${msg}`, "warn");
    return false;
  }
}

/** Some deltas ship a full participant list — treat it as authoritative. */
function syncParticipantListFromEvent(
  ev: Loose,
  info: Record<string, Loose>
): boolean {
  const p = ev.participantIDs;
  if (!Array.isArray(p) || p.length === 0) return false;

  const next = p.map((x) => String(x)).filter(Boolean);
  if (next.length === 0) return false;

  const prev = JSON.stringify((info.participantIDs || []).map(String).sort());
  const n = JSON.stringify([...next].sort());
  if (prev === n) return false;

  info.participantIDs = next;

  if (Array.isArray(info.userInfo)) {
    const set = new Set(next);
    info.userInfo = info.userInfo.filter((u: Loose) => set.has(String(u?.id)));
  }
  return true;
}

/* ═══════════════════════════════════════════════════════════
   🎨 PATCHERS — THEME / ADMIN / NICKNAME / APPROVAL / INVITE
   ═══════════════════════════════════════════════════════════ */

const MAX_THEME_WALK_DEPTH = 10;

/** Best-effort theme patch — walks nested objects looking for color/emoji fields. */
function tryPatchThemeFromUntyped(
  data: Loose,
  info: Record<string, Loose>
): boolean {
  if (!data || typeof data !== "object") return false;

  let mutated = false;
  const stack: Array<{ obj: Record<string, Loose>; depth: number }> = [
    { obj: data as Record<string, Loose>, depth: 0 }
  ];
  const seen = new Set<Loose>();

  while (stack.length) {
    const { obj, depth } = stack.pop()!;
    if (!obj || seen.has(obj)) continue;
    seen.add(obj);
    if (depth > MAX_THEME_WALK_DEPTH) continue;

    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const kl = k.toLowerCase();

      if (typeof v === "string") {
        /* Emoji field */
        if (kl.includes("emoji") && !kl.includes("unicode")) {
          info.emoji = v;
          mutated = true;
        }

        /* Color field (hex, 6 or 8 chars) */
        if (
          kl.includes("bubble_color") ||
          kl.includes("theme_color") ||
          kl.includes("outgoing_bubble") ||
          kl === "gradient_color" ||
          kl === "accessory_color"
        ) {
          const hex = v.replace(/^#/, "").trim();
          if (/^[0-9a-f]{6,12}$/i.test(hex)) {
            info.color = hex.length >= 8 ? hex.slice(0, 8) : hex;
            mutated = true;
          }
        }
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        stack.push({ obj: v as Record<string, Loose>, depth: depth + 1 });
      }
    }
  }
  return mutated;
}

/** Best-effort admin list patch — walks nested objects looking for admin arrays. */
function tryPatchAdminsFromUntyped(
  data: Loose,
  info: Record<string, Loose>
): boolean {
  if (!data || typeof data !== "object") return false;

  const tryArray = (arr: Loose): boolean => {
    if (!Array.isArray(arr) || !arr.length) return false;
    const ids = arr.map(normalizeParticipantId).filter(Boolean);
    if (!ids.length) return false;
    info.adminIDs = ids;
    return true;
  };

  /* Fast path — top-level "admin*" arrays */
  const o = data as Record<string, Loose>;
  for (const key of Object.keys(o)) {
    const kl = key.toLowerCase();
    if (kl.includes("admin") && Array.isArray(o[key])) {
      if (tryArray(o[key])) return true;
    }
  }

  /* Deep walk */
  let mutated = false;
  const walk = (node: Loose, depth: number): void => {
    if (!node || typeof node !== "object" || depth > 8) return;

    if (Array.isArray(node)) {
      if (
        node.length &&
        node.every((x) => typeof x === "string" || typeof x === "number")
      ) {
        if (tryArray(node)) mutated = true;
      }
      node.forEach((x) => walk(x, depth + 1));
      return;
    }

    for (const k of Object.keys(node as object)) {
      const kl = k.toLowerCase();
      const v = (node as Record<string, Loose>)[k];
      if (
        kl.includes("thread_admin") ||
        kl === "admin_ids" ||
        kl === "admins"
      ) {
        if (tryArray(v)) mutated = true;
      }
      if (v && typeof v === "object") walk(v, depth + 1);
    }
  };
  walk(data, 0);
  return mutated;
}

/** Patch nickname for a participant. */
function tryPatchNickname(
  data: Loose,
  info: Record<string, Loose>
): boolean {
  if (!data || typeof data !== "object") return false;

  const o = data as Record<string, Loose>;
  const pid =
    o.participant_id ??
    o.participantId ??
    o.user_id ??
    o.actor_id ??
    o.target_id;
  const nn = o.nickname ?? o.new_nickname ?? o.name;

  if (pid == null || nn == null || typeof nn !== "string" || !nn.trim()) {
    return false;
  }

  if (!info.nicknames || typeof info.nicknames !== "object") {
    info.nicknames = {};
  }
  (info.nicknames as Record<string, string>)[String(pid)] = nn.trim();
  return true;
}

/** Patch approval mode flag. */
function tryPatchApprovalMode(
  data: Loose,
  info: Record<string, Loose>
): boolean {
  if (!data || typeof data !== "object") return false;

  const o = data as Record<string, Loose>;
  const keys = ["approval_mode", "approvalMode", "is_approval_mode_enabled"];

  for (const k of keys) {
    if (typeof o[k] === "boolean") {
      info.approvalMode = o[k];
      return true;
    }
    if (o[k] === "1" || o[k] === "0" || o[k] === 1 || o[k] === 0) {
      info.approvalMode = Boolean(Number(o[k]));
      return true;
    }
  }
  return false;
}

/** Patch invite link / joinable mode. */
function tryPatchInviteLink(
  data: Loose,
  info: Record<string, Loose>
): boolean {
  if (!data || typeof data !== "object") return false;

  const o = data as Record<string, Loose>;
  const jm = o.joinable_mode ?? o.joinableMode;
  if (!jm || typeof jm !== "object") return false;

  const mode = (jm as Record<string, Loose>).mode;
  const link = (jm as Record<string, Loose>).link;

  if (!info.inviteLink || typeof info.inviteLink !== "object") {
    info.inviteLink = {};
  }
  const il = info.inviteLink as Record<string, Loose>;
  if (mode !== undefined) il.enable = mode === 1 || mode === true;
  if (typeof link === "string") il.link = link;
  return true;
}

/* ═══════════════════════════════════════════════════════════
   🎯 MAIN — Apply a single realtime event to the cache
   ═══════════════════════════════════════════════════════════ */

export async function applyThreadInfoRealtimeEvent(
  Thread: ThreadModel,
  threadID: string,
  ev: Loose,
  log?: (msg: string, level?: string) => void,
  api?: Loose
): Promise<void> {
  if (!Thread || !threadID || !ev || ev.type !== "event") {
    return;
  }

  const logType =
    ev.logMessageType != null ? String(ev.logMessageType) : "";
  const data = mergedEventData(ev);

  try {
    const row = await Thread.findOne({ where: { threadID } });
    const rawData =
      row && typeof row.get === "function" ? row.get("data") : row?.data;

    const info = parseRowData(rawData);

    /* No cached data → invalidate and bail */
    if (!row || !info) {
      await invalidateThreadCacheRow(Thread, threadID);
      return;
    }

    let mutated = false;

    /* Participant list from event overrides cache */
    if (syncParticipantListFromEvent(ev, info)) mutated = true;

    switch (logType) {
      case "log:thread-name": {
        const name = data.name != null ? String(data.name) : "";
        if (name) {
          info.threadName = name;
          info.name = name;
          mutated = true;
        }
        break;
      }

      case "log:unsubscribe": {
        const left = normalizeParticipantId(data.leftParticipantFbId);
        if (left) {
          if (Array.isArray(info.participantIDs)) {
            info.participantIDs = info.participantIDs
              .map(String)
              .filter((id) => id !== left);
            mutated = true;
          }
          if (Array.isArray(info.userInfo)) {
            info.userInfo = info.userInfo.filter(
              (u: Loose) => String(u?.id) !== left
            );
            mutated = true;
          }
        }
        if (
          mutated &&
          Array.isArray(info.participantIDs) &&
          info.participantIDs.length
        ) {
          const ok = await fetchAndMergeParticipants(
            api,
            info,
            info.participantIDs.map(String),
            log
          );
          if (ok) mutated = true;
        }
        break;
      }

      case "log:subscribe": {
        const added = normalizeAddedParticipants(data.addedParticipants);
        if (added.length) {
          if (!Array.isArray(info.participantIDs)) info.participantIDs = [];
          const set = new Set(info.participantIDs.map(String));
          for (const id of added) {
            if (!set.has(id)) {
              info.participantIDs.push(id);
              set.add(id);
              mutated = true;
            }
          }
          const ok = await fetchAndMergeParticipants(api, info, added, log);
          if (ok) mutated = true;
        }
        break;
      }

      case "log:thread-icon":
      case "log:thread-image": {
        const img = data.image as Record<string, Loose> | undefined;
        const url = img && (img.url || img.uri);
        if (url) {
          info.imageSrc = String(url);
          mutated = true;
        }
        break;
      }

      case "log:thread-color": {
        if (tryPatchThemeFromUntyped(data, info)) mutated = true;
        break;
      }

      case "log:thread-admins": {
        if (tryPatchAdminsFromUntyped(data, info)) mutated = true;
        break;
      }

      case "log:user-nickname": {
        if (tryPatchNickname(data, info)) mutated = true;
        break;
      }

      case "log:thread-approval-mode": {
        if (tryPatchApprovalMode(data, info)) mutated = true;
        break;
      }

      case "log:link-status": {
        if (tryPatchInviteLink(data, info)) mutated = true;
        break;
      }

      case "log:approval-queue": {
        const q = data.approvalQueue;
        if (q && typeof q === "object") {
          const cur = Array.isArray(info.approvalQueue)
            ? [...info.approvalQueue]
            : [];
          cur.push(q as Loose);
          info.approvalQueue = cur;
          mutated = true;
        }
        break;
      }

      /* Informational only — no cache patch needed */
      case "log:magic-words":
      case "log:thread-poll":
      case "log:thread-pinned":
      case "log:unpin-message":
      case "log:thread-call":
      case "log:user-location":
        break;

      default: {
        /* Unknown event — try every patcher as best-effort */
        if (tryPatchThemeFromUntyped(data, info)) mutated = true;
        if (tryPatchAdminsFromUntyped(data, info)) mutated = true;
        if (tryPatchNickname(data, info)) mutated = true;
        if (tryPatchApprovalMode(data, info)) mutated = true;
        if (tryPatchInviteLink(data, info)) mutated = true;
        break;
      }
    }

    /* Persist or invalidate */
    if (mutated && typeof row.update === "function") {
      await row.update({ data: info });
    } else {
      await invalidateThreadCacheRow(Thread, threadID);
    }
  } catch (e: Loose) {
    const msg = e && e.message ? e.message : String(e);
    log?.(`Shihab X FCA · thread-info-realtime-sync: ${msg}`, "warn");
  }
}

/* ═══════════════════════════════════════════════════════════
   🔌 ATTACH — Hook the sync handler onto the FCA context
   ═══════════════════════════════════════════════════════════ */

/**
 * Attach the sync handler to `ctx` after login (needs the Sequelize `Thread`
 * model). When no database is available, this is a no-op and returns `false`.
 */
export function attachThreadInfoRealtimeSync(
  ctx: Loose,
  models: Loose,
  logger: (msg: string, level?: string) => void,
  api?: Loose
): boolean {
  const Thread = models?.Thread as ThreadModel | undefined;
  if (!Thread || typeof Thread.findOne !== "function") {
    return false;
  }

  const resolveApi = () => api || ctx.api;

  ctx._syncThreadInfoFromEvent = (ev: Loose) => {
    if (!ev || ev.type !== "event" || ev.threadID == null) {
      return;
    }
    const tid = String(ev.threadID);
    void applyThreadInfoRealtimeEvent(Thread, tid, ev, logger, resolveApi());
  };

  return true;
}

/* ═══════════════════════════════════════════════════════════
   📌 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
