import { BillProvider, BillCategory, Biller, RemoteTopupResult } from './utilityProvider';
import { ReloadlyClient } from './reloadlyClient';

// Reloadly Utility Payments API
// (https://developers.reloadly.com/utility-payments,
// https://docs.reloadly.com/utility-payments). Confirmed documented
// endpoints used here:
//   GET  /billers            - list/filter billers (id, name, countryIsoCode, type, serviceType)
//   POST /pay                - pay a bill (subscriberAccountNumber, amount, billerId, useLocalAmount, referenceId)
// Reloadly's Utility API does not publish a separate "verify customer"
// endpoint (unlike some Nigerian-specific billers aggregators) - so
// `verifyCustomer` intentionally returns `null` (not supported) rather than
// fabricating a customer name. This has NOT been exercised against a live
// account - see PHASE_3C_COMPLETION_REPORT.md.

const ACCEPT = 'application/com.reloadly.utilities-v1+json';

const CATEGORY_NAMES: Record<string, string> = {
  ELECTRICITY_BILL_PAYMENT: 'Electricity',
  WATER_BILL_PAYMENT: 'Water',
  TV_BILL_PAYMENT: 'Cable TV',
  INTERNET_BILL_PAYMENT: 'Internet',
};

interface ReloadlyBiller {
  id: number;
  name: string;
  countryCode?: string;
  countryIsoCode?: string;
  type: string;
  serviceType: string;
  localTransactionFee?: number;
  minLocalTransactionAmount?: number;
  maxLocalTransactionAmount?: number;
}

function mapBiller(b: ReloadlyBiller): Biller {
  return {
    id: String(b.id),
    name: b.name,
    categoryId: b.type,
    countryCode: b.countryIsoCode || b.countryCode || 'NG',
    serviceType: (b.serviceType as Biller['serviceType']) || 'PREPAID',
    minAmountNaira: b.minLocalTransactionAmount,
    maxAmountNaira: b.maxLocalTransactionAmount,
  };
}

export class ReloadlyUtilityProvider implements BillProvider {
  name = 'reloadly';
  private client: ReloadlyClient;

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  constructor(clientId: string, clientSecret: string, isSandbox = false) {
    const baseUrl = isSandbox ? 'https://utilities-sandbox.reloadly.com' : 'https://utilities.reloadly.com';
    this.client = new ReloadlyClient(clientId, clientSecret, baseUrl, baseUrl);
  }

  private call<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.client.request<T>('Utility', path, ACCEPT, init);
  }

  private async fetchBillers(countryCode: string, categoryId?: string): Promise<ReloadlyBiller[]> {
    const params = new URLSearchParams({ countryISOCode: countryCode, size: '200' });
    if (categoryId) params.set('type', categoryId);
    const data = await this.call<{ content: ReloadlyBiller[] } | ReloadlyBiller[]>(`/billers?${params.toString()}`);
    return Array.isArray(data) ? data : data.content || [];
  }

  async getCategories(countryCode: string): Promise<BillCategory[]> {
    const billers = await this.fetchBillers(countryCode);
    const types = Array.from(new Set(billers.map((b) => b.type)));
    return types.map((type) => ({ id: type, name: CATEGORY_NAMES[type] || type }));
  }

  async getBillers(countryCode: string, categoryId?: string): Promise<Biller[]> {
    const billers = await this.fetchBillers(countryCode, categoryId);
    return billers.map(mapBiller);
  }

  async verifyCustomer(): Promise<{ customerName: string } | null> {
    // Not supported: Reloadly's Utility Payments API has no documented
    // pre-payment customer/meter verification endpoint.
    return null;
  }

  async payBill(input: { billerId: string; customerNumber: string; amountNaira: number; reference: string }): Promise<RemoteTopupResult> {
    const data = await this.call<{ id: number; status: string }>('/pay', {
      method: 'POST',
      body: JSON.stringify({
        subscriberAccountNumber: input.customerNumber,
        amount: input.amountNaira,
        billerId: Number(input.billerId),
        useLocalAmount: true,
        referenceId: input.reference,
      }),
    });
    return { providerTransactionId: String(data.id), status: mapBillStatus(data.status) };
  }
}

function mapBillStatus(status: string): 'successful' | 'processing' | 'failed' {
  const s = (status || '').toUpperCase();
  if (s === 'SUCCESSFUL' || s === 'SUCCESS') return 'successful';
  if (s === 'FAILED' || s === 'REJECTED') return 'failed';
  // Utility bill payments are frequently asynchronous - Reloadly's own docs
  // show a "PROCESSING" response with a `finalStatusAvailabilityAt` up to 24
  // hours later. Treat anything else as still processing rather than
  // guessing success/failure.
  return 'processing';
}
