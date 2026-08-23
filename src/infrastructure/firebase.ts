import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '@config/env';

// `getReactNativePersistence` is only present in the React Native build of
// `firebase/auth` (resolved automatically by Metro via the package's
// "react-native" export condition). The published TypeScript types for the
// package's default ("browser") entry point don't declare it, even though it
// exists at runtime on native platforms, so it's imported separately here
// with a local type declaration instead of `@ts-ignore`-ing the whole file.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => import('firebase/auth').Persistence;
};

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
  storageBucket: env.firebaseStorageBucket,
  messagingSenderId: env.firebaseMessagingSenderId,
  appId: env.firebaseAppId,
  measurementId: env.firebaseMeasurementId,
};

if (!firebaseConfig.apiKey) {
  throw new Error('Missing Firebase API key. Check that EXPO_PUBLIC_FIREBASE_API_KEY is set in the .env file and the server has been restarted.');
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// The Firebase JS SDK requires `initializeAuth` with an explicit AsyncStorage
// persistence layer on native platforms (Android/iOS). Calling `getAuth`
// there falls back to in-memory persistence with a console warning, but on
// some native runtimes the default `getAuth` initialization path pulls in
// browser-only persistence probing (indexedDB/localStorage) that throws
// synchronously and crashes the app on startup. `initializeAuth` avoids that
// entirely by using the RN-specific auth build.
let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if called more than once (e.g. Fast Refresh).
    auth = getAuth(app);
  }
}
export { auth };

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Firebase Cloud Messaging (`firebase/messaging`) is a web-only module. It
// depends on browser APIs (Service Worker, Notification, indexedDB) that do
// not exist in the React Native runtime. React Native defines a global
// `window` object for compatibility, so a `typeof window !== 'undefined'`
// check does NOT reliably distinguish web from native and previously caused
// `getMessaging()` to run on Android/iOS, throwing an unhandled
// `messaging/unsupported-browser` error during module init and crashing the
// app immediately after the splash screen. Messaging is intentionally
// omitted on native for now; push notifications are not part of Phase 2/3.
export const messaging = null;

// Only connect to the local Functions emulator when explicitly requested.
// The default "development" app env is also used for real-device preview
// builds, which have no way to reach a developer machine's "localhost".
if (env.useFirebaseEmulator) {
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch {
    // Emulator not running; ignore.
  }
}

export default app;
