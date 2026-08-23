import { db } from '../admin';
import { SocialServiceProvider, RemoteService } from '../providers/serviceProvider';
import { submitServiceOrder } from './orderService';
import { toKobo } from '../config';
import { ServiceOrderRecord } from '../types';

export type SocialOrderRecord = ServiceOrderRecord;

const CATALOG_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ServiceCatalog {
  provider: string;
  services: RemoteService[];
  categories: string[];
  updatedAt: string;
}

// The Owlet catalog has thousands of services (well over Firestore's 1MB
// per-document limit), so it is cached in-memory per warm Cloud Functions
// instance rather than persisted to Firestore. This is intentionally simple:
// a cold start just refetches from Owlet, and the 1-hour TTL keeps pricing
// reasonably fresh without hitting the provider on every request.
let memoryCatalog: ServiceCatalog | null = null;

export async function getSocialCatalog(provider: SocialServiceProvider, forceRefresh = false): Promise<ServiceCatalog> {
  if (!forceRefresh && memoryCatalog) {
    const age = Date.now() - new Date(memoryCatalog.updatedAt).getTime();
    if (age < CATALOG_TTL_MS) return memoryCatalog;
  }

  const services = await provider.getServices();
  const categories = Array.from(new Set(services.map((s) => s.category))).sort();
  memoryCatalog = {
    provider: 'owlet',
    services,
    categories,
    updatedAt: new Date().toISOString(),
  };
  return memoryCatalog;
}

interface PlaceOrderInput {
  userId: string;
  serviceId: string;
  link: string;
  quantity: number;
}

function orderRef(id: string) {
  return db.collection('serviceOrders').doc(id);
}

function validateLink(link: string): void {
  if (!link || link.trim().length < 3) {
    throw new Error('A valid target link/username is required');
  }
}

export async function placeSocialOrder(
  provider: SocialServiceProvider,
  input: PlaceOrderInput
): Promise<SocialOrderRecord> {
  validateLink(input.link);
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error('Quantity must be a positive number');
  }

  const catalog = await getSocialCatalog(provider);
  const service = catalog.services.find((s) => s.id === input.serviceId);
  if (!service) {
    throw new Error('Selected service is no longer available. Please refresh and try again.');
  }
  if (input.quantity < service.min || (service.max > 0 && input.quantity > service.max)) {
    throw new Error(`Quantity must be between ${service.min} and ${service.max}`);
  }

  // Authoritative server-side price calculation. Never trust a client total.
  const priceNaira = (service.rateNaira / 1000) * input.quantity;
  const amountKobo = toKobo(Math.ceil(priceNaira * 100) / 100);

  return submitServiceOrder({
    userId: input.userId,
    serviceType: 'social_media',
    serviceId: service.id,
    serviceName: service.name,
    platform: service.category,
    provider: 'owlet',
    link: input.link,
    quantity: input.quantity,
    amountKobo,
    metadata: { category: service.category, quantity: input.quantity },
    submit: async () => {
      // Owlet's `add` action only ever returns an accepted order id - it
      // never confirms success/failure synchronously - so the order is
      // recorded as `processing` until refreshed via `getOrderStatus`.
      const result = await provider.createOrder({ serviceId: service.id, link: input.link, quantity: input.quantity });
      return { providerTransactionId: result.providerOrderId, status: 'processing' };
    },
  });
}

export async function refreshSocialOrderStatus(provider: SocialServiceProvider, userId: string, orderId: string): Promise<SocialOrderRecord> {
  const snap = await orderRef(orderId).get();
  if (!snap.exists) throw new Error('Order not found');
  const order = snap.data() as SocialOrderRecord;
  if (order.userId !== userId) throw new Error('Not authorized to view this order');
  if (!order.providerOrderId) return order;

  const status = await provider.getOrderStatus(order.providerOrderId);
  const now = new Date().toISOString();
  const update: Partial<SocialOrderRecord> = { status: status.status as SocialOrderRecord['status'], updatedAt: now };
  await orderRef(orderId).update(update);
  return { ...order, ...update };
}
