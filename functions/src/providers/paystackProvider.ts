import { PaymentProvider, InitializePaymentInput, InitializePaymentResult, WebhookVerificationResult, PaymentVerifier, ProviderVerificationResult } from './paymentProvider';
import { hmacSha512 } from '../utils';
import { CURRENCY } from '../config';

export class PaystackProvider implements PaymentProvider, PaymentVerifier {
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

  async verifyTransaction(reference: string, secret: string): Promise<ProviderVerificationResult> {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Paystack verification failed: ${error}`);
    }

    const payload = (await response.json()) as {
      status: boolean;
      message?: string;
      data: {
        reference: string;
        status: string;
        amount: number;
        currency: string;
      };
    };

    if (!payload.status) {
      throw new Error(`Paystack verification error: ${payload.message}`);
    }

    return {
      reference,
      providerReference: payload.data.reference,
      providerStatus: payload.data.status === 'success' ? 'successful' : payload.data.status === 'abandoned' ? 'abandoned' : 'failed',
      amount: payload.data.amount,
      currency: payload.data.currency || CURRENCY.code,
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
