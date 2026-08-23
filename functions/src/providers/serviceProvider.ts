// Generic abstraction for external digital-service providers (social media
// growth, airtime/data, gift cards, etc). THE-HK backend code should depend
// on this interface, not on a specific provider's API shape, so a provider
// can be swapped later without touching order/wallet logic.

export interface RemoteService {
  id: string; // provider's service id
  category: string; // e.g. "Instagram", "TikTok"
  name: string;
  rateOrigin: number; // provider's raw rate (their currency, per 1000 units)
  rateNaira: number; // normalized price in NGN per 1000 units
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  description?: string;
}

export interface RemoteOrderResult {
  providerOrderId: string;
}

// Aligned with THE-HK's `TransactionStatus` domain type so order records can
// reuse the existing status badge/UI vocabulary instead of introducing a
// parallel provider-specific status enum.
export type RemoteOrderStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';

export interface RemoteOrderStatusResult {
  status: RemoteOrderStatus;
  startCount?: number;
  remains?: number;
  raw?: unknown;
}

export interface SocialServiceProvider {
  getServices(): Promise<RemoteService[]>;
  createOrder(input: { serviceId: string; link: string; quantity: number }): Promise<RemoteOrderResult>;
  getOrderStatus(providerOrderId: string): Promise<RemoteOrderStatusResult>;
}
