# PHASE 5 — VTU.ng Airtime/Data Provider Integration Report

## Summary

VTU.ng has been added as a first-class alternative Airtime/Data provider for THE-HK alongside the existing Reloadly implementation. The existing provider abstraction, wallet/order flow, and client UI remain unchanged. VTU.ng is now the default for airtime and data; Reloadly is still available via `AIRTIME_DATA_PROVIDER=reloadly` / `DATA_PROVIDER=reloadly` or the `adminPanel/platformConfig` document.

## What was implemented

### 1. VTU.ng adapter (`functions/src/providers/vtungProvider.ts`)

- Implements `AirtimeDataProvider` from `functions/src/providers/utilityProvider.ts`.
- `listOperators('NG')` returns the static Nigerian network list (`mtn`, `glo`, `airtel`, `9mobile`, `smile`).
- `detectOperator(phone, 'NG')` maps local and `+234` prefixes to a network; returns `null` for unknown prefixes so the user can still select manually.
- `getDataPlans(service_id)` calls the public `GET /api/v2/variations/data?service_id=<service_id>` endpoint and returns available plans.
- `purchaseAirtime` calls `POST /api/v2/airtime` with `request_id`, `phone`, `service_id`, `amount`.
- `purchaseData` calls `POST /api/v2/data` with `request_id`, `phone`, `service_id`, `variation_id`.
- `requeryOrder(requestId)` calls `POST /api/v2/requery` and returns a normalized `RemoteTopupResult`.
- Maps VTU.ng statuses (`completed-api`, `processing-api`, `refunded`, `failed`, `cancelled`) to THE-HK's `successful` / `processing` / `failed`.

### 2. JWT HTTP client (`functions/src/providers/vtungClient.ts`)

- Authenticates with `POST /jwt-auth/v1/token`.
- Caches the JWT per Cloud Function instance and refreshes on 403.
- `verifyVtungPayload(rawPayload, signature, userPin)` verifies HMAC-SHA256 webhook signatures.

### 3. Webhook handling (`functions/src/services/vtungWebhookService.ts`)

- `processVtungWebhook(rawPayload, signature, userPin)`:
  - Verifies the `X-Signature` HMAC-SHA256 using `VTUNG_USER_PIN`.
  - Looks up the matching THE-HK `serviceOrders` document by `providerReference` (VTU `request_id`).
  - On `completed-api`, marks the order `successful`.
  - On `refunded` / `failed` / `cancelled`, refunds the wallet (and cashback, if used) and marks the order accordingly.
- `reconcileVtungOrder(requestId, result)` is also used by the requery callables.

### 4. Factory, config, and admin defaults

- `functions/src/providers/providerFactory.ts` now recognizes `vtung`, `reloadly`, and `owlet`.
- `functions/src/config.ts` loads `VTUNG_USERNAME`, `VTUNG_PASSWORD`, `VTUNG_USER_PIN`, `VTUNG_API_BASE_URL`.
- `functions/src/services/adminPanelService.ts` now defaults to `airtimeProvider: 'vtung'`, `dataProvider: 'vtung'`, `billProvider: 'reloadly'`.
- `functions/.env.example` created with all new variables and provider-routing envs.

### 5. Order/wallet wiring

- `functions/src/services/orderService.ts`:
  - `RemoteTopupResult` now carries an optional `providerRequestId`.
  - `ServiceOrderRecord` persists `providerOrderId` and `providerReference` (the VTU `request_id`).
  - Added `refundServiceOrder(order, reason)` for webhook/refund scenarios.
- `functions/src/services/utilityService.ts`:
  - Generates a unique `requestId` for each airtime/data order.
  - Passes it to the provider and stores it as `providerReference`.
- `ServiceOrderStatus` extended to include `'refunded'`.

### 6. Cloud Functions (`functions/src/index.ts`)

- `vtungWebhook` — HTTPS `onRequest` endpoint for VTU.ng callbacks.
- `requeryAirtimeOrder` / `requeryDataOrder` — authenticated `onCall` functions to manually requery a VTU.ng order by `requestId`.

## Validation (no real purchases)

- `node node_modules\typescript\bin\tsc` in `functions/` compiled without errors.
- Manual smoke tests against the live public variation endpoint succeeded:

```
listOperators('NG')      -> 5 networks
getDataPlans('mtn')      -> 9 available plans (e.g. 1GB + 1.5 mins - 1 Day @ ₦499)
detectOperator('08012345678','NG') -> Airtel Nigeria
detectOperator('+2348031234567','NG') -> MTN Nigeria
```

- HMAC-SHA256 webhook verification test passed.
- Purchase, requery, and webhook paths are not exercised with real VTU.ng credentials; they are type-checked and structurally validated.

## Required environment variables

Set these in `functions/.env` (or Firebase Functions config) **only on the server**:

```
VTUNG_USERNAME=your_vtu_email_or_username
VTUNG_PASSWORD=your_vtu_password
VTUNG_USER_PIN=your_vtu_webhook_pin
VTUNG_API_BASE_URL=https://vtu.ng/wp-json/api/v2
AIRTIME_DATA_PROVIDER=vtung
DATA_PROVIDER=vtung
```

Optional: `BILL_PROVIDER=reloadly` is unchanged.

## Next steps to go live

1. Create/reseller-enable a VTU.ng account and complete KYC.
2. Whitelist the Cloud Functions egress IP(s) in VTU.ng developer settings.
3. Set `VTUNG_USERNAME`, `VTUNG_PASSWORD`, `VTUNG_USER_PIN` in the Firebase Functions environment.
4. Configure the VTU.ng webhook URL to `https://<region>-<projectId>.cloudfunctions.net/vtungWebhook`.
5. Fund the VTU.ng wallet and run a small real airtime purchase in a sandbox/test environment (VTU.ng has no sandbox; use a small live amount).
6. If VTU.ng should not be the default, set `AIRTIME_DATA_PROVIDER=reloadly` and update the `adminPanel/platformConfig` document.

## Files changed

- `functions/src/providers/utilityProvider.ts` — interface additions
- `functions/src/providers/vtungProvider.ts` — new
- `functions/src/providers/vtungClient.ts` — new
- `functions/src/providers/reloadlyProvider.ts` — `requestId` passthrough, `requeryOrder`
- `functions/src/providers/providerFactory.ts` — VTU.ng wiring
- `functions/src/services/utilityService.ts` — `requestId` generation
- `functions/src/services/orderService.ts` — `providerReference`, `refundServiceOrder`
- `functions/src/services/vtungWebhookService.ts` — new
- `functions/src/services/adminPanelService.ts` — default to VTU.ng
- `functions/src/config.ts` — VTU.ng secrets
- `functions/src/index.ts` — `vtungWebhook`, `requeryAirtimeOrder`, `requeryDataOrder`
- `functions/src/types.ts` — `ServiceOrderRecord` + `refunded` status
- `functions/.env.example` — new

## Notes

- Existing Reloadly gift cards and bill payments are untouched.
- The client UI (`app/services/airtime.tsx`, `app/services/data.tsx`) did not require changes because it already depends on the normalized `UtilityRepository` interface.
- `request_id` is generated by THE-HK and mapped to `providerReference` on the order for requery and webhook correlation.
