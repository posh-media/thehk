# THE-HK — Phase 3B Completion Report: Airtime, Data & Bills

## Summary

This phase extended the Phase 3A provider/order/wallet architecture (established for The Owlet social media services) to Airtime and Data top-ups via **Reloadly**. The full pipeline — UI → validation → authoritative pricing → wallet debit → provider call → order status → automatic refund on failure — is genuinely implemented and reuses `debitWalletForOrder`/`refundWalletDebit` and the unified `serviceOrders` collection from Phase 3A. No new wallet logic, no new financial system, no duplicate repositories.

**Reloadly credentials are not currently available**, so Airtime/Data purchases are fully wired end-to-end but fail at a clear, honest boundary (`"Airtime/Data provider (Reloadly) is not configured..."`) rather than faking a successful purchase. This was verified live against the deployed Cloud Function.

**Bills/Subscriptions** were not implemented against any provider — no bill-payment provider was ever selected or credentialed for THE-HK, and Reloadly's Nigerian bill-payment product would require separate credentials that also aren't available. Per the instructions ("do not invent unsupported categories"), the Bills screen now shows an honest "Coming Soon" state instead of a fake category list and fake payment flow (the previous Phase 1 version had `setTimeout` + fake success).

---

## 1. Inspection performed before building

Reviewed and reused without duplication:
- `functions/src/providers/serviceProvider.ts` / `owletProvider.ts` — used as the direct template for the new `utilityProvider.ts` / `reloadlyProvider.ts`.
- `functions/src/services/socialService.ts` — its in-memory catalog caching pattern and order-submission/refund pattern are mirrored in `utilityService.ts`.
- `functions/src/services/walletService.ts` — `debitWalletForOrder` / `refundWalletDebit` are reused as-is (no changes to their logic; only their shared record type was factored out — see below).
- `serviceOrders` Firestore collection and its security rule — reused and extended with a `serviceType` discriminator instead of creating `airtimeOrders`/`dataOrders`.
- `src/repositories/firebaseRepository.ts` and the app's screens (`app/services/airtime.tsx`, `data.tsx`, `bills.tsx`, `orders.tsx`) — extended rather than replaced.

**Minor refactor for reuse (not new functionality):** the order-record shape used by Phase 3A (`SocialOrderRecord`) was promoted to a shared `ServiceOrderRecord` type in `functions/src/types.ts` with a `serviceType` field, so Airtime/Data orders and Social Media orders write to the exact same collection/shape instead of two parallel models. `socialService.ts` now aliases `SocialOrderRecord = ServiceOrderRecord` for backward compatibility.

---

## 2. Provider capability check (before writing any provider code)

- **The Owlet**: its confirmed API (`https://the-owlet.com/api/v2`) is a standard SMM-panel API (`services`/`add`/`status`/`balance`). It has no airtime/data/bill actions in that namespace — its marketing site separately advertises airtime/data as a *consumer* product, but no documented API surface for it was discoverable without an authenticated Owlet dashboard session, so it was not used or guessed at for this phase.
- **Reloadly**: a well-documented, public REST API for airtime/data top-ups (OAuth2 client-credentials + `/operators`, `/operators/auto-detect/...`, `/topups`). No THE-HK Reloadly account/credentials exist yet. The implementation below follows Reloadly's published contract exactly (endpoints, payload shapes, auth flow) but **has not been exercised against a live Reloadly account** — it is implemented, not guessed, but unverified live.
- **Bills**: no candidate provider was given or confirmed for Nigerian electricity/cable/internet bill payment. Building fake categories or a fake verification step for an unconfirmed provider would violate the explicit "do not invent unsupported categories" / "do not fake provider integrations" instructions, so this was left as an honest boundary.

---

## 3. Provider abstraction

- `functions/src/providers/utilityProvider.ts` — new interfaces: `AirtimeDataProvider` (`listOperators`, `detectOperator`, `getDataPlans`, `purchaseAirtime`, `purchaseData`) and `BillProvider` (defined for future use, no implementation yet).
- `functions/src/providers/reloadlyProvider.ts` — `ReloadlyProvider implements AirtimeDataProvider`. Handles OAuth2 token caching, operator listing/auto-detect, data-plan derivation from Reloadly's `fixedAmounts`/`localFixedAmounts` + descriptions, and top-up submission. Throws a clear configuration error immediately if `RELOADLY_CLIENT_ID`/`RELOADLY_CLIENT_SECRET` are missing — no network call is attempted, no fake data is returned.

The UI and Cloud Functions depend only on `AirtimeDataProvider`, not on Reloadly directly — a different aggregator could be substituted later without touching `utilityService.ts` or any screen.

---

## 4. Airtime

**UI** (`app/services/airtime.tsx`, fully rewritten from the Phase 1 fake version):
- Loads real network operators + wallet balance on mount.
- Phone number field auto-detects the network on blur (via Reloadly's auto-detect endpoint) while still allowing manual network selection.
- Quick-amount chips (₦100–₦5,000) plus free-text amount entry.
- A dedicated **Review** step showing Network, Phone Number, Amount, Wallet Balance, and Balance After — before any charge occurs.
- Insufficient-balance state with a "Fund Wallet" shortcut; the Review/Pay button is disabled until the amount is affordable.
- Loading, empty ("Airtime unavailable"), and error states are all handled — the screen is never left blank during a network call.

**Backend**: `purchaseAirtime` (callable) → `placeAirtimeOrder` in `utilityService.ts`:
1. Validates phone format and amount.
2. Loads live operators (cached in-memory, 1h TTL) and validates the operator supports airtime and the amount is within the operator's min/max.
3. Computes the authoritative charge (`toKobo(amountNaira)` — no markup in Phase 3B).
4. Debits the wallet via the existing `debitWalletForOrder`.
5. Creates a `serviceOrders` record (`serviceType: 'airtime'`) with status `processing`.
6. Calls `provider.purchaseAirtime(...)`.
7. On success: updates order status from the provider's response (`successful`/`processing`/`failed`); if the provider itself reports `failed`, the wallet is refunded automatically.
8. On a thrown error (network/config/provider error): refunds the wallet and marks the order `failed`, returning a clear message to the client. **No fake success is ever returned.**

**Wallet integration**: same `transactions`/`ledgerEntries` records as every other Phase 2/3A financial operation — visible in the existing transaction history.

**Refund behavior**: identical mechanism to Phase 3A's social orders (`refundWalletDebit`), verified by code review; not independently re-tested since it's unchanged logic already covered in Phase 3A.

---

## 5. Data

**UI** (`app/services/data.tsx`, new screen): network selection → phone number → live data-plan grid (cards showing description + price, not a giant dropdown) → Review → Confirm. Plans are fetched from Reloadly per-operator (`getDataPlans`), with loading/error/empty states specific to plan loading (separate from the top-level network loading state).

**Backend**: `purchaseData` (callable) → `placeDataOrder` in `utilityService.ts`. Same validate → authoritative price (directly from the provider's plan price, in kobo) → debit → order → submit → refund-on-failure flow as airtime, sharing the same `submitOrder` helper function (no duplicated wallet-debit code between airtime and data).

---

## 6. Bills

**Not implemented against a real provider.** `app/services/bills.tsx` now shows a clear "Coming Soon" empty state (matching the pattern already established for Withdraw in Phase 2) instead of the old fake category list + fake payment. No Cloud Function, no Firestore writes, no fabricated bill categories.

---

## 7. Firebase changes

**New Cloud Functions** (`functions/src/index.ts`):
- `getNetworkOperators` — list Nigerian network operators.
- `detectOperatorForPhone` — auto-detect network from a phone number.
- `getDataPlans` — list data plans for an operator.
- `purchaseAirtime` — server-authoritative airtime purchase.
- `purchaseData` — server-authoritative data purchase.

All deployed to `us-central1` on the `poshmedia-thehk` project and confirmed reachable (see Testing below).

**New backend files**: `functions/src/providers/utilityProvider.ts`, `functions/src/providers/reloadlyProvider.ts`, `functions/src/services/utilityService.ts`.

**Modified**: `functions/src/types.ts` (added shared `ServiceOrderRecord`/`ServiceOrderType`/`ServiceOrderStatus`), `functions/src/services/socialService.ts` (now uses the shared type), `functions/src/config.ts` (added `SECRETS.reloadly`).

**Firestore collections**: no new collection. Airtime/Data orders are written to the existing `serviceOrders` collection with `serviceType: 'airtime' | 'data'`. Documented in `docs/THE-HK-DATABASE-SCHEMA.md`.

**Firestore rules/indexes**: unchanged — the existing `serviceOrders` rule (server-only create/update) and the existing `userId`+`createdAt` index already cover the new order types.

**Client changes**: `src/types/domain.ts` (added `ServiceOrderType`, `NetworkOperator`, `DataPlan`, extended `ServiceOrder`), `src/repositories/types.ts` (new `UtilityRepository` interface), `src/repositories/firebaseRepository.ts` (`FirebaseUtilityRepository`, added to `repositories.utility`).

### External APIs

**Reloadly**
- Purpose: Airtime and data top-ups (Nigerian networks).
- Implemented: OAuth2 client-credentials auth, `GET /operators/countries/{code}`, `GET /operators/auto-detect/phone/{phone}/countries/{code}`, `GET /operators/{id}` (for data plans), `POST /topups` (airtime and data purchase).
- Credentials required: `RELOADLY_CLIENT_ID`, `RELOADLY_CLIENT_SECRET` (from a Reloadly developer account). Optional: `RELOADLY_SANDBOX=true` to use `topups-sandbox.reloadly.com` for testing before going live.
- Configuration status: **Not configured.** No secrets were added to `functions/.env` (none were provided, and no placeholder/fake values were committed). The integration is otherwise complete and will work once real credentials are added — no code changes should be needed.

**The Owlet** — unchanged from Phase 3A; not used for airtime/data (see capability check above).

---

## 8. Testing — what was actually verified

**Verified with the real deployed backend:**
- `npm run typecheck` (client) — pass.
- `cd functions && npm run build` — pass.
- All 5 new Cloud Functions deployed successfully to `poshmedia-thehk` (`us-central1`).
- `getNetworkOperators` called with a real authenticated user token → returned the expected, correctly-worded configuration error: `"Airtime/Data provider (Reloadly) is not configured. Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET in the Cloud Functions environment."` This confirms: authentication works, the callable is reachable, and the code fails at exactly the intended boundary rather than crashing or faking success.
- Confirmed no `functions.config()`/emulator regressions and re-confirmed the Phase 3A Android crash fix is untouched (no `getMessaging` calls reintroduced; `eas.json`'s `preview` profile still uses `EXPO_PUBLIC_APP_ENV=production`).

**Implemented but requires credentials (not verified against a live provider):**
- Reloadly operator listing, auto-detect, data-plan retrieval, and top-up submission — written against Reloadly's public documented API contract, but never executed successfully because no account credentials exist. Once `RELOADLY_CLIENT_ID`/`RELOADLY_CLIENT_SECRET` are added, this should be smoke-tested against Reloadly's sandbox first.

**Not implemented:**
- Bills/Subscriptions (any provider).
- A new Android APK was built after these changes (see below) — this is a build/packaging check, not a live-provider test.

---

## 9. Android build

No native code or startup-path changes were made in Phase 3B (only Firestore/Functions/JS/TSX). A new APK was built after these changes to confirm no regression and to give you an updated build for physical-device testing:

- APK: `C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\THE-HK-preview-3.apk` (see build report in this same response for the exact size/link).

---

## 10. Deferred / out of scope for Phase 3B

- Bills/Subscriptions (all categories) — needs a confirmed, credentialed provider.
- Order-status polling/refresh for airtime/data (Phase 3A's `refreshSocialMediaOrder` has no airtime/data equivalent yet — Reloadly's `/topups` response already includes a status, so this is lower priority than for Owlet's async fulfillment, but could be added later).
- Idempotency hardening beyond what Phase 3A already provides (see note below).
- Gift Cards, Digital Marketplace, Seller System — unchanged, still future work per Phase 3A's report.
- Withdrawal — unchanged, still "Coming Soon".

### Note on idempotency

`debitWalletForOrder` runs inside a Firestore transaction keyed on the wallet document, so a genuine double-submit from a UI double-tap results in two separate transactions today (not a Firestore-level idempotency key on the request itself) — this is the same behavior Phase 3A shipped with for social orders. The UI disables the pay button while `submitting` is true, which covers the common double-tap case, but a stronger fix (e.g. a client-generated idempotency key stored on the order/transaction and checked server-side) would be a good follow-up if this becomes a real-world issue. Not built in this pass to avoid scope creep beyond what Phase 3A already established.
