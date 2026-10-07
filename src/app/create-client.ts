/**
 * Shihab X FCA — Client Facade Factory
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Builds a namespaced client facade (`FcaClientFacade`) around the
 * flat legacy API surface. Provides domain-grouped methods:
 *
 *   client.messages.send(...)     instead of   api.sendMessage(...)
 *   client.threads.getInfo(...)   instead of   api.getThreadInfo(...)
 *   client.users.getInfo(...)     instead of   api.getUserInfo(...)
 *   client.realtime.listen(...)   instead of   api.listenMqtt(...)
 *
 * If the API already exposes domain namespaces, they are merged with
 * the fallback bindings so nothing is lost.
 */

import type {
  FcaClientFacade,
  FcaClientNamespace,
  FcaClientNamespaces,
  LegacyApiLike
} from "../types/client";

/* ═══════════════════════════════════════════════════════════
   🛠️ BINDING HELPERS
   ═══════════════════════════════════════════════════════════ */

/**
 * Bind an optional API method to the API object.
 * Returns `undefined` if the method doesn't exist (so it can be
 * filtered out by `compactNamespace`).
 */
function bindOptionalMethod(api: LegacyApiLike, key: string): Loose {
  const candidate = api[key];
  return typeof candidate === "function" ? candidate.bind(api) : undefined;
}

/**
 * Read an optional member off the API object.
 * Returns `undefined` if the member is not present.
 */
function readOptionalMember(api: LegacyApiLike, key: string): Loose {
  return typeof api[key] === "undefined" ? undefined : api[key];
}

/**
 * Bind a "live" method that resolves the target function **at call time**.
 * Useful for methods that get replaced at runtime (e.g. `listenMqtt`
 * after reconnection).
 */
function bindLiveMethod(api: LegacyApiLike, key: string): Loose {
  return (...args: Loose[]) => {
    const candidate = api[key];

    if (typeof candidate !== "function") {
      throw new Error(
        `[Shihab X FCA] API method "${key}" is not available`
      );
    }

    return candidate.apply(api, args);
  };
}

/**
 * Remove `undefined` entries from a namespace object so that
 * `client.messages.send` is not `undefined` when unavailable.
 */
function compactNamespace(
  namespace: Record<string, Loose>
): FcaClientNamespace {
  return Object.fromEntries(
    Object.entries(namespace).filter(([, value]) => value !== undefined)
  ) as FcaClientNamespace;
}

/**
 * Read an existing namespace object off the API (if the FCA runtime
 * already exposes one).
 */
function readNamespace(
  api: LegacyApiLike,
  key: string
): FcaClientNamespace | undefined {
  const value = api[key];
  return value && typeof value === "object"
    ? (value as FcaClientNamespace)
    : undefined;
}

/* ═══════════════════════════════════════════════════════════
   🏗️ FALLBACK NAMESPACES
   ═══════════════════════════════════════════════════════════ */

/**
 * Build the fallback namespaces by binding the flat API's methods
 * into domain-grouped objects.
 *
 * Only methods that actually exist on the API are included.
 */
function createFallbackNamespaces(api: LegacyApiLike): FcaClientNamespaces {
  return {
    /* ─── Messages ─── */
    messages: compactNamespace({
      send: bindOptionalMethod(api, "sendMessage"),
      edit: bindOptionalMethod(api, "editMessage"),
      delete: bindOptionalMethod(api, "deleteMessage"),
      unsend: bindOptionalMethod(api, "unsendMessage"),
      get: bindOptionalMethod(api, "getMessage"),
      markRead: bindOptionalMethod(api, "markAsRead"),
      markReadAll: bindOptionalMethod(api, "markAsReadAll"),
      markSeen: bindOptionalMethod(api, "markAsSeen"),
      markDelivered: bindOptionalMethod(api, "markAsDelivered"),
      typing: bindOptionalMethod(api, "sendTypingIndicator"),
      react: bindOptionalMethod(api, "setMessageReaction"),
      shareContact: bindOptionalMethod(api, "shareContact"),
      getEmojiUrl: bindOptionalMethod(api, "getEmojiUrl"),
      resolvePhotoUrl: bindOptionalMethod(api, "resolvePhotoUrl"),
      uploadAttachment: bindOptionalMethod(api, "uploadAttachment"),
      forwardAttachment: bindOptionalMethod(api, "forwardAttachment")
    }),

    /* ─── Threads ─── */
    threads: compactNamespace({
      createGroup: bindOptionalMethod(api, "createNewGroup"),
      getInfo: bindOptionalMethod(api, "getThreadInfo"),
      getList: bindOptionalMethod(api, "getThreadList"),
      getHistory: bindOptionalMethod(api, "getThreadHistory"),
      getPictures: bindOptionalMethod(api, "getThreadPictures"),
      addUsers: bindOptionalMethod(api, "addUserToGroup"),
      archive: bindOptionalMethod(api, "changeArchivedStatus"),
      removeUser: bindOptionalMethod(api, "removeUserFromGroup"),
      setAdmin: bindOptionalMethod(api, "changeAdminStatus"),
      setImage: bindOptionalMethod(api, "changeGroupImage"),
      setColor: bindOptionalMethod(api, "changeThreadColor"),
      setEmoji: bindOptionalMethod(api, "changeThreadEmoji"),
      setNickname: bindOptionalMethod(api, "changeNickname"),
      createPoll: bindOptionalMethod(api, "createPoll"),
      createThemeAI: bindOptionalMethod(api, "createThemeAI"),
      getThemePictures: bindOptionalMethod(api, "getThemePictures"),
      delete: bindOptionalMethod(api, "deleteThread"),
      colors: readOptionalMember(api, "threadColors"),
      handleMessageRequest: bindOptionalMethod(api, "handleMessageRequest"),
      mute: bindOptionalMethod(api, "muteThread"),
      setTitle: bindOptionalMethod(api, "setTitle"),
      search: bindOptionalMethod(api, "searchForThread")
    }),

    /* ─── Users ─── */
    users: compactNamespace({
      getID: bindOptionalMethod(api, "getUserID"),
      getInfo: bindOptionalMethod(api, "getUserInfo"),
      getInfoV2: bindOptionalMethod(api, "getUserInfoV2"),
      getFriends: bindOptionalMethod(api, "getFriendsList")
    }),

    /* ─── Account ─── */
    account: compactNamespace({
      addExternalModule: bindOptionalMethod(api, "addExternalModule"),
      changeAvatar: bindOptionalMethod(api, "changeAvatar"),
      changeBio: bindOptionalMethod(api, "changeBio"),
      enableAutoSaveAppState: bindOptionalMethod(api, "enableAutoSaveAppState"),
      getCurrentUserID: bindOptionalMethod(api, "getCurrentUserID"),
      handleFriendRequest: bindOptionalMethod(api, "handleFriendRequest"),
      logout: bindOptionalMethod(api, "logout"),
      refreshDtsg: bindOptionalMethod(api, "refreshFb_dtsg"),
      changeBlockedStatus: bindOptionalMethod(api, "changeBlockedStatus"),
      setOptions: bindOptionalMethod(api, "setOptions"),
      setPostReaction: bindOptionalMethod(api, "setPostReaction"),
      unfriend: bindOptionalMethod(api, "unfriend"),
      getAppState: bindOptionalMethod(api, "getAppState"),
      getCookies: bindOptionalMethod(api, "getCookies")
    }),

    /* ─── Realtime ─── */
    realtime: compactNamespace({
      listen: bindLiveMethod(api, "listenMqtt"),
      stop: bindLiveMethod(api, "stopListening"),
      stopAsync: bindLiveMethod(api, "stopListeningAsync"),
      useMiddleware: bindLiveMethod(api, "useMiddleware"),
      removeMiddleware: bindLiveMethod(api, "removeMiddleware"),
      clearMiddleware: bindLiveMethod(api, "clearMiddleware"),
      listMiddleware: bindLiveMethod(api, "listMiddleware"),
      setMiddlewareEnabled: bindLiveMethod(api, "setMiddlewareEnabled")
    }),

    /* ─── HTTP ─── */
    http: compactNamespace({
      get: bindOptionalMethod(api, "httpGet"),
      post: bindOptionalMethod(api, "httpPost"),
      postFormData: bindOptionalMethod(api, "postFormData")
    }),

    /* ─── Scheduler ─── */
    scheduler: compactNamespace(
      (readOptionalMember(api, "scheduler") || {}) as Record<string, Loose>
    )
  };
}

/* ═══════════════════════════════════════════════════════════
   🔀 NAMESPACE MERGE
   ═══════════════════════════════════════════════════════════ */

/**
 * Merge a fallback namespace with an existing (runtime) namespace.
 * Runtime methods take precedence over fallbacks.
 */
function mergeNamespace(
  fallback: FcaClientNamespace,
  existing?: FcaClientNamespace
): FcaClientNamespace {
  return compactNamespace({
    ...fallback,
    ...(existing || {})
  });
}

/* ═══════════════════════════════════════════════════════════
   🏭 CLIENT FACADE FACTORY
   ═══════════════════════════════════════════════════════════ */

/**
 * Build a `FcaClientFacade` from a pre-computed set of namespaces.
 * Use this when you already have namespaces (e.g. from `attachLegacyApiSurface`).
 */
export function createFcaClientFromNamespaces(
  api: LegacyApiLike,
  namespaces: FcaClientNamespaces
): FcaClientFacade {
  return {
    raw: api,
    messages: compactNamespace(namespaces.messages),
    threads: compactNamespace(namespaces.threads),
    users: compactNamespace(namespaces.users),
    account: compactNamespace(namespaces.account),
    realtime: compactNamespace(namespaces.realtime),
    http: compactNamespace(namespaces.http),
    scheduler: compactNamespace(namespaces.scheduler)
  };
}

/**
 * Create a `FcaClientFacade` from a flat API surface.
 *
 * If the API already exposes domain namespaces (`api.messages`,
 * `api.threads`, …), those are merged with the fallback bindings so
 * that any runtime-overridden methods take precedence.
 *
 * @example
 *   const client = createFcaClient(ctx.api);
 *   await client.messages.send("Hi!", threadID);
 *   await client.threads.getInfo(threadID);
 */
export function createFcaClient(api: LegacyApiLike): FcaClientFacade {
  const fallback = createFallbackNamespaces(api);

  return createFcaClientFromNamespaces(api, {
    messages: mergeNamespace(fallback.messages, readNamespace(api, "messages")),
    threads: mergeNamespace(fallback.threads, readNamespace(api, "threads")),
    users: mergeNamespace(fallback.users, readNamespace(api, "users")),
    account: mergeNamespace(fallback.account, readNamespace(api, "account")),
    realtime: mergeNamespace(fallback.realtime, readNamespace(api, "realtime")),
    http: mergeNamespace(fallback.http, readNamespace(api, "http")),
    scheduler: mergeNamespace(fallback.scheduler, readNamespace(api, "scheduler"))
  });
}

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
