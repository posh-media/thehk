# THE-HK AI Receipt Prototype — Final Report

**Date:** 2026-09-14
**Prototype location:** `prototypes/ai-receipt/`
**Function:** `aiReceiptPrototypeFn` (Firebase Cloud Functions, `us-central1`)

## 1. Primary model attempted

`gemini-3.1-flash-image` on the **Gemini Developer API** (`generativelanguage.googleapis.com`).

## 2. Did the primary model work?

**No.** Every request to `gemini-3.1-flash-image` through the Gemini Developer API returned:

```json
{
  "error": {
    "code": 401,
    "status": "UNAUTHENTICATED",
    "message": "Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential.",
    "details": [{
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      "reason": "ACCESS_TOKEN_TYPE_UNSUPPORTED"
    }]
  }
}
```

This was reproduced with:
- The official `@google/genai` SDK (`apiKey` path).
- A manual REST call using the documented `x-goog-api-key` header.
- A manual REST call using the `?key=` query parameter.

## 3. Exact reason the primary model failed

The API key created in Google AI Studio is the newer `AQ.*` “authorization key” format. Public Google AI Developer forum reports confirm that `AQ.*` keys are currently rejected by `generativelanguage.googleapis.com` with `ACCESS_TOKEN_TYPE_UNSUPPORTED` for some accounts/projects, even though the request is formed correctly. The issue is not the code or the request format — the same code and headers work with older `AIzaSy*` standard keys, and standard/API-key transmission is exactly what Google’s documentation prescribes.

This was an **authentication/access failure before inference**, not a model-availability or capacity failure.

## 4. Fallback model used

`gemini-2.5-flash-image` on **Vertex AI** (`us-central1`).

## 5. Did the fallback require a paid tier?

Vertex AI calls are billed to the Google Cloud project (`poshmedia-thehk`). The project has an active service account and the Cloud Functions runtime was able to authenticate via Application Default Credentials. The claimed $10 Google Cloud/AI credit may apply, but the key used for the Gemini Developer API was never accepted, so that credit was not directly consumed by this prototype.

## 6. Was the claimed $10 credit usable?

**Not via the Gemini Developer API key path**, because the key was rejected before any chargeable inference occurred. The fallback used the project’s existing Vertex AI / Google Cloud billing.

## 7. API used for final generations

**Vertex AI** (`aiplatform.googleapis.com`) with `gemini-2.5-flash-image`.

## 8. Secret-management method

- The Gemini API key is stored in **Google Cloud Secret Manager** as `GEMINI_API_KEY`.
- The Firebase Cloud Function opts into the secret via `runWith({ secrets: ['GEMINI_API_KEY'] })`.
- The key is injected as a runtime environment variable; it is **not** in source code, `.env`, the client app, logs, or API responses.
- The key value is `trim()`ed before use to avoid accidental whitespace.
- The prototype runner’s Firebase Auth token is read from the root `.env` file, but the API key itself never leaves the server.

## 9. Number of generations

5 successful generations:

| Run | Model | Resolution | API | Status |
|-----|-------|------------|-----|--------|
| test-access | gemini-2.5-flash-image | 1K | Vertex AI | Success |
| test-1 | gemini-2.5-flash-image | 1K | Vertex AI | Success |
| test-2 | gemini-2.5-flash-image | 2K | Vertex AI | Success |
| test-3 | gemini-2.5-flash-image | 1K | Vertex AI | Success |
| repeat-1 | gemini-2.5-flash-image | 1K | Vertex AI | Success |

One additional generation attempt was aborted because of a local network reset (`ECONNRESET`) while reading the response body; the function itself did not error.

## 10. Approximate cost

Vertex AI `gemini-2.5-flash-image` pricing is roughly:
- Input: ~$0.30 / 1M tokens
- Output: ~$2.50 / 1M tokens

A single 1K receipt image consumes roughly 1,000–1,500 output tokens. Estimated cost per image: **$0.003–$0.006**. Total for 5 images: **≈ $0.02–$0.03**.

## 11. Output resolution

- `1K` generations produced images around 928 × 1152 px.
- `2K` generation produced an image around 1152 × 2048 px.

## 12–17. OCR accuracy by field

### test-1 (1K) — Expected values
- Amount: `₦1,000,000.00`
- Sender: `OLUWASEUN PRAISE AKINROLABU`
- Sender account: `0123456789`
- Receiver: `AYOMIDE COLLINS AKINBANI`
- Receiver account: `9876543210`
- Date/time: `Sep 13th, 2026 14:30:05`
- Reference: `HK-PAY-TEST-000123456789`

**OCR extracted:**
- Amount: `₦1,000.00.00` ❌ (extra decimal segment)
- Sender name: `OLUWASEUN PRAISE AKINROLABU` ✅
- Sender account: `0123456889` ❌
- Receiver name: `AYOMIDE COLLINS AKINBANI` ✅
- Receiver account: `9876542610` ❌
- Date/time: `Sep 13th, 2026 14:30:05` ✅
- Reference: `HK-PAY-TEST-0001233789` ❌

### test-2 (2K) — Expected values
- Amount: `₦250,000.50`
- Sender account: `0000123456`
- Receiver account: `9999888877`
- Reference: `HK-REF-ALPHA-999888777`

**OCR extracted:**
- Amount: `₦250,000.50` ✅ (visually correct; OCR symbol was `§`)
- Sender account: `603****66` ❌ (masked and altered)
- Receiver account: split/altered ❌
- Reference: `HK-REF-ALPHA-999888777` ✅

### test-3 (1K) — Expected values
- Amount: `₦9,999.99`
- Sender account: `0011223344`
- Receiver account: `5566778899`
- Reference: `HK-TRF-BETA-111222333444`

**OCR extracted:**
- Amount: `₦9,999.99` ✅ (visually correct)
- Sender account: `001*****444` ❌ (masked)
- Receiver account: not clearly rendered ❌
- Reference: `HK-TRF-BETA-1112233444` ❌

### repeat-1 (1K) — identical inputs to test-1

**OCR extracted:**
- Amount: `₦1,000,000.00` ✅
- Sender account: `01235566789` ❌
- Receiver account: `98754421610` ❌
- Reference: `HK-PAY-TEST-0001236789` ❌

## 18. Visual similarity

High. The generated images closely follow the reference OPay receipt:
- Green OPay logo and amount styling.
- “Share Receipt” header and back arrow.
- Dashed separator lines.
- “Share as image / Share as PDF” footer.
- Promotional/disclaimer text copied from the reference.
- Overall mobile-screen aspect ratio and white card container.

## 19. Repeatability

**Poor.** The same prompt, reference image, transaction data, model, and resolution produced different account numbers and references across runs. The model also masked account digits in some runs (`***`) and invented extra decimal segments in others.

## 20. Common failure modes

1. **Digit substitution/insertion:** account numbers and references frequently have digits changed or dropped.
2. **Extra formatting artifacts:** amount rendered as `1,000.00.00` in one run.
3. **Privacy-style masking:** the model spontaneously masked account numbers (`603****66`, `001*****444`), ignoring the instruction to reproduce the exact supplied values.
4. **Currency symbol OCR confusion:** OCR occasionally reads `₦` as `#` or `§`, though visually it appears as `₦`.
5. **Layout drift:** in test-2, account numbers were split across lines and misaligned.

## 21. Overall PASS/FAIL

**FAIL** for the stated business requirement of preserving exact financial transaction information.

The model is visually convincing but **not reliable enough** for Bank Gen receipts, because it alters, masks, or invents financial data even when explicitly instructed not to.

## 22. Recommendation for THE-HK Bank Gen

**Do not replace the existing deterministic Bank Gen renderer with pure AI generation at this time.**

Recommended path:
- Keep the current server-authoritative payment flow and deterministic receipt rendering.
- If AI is desired, use it only as a **style/texture reference** or **background layer**, with all transaction text rendered deterministically (e.g., SVG/Canvas with known fonts and layout) and composited onto the AI background.
- If Google resolves the `AQ.*` key issue for the Gemini Developer API, re-test `gemini-3.1-flash-image` with the same strict OCR validation before considering it.
- Consider `gemini-2.5-flash-image` (or a future Imagen / Veo model) only if the prompt/pipeline can be made to reproduce exact numeric strings 100% of the time — current testing shows it cannot.
