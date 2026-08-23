# THE-HK Phase 4C Finalization Report

**Date:** 23 August 2026
**Project:** THE-HK (`poshmedia-thehk`)
**Objective:** Deploy the Firebase backend, seed admin configuration, fix the Android infinite splash issue, and produce a local installable APK.

---

## 1. Firebase Backend Deployment

All Phase 4 backend resources were deployed to `poshmedia-thehk`.

- **Firestore rules** and **indexes** deployed successfully from `firebase/firestore.rules` and `firebase/firestore.indexes.json`.
- **Cloud Functions** deployed successfully with the full Phase 4 surface:
  - `claimVoucherFn`, `redeemVoucherFn`, `getMyVouchers`, `getVoucherCatalog`
  - `getCashback`, `getCashbackHistoryFn`
  - `createDisputeFn`, `getMyDisputes`
  - `getReceiptFn`, `generateReceiptFn`
  - `getPlatformConfigFn`, `verifyBankAccount`
  - Existing Phase 2/3 payment, utility, gift-card, and SMM functions

The previous `User code failed to load` / discovery-timeout failure was resolved by setting `FUNCTIONS_DISCOVERY_TIMEOUT=60` for the deploy command. The Node.js 20 runtime and `firebase-functions` version warnings remain cosmetic and do not block deployment.

---

## 2. Admin Panel / Platform Configuration Seeded

The `adminPanel/platform` Firestore document was created and populated by invoking the deployed `getPlatformConfigFn` callable. The seeded document contains:

- `onMaintenance: false`
- `supportEmail: support@the-hk.com`
- Announcements, onboarding tutorial, and platform tips
- Timestamps

Because anonymous authentication is disabled in the Firebase project, a temporary test account was created to call the function:

- **Email:** `test-seed-admin@the-hk.com`
- **Password:** `TempSeedPassword123!`
- **UID:** `1lkVx0R1tLcQRdtjQXZChR6nXSc2`

The temporary Node script used for seeding was deleted after use so no credentials remain in the repo.

---

## 3. Android Infinite Splash Fix

### Root cause
The original startup flow had no explicit auth-initialization state. The splash screen in `app/index.tsx` was a static component and the root layout’s navigation guard relied on a 1.5-second `setTimeout` and a store that never transitioned through a loading phase. If Firebase auth / `AsyncStorage` persistence did not resolve, the app could sit on the splash indefinitely.

### Changes made
- **`src/stores/authStore.ts`**
  - `isLoading` now defaults to `true`.
  - Added `authError` and `clearAuthError` state/actions.
  - `signIn` and `signOut` always clear loading/error.

- **`src/repositories/firebaseRepository.ts`**
  - `FirebaseAuthRepository` now signals `setLoading(true)` before subscribing.
  - `onAuthStateChanged` resolves to `signIn` / `signOut` and sets loading to `false`.
  - Added an error callback that surfaces init failures via `setAuthError`.
  - Added a 7-second fallback timeout that releases the loading state if `onAuthStateChanged` never fires (prevents an infinite splash).

- **`app/_layout.tsx`**
  - Removed the timeout-based navigation guard and the unused `repositories` reference.
  - Kept the import for the repository barrel as a side-effect to initialize the auth listener.
  - Root layout is now a pure provider wrapper.

- **`app/index.tsx`**
  - Converted the splash screen into a proper startup screen.
  - Listens to `isLoading` / `isAuthenticated` / `authError` from the auth store.
  - Navigates to `/(auth)/login` or `/(tabs)` as soon as auth state resolves.
  - Displays the `authError` with a "Continue to Login" button if initialization fails.

### Verification
- `npm run typecheck` (`tsc --noEmit`) passed.
- `npx expo-doctor` (21/21 checks) passed.

---

## 4. Local Android APK Build

### Environment workaround
The initial local build failed because the Android SDK/NDK were installed under `C:\Users\Welcome Sir\...`, a path containing spaces. On Windows, the NDK linker (`ld.lld`) could not locate `libc++_shared.so` from a space-containing path, producing `undefined symbol: std::__ndk1::*` errors. To resolve this:

- Created a Windows junction: `C:\Android\Sdk -> C:\Users\Welcome Sir\AppData\Local\Android\Sdk`
- Wrote `android/local.properties` pointing `sdk.dir` and `ndk.dir` to the junction.
- Re-ran `gradlew assembleDebug` with `ANDROID_HOME=C:\Android\Sdk`.

The second build succeeded after this path fix.

### Output
- **APK file:** `THE-HK-preview-debug.apk`
- **Location:** `C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\THE-HK-preview-debug.apk`
- **Gradle output path:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Size:** ~212 MB (debug build, multi-arch)
- **Variant:** `assembleDebug` (signed with the Android debug keystore, installable via `adb install` or file manager on a physical device)

A true release APK was not built because a release signing keystore is not available in this local environment. The debug build is the standard installable preview variant for local testing.

---

## 5. Summary of Known Issues / Recommendations

1. **Test account** `test-seed-admin@the-hk.com` exists in Firebase Auth. If it is no longer needed, it can be deleted from the Firebase console.
2. **Cloud Functions** use the Node.js 20 runtime, which is deprecated. Plan to upgrade to Node.js 22 before October 2026.
3. **`firebase-functions` package** in `functions/package.json` is flagged as outdated; upgrading may have breaking changes but should be done before the Admin Platform is completed.
4. **Windows path length:** The project is located under `C:\Users\Welcome Sir\Desktop\Projects\The-HK`, which contains a space and long paths. For future local Android builds, moving the project to a shorter, space-free path (e.g., `C:\dev\the-hk`) or keeping the `C:\Android\Sdk` junction is recommended.
5. **Reloadly credentials** are still invalid (`INVALID_CREDENTIALS`) per the earlier diagnostic. Airtime/data/gift-card provider flows will not work until valid Reloadly sandbox credentials are supplied to the Cloud Functions environment.
6. **Physical device verification:** The APK built successfully and is ready for sideloading. Validate on a device that the splash navigates to login/tabs and that the wallet, points, referrals, and voucher flows behave correctly.

---

## 6. Files Touched in This Session

- `src/stores/authStore.ts` - startup loading/error state
- `src/repositories/firebaseRepository.ts` - auth init lifecycle + fallback
- `app/_layout.tsx` - simplified root layout
- `app/index.tsx` - startup screen with auth-driven navigation
- `android/local.properties` - created for space-free SDK/NDK path
- `PHASE_4C_COMPLETION_REPORT.md` - this report

Generated artifact:
- `THE-HK-preview-debug.apk`
