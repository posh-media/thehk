import { GiftCardProvider, GiftCardProduct, GiftCardRedeemCode } from '../providers/giftCardProvider';
import { submitServiceOrder } from './orderService';
import { toKobo } from '../config';
import { generateReference } from '../utils';
import { ServiceOrderRecord } from '../types';
import { db } from '../admin';

const COUNTRY_CODE = 'NG';
const CATALOG_TTL_MS = 60 * 60 * 1000; // 1 hour

interface GiftCardCatalog {
  products: GiftCardProduct[];
  updatedAt: number;
}

// Same in-memory caching rationale as the other Phase 3 catalogs (Owlet
// services, Reloadly operators/billers): avoids re-fetching the full
// product list on every request while staying reasonably fresh.
//
// IMPORTANT SCOPING DECISION: only products priced in NGN
// (`currencyCode === 'NGN'`) are exposed. THE-HK's wallet is NGN-only, and
// Reloadly only reveals the exact NGN amount it will charge *after* an
// order is placed for foreign-currency products (it performs FX
// conversion internally). Debiting the wallet before calling the provider
// - the same server-authoritative pattern used everywhere else in THE-HK -
// requires knowing the exact NGN charge up front, so foreign-currency
// products are filtered out rather than estimated with an approximate FX
// rate. See PHASE_3C_COMPLETION_REPORT.md.
let cache: GiftCardCatalog | null = null;

async function getCatalog(provider: GiftCardProvider, forceRefresh = false): Promise<GiftCardCatalog> {
  if (!forceRefresh && cache && Date.now() - cache.updatedAt < CATALOG_TTL_MS) {
    return cache;
  }
  const products = await provider.listProducts(COUNTRY_CODE);
  cache = { products: products.filter((p) => p.currencyCode === 'NGN'), updatedAt: Date.now() };
  return cache;
}

export async function listGiftCardProducts(provider: GiftCardProvider): Promise<GiftCardProduct[]> {
  const catalog = await getCatalog(provider);
  return catalog.products;
}

export async function getGiftCardProduct(provider: GiftCardProvider, productId: string): Promise<GiftCardProduct | null> {
  const catalog = await getCatalog(provider);
  return catalog.products.find((p) => p.id === productId) || null;
}

interface PlaceGiftCardOrderInput {
  userId: string;
  productId: string;
  unitPrice: number;
  quantity: number;
  recipientEmail: string;
  senderName: string;
  useCashback?: boolean;
}

function validateDenomination(product: GiftCardProduct, unitPrice: number): void {
  if (product.denominationType === 'fixed') {
    const allowed = product.fixedDenominations.some((d) => Math.abs(d - unitPrice) < 0.01);
    if (!allowed) throw new Error('Selected denomination is not valid for this gift card');
  } else {
    if (product.minAmount && unitPrice < product.minAmount) throw new Error(`Minimum amount is ₦${product.minAmount}`);
    if (product.maxAmount && unitPrice > product.maxAmount) throw new Error(`Maximum amount is ₦${product.maxAmount}`);
  }
}

export async function placeGiftCardOrder(provider: GiftCardProvider, input: PlaceGiftCardOrderInput): Promise<ServiceOrderRecord> {
  if (!input.recipientEmail || !input.recipientEmail.includes('@')) {
    throw new Error('A valid recipient email is required');
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > 10) {
    throw new Error('Quantity must be between 1 and 10');
  }

  const product = await getGiftCardProduct(provider, input.productId);
  if (!product) throw new Error('Selected gift card is no longer available. Please refresh and try again.');
  validateDenomination(product, input.unitPrice);

  // Authoritative price: unit price (validated against the live product's
  // own denominations) x quantity, in kobo. Never trust a client-submitted
  // total.
  const amountKobo = toKobo(input.unitPrice * input.quantity);
  const reference = generateReference('HK-GC');

  return submitServiceOrder({
    userId: input.userId,
    serviceType: 'gift_card',
    serviceId: product.id,
    serviceName: `${product.brandName} ₦${input.unitPrice}`,
    platform: product.brandName,
    provider: 'reloadly',
    link: input.recipientEmail,
    quantity: input.quantity,
    amountKobo,
    useCashback: input.useCashback,
    metadata: { brandId: product.brandId, unitPrice: input.unitPrice },
    submit: async () => {
      const result = await provider.orderGiftCard({
        productId: product.id,
        unitPrice: input.unitPrice,
        quantity: input.quantity,
        recipientEmail: input.recipientEmail,
        senderName: input.senderName,
        reference,
      });
      return { providerTransactionId: result.providerTransactionId, status: result.status };
    },
  });
}

export async function getGiftCardRedeemCodes(
  provider: GiftCardProvider,
  userId: string,
  orderId: string
): Promise<GiftCardRedeemCode[]> {
  const snap = await db.collection('serviceOrders').doc(orderId).get();
  if (!snap.exists) throw new Error('Order not found');
  const order = snap.data() as ServiceOrderRecord;
  if (order.userId !== userId) throw new Error('Not authorized to view this order');
  if (order.serviceType !== 'gift_card') throw new Error('Not a gift card order');
  if (order.status !== 'successful' || !order.providerOrderId) {
    throw new Error('Redeem code is not available until the order is completed');
  }
  return provider.getRedeemCodes(order.providerOrderId);
}
