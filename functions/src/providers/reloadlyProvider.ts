import { AirtimeDataProvider, RemoteOperator, RemoteDataPlan, RemoteTopupResult } from './utilityProvider';
import { ReloadlyClient } from './reloadlyClient';

// Reloadly (https://www.reloadly.com) — public, well-documented REST API for
// international airtime/data top-ups. Endpoints below match Reloadly's
// published Topups API (https://developers.reloadly.com/topups).

const ACCEPT = 'application/com.reloadly.topups-v1+json';

interface ReloadlyOperator {
  operatorId: number;
  name: string;
  bundle: boolean; // true for data-bundle style operators
  data: boolean;
  supportsLocalAmounts?: boolean;
  minAmount?: number;
  maxAmount?: number;
  localMinAmount?: number;
  localMaxAmount?: number;
  fixedAmounts?: number[];
  localFixedAmounts?: number[];
  fixedAmountsDescriptions?: Record<string, string>;
  localFixedAmountsDescriptions?: Record<string, string>;
}

function mapOperator(op: ReloadlyOperator, countryCode: string): RemoteOperator {
  return {
    id: String(op.operatorId),
    name: op.name,
    networkCode: op.name,
    countryCode,
    supportsAirtime: !op.data,
    supportsData: Boolean(op.data || op.bundle),
    minAmountNaira: op.localMinAmount ?? op.minAmount,
    maxAmountNaira: op.localMaxAmount ?? op.maxAmount,
  };
}

export class ReloadlyProvider implements AirtimeDataProvider {
  name = 'reloadly';
  private client: ReloadlyClient;

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  constructor(clientId: string, clientSecret: string, isSandbox = false) {
    const baseUrl = isSandbox ? 'https://topups-sandbox.reloadly.com' : 'https://topups.reloadly.com';
    this.client = new ReloadlyClient(clientId, clientSecret, baseUrl, baseUrl);
  }

  private call<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.client.request<T>('Airtime/Data', path, ACCEPT, init);
  }

  async listOperators(countryCode: string): Promise<RemoteOperator[]> {
    const ops = await this.call<ReloadlyOperator[]>(`/operators/countries/${countryCode}`);
    return ops.map((op) => mapOperator(op, countryCode));
  }

  async detectOperator(phone: string, countryCode: string): Promise<RemoteOperator | null> {
    try {
      const op = await this.call<ReloadlyOperator>(
        `/operators/auto-detect/phone/${encodeURIComponent(phone)}/countries/${countryCode}`
      );
      return mapOperator(op, countryCode);
    } catch {
      return null;
    }
  }

  async getDataPlans(operatorId: string): Promise<RemoteDataPlan[]> {
    const op = await this.call<ReloadlyOperator>(`/operators/${operatorId}`);
    const amounts = op.localFixedAmounts && op.localFixedAmounts.length > 0 ? op.localFixedAmounts : op.fixedAmounts || [];
    const descriptions = op.localFixedAmountsDescriptions || op.fixedAmountsDescriptions || {};
    return amounts.map((amount) => ({
      id: `${operatorId}:${amount}`,
      operatorId,
      description: descriptions[String(amount)] || `₦${amount}`,
      amountNaira: amount,
    }));
  }

  async purchaseAirtime(input: {
    operatorId: string;
    phone: string;
    amountNaira: number;
    requestId?: string;
  }): Promise<RemoteTopupResult> {
    const data = await this.call<{ transactionId: number; status: string }>('/topups', {
      method: 'POST',
      body: JSON.stringify({
        operatorId: Number(input.operatorId),
        amount: input.amountNaira,
        useLocalAmount: true,
        recipientPhone: { countryCode: 'NG', number: input.phone },
      }),
    });
    return { providerTransactionId: String(data.transactionId), providerRequestId: input.requestId, status: mapTopupStatus(data.status) };
  }

  async purchaseData(input: {
    operatorId: string;
    phone: string;
    plan: RemoteDataPlan;
    requestId?: string;
  }): Promise<RemoteTopupResult> {
    const data = await this.call<{ transactionId: number; status: string }>('/topups', {
      method: 'POST',
      body: JSON.stringify({
        operatorId: Number(input.operatorId),
        amount: input.plan.amountNaira,
        useLocalAmount: true,
        recipientPhone: { countryCode: 'NG', number: input.phone },
      }),
    });
    return { providerTransactionId: String(data.transactionId), providerRequestId: input.requestId, status: mapTopupStatus(data.status) };
  }

  async requeryOrder(): Promise<RemoteTopupResult> {
    throw new Error('Order requery is not supported by the Reloadly Airtime/Data provider.');
  }
}

function mapTopupStatus(status: string): 'successful' | 'processing' | 'failed' {
  const s = (status || '').toUpperCase();
  if (s === 'SUCCESSFUL') return 'successful';
  if (s === 'FAILED' || s === 'REFUNDED') return 'failed';
  return 'processing';
}
