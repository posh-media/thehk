import { AirtimeDataProvider, RemoteOperator, RemoteDataPlan } from '../providers/utilityProvider';
import { submitServiceOrder } from './orderService';
import { toKobo } from '../config';
import { ServiceOrderRecord } from '../types';

const COUNTRY_CODE = 'NG';
const OPERATOR_TTL_MS = 60 * 60 * 1000; // 1 hour

// Same rationale as the Owlet social catalog cache (Phase 3A): keep this
// in-memory per warm Cloud Functions instance rather than persisting to
// Firestore. The operator list is small (a handful of Nigerian networks),
// so size isn't the concern here - simplicity is.
let operatorCache: { operators: RemoteOperator[]; updatedAt: number } | null = null;

async function getOperators(provider: AirtimeDataProvider, forceRefresh = false): Promise<RemoteOperator[]> {
  if (!forceRefresh && operatorCache && Date.now() - operatorCache.updatedAt < OPERATOR_TTL_MS) {
    return operatorCache.operators;
  }
  const operators = await provider.listOperators(COUNTRY_CODE);
  operatorCache = { operators, updatedAt: Date.now() };
  return operators;
}

export async function listNetworkOperators(provider: AirtimeDataProvider): Promise<RemoteOperator[]> {
  return getOperators(provider);
}

export async function detectNetworkOperator(provider: AirtimeDataProvider, phone: string): Promise<RemoteOperator | null> {
  return provider.detectOperator(phone, COUNTRY_CODE);
}

export async function listDataPlans(provider: AirtimeDataProvider, operatorId: string): Promise<RemoteDataPlan[]> {
  return provider.getDataPlans(operatorId);
}

function validatePhone(phone: string): void {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 14) {
    throw new Error('A valid phone number is required');
  }
}

interface PlaceAirtimeInput {
  userId: string;
  operatorId: string;
  phone: string;
  amountNaira: number;
}

export async function placeAirtimeOrder(provider: AirtimeDataProvider, input: PlaceAirtimeInput): Promise<ServiceOrderRecord> {
  validatePhone(input.phone);
  if (!Number.isFinite(input.amountNaira) || input.amountNaira <= 0) {
    throw new Error('A valid amount is required');
  }

  const operators = await getOperators(provider);
  const operator = operators.find((o) => o.id === input.operatorId);
  if (!operator) throw new Error('Selected network is no longer available. Please refresh and try again.');
  if (!operator.supportsAirtime) throw new Error('Selected network does not support airtime top-up');

  if (operator.minAmountNaira && input.amountNaira < operator.minAmountNaira) {
    throw new Error(`Minimum airtime amount is ₦${operator.minAmountNaira}`);
  }
  if (operator.maxAmountNaira && input.amountNaira > operator.maxAmountNaira) {
    throw new Error(`Maximum airtime amount is ₦${operator.maxAmountNaira}`);
  }

  // Authoritative price: the amount charged to the user is exactly the
  // provider's local top-up amount, converted to kobo. There is no markup
  // in Phase 3B.
  const amountKobo = toKobo(input.amountNaira);

  return submitServiceOrder({
    userId: input.userId,
    serviceType: 'airtime',
    serviceId: operator.id,
    serviceName: `${operator.name} Airtime`,
    platform: operator.name,
    provider: provider.name,
    link: input.phone,
    amountKobo,
    submit: () => provider.purchaseAirtime({ operatorId: operator.id, phone: input.phone, amountNaira: input.amountNaira }),
  });
}

interface PlaceDataInput {
  userId: string;
  operatorId: string;
  phone: string;
  planId: string;
}

export async function placeDataOrder(provider: AirtimeDataProvider, input: PlaceDataInput): Promise<ServiceOrderRecord> {
  validatePhone(input.phone);

  const operators = await getOperators(provider);
  const operator = operators.find((o) => o.id === input.operatorId);
  if (!operator) throw new Error('Selected network is no longer available. Please refresh and try again.');
  if (!operator.supportsData) throw new Error('Selected network does not support data bundles');

  const plans = await provider.getDataPlans(input.operatorId);
  const plan = plans.find((p) => p.id === input.planId);
  if (!plan) throw new Error('Selected data plan is no longer available. Please refresh and try again.');

  const amountKobo = toKobo(plan.amountNaira);

  return submitServiceOrder({
    userId: input.userId,
    serviceType: 'data',
    serviceId: plan.id,
    serviceName: `${operator.name} ${plan.description}`,
    platform: operator.name,
    provider: provider.name,
    link: input.phone,
    amountKobo,
    submit: () => provider.purchaseData({ operatorId: operator.id, phone: input.phone, plan }),
  });
}
