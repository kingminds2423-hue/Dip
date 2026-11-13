import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with IndexedDB Persistent Offline Cache for instant zero-wait app launch
const rawConfig = firebaseConfig as Record<string, any>;
const firestoreDbId: string | undefined = rawConfig.firestoreDatabaseId || undefined;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    firestoreDbId
  );
} catch {
  firestoreInstance = firestoreDbId
    ? getFirestore(app, firestoreDbId)
    : getFirestore(app);
}

export const db = firestoreInstance;

// Initialize Firebase Authentication
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  code: string;
  message: string;
  operation: string;
  timestamp: string;
  operationType?: OperationType | string;
  path?: string | null;
  authInfo?: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operation: string,
  operationType: OperationType | string = OperationType.GET,
  path: string | null = null
): FirestoreErrorInfo {
  const err = error as { code?: string; message?: string };
  const info: FirestoreErrorInfo = {
    code: err.code || 'unknown',
    message: err.message || 'একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে',
    operation,
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    timestamp: new Date().toISOString(),
  };

  console.error(`Firestore [${operation}] ত্রুটি:`, JSON.stringify(info), error);
  return info;
}

export default app;
