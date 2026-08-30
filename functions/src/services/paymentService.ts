import { db } from '../admin';
import { PaymentProvider } from '../providers/paymentProvider';
import { PaystackProvider } from '../providers/paystackProvider';
import { KorapayProvider } from '../providers/korapayProvider';
import { createPayment, processPaymentVerification, ensureWallet } from './walletService';
import { maybeRewardReferralActivation } from './referralService';
import { createNotification } from './notificationService';
import { CURRENCY, MIN_FUNDING_AMOUNT, toKobo, fromKobo } from '../config';
import { Payment } from '../types';
import { SECRETS } from '../config';

function getProvider(provider: string): PaymentProvider {
  if (provider === 'paystack') return new PaystackProvider(SECRETS.paystack.secretKey);
  if (provider === 'korapay') return new KorapayProvider(SECRETS.korapay.secretKey);
  throw new Error(`Unsupported payment provider: ${provider}`);
}

interface InitiateFundingInput {
  userId: string;
  email: string;
  amount: number; // kobo
  provider: 'paystack' | 'korapay';
}

export async function initiateFunding(input: InitiateFundingInput) {
  if (input.amount < toKobo(MIN_FUNDING_AMOUNT)) {
    throw new Error(`Minimum funding amount is ₦${MIN_FUNDING_AMOUNT}`);
  }

  await ensureWallet(input.userId);

  const { transaction, payment } = await createPayment({
    userId: input.userId,
    amount: input.amount,
    provider: input.provider,
    description: `Wallet funding via ${input.provider}`,
    metadata: { provider: input.provider },
  });

  const provider = getProvider(input.provider);
  const { authorizationUrl } = await provider.initialize({
    amount: input.amount,
    email: input.email,
    reference: payment.reference,
    metadata: { ...payment.metadata, transactionId: transaction.id, paymentId: payment.id },
  });

  await db.collection('payments').doc(payment.id).update({ authorizationUrl, updatedAt: new Date().toISOString() });

  return { transaction, payment: { ...payment, authorizationUrl } };
}

interface HandleWebhookInput {
  provider: 'paystack' | 'korapay';
  rawPayload: string;
  signature?: string;
}

export async function handleWebhook(input: HandleWebhookInput) {
  const provider = getProvider(input.provider);
  const secret = input.provider === 'paystack' ? SECRETS.paystack.webhookSecret || SECRETS.paystack.secretKey : SECRETS.korapay.webhookSecret || SECRETS.korapay.secretKey;

  const result = provider.handleWebhook(input.rawPayload, input.signature, secret);
  if (!result) return { processed: false, message: 'Event ignored' };

  // Find the payment by internal reference
  const snap = await db.collection('payments').where('reference', '==', result.reference).limit(1).get();
  if (snap.empty) throw new Error('Payment reference not found');

  const paymentDoc = snap.docs[0];
  const payment = paymentDoc.data() as Payment;

  if (payment.status === 'successful') {
    return { processed: true, message: 'Payment already processed', transactionId: payment.transactionId };
  }
  if (payment.status === 'failed' || payment.status === 'abandoned') {
    return { processed: false, message: 'Payment already finalized as non-successful' };
  }

  if (payment.currency !== result.currency) {
    throw new Error(`Currency mismatch: expected ${payment.currency}, got ${result.currency}`);
  }

  const { userId, isFirstFunding } = await processPaymentVerification({
    payment,
    providerReference: result.providerReference,
    providerStatus: result.providerStatus,
    verifiedAmount: result.amount,
  });

  if (isFirstFunding) {
    // Referral activation event (see referralService.ts for why this event
    // was chosen). Failures here must never affect the payment/wallet
    // result the user already received, so they're isolated and logged
    // rather than thrown.
    try {
      await maybeRewardReferralActivation(userId);
    } catch (err) {
      console.error('Referral activation reward failed:', err);
    }
  }

  if (result.providerStatus === 'successful') {
    try {
      await createNotification({
        userId,
        title: 'Wallet Funded',
        body: `Your wallet was credited with ${(result.amount / CURRENCY.minorUnit).toLocaleString()} HK Coins.`,
        category: 'transaction',
        actionUrl: '/wallet',
      });
    } catch (err) {
      console.error('Failed to create wallet funding notification:', err);
    }
  }

  return { processed: true, message: 'Payment verified', transactionId: payment.transactionId };
}
