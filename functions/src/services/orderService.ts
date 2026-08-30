import { db } from '../admin';
import { debitConsumerPayment, refundConsumerPayment } from './walletService';
import { generateReference } from '../utils';
import { RemoteTopupResult } from '../providers/utilityProvider';
import { ServiceOrderRecord, ServiceOrderType, Transaction } from '../types';

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
   * When true, eligible cashback is applied after the HKC primary balance and
   * before the NGN wallet is charged for the remainder.
   */
  useCashback?: boolean;
  submit: () => Promise<RemoteTopupResult>;
}

/**
 * Shared debit -> create order -> call provider -> refund-on-failure flow used
 * by every Phase 3/5 service. The wallet is only debited once per order using
 * the canonical payment priority (HKC -> Cashback -> NGN wallet), and refunded
 * only if the provider call explicitly fails. A `processing` result is left
 * alone to avoid double-spend/refund races on genuinely asynchronous providers.
 */
export async function submitServiceOrder(input: SubmitServiceOrderInput): Promise<ServiceOrderRecord> {
  const description = `${input.serviceName} - ${input.link}`;
  const now = new Date().toISOString();
  const id = db.collection('serviceOrders').doc().id;
  const reference = generateReference(REFERENCE_PREFIX[input.serviceType]);

  const paymentResult = await debitConsumerPayment({
    userId: input.userId,
    totalKobo: input.amountKobo,
    useCashback: input.useCashback ?? false,
    description,
    orderReference: reference,
    serviceType: input.serviceType,
    metadata: { serviceId: input.serviceId, platform: input.platform, target: input.link, ...input.metadata },
  });

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
    transactionId: paymentResult.ngnTransactionId || paymentResult.hkcTransactionId || '',
    providerReference: input.metadata?.providerReference as string | undefined,
    metadata: {
      ...input.metadata,
      hkcUsed: paymentResult.hkcUsed,
      cashbackUsed: paymentResult.cashbackUsed,
      ngnUsed: paymentResult.ngnUsed,
      hkcTransactionId: paymentResult.hkcTransactionId,
      ngnTransactionId: paymentResult.ngnTransactionId,
    },
    createdAt: now,
    updatedAt: now,
  };

  async function refundEverything(reason: string) {
    await refundConsumerPayment({
      userId: input.userId,
      hkcUsed: paymentResult.hkcUsed,
      cashbackUsed: paymentResult.cashbackUsed,
      ngnUsed: paymentResult.ngnUsed,
      hkcTransactionId: paymentResult.hkcTransactionId,
      ngnTransactionId: paymentResult.ngnTransactionId,
      reason,
      orderReference: reference,
    });
  }

  try {
    const result = await input.submit();
    order.providerOrderId = result.providerTransactionId;
    order.providerReference = result.providerRequestId ?? order.providerReference;
    order.status = result.status === 'successful' ? 'successful' : result.status === 'failed' ? 'failed' : 'processing';
    await orderRef(id).set(order);

    if (order.status === 'failed') {
      await refundEverything(`${input.serviceName} purchase failed at provider`);
    }
  } catch (err) {
    await refundEverything(`${input.serviceName} submission failed: ${(err as Error).message}`);
    order.status = 'failed';
    await orderRef(id).set(order);
    throw new Error((err as Error).message || 'Purchase could not be completed. Your wallet has been refunded.');
  }

  return order;
}

/**
 * Refunds an existing service order by reversing all payment sources recorded
 * in the order metadata. Used by asynchronous provider webhooks when a
 * terminal failure status is received after the order was already created.
 */
export async function refundServiceOrder(order: ServiceOrderRecord, reason: string): Promise<void> {
  const meta = order.metadata || {};
  await refundConsumerPayment({
    userId: order.userId,
    hkcUsed: (meta.hkcUsed as number) || 0,
    cashbackUsed: (meta.cashbackUsed as number) || 0,
    ngnUsed: (meta.ngnUsed as number) || 0,
    hkcTransactionId: (meta.hkcTransactionId as string) || undefined,
    ngnTransactionId: (meta.ngnTransactionId as string) || undefined,
    reason,
    orderReference: order.reference,
  });
}
