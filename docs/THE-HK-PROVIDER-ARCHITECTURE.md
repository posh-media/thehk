# THE-HK — Digital Service Provider Architecture

This document explains how THE-HK integrates external digital-service providers (social media growth, airtime/data, utility bills, gift cards) and how a future provider can be swapped in without touching wallet, order, or UI code.

## Design principle

```
THE-HK UI / business logic
          ↓
THE-HK provider interface (normalized domain model)
          ↓
Provider adapter (translates provider-specific request/response shapes)
          ↓
External API
```

Business logic (Cloud Functions in `functions/src/services/*.ts`) and the client UI depend only on THE-HK's own interfaces, defined in `functions/src/providers/*Provider.ts`. They never see a provider's raw response shape directly — each adapter normalizes it first. This means a new provider can be introduced by writing one new adapter class; nothing else needs to change.

## Interfaces and current implementations

| Domain | Interface | File | Current implementation |
|--------|-----------|------|--------------------------|
| Social media growth | `SocialServiceProvider` | `providers/serviceProvider.ts` | `OwletProvider` (`providers/owletProvider.ts`) |
| Airtime / Data | `AirtimeDataProvider` | `providers/utilityProvider.ts` | `ReloadlyProvider` (`providers/reloadlyProvider.ts`) |
| Utility / Bill payments | `BillProvider` | `providers/utilityProvider.ts` | `ReloadlyUtilityProvider` (`providers/reloadlyUtilityProvider.ts`) |
| Gift cards (buying) | `GiftCardProvider` | `providers/giftCardProvider.ts` | `ReloadlyGiftCardProvider` (`providers/reloadlyGiftCardProvider.ts`) |
| Payments (wallet funding) | `PaymentProvider` | `providers/paymentProvider.ts` | `PaystackProvider`, `KorapayProvider` |

Each service (`functions/src/services/socialService.ts`, `utilityService.ts`, `billService.ts`, `giftCardService.ts`) takes a provider instance as a constructor/function argument rather than importing Reloadly or Owlet directly. `functions/src/index.ts` is the only place where a concrete provider is instantiated and wired to a Cloud Function — this is the single place you'd change to switch providers.

### Example: swapping Airtime from Reloadly to another provider

```ts
// functions/src/index.ts (today)
const reloadlyProvider = new ReloadlyProvider(SECRETS.reloadly.clientId, SECRETS.reloadly.clientSecret, SECRETS.reloadly.sandbox);

// Future: a different provider, or Owlet's separate consumer airtime product
const airtimeProvider = new SomeOtherProvider(SECRETS.otherProvider.apiKey);
```

`utilityService.ts`, the `purchaseAirtime`/`purchaseData` Cloud Functions, and the client UI (`app/services/airtime.tsx`, `data.tsx`) would require **zero changes** as long as `SomeOtherProvider implements AirtimeDataProvider`.

### Shared Reloadly OAuth client

Reloadly issues a separate access token per product ("audience") even though the auth endpoint is shared. `providers/reloadlyClient.ts` (`ReloadlyClient`) centralizes token fetch/caching so the three Reloadly adapters (Airtime/Data, Utility, Gift Cards) don't each reimplement OAuth. This is a small, justified shared utility — not a general-purpose "provider framework" — introduced only because three products now share the exact same auth mechanism.

### Shared order/wallet flow

`functions/src/services/orderService.ts` exports `submitServiceOrder`, used by all four service types (social media, airtime, data, bills, gift cards). It is the single place that:
1. Calls `debitWalletForOrder` (from `walletService.ts`) - server-authoritative wallet debit.
2. Creates the `serviceOrders` record.
3. Calls the provider.
4. On explicit provider failure, calls `refundWalletDebit`.
5. On a provider result of `processing` (common for utility bills and some gift card orders), leaves the order/wallet alone rather than guessing success or failure.

This is the mechanism referred to elsewhere as "no parallel financial systems" — every service order, regardless of which external provider fulfills it, moves money through exactly one code path.

## Future: admin-controlled provider switching

Not built in this phase (explicitly out of scope), but the architecture supports it cleanly later:
- Each service already resolves to exactly one provider instance in `index.ts`.
- A future admin app could store an "active provider" selection per service type in Firestore (e.g. a `providerConfig` collection, admin-write-only) and `index.ts` could read it at cold start to decide which adapter to instantiate.
- No changes would be needed to `orderService.ts`, `walletService.ts`, or any UI screen — only to which adapter class gets instantiated for a given service.

## Reloadly configuration

### Environment variables (server-side only, `functions/.env`)

| Variable | Purpose |
|----------|---------|
| `RELOADLY_CLIENT_ID` | Reloadly OAuth2 client id |
| `RELOADLY_CLIENT_SECRET` | Reloadly OAuth2 client secret |
| `RELOADLY_SANDBOX` | `"true"` to use Reloadly's sandbox environment, unset/`"false"` for production |

These are never sent to the client, never returned from any Cloud Function, and are excluded from git via `functions/.env` being listed in `.gitignore`.

### Sandbox vs production base URLs (per Reloadly product/"audience")

| Product | Sandbox | Production |
|---------|---------|------------|
| Airtime / Data | `https://topups-sandbox.reloadly.com` | `https://topups.reloadly.com` |
| Gift Cards | `https://giftcards-sandbox.reloadly.com` | `https://giftcards.reloadly.com` |
| Utility Payments | `https://utilities-sandbox.reloadly.com` | `https://utilities.reloadly.com` |

Each product requires its own access token (requested with its own `audience` value) — a token for one product does not authenticate calls to another, even in the same environment.

## Supported services (as confirmed by Reloadly's public documentation)

- **Airtime/Data**: `GET /operators/countries/{iso}`, `GET /operators/auto-detect/phone/{phone}/countries/{iso}`, `GET /operators/{id}`, `POST /topups`.
- **Utility Payments**: `GET /billers` (filterable by `countryISOCode`, `type`, `serviceType`), `POST /pay`. Confirmed biller `type` values: `ELECTRICITY_BILL_PAYMENT`, `WATER_BILL_PAYMENT`, `TV_BILL_PAYMENT`, `INTERNET_BILL_PAYMENT`. **No customer/meter pre-payment verification endpoint is documented** — `BillProvider.verifyCustomer` intentionally returns `null` for Reloadly.
- **Gift Cards**: `GET /products` (filterable by `countryCode`), `GET /products/{id}`, `POST /orders`, `GET /orders/transactions/{id}/cards` (redeem codes), `GET /redeem-instructions/{brandId}`.

## Known limitations

1. **Sandbox credentials currently fail authentication.** The `RELOADLY_CLIENT_ID`/`RELOADLY_CLIENT_SECRET` pair configured for THE-HK returns `401 INVALID_CREDENTIALS` from Reloadly's own auth endpoint for all three products. This was verified directly against `https://auth.reloadly.com/oauth/token` outside of Firebase, so it is not a bug in THE-HK's request format. See `PHASE_3C_COMPLETION_REPORT.md`.
2. **Gift cards are NGN-only.** Foreign-currency gift card products are filtered out of the catalog because Reloadly only reveals the exact NGN charge after an order is placed (it performs FX conversion internally), which is incompatible with THE-HK's "debit wallet before calling the provider" safety pattern.
3. **No customer verification for utility bills.** Reloadly's Utility Payments API has no documented pre-payment verification/lookup endpoint, so the UI shows a clear disclaimer instead of fabricating a "verified" customer name.
4. **Utility payments are frequently asynchronous.** Reloadly's own examples show a `PROCESSING` status with a `finalStatusAvailabilityAt` up to 24 hours later. THE-HK does not auto-refund `processing` orders (only explicit `failed` results trigger a refund) to avoid double-spend/refund races - this means a genuinely stuck "processing" bill payment currently has no automated resolution path (see Future Work).

## Future provider integration process

To add a new provider for an existing service type:
1. Implement the relevant interface (`AirtimeDataProvider`, `BillProvider`, `GiftCardProvider`, or `SocialServiceProvider`) in a new file under `functions/src/providers/`.
2. Add any required secrets to `functions/src/config.ts` (`SECRETS.<provider>`) and `functions/.env`.
3. Instantiate the new adapter in `functions/src/index.ts` and pass it to the relevant service function(s) instead of the current adapter.
4. No changes to `orderService.ts`, `walletService.ts`, Firestore rules, or client UI should be necessary.
