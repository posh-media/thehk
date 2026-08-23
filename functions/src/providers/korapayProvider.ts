import { PaymentProvider, InitializePaymentInput, InitializePaymentResult, WebhookVerificationResult } from './paymentProvider';
import { hmacSha256 } from '../utils';
import { CURRENCY } from '../config';

export class KorapayProvider implements PaymentProvider {
  name = 'korapay';
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const response = await fetch('https://api.korapay.com/merchant/api/v1/charges/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: input.reference,
        amount: input.amount / CURRENCY.minorUnit,
        currency: CURRENCY.code,
        customer: { email: input.email },
        metadata: input.metadata,
        redirect_url: input.metadata?.callbackUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Korapay initialize failed: ${error}`);
    }

    const data = (await response.json()) as { status: boolean; message?: string; data: { checkout_url: string } };
    if (!data.status) throw new Error(`Korapay initialize error: ${data.message}`);

    return {
      authorizationUrl: data.data.checkout_url,
      providerReference: input.reference,
    };
  }

  handleWebhook(rawPayload: string, signature: string | undefined, secret: string): WebhookVerificationResult | null {
    if (!signature) throw new Error('Missing Korapay webhook signature');

    const hash = hmacSha256(secret, rawPayload);
    if (hash !== signature) throw new Error('Invalid Korapay webhook signature');

    const payload = JSON.parse(rawPayload);
    const event = payload.event;
    const data = payload.data;
    if (event !== 'charge.success') return null;

    const reference = data.reference as string;
    if (!reference) throw new Error('Missing reference in Korapay webhook');

    const amountInKobo = Math.round((data.amount as number) * CURRENCY.minorUnit);

    return {
      reference,
      providerReference: data.reference,
      providerStatus: data.status === 'success' ? 'successful' : 'failed',
      amount: amountInKobo,
      currency: (data.currency as string) || CURRENCY.code,
    };
  }
}
