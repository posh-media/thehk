export interface InitializePaymentInput {
  amount: number; // kobo
  email: string;
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  providerReference?: string;
}

export interface WebhookVerificationResult {
  reference: string; // internal THE-HK reference
  providerReference: string;
  providerStatus: 'successful' | 'failed' | 'abandoned';
  amount: number; // kobo
  currency: string;
}

export interface PaymentProvider {
  name: string;
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
  handleWebhook(rawPayload: string, signature: string | undefined, secret: string): WebhookVerificationResult | null;
}
