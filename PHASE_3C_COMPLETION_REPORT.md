# THE-HK — Phase 3C Completion Report: Gift Cards, Utility Bills & Provider Architecture

## Headline: Phase 3 is NOT fully "verified complete"

Per the explicit instruction not to claim completion unless verified: **the Reloadly sandbox credentials provided for this phase (`rm6JMG3q81EdT3NC3y9Tfien8JizSdZg` / `4FzUGZUyQ3-pHOB6sI5c6sAbbL4eQO-3yi1CA7YaQ`) are rejected by Reloadly's own authentication endpoint** (`401 INVALID_CREDENTIALS` from `https://auth.reloadly.com/oauth/token`, tested against all three product audiences: Airtime, Gift Cards, Utility). This was confirmed with a standalone script run outside of Firebase (`functions/scripts/testReloadly.js`), so it is not a bug in THE-HK's request format — Reloadly itself is rejecting the credential pair.

Per your explicit direction after I reported this, I proceeded to build the full architecture, backend, and UI for Utility Bills and Gift Cards anyway, so it is ready to go the moment working credentials are supplied — but none of it has been exercised against a live/sandbox Reloadly response. This report clearly marks everything as **IMPLEMENTED BUT UNVERIFIED** rather than claiming it works.

---

## 1. What was implemented

### Shared architecture refactor (no behavior change, reduces duplication)
- `functions/src/providers/reloadlyClient.ts` — new shared OAuth2 client-credentials handler used by all three Reloadly adapters (Airtime/Data, Utility, Gift Cards), replacing three separate copies of the same token-fetch logic.
- `functions/src/services/orderService.ts` — new shared `submitServiceOrder` helper (debit → create order → call provider → refund-on-explicit-failure), now used by **all four** service types: social media, airtime, data, bills, and gift cards. `socialService.ts` and `utilityService.ts` were refactored to use it instead of duplicating the logic Phase 3A/3B had each implemented separately.
- `functions/src/types.ts` — `ServiceOrderType` extended with `'bill' | 'gift_card'`.

### Utility / Bill Payments (Reloadly Utility Payments API)
- `functions/src/providers/utilityProvider.ts` — `BillProvider` interface (`getCategories`, `getBillers`, `verifyCustomer`, `payBill`), extended with `BillCategory`/`Biller` types.
- `functions/src/providers/reloadlyUtilityProvider.ts` — `ReloadlyUtilityProvider`, built against Reloadly's documented endpoints: `GET /billers` (filterable by `countryISOCode`/`type`), `POST /pay`. Categories are derived from the distinct `type` values actually returned by `/billers` for Nigeria (`ELECTRICITY_BILL_PAYMENT`, `WATER_BILL_PAYMENT`, `TV_BILL_PAYMENT`, `INTERNET_BILL_PAYMENT`) — **not hardcoded**, so if Reloadly doesn't return a category for Nigeria, it simply won't appear.
- `functions/src/services/billService.ts` — catalog caching + `payBill` order flow using the shared `submitServiceOrder`.
- Cloud Functions: `getBillCategories`, `getBillers`, `verifyBillerCustomer`, `payUtilityBill`.
- UI: `app/services/bills.tsx` rewritten from the old fake "Coming Soon"/fake-form version into a real category → biller → customer number → review → confirm flow, with a clear disclaimer that automatic customer verification isn't available (see Limitations).

### Gift Cards (Reloadly Gift Cards API — buying only)
- `functions/src/providers/giftCardProvider.ts` — `GiftCardProvider` interface (`listProducts`, `getProduct`, `orderGiftCard`, `getRedeemCodes`).
- `functions/src/providers/reloadlyGiftCardProvider.ts` — `ReloadlyGiftCardProvider`, built against Reloadly's documented endpoints: `GET /products`, `GET /products/{id}`, `POST /orders`, `GET /orders/transactions/{id}/cards`.
- `functions/src/services/giftCardService.ts` — catalog caching (**NGN-only**, see Limitations), authoritative denomination validation, `placeGiftCardOrder`, `getGiftCardRedeemCodes`.
- Cloud Functions: `getGiftCardProducts`, `getGiftCardProductDetail`, `purchaseGiftCard`, `getGiftCardRedeemCode`.
- UI: `app/services/gift-cards.tsx` completely rewritten from the old fake buy/sell form into a real product grid (brand logo, discount badge, "from ₦X") → product detail (denomination chips, quantity, recipient email) → review → confirm flow. **Selling/trading is left as a clear "Coming Soon" state** (see Part 7 below) rather than built.

### Client-side
- `src/types/domain.ts` — `ServiceOrderType` extended; new `BillCategory`, `Biller`, `GiftCardProduct` types.
- `src/repositories/types.ts` — `UtilityRepository` extended with `getBillCategories`/`getBillers`/`verifyBillCustomer`/`payBill`; new `GiftCardRepository`.
- `src/repositories/firebaseRepository.ts` — `FirebaseUtilityRepository` extended; new `FirebaseGiftCardRepository`.
- `app/services/orders.tsx` — updated to display bill and gift card orders correctly alongside social/airtime/data.

---

## 2. What was verified against Reloadly

**Nothing was verified with a successful Reloadly API call**, because the auth step itself fails. What *was* verified:

- Reloadly's public documentation was read directly (not assumed from memory) to confirm real endpoints, request/response shapes, and per-product audiences, before writing any provider code (see `docs/THE-HK-PROVIDER-ARCHITECTURE.md` for the exact endpoints and sources).
- The credential failure itself was verified three separate ways: (1) a standalone Node script hitting `https://auth.reloadly.com/oauth/token` directly for all three audiences, (2) byte-for-byte confirmation that the `.env` values match exactly what was provided (no whitespace/encoding corruption), (3) the same `401 INVALID_CREDENTIALS` reproduced live through the deployed `getBillCategories` and `getGiftCardProducts` Cloud Functions after full deployment.
- The full request pipeline (auth → callable Cloud Function → authenticated user → provider call → clear error surfaced to client) was verified end-to-end for both new services, proving the architecture and deployment are sound independent of the credential issue.
- `npm run typecheck` (client) and `cd functions && npm run build` — both pass.
- All 8 new Cloud Functions (`getBillCategories`, `getBillers`, `verifyBillerCustomer`, `payUtilityBill`, `getGiftCardProducts`, `getGiftCardProductDetail`, `purchaseGiftCard`, `getGiftCardRedeemCode`) deployed successfully to `poshmedia-thehk` (`us-central1`).

## 3. What could not be verified

- Any actual Reloadly Airtime/Data/Utility/Gift Card response (list, order, status) — blocked entirely on the credential issue described above.
- Whether Nigeria actually has electricity/water/cable/internet billers available in Reloadly's live catalog (the endpoint shape is confirmed from documentation; the actual Nigerian content is not, since no successful call has been made).
- Whether any Nigerian gift card brands are priced in NGN vs. USD/other currencies (the NGN-only filter is a defensive design decision, not something confirmed against real catalog data).
- Gift card redeem-code delivery behavior, discount amounts, and exact biller minimum/maximum amounts.

---

## 4. Reloadly services actually available to THE-HK

Cannot be answered with certainty — see above. Based on Reloadly's public documentation (not THE-HK's specific account), the platform generally supports Airtime, Data, Gift Cards, and Utility Payments as three separate products with per-product API access, each gated by its own credential/audience pair. Whether THE-HK's specific Reloadly account has all three products enabled cannot be determined until authentication succeeds.

## 5. Nigerian utility categories actually available

**Not confirmed.** The code derives categories dynamically from whatever `GET /billers?countryISOCode=NG` actually returns (`ELECTRICITY_BILL_PAYMENT`, `WATER_BILL_PAYMENT`, `TV_BILL_PAYMENT`, `INTERNET_BILL_PAYMENT` are Reloadly's documented possible values, not a guaranteed Nigeria-specific list) — no category was hardcoded, so once authentication works, the UI will show exactly what Reloadly returns for Nigeria, nothing more or less.

## 6. Gift card capabilities actually available

**Not confirmed** for THE-HK's account/country. Reloadly's public catalog claims 200+ brands / 13,000+ products across 140+ countries generally, but the NGN-only filter applied here will show only whatever subset of that is both available for `countryCode=NG` and priced in NGN — unknown until authentication works.

---

## 7. Gift Card selling/trading

Explicitly investigated and **not supported by Reloadly**: their Gift Card API is documented as an ordering/purchasing API (redeem codes flow from Reloadly to the buyer), with no buyback, valuation, or "submit a card you own" endpoint found anywhere in their documentation. The Sell tab in `app/services/gift-cards.tsx` shows a clear "Coming Soon" state rather than inventing a workflow. The `GiftCardProvider` interface only covers buying; a future buyback provider would need its own separate interface (e.g. `GiftCardBuybackProvider`) — not built, since no such provider has been chosen.

---

## 8. Wallet/order integration

All four service types (social media, airtime, data, bills, gift cards) now share:
- One wallet debit implementation (`debitWalletForOrder`).
- One refund implementation (`refundWalletDebit`).
- One order-submission flow (`submitServiceOrder`), which enforces: debit happens before the provider is ever called; a `processing` provider result does **not** trigger a refund (avoids double-spend/refund races on genuinely asynchronous providers like utility bills); only an explicit `failed` result or a thrown exception triggers an automatic refund.
- One collection (`serviceOrders`), discriminated by `serviceType`.

No parallel financial system, no duplicate wallet-debit code, no new Firestore collections for money movement.

## 9. Firebase changes

- **Functions deployed**: `getBillCategories`, `getBillers`, `verifyBillerCustomer`, `payUtilityBill`, `getGiftCardProducts`, `getGiftCardProductDetail`, `purchaseGiftCard`, `getGiftCardRedeemCode` (all new), plus redeployment of all existing functions (no behavior change to those beyond the internal `orderService.ts` refactor for social/airtime/data).
- **Rules**: unchanged — the existing `serviceOrders` rule (server-only create/update, owner-only read) already covers the new `serviceType` values; no enum restriction existed to update.
- **Indexes**: unchanged — the existing `serviceOrders` (`userId` ASC, `createdAt` DESC) index already covers bill and gift card orders.
- **Secrets**: `RELOADLY_CLIENT_ID`, `RELOADLY_CLIENT_SECRET`, `RELOADLY_SANDBOX=true` added to `functions/.env` (git-ignored, never sent to client, never logged, never returned from any Cloud Function).

## 10. Provider architecture

Documented in full in `docs/THE-HK-PROVIDER-ARCHITECTURE.md`, including the interface list, the shared Reloadly OAuth client, the shared order/wallet flow, and the process for adding a future provider. Summary: business logic depends only on THE-HK's own interfaces (`AirtimeDataProvider`, `BillProvider`, `GiftCardProvider`, `SocialServiceProvider`); Reloadly/Owlet-specific code is isolated to one adapter file per provider; swapping a provider means writing one new adapter and changing one instantiation line in `index.ts` — no changes to wallet, order, or UI code.

## 11. Database schema changes

`docs/THE-HK-DATABASE-SCHEMA.md` updated:
- `serviceOrders` fields/description updated to cover `bill` and `gift_card` service types, new reference prefixes (`HK-BILL-`, `HK-GC-`), and the shared `submitServiceOrder` creation path.
- New "Note on gift card currency scoping" explaining the NGN-only decision.
- "Reserved / Planned" section updated to move bills/gift-cards from "deferred" to "implemented but unverified", and to note that selling/trading gift cards remains unsupported (no provider).

## 12. Security/secrets configuration

- Reloadly credentials live only in `functions/.env` (git-ignored) and are read via `functions/src/config.ts` (`SECRETS.reloadly`).
- Never referenced in `app.json`, any `EXPO_PUBLIC_*` variable, any client TypeScript/TSX file, or any Firestore document.
- Confirmed no secret values appear in any Cloud Function response (errors surface Reloadly's error *message*, e.g. "Access Denied", never the credentials themselves).

## 13. Limitations

1. **Reloadly sandbox credentials do not authenticate** (see Headline). This blocks all real verification of Airtime, Data, Utility, and Gift Card behavior.
2. **Gift cards are NGN-only** by deliberate design (FX-timing incompatibility with THE-HK's debit-before-provider-call safety pattern) — documented, not a bug.
3. **No customer/meter verification for utility bills** — Reloadly has no documented endpoint for this; the UI shows a disclaimer instead of a fabricated "verified" name.
4. **Stuck "processing" utility payments have no automated resolution.** Since Reloadly's own docs show utility payments can stay `PROCESSING` for up to 24 hours, and THE-HK intentionally does not auto-refund `processing` orders, a bill payment that never resolves would currently require manual/admin intervention (not built - there is no admin app yet per Phase 3 scope).
5. **Gift card order status is captured at order time only** — there is no scheduled/webhook-based refresh of a `processing` gift card order's status (mirrors the same gap already documented for Owlet social orders in Phase 3A, which rely on manual refresh).

## 14. Remaining Phase 3 work

Given the credential blocker, the following cannot be marked complete even though code exists:
- Live sandbox verification of Airtime, Data, Utility, and Gift Card purchases (Part 20 of the original scope).
- Confirming actual Nigerian utility categories/billers and NGN-priced gift card brands.
- End-to-end testing of refund-on-failure behavior against real provider error responses (only the wallet-side logic has been code-reviewed, not exercised).

Everything explicitly out of scope for Phase 3 (Digital Marketplace, Seller System, Admin app, provider-management UI, Withdrawal/payout, gift card buyback, final production hardening) remains untouched, as instructed.

## 15. Recommended future work

1. **Immediate**: obtain a working Reloadly client ID/secret pair (re-check the dashboard's Sandbox toggle and Developers → API Settings page, or contact Reloadly support) and re-run `functions/scripts/testReloadly.js` to confirm authentication before doing anything else with these three services.
2. Once authenticated, run the full sandbox verification matrix originally requested (operator retrieval, auto-detect, purchases, invalid inputs, failure handling) for all four services.
3. Confirm real Nigerian utility categories/billers and NGN gift card brands, and adjust UI copy/expectations accordingly.
4. Consider a scheduled Cloud Function to periodically refresh `processing` orders (utility bills and gift cards) so they don't stay stuck indefinitely without any status update.
5. When ready to support gift card selling, evaluate providers with a documented buyback/valuation API and implement a new `GiftCardBuybackProvider` interface rather than extending `GiftCardProvider`.
