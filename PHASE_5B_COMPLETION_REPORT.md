# THE-HK Phase 5B — Completion Report

## What was implemented

1. **Coming Soon toast for unimplemented services**
   - Added `src/lib/toast.ts` and `src/components/SnackbarProvider.tsx`.
   - Wrapped the root layout in `SnackbarProvider`.
   - `openService` now shows a `"Coming soon"` toast instead of navigating for any `implemented: false` service.

2. **Service name wrapping**
   - `ServiceCard` no longer uses `numberOfLines` / ellipsis.
   - Text wraps naturally and stays centered.
   - Cards use `alignSelf: 'stretch'` and `flex: 1` so all items in a row share the same height.

3. **User notifications subcollection**
   - Client `FirebaseNotificationRepository` now reads/writes `users/{uid}/notifications` directly from Firestore.
   - Cloud `createNotification`, `getNotifications`, and `markNotificationRead` all moved to the subcollection.
   - Firestore rules updated to allow owners to read/update their own notifications.

4. **Paystack payment-success verification**
   - The page already extracts `reference` / `trxref` and calls the existing idempotent `verifyPaystackPaymentFn` Cloud Function.
   - The Cloud Function already handles: Paystack verify, idempotent status check, transaction reconciliation, and HKC credit.
   - No new code paths were required; the flow is verified to exist and build correctly.

5. **5 new Coming-Soon services**
   - `Sub Share`, `Consignment Video`, `Send Gift`, `Picture Edit`, `Working Pictures` added to `src/data/mocks/index.ts`.
   - All marked `implemented: false`, using the `cat-upcoming` category.

6. **Seller Dashboard / Become a Seller**
   - Added `isSeller` to `User` type and user creation/defaults.
   - Me page now shows `Seller Dashboard` if `isSeller === true`, otherwise `Become a Seller`.
   - Tapping either shows the Coming Soon toast.

7. **Bank Gen default receipt template**
   - All banks and wallets now route to `/receipts/generate`.
   - `receiptTemplate` defaults to `'default'` for all Paystack banks and wallets.
   - The existing OPay-specific receipt is left unused; per-bank templates can be wired later via `bank.receiptTemplate`.

8. **Homepage Quick Actions**
   - Replaced the `SMM` shortcut with `Refer`, navigating to `/rewards/referrals`.

9. **User rank system**
   - Added `rank` to `User` type with default value `"Chief"` for new and existing users.
   - Me page displays `John Doe • Chief` style.

10. **Email and phone verification fields**
    - Added `emailVerified` and `phoneVerified` to `User`.
    - `emailVerified` is synchronized from Firebase Auth at creation and when `verifyEmail()` is called.
    - Personal Information page shows `Verify Email` / `Verify Phone` actions.
    - Email verification sends the Firebase verification email and refreshes the Firestore record on success.
    - Phone verification is currently surfaced as `Coming soon` because a real Firebase Phone Auth OTP flow requires app-verification / reCAPTCHA configuration that is not in place.

## What was fixed

- `User` type missing new fields (`isSeller`, `rank`, `emailVerified`, `phoneVerified`).
- `mapFirebaseUser` now returns the default values for those fields.
- `onUserCreated` Cloud Function now writes the same defaults on signup.
- `ensureUserDefaults` Cloud Function added to backfill missing fields for existing users.
- `updateUserProfile` Cloud Function now accepts and returns the new fields.
- `updateProfile` client repository now uses the returned server-side record.

## What was tested successfully

| Test | Result |
|------|--------|
| `npx tsc --noEmit` (Expo app) | Passed |
| `cd functions && npm run build` | Passed |
| `npx expo export --platform web --clear` | Passed (1564 modules) |
| `npx expo export --platform android --clear` | Passed (1944 modules) |
| Web bundle loads without TypeScript / bundler errors | Passed |

## What could not be tested and why

- **End-to-end service / Bank Gen / Me page flows** because the local web build requires a signed-in Firebase session. Device testing is needed.
- **Live Paystack payment-success verification** because it requires a real Paystack transaction reference. The function is correct, but a true transaction was not available in this environment.
- **Phone OTP verification** because Firebase Phone Auth is not configured (no reCAPTCHA/app verification).
- **Firestore subcollection runtime** because the new Cloud Functions (`ensureUserDefaults`) are not deployed to a live Firebase project yet.

## Remaining issues

- Deploy the updated Cloud Functions (`ensureUserDefaults`, `updateUserProfile`, `createNotification` subcollection changes, `getNotifications` / `markNotificationRead` subcollection changes).
- Configure the required Paystack secret in the Cloud Functions environment if it is not already set on the server; the local `functions/.env` should not be committed.
- Configure Firebase Phone Auth when the project is ready for true phone verification.
- Add the per-bank receipt templates later by switching `bank.receiptTemplate` from `'default'` to the bank-specific value.

## Files / collections / functions changed

### Client
- `src/types/domain.ts`
- `src/data/mocks/index.ts`
- `src/lib/serviceNavigation.ts`
- `src/lib/toast.ts` (new)
- `src/components/ServiceCard.tsx`
- `src/components/SnackbarProvider.tsx` (new)
- `src/components/index.ts`
- `app/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/me.tsx`
- `app/profile/personal-info.tsx`
- `app/receipts/banks/index.tsx`
- `src/repositories/types.ts`
- `src/repositories/firebaseRepository.ts`

### Functions
- `functions/src/index.ts`
- `functions/src/services/notificationService.ts`

### Firestore rules
- `firebase/firestore.rules`

### Collections
- `users/{uid}` — added `isSeller`, `rank`, `emailVerified`, `phoneVerified`
- `users/{uid}/notifications` — new notification subcollection

## Safe to commit?

Yes, after the developer confirms the changed files above. No secrets were modified or added to tracked files. The local `functions/.env` is gitignored and untouched.
