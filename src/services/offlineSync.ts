import { doc, setDoc, deleteDoc, waitForPendingWrites } from 'firebase/firestore';
import { db } from '../firebase';

const OFFLINE_QUEUE_KEY = 'dip_bhola_offline_queue_v1';

export interface OfflineQueuedWrite {
  docId: string;
  collectionName: string;
  op: 'set' | 'delete';
  merge?: boolean;
  data?: Record<string, any>;
  queuedAt: string;
}

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  pendingDocIds: string[];
  lastAutoSyncedCount: number;
  lastSyncedAt: string | null;
}

/**
 * Recursively removes keys with `undefined` values (and transient `_pendingSync` markers)
 * so Firestore `setDoc` never throws `Unsupported field value: undefined`.
 */
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value as Record<string, any>)) {
      if (val !== undefined && key !== '_pendingSync') {
        out[key] = stripUndefined(val);
      }
    }
    return out as T;
  }
  return value;
}

function readQueue(): OfflineQueuedWrite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineQueuedWrite[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Offline queue storage error:', e);
  }
}

export function getOfflineQueue(): OfflineQueuedWrite[] {
  return readQueue();
}

export function getOfflineQueuedDocsForCollection<T extends { id: string }>(
  collectionName: string
): Array<T & { _pendingSync: boolean }> {
  return readQueue()
    .filter((item) => item.collectionName === collectionName && item.op === 'set' && item.data)
    .map((item) => ({
      ...(item.data as T),
      id: item.docId,
      _pendingSync: true
    }));
}

export function getOfflineDeletedIdsForCollection(collectionName: string): Set<string> {
  return new Set(
    readQueue()
      .filter((item) => item.collectionName === collectionName && item.op === 'delete')
      .map((item) => item.docId)
  );
}

let isSyncingNow = false;
let lastAutoSyncedCount = 0;
let lastSyncedAt: string | null = null;
const listeners = new Set<(state: OfflineSyncState) => void>();

export function getOfflineSyncState(): OfflineSyncState {
  const queue = readQueue();
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  return {
    isOnline,
    isSyncing: isSyncingNow,
    pendingCount: queue.length,
    pendingDocIds: queue.map((q) => q.docId),
    lastAutoSyncedCount,
    lastSyncedAt
  };
}

function notifyListeners(): void {
  const state = getOfflineSyncState();
  listeners.forEach((cb) => {
    try {
      cb(state);
    } catch {
      // ignore subscriber errors
    }
  });
}

export function subscribeOfflineSyncState(cb: (state: OfflineSyncState) => void): () => void {
  listeners.add(cb);
  cb(getOfflineSyncState());
  return () => {
    listeners.delete(cb);
  };
}

export function enqueueOfflineWrite(entry: OfflineQueuedWrite): void {
  const current = readQueue();
  const existingIdx = current.findIndex(
    (q) => q.collectionName === entry.collectionName && q.docId === entry.docId
  );

  if (existingIdx >= 0) {
    const existing = current[existingIdx];
    if (entry.op === 'set' && entry.merge && existing.op === 'set' && existing.data) {
      current[existingIdx] = {
        ...entry,
        data: { ...existing.data, ...(entry.data || {}) },
        merge: existing.merge
      };
    } else {
      current[existingIdx] = entry;
    }
  } else {
    current.push(entry);
  }

  writeQueue(current);
  notifyListeners();
}

export function removeOfflineWrite(collectionName: string, docId: string): void {
  const current = readQueue();
  const next = current.filter(
    (q) => !(q.collectionName === collectionName && q.docId === docId)
  );
  if (next.length !== current.length) {
    writeQueue(next);
    notifyListeners();
  }
}

export function clearLastAutoSyncedNotice(): void {
  lastAutoSyncedCount = 0;
  notifyListeners();
}

/**
 * Offline-safe Firestore write:
 * 1. Strips all `undefined` properties so Firestore never rejects payloads.
 * 2. Saves to local offline queue immediately so offline entries survive app closes/reloads.
 * 3. Writes to Firestore persistent IndexedDB cache and waits up to 2.5s for server ACK.
 *    If offline or slow network, returns cleanly without hanging the UI and auto-syncs on reconnect.
 */
export async function commitDocOfflineSafe(
  collectionName: string,
  docId: string,
  rawData: Record<string, any>,
  merge = false
): Promise<{ syncedOnline: boolean }> {
  const cleanData = stripUndefined({ ...rawData });
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  enqueueOfflineWrite({
    docId,
    collectionName,
    op: 'set',
    merge,
    data: cleanData,
    queuedAt: new Date().toISOString()
  });

  const ref = doc(db, collectionName, docId);
  const writePromise = merge
    ? setDoc(ref, cleanData, { merge: true })
    : setDoc(ref, cleanData);

  writePromise
    .then(() => {
      removeOfflineWrite(collectionName, docId);
      lastSyncedAt = new Date().toISOString();
      notifyListeners();
    })
    .catch((err) => {
      console.warn(`Queued write [${collectionName}/${docId}] awaiting online sync:`, err);
    });

  if (!isOnline) {
    return { syncedOnline: false };
  }

  const outcome = await Promise.race([
    writePromise.then(() => 'synced' as const).catch(() => 'queued' as const),
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 2600))
  ]);

  if (outcome === 'synced') {
    removeOfflineWrite(collectionName, docId);
    lastSyncedAt = new Date().toISOString();
    notifyListeners();
    return { syncedOnline: true };
  }

  return { syncedOnline: false };
}

export async function deleteDocOfflineSafe(
  collectionName: string,
  docId: string
): Promise<{ syncedOnline: boolean }> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const existingQueue = readQueue();
  const isOnlyQueuedOffline = existingQueue.some(
    (q) => q.collectionName === collectionName && q.docId === docId && q.op === 'set' && !q.merge
  );

  if (isOnlyQueuedOffline) {
    removeOfflineWrite(collectionName, docId);
    deleteDoc(doc(db, collectionName, docId)).catch(() => {});
    return { syncedOnline: isOnline };
  }

  enqueueOfflineWrite({
    docId,
    collectionName,
    op: 'delete',
    queuedAt: new Date().toISOString()
  });

  const delPromise = deleteDoc(doc(db, collectionName, docId))
    .then(() => {
      removeOfflineWrite(collectionName, docId);
      lastSyncedAt = new Date().toISOString();
      notifyListeners();
    })
    .catch((err) => {
      console.warn(`Queued delete [${collectionName}/${docId}] awaiting online sync:`, err);
    });

  if (!isOnline) {
    return { syncedOnline: false };
  }

  const outcome = await Promise.race([
    delPromise.then(() => 'synced' as const).catch(() => 'queued' as const),
    new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 2600))
  ]);

  return { syncedOnline: outcome === 'synced' };
}

/**
 * Automatically flushes all offline entries to Firestore when internet connectivity returns.
 */
export async function flushOfflineQueue(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    notifyListeners();
    return 0;
  }
  if (isSyncingNow) return 0;

  const queue = readQueue();
  if (queue.length === 0) {
    notifyListeners();
    return 0;
  }

  isSyncingNow = true;
  notifyListeners();

  let syncedCount = 0;

  try {
    for (const item of queue) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) break;
      try {
        const ref = doc(db, item.collectionName, item.docId);
        if (item.op === 'delete') {
          await deleteDoc(ref);
        } else if (item.data) {
          const clean = stripUndefined(item.data);
          await (item.merge ? setDoc(ref, clean, { merge: true }) : setDoc(ref, clean));
        }
        removeOfflineWrite(item.collectionName, item.docId);
        syncedCount += 1;
      } catch (err) {
        console.warn(`Auto-sync item [${item.collectionName}/${item.docId}] deferred:`, err);
      }
    }

    try {
      await Promise.race([
        waitForPendingWrites(db),
        new Promise((resolve) => setTimeout(resolve, 4000))
      ]);
    } catch {
      // ignore waitForPendingWrites timeout
    }

    if (syncedCount > 0) {
      lastAutoSyncedCount = syncedCount;
      lastSyncedAt = new Date().toISOString();
    }
  } finally {
    isSyncingNow = false;
    notifyListeners();
  }

  return syncedCount;
}

let listenersInitialized = false;

export function initOfflineAutoSync(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (listenersInitialized) return () => {};
  listenersInitialized = true;

  const handleOnline = () => {
    notifyListeners();
    setTimeout(() => {
      flushOfflineQueue();
    }, 600);
  };

  const handleOffline = () => {
    notifyListeners();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      flushOfflineQueue();
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const periodicTimer = window.setInterval(() => {
    if (navigator.onLine && readQueue().length > 0 && !isSyncingNow) {
      flushOfflineQueue();
    }
  }, 15000);

  // Run an initial check on boot if online
  if (navigator.onLine && readQueue().length > 0) {
    setTimeout(() => flushOfflineQueue(), 1200);
  }

  return () => {
    listenersInitialized = false;
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.clearInterval(periodicTimer);
  };
}
