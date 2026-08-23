import { db } from '../admin';
import { debitWalletForOrder, refundWalletDebit } from './walletService';
import { spendCashback, awardCashback } from './cashbackService';
import { generateReference } from '../utils';
import { ServiceOrderRecord, ServiceOrderType } from '../types';

function orderRef(id: string) {
  return db.collection('serviceOrders').doc(id);
}

const REFERENCE_PREFIX: Record<ServiceOrderType, string> = {
  social_media: 'HK-SMM',
  airtime: 'HK-AIR',
  data: 'HK-DATA',
  bill: 'HK-BILL',
  gift_card: 'HK-GC',
};

interface SubmitServiceOrderInput {
  userId: string;
  serviceType: ServiceOrderType;
  serviceId: string;
  serviceName: string;
  platform: string;
  provider: string;
  link: string;
  quantity?: number;
  amountKobo: number;
  metadata?: Record<string, unknown>;
  /**
   * When true, applies THE-HK's cashback-first payment priority: eligible
   * cashback balance is spent before the wallet is charged for the
   * remainder. Not every service opts into this yet - see
   * PHASE_4_CONTINUATION_REPORT.md for which one does today and why the
   * others weren't changed in this pass.
   */
  useCashback?: boolean;
  submit: () => Promise<{ providerTransactionId: string; status: 'successful' | 'processing' | 'failed' }>;
}

/**
 * Shared debit -> create order -> call provider -> refund-on-failure flow
 * used by every Phase 3 service (social media, airtime, data, bills, gift
 * cards). Centralizing this means every service gets the same
 * server-authoritative wallet safety guarantees without re-implementing
 * them: the wallet is only ever debited once per order, and only refunded
 * if the provider call explicitly fails - a `processing` result (common for
 * utility bills and some gift card orders) is left alone rather than
 * guessed at, to avoid double-spend/refund races on genuinely asynchronous
 * providers.
 */
export async function submitServiceOrder(input: SubmitServiceOrderInput): Promise<ServiceOrderRecord> {
  const description = `${input.serviceName} - ${input.link}`;

  // Cashback-first priority: spend eligible cashback before touching the
  // wallet. `spendCashback` caps at whatever is actually available, so the
  // wallet only ever covers the true remainder.
  let cashbackUsed = 0;
  if (input.useCashback) {
    const result = await spendCashback({ userId: input.userId, requestedAmountKobo: input.amountKobo, description, relatedOrderId: undefined });
    cashbackUsed = result.spent;
  }
  const walletAmount = input.amountKobo - cashbackUsed;

  const { transaction } = await debitWalletForOrder({
    userId: input.userId,
    amount: walletAmount,
    type: `${input.serviceType}_purchase`,
    description,
    metadata: { serviceId: input.serviceId, platform: input.platform, target: input.link, cashbackUsed, ...input.metadata },
  });

  const now = new Date().toISOString();
  const id = db.collection('serviceOrders').doc().id;
  const reference = generateReference(REFERENCE_PREFIX[input.serviceType]);

  const order: ServiceOrderRecord = {
    id,
    userId: input.userId,
    serviceType: input.serviceType,
    serviceId: input.serviceId,
    serviceName: input.serviceName,
    platform: input.platform,
    provider: input.provider,
    link: input.link,
    quantity: input.quantity ?? 1,
    amount: input.amountKobo,
    status: 'processing',
    reference,
    transactionId: transaction.id,
    createdAt: now,
    updatedAt: now,
  };

  async function refundEverything(reason: string) {
    await refundWalletDebit({ userId: input.userId, transactionId: transaction.id, amount: walletAmount, reason });
    if (cashbackUsed > 0) {
      await awardCashback({ userId: input.userId, amountKobo: cashbackUsed, description: `Refund: ${reason}`, relatedOrderId: id });
    }
  }

  try {
    const result = await input.submit();
    order.providerOrderId = result.providerTransactionId;
    order.status = result.status === 'successful' ? 'successful' : result.status === 'failed' ? 'failed' : 'processing';
    await orderRef(id).set(order);

    if (order.status === 'failed') {
      await refundEverything(`${input.serviceName} purchase failed at provider`);
    }
  } catch (err) {
    await refundEverything(`${input.serviceName} submission failed: ${(err as Error).message}`);
    order.status = 'failed';
    await orderRef(id).set(order);
    throw new Error((err as Error).message || 'Purchase could not be completed. Your wallet/cashback has been refunded.');
  }

  return order;
}
