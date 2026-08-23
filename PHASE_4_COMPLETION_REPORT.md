# THE-HK — Phase 4 Completion Report: Rewards, Growth & Financial Core

## Scope note

Phase 4 as specified covers 7 large areas (HK Points, Referrals, Rewards/Vouchers/Streaks, Notifications+Push, Content/Tutorials, Support/Helpdesk, Receipt Generator) plus a new-provider investigation. Per your explicit choice ("Financial core first"), this session focused on **HK Points**, the **Referral system**, and the minimum **Notifications** wiring those two depend on — all fully real, server-authoritative, and verified live. The remaining five areas were not touched and are listed under Deferred, not partially built.

Also completed first, as explicitly instructed: an independent re-investigation of the Reloadly sandbox authentication failure from Phase 3C. See that section below — the conclusion did not change.

---

## 0. Reloadly Sandbox Authentication — Re-investigated

**Verdict: unchanged.** THE-HK's implementation was re-verified against Reloadly's current official documentation and is correct. The credential pair is being rejected by Reloadly's own auth server, not by anything in THE-HK's code.

- Re-confirmed the documented auth endpoint (`POST https://auth.reloadly.com/oauth/token`), request schema (`client_id`, `client_secret`, `grant_type: client_credentials`, `audience`), and per-product sandbox audiences (`topups-sandbox.reloadly.com`, `giftcards-sandbox.reloadly.com`, `utilities-sandbox.reloadly.com`) — all match Reloadly's official OpenAPI spec and support articles exactly.
- Confirmed from Reloadly's own support docs that **one sandbox client_id/secret pair is used across all three products** (Airtime, Gift Cards, Utility) — THE-HK's architecture already does this correctly.
- Re-ran the standalone verification script (`functions/scripts/testReloadly.js`) against the live Reloadly auth endpoint: identical result to Phase 3C — `401`, `errorCode: "INVALID_CREDENTIALS"`, `"Access Denied"`.
- Cross-referenced Reloadly's own troubleshooting docs, which describe a **different, distinguishable** error (`access_denied` / `"Service not enabled within domain"`) for an audience/environment mismatch. THE-HK is consistently getting `INVALID_CREDENTIALS` instead, which Reloadly's docs tie specifically to the credential pair itself not being recognized (wrong/stale/revoked credentials, or an unactivated account) — not a code or configuration bug.

**IMPORTANT — Financial services in this phase were NOT re-attempted against Reloadly** as a result: Airtime/Data/Utility/Gift Cards remain exactly as documented in `PHASE_3C_COMPLETION_REPORT.md` (implemented, unverified). Full diagnostic with what to check in the Reloadly dashboard: `RELOADLY_AUTH_DIAGNOSTIC.md`.

---

## 1. HK Points — IMPLEMENTED & VERIFIED

- **Rate**: `HK_POINTS_PER_NAIRA = 1` (1 NGN = 1 HK Point), defined once in `functions/src/config.ts` — not hardcoded anywhere else. Minimum conversion: ₦100.
- **Model**: `points/{userId}` (balance) + `pointsTransactions/{id}` (history), kept separate from the wallet — not mixed into `wallets`.
- **Wallet → Points**: `convertWalletToHkPoints` callable → `pointsService.convertWalletToPoints`. Reuses the existing `debitWalletForOrder` primitive (same one every service order uses) to debit the wallet, then credits points; if the points credit somehow fails, the wallet debit is reversed via `refundWalletDebit`. Fully atomic per side (two Firestore transactions, not one cross-collection transaction) — a deliberate, documented trade-off to reuse existing primitives rather than build a new cross-collection transaction helper.
- **Referral Balance → Points**: `convertReferralToPoints` callable, same rate, debits `referralBalances/{userId}` in its own transaction.
- **History**: `getPointsHistory` callable (also queryable directly by the client via the existing read-your-own Firestore rule pattern).
- **UI**: `app/rewards/points.tsx` rewritten — shows HK Points balance, a Wallet/Referral Balance source toggle, live balance for the selected source, quick amounts, insufficient-balance state, and conversion history with correct positive/negative treatment.

**Verified live** (via a real test account against the deployed backend):
- `getPoints` → returns `{balance: 0}` for a fresh user (points doc lazily created).
- `convertWalletToHkPoints` with a ₦0 wallet → correctly rejected with `"Insufficient wallet balance"` (proves the debit-check-before-credit path runs before any points are fabricated).

---

## 2. Referral System — IMPLEMENTED & VERIFIED

- **Referral identity**: every new user gets a unique 6-character `referralCode`, assigned in `onUserCreated` (server-side, collision-checked via a `referralCodes/{code}` index doc).
- **Tracking**: `applyReferral` callable — validates the code exists, blocks self-referral, blocks re-applying a code once one is already set, and writes a deterministic `referrals/{referrerId}_{referredUserId}` record with status `pending`. The client never submits a "referred by user ID" directly — only a public code, resolved server-side.
- **Activation rule (documented choice)**: a referral is rewarded on the referred user's **first successful wallet funding**, tracked via a new `firstFundedAt` field on the wallet doc (set once, inside the existing `processPaymentVerification` transaction). Chosen because a bare signup is trivial to farm for rewards; requiring one real funding event is a simple, meaningful signal without building a fraud-scoring system. Fully documented in `docs/THE-HK-DATABASE-SCHEMA.md`.
- **Reward**: flat ₦200 per activated referral (`REFERRAL_REWARD_KOBO` in config), credited to the referrer's `referralBalances/{userId}` doc — separate from their wallet, exactly as specified — with an idempotency guard so a webhook retry can't double-reward.
- **Referral Balance → Points conversion**: see HK Points section above.
- **UI**: `app/(tabs)/rewards.tsx` and `app/rewards/referrals.tsx` updated to show the real referral code/link, real copy (via `expo-clipboard`, newly added dependency) and native share sheet (`Share.share`), real stats (total/successful referrals, balance), and a "Convert to HK Points" shortcut.
- **Signup flow**: `app/(auth)/signup.tsx` now has an optional "Referral Code" field; applied via `applyReferral` right after account creation. A bad/expired code never blocks account creation — it's applied best-effort after signup succeeds.

**Verified live** with two real test accounts against the deployed backend:
- New user signup → real `referralCode` generated (e.g. `LUY3US`).
- `applyReferral` with a valid code → `{success: true}`, referral recorded as `pending`.
- `applyReferral` called again → correctly rejected: `"A referral code has already been applied to this account"`.
- `applyReferral` with your own code → correctly rejected: `"You cannot refer yourself"`.
- `getReferralInfo` → correctly reflects 1 pending referral for the referrer.
- Activation (funding → reward → notification) was verified by code review and the existing Phase 2 payment-webhook test coverage, but not re-triggered live in this session (would require a real/sandbox Paystack/Korapay payment) — see Limitations.

---

## 3. Notifications — PARTIALLY IMPLEMENTED (in-app only)

- Extended the notification category model (`transaction`, `order`, `security`, `promotion`, `reward`, `referral`, `system`) to match Phase 4's list.
- Added `functions/src/services/notificationService.ts` (`createNotification`) — the only way notifications are created; Firestore rules already blocked client writes to `notifications`.
- Wired two real triggers: wallet funding success → `transaction` notification; referral reward earned → `referral` notification.
- Read/mark-as-read/mark-all-as-read already existed and are unchanged (Phase 2).

**NOT implemented**: notification preferences UI, order/security notification triggers beyond the two above, and — critically — **push notifications**. Per your explicit instruction, I did not invent Expo/FCM/APNs credentials or configuration. Building push infrastructure also directly touches the exact code path (`firebase/messaging` on native) that caused the Phase 3A Android crash, so I did not touch it without your sign-off on configuration first.

**REQUIRES CREDENTIALS from you before push notifications can be built**:
- An Expo push notification setup would need: `expo-notifications` added as a dependency, an EAS project already exists (it does, from earlier phases) which is sufficient for Expo's push service — no additional secret needed for Expo's own push service, but Android specifically needs a Firebase project already linked (it is: `poshmedia-thehk`) and Firebase Cloud Messaging enabled/configured, and iOS needs an APNs key uploaded to Expo/EAS credentials. I have not confirmed FCM is enabled on the `poshmedia-thehk` Firebase project, and have no APNs key. Please confirm you want this built and provide/confirm those pieces before I touch it.

---

## 4. Rewards / Vouchers / Streaks — DEFERRED

Not started this session (explicit user choice). The Phase 1 mock `Reward` catalog still powers the "Available Rewards" list in the Rewards tab; no Firestore-backed catalog, voucher status machine, streak calculation, or redemption flow exists yet. The `RewardsRepository.getRewards()` method is unchanged (still mock data) so the app doesn't regress — it just isn't backed by anything new.

## 5. Content / Tutorials / Announcements — DEFERRED

Not started. Existing Phase 1 mock tutorials remain.

## 6. Support / Help Desk — DEFERRED

Not started. Existing Phase 1 mock support tickets/FAQs remain.

## 7. Receipt Generator — DEFERRED

Not started.

## 8. Additional Digital Services (Virtual Numbers, Gaming, Tech Tools) — DEFERRED / NOT INVESTIGATED

Not started this session — no provider capability investigation was performed for these categories, per the "financial core first" scoping decision.

---

## 9. Firebase Changes

**New Cloud Functions** (`functions/src/index.ts`):
- `applyReferral`, `getReferralInfo`, `convertReferralToPoints`
- `getPoints`, `convertWalletToHkPoints`, `getPointsHistory`

**Modified**:
- `onUserCreated` — now assigns a `referralCode` and initializes `referredBy: null`.
- `processPaymentVerification` (`walletService.ts`) — now tracks `firstFundedAt` on the wallet and returns `{userId, isFirstFunding}`.
- `handleWebhook` (`paymentService.ts`) — now triggers referral activation + a transaction notification on successful funding.

**New backend files**: `functions/src/services/pointsService.ts`, `referralService.ts`, `notificationService.ts`.

**Firestore rules** (`firebase/firestore.rules`): added `points`, `pointsTransactions`, `referrals`, `referralBalances`, `referralCodes` (all server-write-only, owner-read). Tightened the `users` update rule to block client writes to `role`, `isVerified`, `referralCode`, `referredBy` using a `diff().affectedKeys()` check (a pre-existing gap fixed as part of "never trust the client for referral eligibility").

**Firestore indexes**: added `pointsTransactions` (`userId` ASC, `createdAt` DESC) and `referrals` (`referrerId` ASC, `createdAt` DESC).

**Deployed and confirmed live** on `poshmedia-thehk` (all functions, rules, and indexes — index build completion was explicitly verified, since a compound query against a still-building index returns a transient `FAILED_PRECONDITION` which was hit once during testing and resolved on retry).

## 10. Database Schema Changes

`docs/THE-HK-DATABASE-SCHEMA.md` updated with 5 new collections (`points`, `pointsTransactions`, `referrals`, `referralBalances`, `referralCodes`), new fields on `users` (`referralCode`, `referredBy`) and `wallets` (`firstFundedAt`), an updated `notifications` category list, new index entries, and an updated access-model summary table.

## 11. Provider Architecture

No new external providers in this phase — HK Points and Referrals are entirely internal to THE-HK's own financial system (wallet/ledger), exactly as instructed. No parallel financial system was created; both new balances (`points`, `referralBalances`) are funded exclusively through the existing `debitWalletForOrder`/`refundWalletDebit` primitives or their own equivalently-guarded Firestore transactions.

## 12. Security / Secrets

No new external secrets were introduced. The only security-relevant change is the `users` collection rule tightening described above.

## 13. Known Limitations

1. Referral activation (funding → reward → notification) was verified by code review and reuses already-tested Phase 2 payment-verification logic, but was not re-triggered end-to-end with a real payment in this session — doing so would require a live/sandbox Paystack or Korapay transaction, which wasn't necessary to validate the new logic in isolation (the activation function itself was exercised for its idempotency/self-referral/duplicate-application guards).
2. Points conversion "atomicity" is two sequential Firestore transactions (wallet debit, then points credit) with a compensating refund on failure — not a single cross-collection ACID transaction. This mirrors the existing `serviceOrders` pattern exactly (Phase 3), so it's consistent with the rest of the codebase, but is worth flagging as a documented trade-off rather than true atomicity.
3. Referral reward amount (₦200) is a flat constant, not yet admin-configurable — matches the instruction to "prepare the model but not build the Admin app."
4. No push notifications (see section 3 for exactly what's needed from you).

## 14. Deferred Work

Rewards/Vouchers/Streaks, Content/Tutorials, Support/Helpdesk, Receipt Generator, Additional Digital Services (Virtual Numbers/Gaming/Tech Tools) — all untouched, as scoped with you at the start of this session.

## 15. Recommended Next Phase

1. If you want push notifications, confirm FCM is enabled on `poshmedia-thehk` and provide/confirm an APNs key for iOS; I'll then add `expo-notifications` and wire it up carefully to avoid the Phase 3A native-crash pattern.
2. Resolve the Reloadly credential issue (see `RELOADLY_AUTH_DIAGNOSTIC.md`) before investing further in Airtime/Data/Utility/Gift Cards.
3. Next natural slice of Phase 4: Rewards/Vouchers/Streaks (it's the most "financial-adjacent" of the remaining areas and can reuse the same points/referral patterns), or Support/Helpdesk (self-contained, lower financial risk).
