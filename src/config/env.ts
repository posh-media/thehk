import Constants from 'expo-constants';

interface EnvConfig {
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  firebaseMeasurementId?: string;
  appEnv: 'development' | 'staging' | 'production';
  useFirebaseEmulator: boolean;
}

function resolveValue(...candidates: (string | undefined)[]): string | undefined {
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim().length > 0 && !v.startsWith('${')) {
      return v.trim();
    }
  }
  return undefined;
}

function getEnv(): EnvConfig {
  const extra = (Constants.expoConfig?.extra || {}) as Partial<EnvConfig>;

  return {
    firebaseApiKey: resolveValue(
      process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      extra.firebaseApiKey
    ),
    firebaseAuthDomain: resolveValue(
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      extra.firebaseAuthDomain
    ),
    firebaseProjectId: resolveValue(
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      extra.firebaseProjectId
    ),
    firebaseStorageBucket: resolveValue(
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      extra.firebaseStorageBucket
    ),
    firebaseMessagingSenderId: resolveValue(
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      extra.firebaseMessagingSenderId
    ),
    firebaseAppId: resolveValue(
      process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      extra.firebaseAppId
    ),
    firebaseMeasurementId: resolveValue(
      process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      extra.firebaseMeasurementId
    ),
    appEnv: (process.env.EXPO_PUBLIC_APP_ENV as EnvConfig['appEnv']) || 'development',
    useFirebaseEmulator: resolveValue(process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR) === 'true',
  };
}

export const env = getEnv();
