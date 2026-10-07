/**
 * Shihab X FCA — Legacy API Surface Attacher
 * Forked from @dongdev/fca-unofficial
 *
 * ─────────────────────────────────────────────
 * 🧬 Original Author : DongDev (Donix)
 * 🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
 * 📜 License         : Apache-2.0
 * ─────────────────────────────────────────────
 *
 * Builds the complete flat "legacy" API surface (`api.sendMessage`,
 * `api.getThreadInfo`, …) plus namespaced domains (`messages`, `threads`,
 * `users`, `account`, `realtime`, `http`, `scheduler`) and attaches them
 * to the FCA API object.
 *
 * Domains are created via factory functions under `../domains/*`.
 * Duplicate keys on the API are skipped to preserve runtime overrides.
 */

import { createAccountDomain } from "../domains/account";
import { createHttpDomain } from "../domains/http";
import { createMessagesDomain } from "../domains/messages";
import { createUploadAttachmentCommand } from "../domains/messages/commands/upload-attachment";
import { createRealtimeListener } from "../domains/realtime/listener";
import { createRealtimeMiddlewareSystem } from "../domains/realtime/middleware";
import { createSchedulerDomain } from "../domains/scheduler";
import { createThreadsDomain } from "../domains/threads";
import { createUsersDomain } from "../domains/users";
import type { FcaClientNamespace, FcaClientNamespaces } from "../types/client";

import { EventEmitter } from "node:events";
import mqtt from "mqtt";
import WebSocket from "ws";
import HttpsProxyAgent from "https-proxy-agent";
import legacyLog from "../func/logAdapter";
import runtimeLogger from "../func/logger";
import createEmitAuth from "../domains/realtime/emit-auth";
import createParseDelta from "../domains/realtime/parse-delta";
import createGetSeqID from "../transport/realtime/get-seq-id";
import createListenMqtt from "../transport/realtime/connect-mqtt";
import getTaskResponseData from "../transport/realtime/task-response";
import streamMod from "../transport/realtime/stream";
import { topics } from "../transport/realtime/topics";
import { isReadableStream, BRAND } from "../utils/constants";
import { parseAndCheckLogin } from "../utils/client";
import formatMod from "../utils/format";

/* ═══════════════════════════════════════════════════════════
   🎯 TYPES
   ═══════════════════════════════════════════════════════════ */

export interface LegacyApiAttachResult {
  loaded: number;
  skipped: number;
  namespaces: FcaClientNamespaces;
}

/* ═══════════════════════════════════════════════════════════
   🔧 MODULE PULLS
   ═══════════════════════════════════════════════════════════ */

const { buildProxy, buildStream } = streamMod;

const {
  generateOfflineThreadingID,
  generateTimestampRelative,
  generateThreadingID,
  getCurrentTimestamp
} = formatMod;

/* ═══════════════════════════════════════════════════════════
   📝 LOG HELPERS
   ═══════════════════════════════════════════════════════════ */

function createUploadLogger() {
  return {
    info: (message: string) => legacyLog.info(message),
    warn: (message: string) => legacyLog.warn(message),
    error: (message: string) => legacyLog.error(message)
  };
}

function logError(scope: string, error: Loose) {
  legacyLog.error(scope, error);
}

function logInfo(scope: string, message: string) {
  legacyLog.info(scope, message);
}

/* ═══════════════════════════════════════════════════════════
   🛠️ NAMESPACE HELPERS
   ═══════════════════════════════════════════════════════════ */

/** Remove `undefined` entries from a namespace object. */
function compactNamespace(namespace: Record<string, Loose>): FcaClientNamespace {
  return Object.fromEntries(
    Object.entries(namespace).filter(([, value]) => typeof value !== "undefined")
  ) as FcaClientNamespace;
}

/**
 * Bind a "live" API method that resolves the target function at call
 * time — useful for methods that get replaced at runtime.
 */
function bindLiveMethod(api: Record<string, Loose>, key: string) {
  return (...args: Loose[]) => {
    const candidate = api[key];

    if (typeof candidate !== "function") {
      throw new Error(`[${BRAND.name}] API method "${key}" is not available`);
    }

    return candidate.apply(api, args);
  };
}

/* ═══════════════════════════════════════════════════════════
   📡 REALTIME LISTENER FACTORY
   ═══════════════════════════════════════════════════════════ */

function createLegacyListenMqttFactory(
  logger: (text: string, type?: string) => void
) {
  const parseDelta = createParseDelta({ parseAndCheckLogin });
  const emitAuth = createEmitAuth({ logger });

  const listenMqttCore = createListenMqtt({
    WebSocket,
    mqtt,
    HttpsProxyAgent,
    buildStream,
    buildProxy,
    topics,
    parseDelta,
    getTaskResponseData,
    logger,
    emitAuth
  });

  const getSeqIDFactory = createGetSeqID({
    listenMqtt: listenMqttCore,
    logger,
    emitAuth
  });

  return createRealtimeListener({
    EventEmitter,
    logger,
    emitAuth,
    createMiddlewareSystem: () => createRealtimeMiddlewareSystem(logger),
    topics,
    listenMqttCore,
    getSeqIDFactory
  });
}

/* ═══════════════════════════════════════════════════════════
   🚀 MAIN — Attach Legacy API Surface
   ═══════════════════════════════════════════════════════════ */

/**
 * Attach the full legacy API surface + namespaced domains to the
 * FCA API object.
 *
 * @param api         — The FCA API object (mutated in place)
 * @param defaultFuncs — Low-level HTTP helpers
 * @param ctx         — FCA context
 * @param logger      — Optional logger (defaults to Shihab X logger)
 * @returns `{ loaded, skipped, namespaces }`
 */
export function attachLegacyApiSurface(
  api: Record<string, Loose>,
  defaultFuncs: Loose,
  ctx: Loose,
  logger: (text: string, type?: string) => void = runtimeLogger
): LegacyApiAttachResult {
  const uploadAttachment = createUploadAttachmentCommand({
    ctx,
    logger: createUploadLogger(),
    logError
  });

  /* ═══════════════════════════════════════════════════════
     💬 MESSAGES DOMAIN
     ═══════════════════════════════════════════════════════ */
  const messages = createMessagesDomain({
    send: {
      ctx,
      uploadAttachment,
      generateOfflineThreadingID,
      isReadableStream,
      logError
    },
    markRead: { defaultFuncs, ctx, logError },
    typing: { ctx, logError },
    markSeen: { defaultFuncs, ctx, logError },
    markDelivered: { defaultFuncs, ctx, logError },
    markReadAll: { defaultFuncs, ctx, logError },
    reaction: { ctx, generateOfflineThreadingID, getCurrentTimestamp, logError },
    uploadAttachment: { ctx, logger: createUploadLogger(), logError },
    edit: { ctx, generateOfflineThreadingID, logError },
    delete: { ctx, generateOfflineThreadingID, logError },
    unsend: { ctx, generateOfflineThreadingID, logError },
    forwardAttachment: { ctx, generateOfflineThreadingID, logError },
    shareContact: { ctx, generateOfflineThreadingID, logError },
    threadColor: { ctx, generateOfflineThreadingID, logError },
    threadEmoji: { defaultFuncs, ctx, generateOfflineThreadingID, logError },
    get: { defaultFuncs, ctx, logError },
    photoUrl: { defaultFuncs, ctx, logError }
  }) as Record<string, Loose>;

  /* ═══════════════════════════════════════════════════════
     🧵 THREADS DOMAIN
     ═══════════════════════════════════════════════════════ */
  const threads = createThreadsDomain({
    info: { defaultFuncs, api, ctx, logError },
    list: { defaultFuncs, ctx, logError },
    history: { defaultFuncs, ctx, logError },
    pictures: { defaultFuncs, ctx, logError },
    color: { ctx, generateOfflineThreadingID, logError },
    emoji: { defaultFuncs, ctx, generateOfflineThreadingID, logError },
    mute: { defaultFuncs, ctx, logError },
    archive: { defaultFuncs, ctx, logError },
    addUsers: { ctx, generateOfflineThreadingID, logError },
    removeUser: { ctx, generateOfflineThreadingID, logError },
    adminStatus: { ctx, generateOfflineThreadingID, logError },
    groupImage: { defaultFuncs, ctx, generateOfflineThreadingID, logError },
    nickname: { ctx, generateOfflineThreadingID, logError },
    createGroup: { defaultFuncs, ctx, logError },
    createPoll: { ctx, generateOfflineThreadingID, logError },
    createThemeAI: { defaultFuncs, ctx, logError },
    messageRequest: { defaultFuncs, ctx, logError },
    deleteThread: { defaultFuncs, ctx, logError },
    title: {
      defaultFuncs,
      ctx,
      generateOfflineThreadingID,
      generateTimestampRelative,
      generateThreadingID,
      logError
    },
    search: { defaultFuncs, ctx, logError },
    themePictures: { defaultFuncs, ctx, logError }
  }) as Record<string, Loose>;

  /* ═══════════════════════════════════════════════════════
     👤 USERS DOMAIN
     ═══════════════════════════════════════════════════════ */
  const users = createUsersDomain({
    info: { defaultFuncs, api, ctx, logger, logError },
    infoV2: { defaultFuncs, ctx, logger },
    idLookup: { defaultFuncs, ctx, logError },
    friendsList: { defaultFuncs, ctx, logError }
  }) as Record<string, Loose>;

  /* ═══════════════════════════════════════════════════════
     ⚙️ ACCOUNT DOMAIN
     ═══════════════════════════════════════════════════════ */
  const account = createAccountDomain({
    addExternalModule: { defaultFuncs, api, ctx },
    currentUserId: { ctx },
    enableAutoSaveAppState: {
      api: { getAppState: () => api.getAppState() },
      ctx,
      logger
    },
    logout: { defaultFuncs, ctx, logInfo, logError },
    refreshFbDtsg: { ctx },
    changeAvatar: {
      defaultFuncs,
      ctx,
      isReadableStream: isReadableStream as (
        value: Loose
      ) => value is NodeJS.ReadableStream,
      logError
    },
    changeBio: { defaultFuncs, ctx, logError },
    handleFriendRequest: { defaultFuncs, ctx, logError },
    unfriend: { defaultFuncs, ctx, logError },
    setPostReaction: { defaultFuncs, ctx, logError },
    changeBlockedStatus: { defaultFuncs, ctx, logError }
  }) as Record<string, Loose>;

  /* ═══════════════════════════════════════════════════════
     🌐 HTTP DOMAIN
     ═══════════════════════════════════════════════════════ */
  const http = createHttpDomain({
    get: { defaultFuncs, ctx },
    post: { defaultFuncs, ctx },
    postFormData: { defaultFuncs, ctx, logError }
  }) as Record<string, Loose>;

  /* ═══════════════════════════════════════════════════════
     📡 REALTIME LISTENER
     ═══════════════════════════════════════════════════════ */
  const attachRealtimeListener = createLegacyListenMqttFactory(logger);
  const listenMqtt = attachRealtimeListener(defaultFuncs, api, ctx);

  /* ═══════════════════════════════════════════════════════
     ⏰ SCHEDULER DOMAIN
     ═══════════════════════════════════════════════════════ */
  if (!ctx._scheduler) {
    ctx._scheduler = createSchedulerDomain({
      sendMessage: (...args: Loose[]) => api.sendMessage(...args),
      logger
    });
  }

  /* ═══════════════════════════════════════════════════════
     🔗 FLAT LEGACY SURFACE
     ═══════════════════════════════════════════════════════ */
  const legacySurface: Record<string, Loose> = {
    /* ─── Account ─── */
    addExternalModule: account.addExternalModule,
    changeAvatar: account.changeAvatar,
    changeBio: account.changeBio,
    changeBlockedStatus: account.changeBlockedStatus,
    enableAutoSaveAppState: account.enableAutoSaveAppState,
    getCurrentUserID: account.getCurrentUserID,
    handleFriendRequest: account.handleFriendRequest,
    logout: account.logout,
    refreshFb_dtsg: account.refreshFb_dtsg,
    setPostReaction: account.setPostReaction,
    unfriend: account.unfriend,

    /* ─── HTTP ─── */
    httpGet: http.get,
    httpPost: http.post,
    postFormData: http.postFormData,

    /* ─── Threads ─── */
    addUserToGroup: threads.addUsers,
    changeAdminStatus: threads.setAdmin,
    changeArchivedStatus: threads.archive,
    changeGroupImage: threads.setImage,
    changeNickname: threads.setNickname,
    changeThreadColor: threads.setColor,
    changeThreadEmoji: threads.setEmoji,
    createNewGroup: threads.createGroup,
    createPoll: threads.createPoll,
    createThemeAI: threads.createThemeAI,
    deleteThread: threads.delete,
    getThreadHistory: threads.getHistory,
    getThreadInfo: threads.getInfo,
    getThreadList: threads.getList,
    getThreadPictures: threads.getPictures,
    getThemePictures: threads.getThemePictures,
    handleMessageRequest: threads.handleMessageRequest,
    muteThread: threads.mute,
    removeUserFromGroup: threads.removeUser,
    searchForThread: threads.search,
    setTitle: threads.setTitle,
    threadColors: threads.getColors ? threads.getColors() : undefined,

    /* ─── Messages ─── */
    deleteMessage: messages.delete,
    editMessage: messages.edit,
    forwardAttachment: messages.forwardAttachment,
    getEmojiUrl: messages.getEmojiUrl,
    getMessage: messages.get,
    markAsDelivered: messages.markDelivered,
    markAsRead: messages.markRead,
    markAsReadAll: messages.markReadAll,
    markAsSeen: messages.markSeen,
    resolvePhotoUrl: messages.resolvePhotoUrl,
    sendMessage: messages.send,
    sendTypingIndicator: messages.typing,
    setMessageReaction: messages.react,
    shareContact: messages.shareContact,
    unsendMessage: messages.unsend,
    uploadAttachment: messages.uploadAttachment,

    /* ─── Users ─── */
    getFriendsList: users.getFriends,
    getUserID: users.getID,
    getUserInfo: users.getInfo,
    getUserInfoV2: users.getInfoV2,

    /* ─── Realtime & Scheduler ─── */
    listenMqtt,
    scheduler: ctx._scheduler
  };

  /* ═══════════════════════════════════════════════════════
     🗂️ NAMESPACED DOMAINS
     ═══════════════════════════════════════════════════════ */
  const namespaces: FcaClientNamespaces = {
    messages: compactNamespace({
      send: messages.send,
      edit: messages.edit,
      delete: messages.delete,
      unsend: messages.unsend,
      get: messages.get,
      markRead: messages.markRead,
      markReadAll: messages.markReadAll,
      markSeen: messages.markSeen,
      markDelivered: messages.markDelivered,
      typing: messages.typing,
      react: messages.react,
      shareContact: messages.shareContact,
      getEmojiUrl: messages.getEmojiUrl,
      resolvePhotoUrl: messages.resolvePhotoUrl,
      uploadAttachment: messages.uploadAttachment,
      forwardAttachment: messages.forwardAttachment
    }),

    threads: compactNamespace({
      createGroup: threads.createGroup,
      getInfo: threads.getInfo,
      getList: threads.getList,
      getHistory: threads.getHistory,
      getPictures: threads.getPictures,
      addUsers: threads.addUsers,
      archive: threads.archive,
      removeUser: threads.removeUser,
      setAdmin: threads.setAdmin,
      setImage: threads.setImage,
      setColor: threads.setColor,
      setEmoji: threads.setEmoji,
      setNickname: threads.setNickname,
      createPoll: threads.createPoll,
      createThemeAI: threads.createThemeAI,
      getThemePictures: threads.getThemePictures,
      delete: threads.delete,
      colors: threads.getColors ? threads.getColors() : undefined,
      handleMessageRequest: threads.handleMessageRequest,
      mute: threads.mute,
      setTitle: threads.setTitle,
      search: threads.search
    }),

    users: compactNamespace({
      getID: users.getID,
      getInfo: users.getInfo,
      getInfoV2: users.getInfoV2,
      getFriends: users.getFriends
    }),

    account: compactNamespace({
      addExternalModule: account.addExternalModule,
      changeAvatar: account.changeAvatar,
      changeBio: account.changeBio,
      enableAutoSaveAppState: account.enableAutoSaveAppState,
      getCurrentUserID: account.getCurrentUserID,
      handleFriendRequest: account.handleFriendRequest,
      logout: account.logout,
      refreshDtsg: account.refreshFb_dtsg,
      changeBlockedStatus: account.changeBlockedStatus,
      setOptions: api.setOptions,
      setPostReaction: account.setPostReaction,
      unfriend: account.unfriend,
      getAppState: api.getAppState,
      getCookies: api.getCookies
    }),

    realtime: compactNamespace({
      listen: listenMqtt,
      stop: bindLiveMethod(api, "stopListening"),
      stopAsync: bindLiveMethod(api, "stopListeningAsync"),
      useMiddleware: bindLiveMethod(api, "useMiddleware"),
      removeMiddleware: bindLiveMethod(api, "removeMiddleware"),
      clearMiddleware: bindLiveMethod(api, "clearMiddleware"),
      listMiddleware: bindLiveMethod(api, "listMiddleware"),
      setMiddlewareEnabled: bindLiveMethod(api, "setMiddlewareEnabled")
    }),

    http: compactNamespace({
      get: http.get,
      post: http.post,
      postFormData: http.postFormData
    }),

    scheduler: compactNamespace(
      (ctx._scheduler || {}) as Record<string, Loose>
    )
  };

  /* ═══════════════════════════════════════════════════════
     📥 ATTACH — Skip duplicates, count loaded/skipped
     ═══════════════════════════════════════════════════════ */
  let loaded = 0;
  let skipped = 0;

  for (const [key, value] of Object.entries(legacySurface)) {
    if (typeof value === "undefined") {
      skipped += 1;
      continue;
    }

    if (typeof api[key] !== "undefined") {
      skipped += 1;
      continue;
    }

    api[key] = value;
    loaded += 1;
  }

  return { loaded, skipped, namespaces };
}

/* ═══════════════════════════════════════════════════════════
   📌 DEFAULT EXPORT
   ═══════════════════════════════════════════════════════════ */

export default attachLegacyApiSurface;

/* ═══════════════════════════════════════════════════════════
   📖 CREDITS
   ─────────────────────────────────────────────
   🎨 Fork Maintainer : Shihab X (mdshihabhosein777-alt)
   🧬 Original Author : DongDev (Donix)
   📦 Original Project: @dongdev/fca-unofficial
   📜 License         : Apache-2.0
   ═══════════════════════════════════════════════════════════ */
