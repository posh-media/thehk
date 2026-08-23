# THE-HK — Implemented Firestore Database Schema

> This document describes the Firestore collections that are actually implemented and deployed in Phase 2. Phase 3+ collections are noted as **reserved/planned**.

## Conventions

- All monetary `amount` / `balance` fields use the smallest currency unit for NGN (kobo), e.g. ₦1,000 = `100000`.
- `createdAt` and `updatedAt` are ISO 8601 strings (`YYYY-MM-DDTHH:mm:ssZ`).
- Document `id` is a Firebase-generated or application-generated string unless noted.

---

## Collection: `users`

**Purpose**

THE-HK application profile for each Firebase Authentication user. This is distinct from the Firebase Auth identity record.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Firebase Auth UID. Matches document ID. |
| `email` | `string` | Yes | Email from Firebase Auth, kept for querying/display. |
| `phone` | `string` / `null` | Optional | Phone number. |
| `displayName` | `string` / `null` | Optional | Display name from Firebase Auth / profile. |
| `firstName` | `string` / `null` | Optional | First name. |
| `lastName` | `string` / `null` | Optional | Last name. |
| `username` | `string` / `null` | Optional | THE-HK username. |
| `photoUrl` | `string` / `null` | Optional | Profile photo URL. |
| `country` | `string` / `null` | Optional | Country code. |
| `dateOfBirth` | `string` / `null` | Optional | Date of birth. |
| `role` | `string` | Yes | One of `user`, `seller`, `admin`, `support`. Defaults to `user`. |
| `isVerified` | `boolean` | Yes | Mirrors `emailVerified` from Firebase Auth. |
| `referralCode` | `string` | Yes (Phase 4+) | Unique code assigned at account creation (`onUserCreated`). Users created before Phase 4 do not have this field. |
| `referredBy` | `string` / `null` | Yes (Phase 4+) | The referrer's `userId`, set at most once via `applyReferral`. `null` if no referral code was applied. |
| `createdAt` | `string` | Yes | Account creation timestamp. |
| `updatedAt` | `string` | Yes | Last update timestamp. |

**Security rules**

- User can read own user document.
- User can update permitted profile fields.
- User cannot modify `role`, `isVerified`, `referralCode`, or `referredBy` directly (enforced via a Firestore rule `diff().affectedKeys()` check, added in Phase 4) — these are server-only fields.
- Admin can read/update.

**Relationships**

```
users/{userId}
   ↓ (one-to-one)
wallets/{userId}
   ↓ (one-to-many)
transactions/{transactionId}
   ↓ (one-to-one)
ledgerEntries/{ledgerEntryId}
   ↓ (one-to-many)
payments/{paymentId}
withdrawals/{withdrawalId}
notifications/{notificationId}
```

---

## Collection: `wallets`

**Purpose**

Stores the current balance for each user. Document ID is the `userId`.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | Yes | Firebase Auth UID. Matches document ID. |
| `balance` | `number` | Yes | Current total balance in kobo. |
| `availableBalance` | `number` | Yes | Available (not reserved) balance in kobo. |
| `pendingBalance` | `number` | Yes | Reserved/pending balance in kobo. Currently always `0`. Reserved for future withdrawal flow. |
| `currency` | `string` | Yes | `NGN`. |
| `firstFundedAt` | `string` | Optional (Phase 4+) | Set once, on the first successful wallet funding. Used only to gate referral activation (see `referrals` collection below) — not otherwise exposed in the UI. |
| `updatedAt` | `string` | Yes | Last wallet update. |

**Security rules**

- User can read own wallet.
- Client cannot write to wallet balance.
- All balance mutations are performed by Cloud Functions (`walletService.ts`).

**Relationships**

```
wallets/{userId}
   ↓ funds
transactions (user-facing)
   ↓ ledgerEntries
```

---

## Collection: `transactions`

**Purpose**

User-facing record of every financial event.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Firestore document ID. |
| `userId` | `string` | Yes | Owner. |
| `type` | `string` | Yes | `wallet_funding`, `withdrawal`, etc. |
| `amount` | `number` | Yes | Amount in kobo. |
| `currency` | `string` | Yes | `NGN`. |
| `status` | `string` | Yes | `pending`, `processing`, `successful`, `failed`, `cancelled`, `reversed`, `refunded`, `completed` (legacy UI alias). |
| `reference` | `string` | Yes | Unique THE-HK reference. |
| `providerReference` | `string` / `undefined` | Optional | External provider reference. |
| `description` | `string` | Yes | Human-readable description. |
| `metadata` | `map` | Optional | Additional context. |
| `createdAt` | `string` | Yes | Timestamp. |
| `updatedAt` | `string` | Yes | Timestamp. |

**Security rules**

- User can read own transactions.
- Client cannot create/update transactions.

**Relationships**

```
transactions/{transactionId}
   ← created by payments and withdrawals
   ↓ produces
ledgerEntries/{ledgerEntryId}
```

---

## Collection: `payments`

**Purpose**

Tracks an external payment attempt (Paystack / Korapay) before it becomes a wallet credit.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Firestore document ID. |
| `userId` | `string` | Yes | Owner. |
| `transactionId` | `string` | Yes | Related THE-HK transaction. |
| `amount` | `number` | Yes | Amount in kobo. |
| `currency` | `string` | Yes | `NGN`. |
| `provider` | `string` | Yes | `paystack`, `korapay`. |
| `status` | `string` | Yes | `pending`, `processing`, `successful`, `failed`, `abandoned`. |
| `reference` | `string` | Yes | THE-HK internal reference, also sent to provider. |
| `providerReference` | `string` / `undefined` | Optional | Provider's reference/transaction ID. |
| `authorizationUrl` | `string` / `undefined` | Optional | Checkout URL returned to client. |
| `metadata` | `map` | Optional | Provider metadata. |
| `createdAt` | `string` | Yes | Timestamp. |
| `updatedAt` | `string` | Yes | Timestamp. |

**Security rules**

- User can read own payments.
- Client cannot write or update payments.

**Relationships**

```
initiateWalletFunding
   ↓
creates transaction
   ↓
creates payment
   ↓
provider webhook
   ↓
verified by Cloud Function
   ↓
creates ledgerEntries and updates wallet
```

---

## Collection: `ledgerEntries`

**Purpose**

Immutable record of every financial movement that affected a wallet.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Firestore document ID. |
| `walletId` | `string` | Yes | Wallet userId / document ID. |
| `userId` | `string` | Yes | Owner. |
| `transactionId` | `string` | Yes | Related transaction. |
| `paymentId` | `string` / `undefined` | Optional | Related payment (for funding). |
| `withdrawalId` | `string` / `undefined` | Optional | Related withdrawal. |
| `type` | `string` | Yes | `credit` or `debit`. |
| `amount` | `number` | Yes | Amount in kobo. |
| `balanceAfter` | `number` | Yes | Wallet balance after this entry. |
| `description` | `string` | Yes | Description of the movement. |
| `createdAt` | `string` | Yes | Timestamp. |

**Security rules**

- User can read own ledger entries.
- Client cannot write, update, or delete ledger entries.

**Relationships**

```
ledgerEntries/{ledgerEntryId}
   ← always created by Cloud Functions
   ← references transaction, payment, withdrawal
```

---

## Collection: `withdrawals`

**Purpose**

Tracks bank withdrawal requests.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Firestore document ID. |
| `userId` | `string` | Yes | Owner. |
| `amount` | `number` | Yes | Amount in kobo. |
| `currency` | `string` | Yes | `NGN`. |
| `bankName` | `string` | Yes | Bank name. |
| `bankCode` | `string` | Yes | Bank code. |
| `accountNumber` | `string` | Yes | Account number. |
| `accountName` | `string` | Yes | Account name. |
| `status` | `string` | Yes | `pending`, `processing`, `successful`, `failed`, etc. |
| `reference` | `string` | Yes | THE-HK reference. |
| `note` | `string` / `undefined` | Optional | User note. |
| `createdAt` | `string` | Yes | Timestamp. |
| `updatedAt` | `string` | Yes | Timestamp. |

**Status in Phase 2**

The Cloud Function exists but the UI currently shows `Coming Soon` and does not create withdrawals.

**Relationships**

```
withdrawals/{withdrawalId}
   ← created by initiateWithdrawal Cloud Function
   ↓
creates transaction + ledger entry
```

---

## Collection: `notifications`

**Purpose**

In-app notifications for the user.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Firestore document ID. |
| `userId` | `string` | Yes | Owner. |
| `title` | `string` | Yes | Title. |
| `body` | `string` | Yes | Body. |
| `category` | `string` | Optional | `transaction`, `order`, `security`, `promotion`, `reward`, `referral`, or `system` (category list extended in Phase 4; created via `createNotification` in `functions/src/services/notificationService.ts`). |
| `isRead` | `boolean` | Yes | Read status. |
| `actionUrl` | `string` / `undefined` | Optional | Deep link / action. |
| `createdAt` | `string` | Yes | Timestamp. |

**Phase 4 note**: notifications are currently created for wallet-funding success (`transaction`) and referral-reward activation (`referral`). Push delivery (Expo/FCM/APNs) is not implemented — see `PHASE_4_COMPLETION_REPORT.md` for the credentials required before that can be added.

**Security rules**

- User can read own notifications.
- User can update `isRead` on own notifications.
- Client cannot create or delete notifications.

---

## Collection: `serviceOrders` (Phase 3)

**Purpose**

Records orders placed against external digital-service providers. A single, unified collection is used for every service type (rather than `airtimeOrders`/`dataOrders`/`billOrders`/`socialOrders`), distinguished by `serviceType`. Currently used for:
- Social media growth orders (The Owlet) — Phase 3A.
- Airtime and Data top-up orders (Reloadly) — Phase 3B.
- Bill/subscription orders (Reloadly Utility Payments) — Phase 3C. **Implemented but unverified** — see `PHASE_3C_COMPLETION_REPORT.md` (Reloadly sandbox credentials currently fail authentication).
- Gift card purchase orders (Reloadly Gift Cards, NGN-denominated products only) — Phase 3C. **Implemented but unverified** — same credential blocker.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Firestore document ID. |
| `userId` | `string` | Yes | Owner. |
| `serviceType` | `string` | Yes | `social_media`, `airtime`, `data`, `bill`, or `gift_card`. Orders created before Phase 3B predate this field and imply `social_media`. |
| `serviceId` | `string` | Yes | Provider's service id (Owlet service id; `<operatorId>:<amount>` for a Reloadly data plan; the operator id for airtime; the Reloadly biller id for bills; the Reloadly product id for gift cards). |
| `serviceName` | `string` | Yes | Human-readable service name, e.g. "MTN Nigeria Airtime", "Airtel 1GB - 30 Days", "Ikeja Electricity Prepaid", or "Amazon US ₦5,000". |
| `platform` | `string` | Yes | Provider category / network name (e.g. "Instagram", "MTN Nigeria"). |
| `provider` | `string` | Yes | External provider key: `owlet` or `reloadly`. |
| `link` | `string` | Yes | Target URL/username (social media), phone number (airtime/data), customer/meter/account number (bill), or recipient email (gift card). |
| `quantity` | `number` | Yes | Ordered quantity (social media units, number of gift cards, or `1` for airtime/data/bills). |
| `amount` | `number` | Yes | Authoritative server-calculated price, in kobo. |
| `status` | `string` | Yes | `pending`, `processing`, `successful`, `failed`, `cancelled`. |
| `reference` | `string` | Yes | THE-HK internal reference (`HK-SMM-…`, `HK-AIR-…`, `HK-DATA-…`, `HK-BILL-…`, `HK-GC-…`). |
| `transactionId` | `string` | Yes | Related `transactions` record (the wallet debit). |
| `providerOrderId` | `string` | Optional | The provider's own order/transaction id, used to poll status or (for gift cards) fetch the redeem code. |
| `createdAt` | `string` | Yes | Timestamp. |
| `updatedAt` | `string` | Yes | Timestamp. |

**Security rules**

- User can read own service orders.
- Client cannot create or update service orders — they are always created by `placeSocialMediaOrder`, `purchaseAirtime`, `purchaseData`, `payUtilityBill`, or `purchaseGiftCard` after an authoritative price check and a successful wallet debit. All five share the same `submitServiceOrder` helper (`functions/src/services/orderService.ts`).

**Relationships**

```
serviceOrders/{orderId}
   ← created by placeSocialMediaOrder / purchaseAirtime / purchaseData /
     payUtilityBill / purchaseGiftCard (Cloud Functions, via submitServiceOrder)
   ← references transactions/{transactionId} (the wallet debit)
   ← references ledgerEntries via the transaction
   → refunded via refundWalletDebit if provider submission explicitly fails
     (NOT refunded while a provider reports "processing" - see
     PHASE_3C_COMPLETION_REPORT.md for why)
```

**Note on catalog caching**

The Owlet service catalog, Reloadly airtime/data operator list, Reloadly utility biller list, and Reloadly gift card product catalog are all fetched live from their provider and cached **in memory inside the Cloud Function process** (1 hour TTL) rather than persisted to Firestore. For the Owlet catalog specifically this is a hard requirement (~5,000+ services would exceed Firestore's 1 MB per-document limit); for the smaller Reloadly catalogs it's simply a low-effort latency optimization. There is therefore no `serviceCatalog`, `billerCatalog`, or `giftCardCatalog` Firestore collection.

**Note on gift card currency scoping**

Only Reloadly gift card products priced in `NGN` are exposed to users. THE-HK's wallet is NGN-only, and Reloadly only reveals the exact NGN charge for foreign-currency products *after* placing the order (it performs FX conversion internally) - which is incompatible with THE-HK's server-authoritative "debit wallet before calling provider" pattern. This is a deliberate scoping decision, not a bug.

---

## Collection: `points` (Phase 4)

**Purpose**

One document per user holding their current HK Points balance. Kept as its own collection rather than a field on `wallets` or `users`, so points remain a clearly separate ledger from the naira wallet.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | Yes | Owner. Matches document ID. |
| `balance` | `number` | Yes | Whole HK Points (not kobo). |
| `updatedAt` | `string` | Yes | Timestamp. |

**Security rules**: user can read own; `allow write: if false` (Cloud Functions only).

---

## Collection: `pointsTransactions` (Phase 4)

**Purpose**

Auditable history of every points credit/debit.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Firestore document ID. |
| `userId` | `string` | Yes | Owner. |
| `type` | `string` | Yes | `wallet_conversion`, `referral_conversion`, `redeemed`, or `adjustment`. |
| `points` | `number` | Yes | Positive = credit, negative = debit. |
| `amount` | `number` | Optional | The kobo side of a conversion, where applicable. |
| `description` | `string` | Yes | Human-readable description. |
| `status` | `string` | Yes | Always `successful` today (conversions are synchronous). |
| `reference` | `string` | Yes | THE-HK reference (`HK-PTS-…`). |
| `createdAt` | `string` | Yes | Timestamp. |

**Security rules**: user can read own; `allow write: if false` (Cloud Functions only).

**Relationships**

```
points/{userId}
   ← credited by convertWalletToHkPoints (debits wallets/{userId} via debitWalletForOrder)
   ← credited by convertReferralToPoints (debits referralBalances/{userId})
   → pointsTransactions/{id} recorded for every credit
```

**Conversion rate**: `HK_POINTS_PER_NAIRA = 1` (1 NGN = 1 HK Point), defined once in `functions/src/config.ts` rather than hardcoded across screens/functions. Minimum conversion is ₦100 (`MIN_POINTS_CONVERSION_NAIRA`).

**Redemption**: the debit primitive for spending points exists implicitly in the credit/debit pattern above, but no reward catalog or redemption UI was built in Phase 4 (deferred — see `PHASE_4_COMPLETION_REPORT.md`).

---

## Collection: `referrals` (Phase 4)

**Purpose**

One document per referrer/referred-user pair, tracking activation and reward status.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Deterministic: `${referrerId}_${referredUserId}` (prevents duplicate referral records for the same pair). |
| `referrerId` | `string` | Yes | The referrer. |
| `referredUserId` | `string` | Yes | The new user who applied the code. |
| `status` | `string` | Yes | `pending` (code applied, not yet activated), `active` (reserved for future use), or `rewarded`. |
| `rewardAmount` | `number` | Yes | Kobo, credited to the referrer's `referralBalances` doc once activated. |
| `createdAt` | `string` | Yes | When the code was applied. |
| `activatedAt` | `string` | Optional | When the referred user's activation event occurred. |

**Security rules**: readable by either party in the pair, or admin; `allow write: if false` (Cloud Functions only).

**Activation rule (documented, configurable)**: a referral is rewarded on the referred user's **first successful wallet funding** (tracked via a new `firstFundedAt` field on `wallets/{userId}`, set once). This was a deliberate choice — a bare signup is trivial to farm for rewards, while requiring one real funding event is a simple, meaningful signal without building a fraud-scoring system. See `functions/src/services/referralService.ts`.

---

## Collection: `referralBalances` (Phase 4)

**Purpose**

Referral earnings, held separately from the wallet until the user explicitly converts them to HK Points.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | Yes | Owner. Matches document ID. |
| `balance` | `number` | Yes | Kobo. |
| `updatedAt` | `string` | Yes | Timestamp. |

**Security rules**: user can read own; `allow write: if false` (Cloud Functions only).

---

## Collection: `referralCodes` (Phase 4)

**Purpose**

Uniqueness index mapping a short public referral code to the owning user, so `applyReferral` can look up a referrer by code without a collection scan.

**Fields**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | `string` | Yes | 6-character code (document ID). Assigned randomly at account creation; collisions are retried. |
| `userId` | `string` | Yes | The code's owner. |
| `createdAt` | `string` | Yes | Timestamp. |

**Security rules**: readable by any authenticated user (lets the client validate a code exists before submitting it); `allow write: if false` (Cloud Functions only).

---

## Reserved / Planned for Future Phases

These collections may appear as TypeScript interfaces but are not fully implemented as deployed Firestore collections in Phase 2/3:

- `listings` — seller listings (Phase 1 mocks only)
- `marketplaceOrders` — marketplace order flow (Phase 1 mocks only)
- `socialProfiles` — user social media profiles (Phase 1 mocks only)
- `supportTickets` — support tickets (Phase 1 mocks only)
- Rewards catalog / vouchers / streaks — `rewards.ts` mock data still powers the "Available Rewards" list; no Firestore-backed catalog, redemption, voucher, or streak system was built in Phase 4 (deferred).
- `marketplaceProducts` / `sellerListings` / `sellerOrders` — digital marketplace + seller system (deferred to a future phase; existing Phase 1 `listings`/`marketplaceOrders` mocks remain the reference model to extend)
- Gift card selling/trading/buyback — no provider exists for this; only buying (via Reloadly) is implemented. See `PHASE_3C_COMPLETION_REPORT.md`.

`serviceOrders` supports all five `serviceType` values (`social_media`, `airtime`, `data`, `bill`, `gift_card`). Social media and airtime/data are deployed and were verified live in earlier phases; bill and gift card support is deployed but unverified against a live Reloadly account (see `PHASE_3C_COMPLETION_REPORT.md`).

---

## Indexes

Implemented in `firebase/firestore.indexes.json`.

| Collection | Fields | Order | Purpose |
|------------|--------|-------|---------|
| `transactions` | `userId` ASC, `createdAt` DESC | Composite | Query user transactions newest first. |
| `notifications` | `userId` ASC, `createdAt` DESC | Composite | Query user notifications newest first. |
| `payments` | `userId` ASC, `createdAt` DESC | Composite | Query user payments. |
| `ledgerEntries` | `walletId` ASC, `createdAt` DESC | Composite | Query wallet ledger history. |
| `withdrawals` | `userId` ASC, `createdAt` DESC | Composite | Query user withdrawals. |
| `marketplaceOrders` | `buyerId` ASC, `createdAt` DESC | Composite | Query buyer orders. |
| `marketplaceOrders` | `sellerId` ASC, `createdAt` DESC | Composite | Query seller orders. |
| `serviceOrders` | `userId` ASC, `createdAt` DESC | Composite | Query a user's service orders (social media, future airtime/data). |
| `pointsTransactions` | `userId` ASC, `createdAt` DESC | Composite | Query a user's points history newest first. |
| `referrals` | `referrerId` ASC, `createdAt` DESC | Composite | Query a user's referred users newest first. |

---

## Access Model Summary

| Collection | User Read | User Write | Server/Admin Write | Notes |
|------------|-----------|------------|--------------------|-------|
| `users` | own | own profile fields only | admin | Cannot modify role/isVerified/referralCode/referredBy (Phase 4 rule tightening). |
| `wallets` | own | no | Cloud Functions | All financial mutations server-side. |
| `transactions` | own | no | Cloud Functions | User cannot create/fake transactions. |
| `payments` | own | no | Cloud Functions | Created/updated by payment webhooks. |
| `ledgerEntries` | own | no | Cloud Functions | Immutable, server-only. |
| `withdrawals` | own | no | Cloud Functions | UI is disabled in Phase 2. |
| `notifications` | own | own `isRead` | Cloud Functions | Backend creates notifications. |
| `points` | own | no | Cloud Functions | HK Points balance. |
| `pointsTransactions` | own | no | Cloud Functions | Points history, immutable. |
| `referrals` | either party | no | Cloud Functions | Reward status/activation. |
| `referralBalances` | own | no | Cloud Functions | Referral earnings, separate from wallet. |
| `referralCodes` | any authenticated user | no | Cloud Functions | Public lookup index, no sensitive data. |
