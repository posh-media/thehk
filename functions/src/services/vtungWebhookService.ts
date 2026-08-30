import { db } from '../admin';
import { refundServiceOrder } from './orderService';
import { verifyVtungPayload } from '../providers/vtungClient';
import { RemoteTopupResult } from '../providers/utilityProvider';
import { ServiceOrderRecord, ServiceOrderStatus } from '../types';

function mapVtungStatus(status: string): 'successful' | 'processing' | 'failed' {
  const s = (status || '').toLowerCase();
  if (s === 'completed-api' || s === 'completed') return 'successful';
  if (s === 'failed' || s === 'cancelled' || s === 'refunded') return 'failed';
  return 'processing';
}

function getOrderStatus(status: string): ServiceOrderStatus {
  const s = (status || '').toLowerCase();
  if (s === 'completed-api' || s === 'completed') return 'successful';
  if (s === 'refunded') return 'refunded';
  if (s === 'failed' || s === 'cancelled') return 'failed';
  return 'processing';
}

export async function verifyVtungWebhook(rawPayload: string, signature: string, userPin: string): Promise<boolean> {
  if (!signature || !userPin) return false;
  return verifyVtungPayload(rawPayload, signature, userPin);
}

export async function findOrderByProviderReference(providerReference: string): Promise<ServiceOrderRecord | null> {
  const q = await db.collection('serviceOrders').where('providerReference', '==', providerReference).limit(1).get();
  if (q.empty) return null;
  return q.docs[0].data() as ServiceOrderRecord;
}

export async function reconcileVtungOrder(requestId: string, result: RemoteTopupResult): Promise<void> {
  const order = await findOrderByProviderReference(requestId);
  if (!order) return;

  const ref = db.collection('serviceOrders').doc(order.id);
  const status = mapVtungStatus(result.status);

  if (order.status === 'successful' || order.status === 'refunded' || order.status === 'failed') {
    return;
  }

  if (status === 'successful') {
    await ref.update({
      status: 'successful',
      providerOrderId: result.providerTransactionId,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (status === 'failed') {
    await refundServiceOrder(
      order,
      `VTU.ng order ${result.providerTransactionId} ${getOrderStatus(result.status)}`
    );

    await ref.update({
      status: getOrderStatus(result.status),
      providerOrderId: result.providerTransactionId,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function processVtungWebhook(
  rawPayload: string,
  signature: string,
  userPin: string
): Promise<{ processed: boolean; message: string }> {
  const isValid = await verifyVtungWebhook(rawPayload, signature, userPin);
  if (!isValid) {
    throw new Error('Invalid VTU.ng webhook signature.');
  }

  const payload = JSON.parse(rawPayload) as {
    request_id?: string;
    order_id?: number | string;
    status?: string;
    product_name?: string;
  };

  const requestId = payload.request_id;
  if (!requestId) {
    return { processed: false, message: 'Missing request_id in payload' };
  }

  const result: RemoteTopupResult = {
    providerTransactionId: String(payload.order_id ?? ''),
    providerRequestId: requestId,
    status: mapVtungStatus(payload.status || ''),
  };

  await reconcileVtungOrder(requestId, result);
  return { processed: true, message: `Order ${getOrderStatus(payload.status || '')}` };
}
