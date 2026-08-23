import { SocialServiceProvider, RemoteService, RemoteOrderResult, RemoteOrderStatusResult, RemoteOrderStatus } from './serviceProvider';

// The Owlet (https://the-owlet.com) exposes a standard "SMM panel" v2 API:
// POST https://the-owlet.com/api/v2 with `key` + `action` form fields.
// This is the same convention used by most SMM reseller panels
// (actions: services, add, status, balance). Confirmed live at
// https://the-owlet.com/api/v2 (GET returns { api: "owlet", version: "v2" }).
//
// Documented actions used here:
//   action=services -> list of { service, name, type, category, rate, min, max, refill, cancel }
//   action=add       -> { service, link, quantity } -> { order }
//   action=status     -> { order } -> { charge, start_count, status, remains, currency }
//   action=balance    -> { balance, currency }

interface OwletServiceRow {
  service: string | number;
  name: string;
  category: string;
  rate: string | number; // price per 1000, in the panel's currency (NGN)
  min: string | number;
  max: string | number;
  refill?: boolean;
  cancel?: boolean;
  type?: string;
}

interface OwletOrderStatusRow {
  charge?: string;
  start_count?: string | number;
  status: string;
  remains?: string | number;
  currency?: string;
}

function mapStatus(raw: string): RemoteOrderStatus {
  const s = (raw || '').toLowerCase();
  if (s.includes('complete')) return 'successful';
  if (s.includes('progress') || s.includes('processing') || s.includes('partial')) return 'processing';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('fail') || s.includes('error')) return 'failed';
  return 'pending';
}

export class OwletProvider implements SocialServiceProvider {
  name = 'owlet';
  private apiKey: string;
  private apiUrl: string;

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  private async call<T>(action: string, params: Record<string, string | number> = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Owlet API key is not configured. Set OWLET_API_KEY in the Cloud Functions environment.');
    }

    const body = new URLSearchParams({ key: this.apiKey, action, ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ) });

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Owlet API request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as T & { error?: string };
    if (data && typeof data === 'object' && 'error' in data && (data as any).error) {
      throw new Error(`Owlet API error: ${(data as any).error}`);
    }
    return data;
  }

  async getServices(): Promise<RemoteService[]> {
    const rows = await this.call<OwletServiceRow[]>('services');
    if (!Array.isArray(rows)) {
      throw new Error('Unexpected response from Owlet services endpoint');
    }
    return rows.map((row) => {
      const rate = Number(row.rate) || 0;
      return {
        id: String(row.service),
        category: row.category || 'Other',
        name: row.name,
        rateOrigin: rate,
        rateNaira: rate, // Owlet pricing is already NGN-denominated.
        min: Number(row.min) || 1,
        max: Number(row.max) || 0,
        refill: Boolean(row.refill),
        cancel: Boolean(row.cancel),
        description: row.type,
      };
    });
  }

  async createOrder(input: { serviceId: string; link: string; quantity: number }): Promise<RemoteOrderResult> {
    const data = await this.call<{ order: string | number }>('add', {
      service: input.serviceId,
      link: input.link,
      quantity: input.quantity,
    });
    if (!data.order) throw new Error('Owlet did not return an order id');
    return { providerOrderId: String(data.order) };
  }

  async getOrderStatus(providerOrderId: string): Promise<RemoteOrderStatusResult> {
    const data = await this.call<OwletOrderStatusRow>('status', { order: providerOrderId });
    return {
      status: mapStatus(data.status),
      startCount: data.start_count !== undefined ? Number(data.start_count) : undefined,
      remains: data.remains !== undefined ? Number(data.remains) : undefined,
      raw: data,
    };
  }
}
