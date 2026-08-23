import { PaymentProvider, InitializePaymentInput, InitializePaymentResult, WebhookVerificationResult } from './paymentProvider';
import { hmacSha512 } from '../utils';
import { CURRENCY } from '../config';

export class PaystackProvider implements PaymentProvider {
  name = 'paystack';
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async initialize(input: InitializePaymentInput): Promise<InitializePaymentResult> {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amount,
        email: input.email,
        reference: input.reference,
        currency: CURRENCY.code,
        callback_url: input.metadata?.callbackUrl,
        metadata: input.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Paystack initialize failed: ${error}`);
    }

    const data = (await response.json()) as { status: boolean; message?: string; data: { authorization_url: string; reference: string } };
    if (!data.status) throw new Error(`Paystack initialize error: ${data.message}`);

    return {
      authorizationUrl: data.data.authorization_url,
      providerReference: data.data.reference,
    };
  }

  handleWebhook(rawPayload: string, signature: string | undefined, secret: string): WebhookVerificationResult | null {
    if (!signature) throw new Error('Missing Paystack webhook signature');

    const hash = hmacSha512(secret, rawPayload);
    if (hash !== signature) throw new Error('Invalid Paystack webhook signature');

    const payload = JSON.parse(rawPayload);
    const event = payload.event;
    const data = payload.data;
    if (event !== 'charge.success') return null;

    const reference = data.reference as string;
    if (!reference) throw new Error('Missing reference in Paystack webhook');

    return {
      reference,
      providerReference: data.reference,
      providerStatus: data.status === 'success' ? 'successful' : 'failed',
      amount: data.amount as number,
      currency: (data.currency as string) || CURRENCY.code,
    };
  }
}
