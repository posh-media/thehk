# Reloadly Sandbox Authentication — Diagnostic Report

## Conclusion

The implementation is correct per Reloadly's current official documentation. The credentials themselves are being rejected by Reloadly's own authentication server. This is not an endpoint, audience, or code issue on THE-HK's side.

## What was re-verified against Reloadly's current official docs

1. **Auth endpoint**: `POST https://auth.reloadly.com/oauth/token` — confirmed current (official OpenAPI spec, `support.reloadly.com` quickstart, and Reloadly blog quickstarts all agree).
2. **Request format**: `{ client_id, client_secret, grant_type: "client_credentials", audience }` — confirmed current (matches Reloadly's published `TokenRequest` schema exactly).
3. **Audience per product** (sandbox), confirmed from `support.reloadly.com/locating-your-api-credentials`:
   - Airtime/Data: `https://topups-sandbox.reloadly.com`
   - Gift Cards: `https://giftcards-sandbox.reloadly.com`
   - Utility Payments: `https://utilities-sandbox.reloadly.com`
   This is exactly what THE-HK's `ReloadlyClient`/`ReloadlyProvider`/`ReloadlyUtilityProvider`/`ReloadlyGiftCardProvider` already use.
4. **Separate credentials per environment, not per product**: Reloadly's docs confirm Sandbox and Live each have one client_id/secret pair from the portal's Developers → API Settings page (toggled via the Sandbox/Live switch), and that **the same sandbox pair is used across Airtime, Gift Cards, and Utility Payments** — you request a different access token per product (different `audience`), but from the same client_id/secret. THE-HK's code already does this correctly (one credential pair, three `ReloadlyClient` instances with different audiences).
5. **Token exchange mechanics**: OAuth2 client-credentials grant, `Content-Type: application/json`, response is `{ access_token, token_type: "Bearer", expires_in, scope }`. Matches THE-HK's implementation.

## The actual error, and why it points to the credentials themselves

Reloadly's own support documentation distinguishes two different auth failure modes:

- **`access_denied` / "Service not enabled within domain"** → you have valid credentials but used them with the wrong audience/environment (e.g. sandbox credentials against a live URL). This is a mismatch error.
- **`401` / `errorCode: "INVALID_CREDENTIALS"` / `"Access Denied"`** → the `client_id`/`client_secret` pair itself is not recognized by Reloadly at all, regardless of audience.

THE-HK is consistently getting the **second** kind, verbatim:

```
401 {"timeStamp":"...","message":"Access Denied","path":"/oauth/token","errorCode":"INVALID_CREDENTIALS","infoLink":null,"details":[]}
```

This was reproduced identically across all three product audiences, on two separate occasions (Phase 3C and again just now in Phase 4), using a byte-for-byte verified credential pair (correct lengths, no whitespace/encoding corruption, confirmed via a local Node script reading directly from `functions/.env`). If this were an audience mismatch, Reloadly's server would return the `access_denied` / "Service not enabled within domain" message instead — it does not.

## Most likely causes (in order of likelihood, per Reloadly's own support articles)

1. **The credential pair is not actually the current Sandbox client_id/secret for this account** — e.g. it was copied while the dashboard's Live/Sandbox toggle was in the wrong position, is from a different/deleted app, or was mistyped/truncated when it was shared.
2. **The sandbox account itself was never fully activated** — Reloadly requires clicking an email activation link (expires in 30 minutes) and completing an onboarding form after registration before the API will work at all.
3. **The credentials have been regenerated/revoked** in the dashboard since they were issued (Reloadly allows regenerating the client secret, which invalidates the old one immediately).

## What I did NOT do

- Did not guess additional endpoints or retry with modified/invented credentials.
- Did not fall back to production URLs or credentials.
- Did not fabricate a "successful" result.
- Did not modify THE-HK's wallet/order/provider architecture to work around this — the architecture is confirmed correct.

## What I need from you

Please check the Reloadly dashboard directly:
1. Confirm the **Sandbox toggle** (top-right of the dashboard) is ON.
2. Go to **Developers → API Settings** and copy the Client ID and Client Secret shown **while Sandbox is toggled on**.
3. Confirm the account's email activation was completed (check for a Reloadly activation email if the account is new).
4. If the secret was ever regenerated, make sure you're copying the current one.

Send me a fresh copy of both values and I'll re-run the same verification script immediately (it takes under a minute) before touching any more code.
