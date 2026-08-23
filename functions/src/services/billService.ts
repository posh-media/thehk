import { BillProvider, BillCategory, Biller } from '../providers/utilityProvider';
import { submitServiceOrder } from './orderService';
import { toKobo } from '../config';
import { generateReference } from '../utils';
import { ServiceOrderRecord } from '../types';

const COUNTRY_CODE = 'NG';
const BILLER_TTL_MS = 60 * 60 * 1000; // 1 hour

interface BillerCatalog {
  categories: BillCategory[];
  billers: Biller[];
  updatedAt: number;
}

// Same in-memory caching rationale as the Owlet/Reloadly-airtime catalogs:
// the Nigerian biller list is small and doesn't need Firestore persistence.
let cache: BillerCatalog | null = null;

async function getCatalog(provider: BillProvider, forceRefresh = false): Promise<BillerCatalog> {
  if (!forceRefresh && cache && Date.now() - cache.updatedAt < BILLER_TTL_MS) {
    return cache;
  }
  const [categories, billers] = await Promise.all([
    provider.getCategories(COUNTRY_CODE),
    provider.getBillers(COUNTRY_CODE),
  ]);
  cache = { categories, billers, updatedAt: Date.now() };
  return cache;
}

export async function listBillCategories(provider: BillProvider): Promise<BillCategory[]> {
  const catalog = await getCatalog(provider);
  return catalog.categories;
}

export async function listBillers(provider: BillProvider, categoryId?: string): Promise<Biller[]> {
  const catalog = await getCatalog(provider);
  return categoryId ? catalog.billers.filter((b) => b.categoryId === categoryId) : catalog.billers;
}

export async function verifyBillCustomer(
  provider: BillProvider,
  billerId: string,
  customerNumber: string
): Promise<{ customerName: string } | null> {
  return provider.verifyCustomer(billerId, customerNumber);
}

interface PayBillInput {
  userId: string;
  billerId: string;
  customerNumber: string;
  amountNaira: number;
}

export async function payBill(provider: BillProvider, input: PayBillInput): Promise<ServiceOrderRecord> {
  if (!input.customerNumber || input.customerNumber.trim().length < 3) {
    throw new Error('A valid customer/meter/account number is required');
  }
  if (!Number.isFinite(input.amountNaira) || input.amountNaira <= 0) {
    throw new Error('A valid amount is required');
  }

  const catalog = await getCatalog(provider);
  const biller = catalog.billers.find((b) => b.id === input.billerId);
  if (!biller) throw new Error('Selected biller is no longer available. Please refresh and try again.');

  if (biller.minAmountNaira && input.amountNaira < biller.minAmountNaira) {
    throw new Error(`Minimum payment amount is ₦${biller.minAmountNaira}`);
  }
  if (biller.maxAmountNaira && input.amountNaira > biller.maxAmountNaira) {
    throw new Error(`Maximum payment amount is ₦${biller.maxAmountNaira}`);
  }

  const amountKobo = toKobo(input.amountNaira);
  const reference = generateReference('HK-BILL');

  return submitServiceOrder({
    userId: input.userId,
    serviceType: 'bill',
    serviceId: biller.id,
    serviceName: biller.name,
    platform: biller.categoryId,
    provider: 'reloadly',
    link: input.customerNumber,
    amountKobo,
    submit: () => provider.payBill({ billerId: biller.id, customerNumber: input.customerNumber, amountNaira: input.amountNaira, reference }),
  });
}
