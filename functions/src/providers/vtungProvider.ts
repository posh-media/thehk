import {
  AirtimeDataProvider,
  RemoteOperator,
  RemoteDataPlan,
  RemoteTopupResult,
} from './utilityProvider';
import { VtungClient } from './vtungClient';

// VTU.ng (https://vtu.ng) v2 REST API adapter for Airtime and Data.
// Authentication: JWT (POST /jwt-auth/v1/token).
// Public endpoint: GET /api/v2/variations/data
// Transaction endpoints: POST /api/v2/airtime, /api/v2/data, /api/v2/requery
// Docs: https://vtu.ng/api/

interface VtungNetwork {
  name: string;
  networkCode: string;
  supportsAirtime: boolean;
  supportsData: boolean;
  minAmountNaira: number;
  maxAmountNaira: number;
}

const NETWORKS: Record<string, VtungNetwork> = {
  mtn: {
    name: 'MTN Nigeria',
    networkCode: 'MTN',
    supportsAirtime: true,
    supportsData: true,
    minAmountNaira: 10,
    maxAmountNaira: 50000,
  },
  glo: {
    name: 'Glo Nigeria',
    networkCode: 'Glo',
    supportsAirtime: true,
    supportsData: true,
    minAmountNaira: 50,
    maxAmountNaira: 50000,
  },
  airtel: {
    name: 'Airtel Nigeria',
    networkCode: 'Airtel',
    supportsAirtime: true,
    supportsData: true,
    minAmountNaira: 50,
    maxAmountNaira: 50000,
  },
  '9mobile': {
    name: '9mobile Nigeria',
    networkCode: '9mobile',
    supportsAirtime: true,
    supportsData: true,
    minAmountNaira: 50,
    maxAmountNaira: 50000,
  },
  smile: {
    name: 'Smile Nigeria',
    networkCode: 'Smile',
    supportsAirtime: false,
    supportsData: true,
    minAmountNaira: 0,
    maxAmountNaira: 0,
  },
};

// First-4-digit prefix mapping for Nigerian mobile numbers.  This is a
// convenience fallback for auto-detect; VTU.ng does not expose a network
// detection API, so the user can always override manually.
const PREFIX_NETWORK: Record<string, string> = {
  '0701': 'airtel',
  '0702': 'smile',
  '0703': 'mtn',
  '0704': 'mtn',
  '0705': 'glo',
  '0706': 'mtn',
  '0707': 'airtel',
  '0708': 'airtel',
  '0709': 'airtel',
  '0801': 'airtel',
  '0802': 'airtel',
  '0803': 'mtn',
  '0805': 'glo',
  '0806': 'mtn',
  '0807': 'glo',
  '0808': 'airtel',
  '0809': '9mobile',
  '0810': 'mtn',
  '0811': 'glo',
  '0812': 'airtel',
  '0813': 'mtn',
  '0814': 'mtn',
  '0815': 'glo',
  '0816': 'mtn',
  '0817': '9mobile',
  '0818': '9mobile',
  '0902': 'airtel',
  '0903': 'mtn',
  '0905': 'glo',
  '0906': 'mtn',
  '0907': 'airtel',
  '0908': '9mobile',
  '0909': '9mobile',
  '0912': 'airtel',
  '0901': 'airtel',
  '0904': 'airtel',
  '0913': 'mtn',
  '0915': 'glo',
  '0916': 'mtn',
  '0918': '9mobile',
  '0919': '9mobile',
};

interface VtungDataVariation {
  variation_id: number | string;
  service_name: string;
  service_id: string;
  data_plan: string;
  price: string;
  availability?: string;
}

function mapStatus(status: string): 'successful' | 'processing' | 'failed' {
  const s = (status || '').toLowerCase();
  if (s === 'completed-api' || s === 'completed') return 'successful';
  if (s === 'failed' || s === 'cancelled' || s === 'refunded') return 'failed';
  return 'processing';
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^(0|234)/, '');
}

function detectServiceId(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('234') ? '0' + digits.slice(3) : digits;
  const prefix = local.slice(0, 4);
  return PREFIX_NETWORK[prefix] || null;
}

export class VtungProvider implements AirtimeDataProvider {
  name = 'vtung';
  private client: VtungClient;

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  constructor(username: string, password: string, apiBaseUrl: string) {
    this.client = new VtungClient(username, password, apiBaseUrl);
  }

  async listOperators(_countryCode: string): Promise<RemoteOperator[]> {
    return Object.entries(NETWORKS).map(([serviceId, network]) => ({
      id: serviceId,
      name: network.name,
      networkCode: network.networkCode,
      countryCode: 'NG',
      supportsAirtime: network.supportsAirtime,
      supportsData: network.supportsData,
      minAmountNaira: network.minAmountNaira || undefined,
      maxAmountNaira: network.maxAmountNaira || undefined,
    }));
  }

  async detectOperator(phone: string, _countryCode: string): Promise<RemoteOperator | null> {
    const serviceId = detectServiceId(phone);
    if (!serviceId) return null;
    const network = NETWORKS[serviceId];
    if (!network) return null;
    return {
      id: serviceId,
      name: network.name,
      networkCode: network.networkCode,
      countryCode: 'NG',
      supportsAirtime: network.supportsAirtime,
      supportsData: network.supportsData,
      minAmountNaira: network.minAmountNaira || undefined,
      maxAmountNaira: network.maxAmountNaira || undefined,
    };
  }

  async getDataPlans(operatorId: string): Promise<RemoteDataPlan[]> {
    const params = new URLSearchParams();
    if (operatorId) params.set('service_id', operatorId);
    const response = (await this.client.request<{ code: string; data: VtungDataVariation[] }>(
      `/variations/data?${params.toString()}`
    )) as { data: VtungDataVariation[] };

    return (response.data || [])
      .filter((v: VtungDataVariation) => v.service_id === operatorId && v.availability?.toLowerCase() === 'available')
      .map((v: VtungDataVariation) => ({
        id: String(v.variation_id),
        operatorId: v.service_id,
        description: `${v.data_plan} (${v.service_name})`,
        amountNaira: Number(v.price) || 0,
      }));
  }

  async purchaseAirtime(input: {
    operatorId: string;
    phone: string;
    amountNaira: number;
    requestId: string;
  }): Promise<RemoteTopupResult> {
    const response = (await this.client.request<{
      code: string;
      data: {
        order_id: number | string;
        status: string;
        request_id?: string;
      };
    }>('/airtime', {
      method: 'POST',
      body: JSON.stringify({
        request_id: input.requestId,
        phone: normalizePhone(input.phone),
        service_id: input.operatorId,
        amount: input.amountNaira,
      }),
    })) as {
      data: { order_id: number | string; status: string; request_id?: string };
    };

    return {
      providerTransactionId: String(response.data.order_id),
      providerRequestId: response.data.request_id || input.requestId,
      status: mapStatus(response.data.status),
    };
  }

  async purchaseData(input: {
    operatorId: string;
    phone: string;
    plan: RemoteDataPlan;
    requestId: string;
  }): Promise<RemoteTopupResult> {
    const response = (await this.client.request<{
      code: string;
      data: {
        order_id: number | string;
        status: string;
        request_id?: string;
      };
    }>('/data', {
      method: 'POST',
      body: JSON.stringify({
        request_id: input.requestId,
        phone: normalizePhone(input.phone),
        service_id: input.operatorId,
        variation_id: input.plan.id,
      }),
    })) as {
      data: { order_id: number | string; status: string; request_id?: string };
    };

    return {
      providerTransactionId: String(response.data.order_id),
      providerRequestId: response.data.request_id || input.requestId,
      status: mapStatus(response.data.status),
    };
  }

  async requeryOrder(requestId: string): Promise<RemoteTopupResult> {
    const response = (await this.client.request<{
      code: string;
      data: {
        order_id: number | string;
        status: string;
        request_id?: string;
      };
    }>('/requery', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId }),
    })) as {
      data: { order_id: number | string; status: string; request_id?: string };
    };

    return {
      providerTransactionId: String(response.data.order_id),
      providerRequestId: response.data.request_id || requestId,
      status: mapStatus(response.data.status),
    };
  }
}
