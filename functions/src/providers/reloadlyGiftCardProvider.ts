import { GiftCardProvider, GiftCardProduct, GiftCardOrderResult, GiftCardRedeemCode } from './giftCardProvider';
import { ReloadlyClient } from './reloadlyClient';

// Reloadly Gift Cards API
// (https://developers.reloadly.com/gift-cards/introduction,
// https://docs.reloadly.com/gift-cards). Confirmed documented endpoints:
//   GET  /products                          - paginated product catalog (countryCode filter)
//   GET  /products/{id}                     - single product detail
//   POST /orders                            - place an order (productId, quantity, unitPrice, recipientEmail, senderName, ...)
//   GET  /orders/transactions/{id}          - transaction/order status
//   GET  /orders/transactions/{id}/cards    - redeem codes (card number / PIN) for a completed order
// This has NOT been exercised against a live account - see
// PHASE_3C_COMPLETION_REPORT.md.

const ACCEPT = 'application/com.reloadly.giftcards-v1+json';

interface ReloadlyBrand {
  brandId: number;
  brandName: string;
}

interface ReloadlyProduct {
  productId: number;
  productName: string;
  countryCode: string;
  global: boolean;
  senderFee?: number;
  discountPercentage?: number;
  denominationType: 'FIXED' | 'RANGE';
  recipientCurrencyCode: string;
  fixedRecipientDenominations?: number[];
  minRecipientDenomination?: number;
  maxRecipientDenomination?: number;
  logoUrls?: string[];
  brand: ReloadlyBrand;
}

function mapProduct(p: ReloadlyProduct): GiftCardProduct {
  return {
    id: String(p.productId),
    brandId: String(p.brand?.brandId ?? ''),
    brandName: p.brand?.brandName || p.productName,
    countryCode: p.countryCode,
    currencyCode: p.recipientCurrencyCode,
    logoUrl: p.logoUrls && p.logoUrls.length > 0 ? p.logoUrls[0] : undefined,
    discountPercentage: p.discountPercentage,
    denominationType: p.denominationType === 'RANGE' ? 'range' : 'fixed',
    fixedDenominations: p.fixedRecipientDenominations || [],
    minAmount: p.minRecipientDenomination,
    maxAmount: p.maxRecipientDenomination,
  };
}

export class ReloadlyGiftCardProvider implements GiftCardProvider {
  name = 'reloadly';
  private client: ReloadlyClient;

  constructor(clientId: string, clientSecret: string, isSandbox = false) {
    const baseUrl = isSandbox ? 'https://giftcards-sandbox.reloadly.com' : 'https://giftcards.reloadly.com';
    this.client = new ReloadlyClient(clientId, clientSecret, baseUrl, baseUrl);
  }

  private call<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.client.request<T>('Gift Card', path, ACCEPT, init);
  }

  async listProducts(countryCode: string): Promise<GiftCardProduct[]> {
    const data = await this.call<{ content: ReloadlyProduct[] } | ReloadlyProduct[]>(
      `/products?countryCode=${encodeURIComponent(countryCode)}&size=100`
    );
    const products = Array.isArray(data) ? data : data.content || [];
    return products.map(mapProduct);
  }

  async getProduct(productId: string): Promise<GiftCardProduct | null> {
    try {
      const product = await this.call<ReloadlyProduct>(`/products/${productId}`);
      return mapProduct(product);
    } catch {
      return null;
    }
  }

  async orderGiftCard(input: {
    productId: string;
    unitPrice: number;
    quantity: number;
    recipientEmail: string;
    senderName: string;
    reference: string;
  }): Promise<GiftCardOrderResult> {
    const data = await this.call<{ transactionId: number; status?: string; amount?: number; currencyCode?: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        productId: Number(input.productId),
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        customIdentifier: input.reference,
        senderName: input.senderName,
        recipientEmail: input.recipientEmail,
      }),
    });
    return {
      providerTransactionId: String(data.transactionId),
      status: mapOrderStatus(data.status),
      chargedAmount: data.amount,
      chargedCurrency: data.currencyCode,
    };
  }

  async getRedeemCodes(providerTransactionId: string): Promise<GiftCardRedeemCode[]> {
    const cards = await this.call<{ cardNumber: string; pinCode?: string }[]>(
      `/orders/transactions/${providerTransactionId}/cards`
    );
    return (cards || []).map((c) => ({ cardNumber: c.cardNumber, pinCode: c.pinCode }));
  }
}

function mapOrderStatus(status: string | undefined): 'successful' | 'processing' | 'failed' {
  const s = (status || '').toUpperCase();
  if (s === 'SUCCESSFUL') return 'successful';
  if (s === 'FAILED' || s === 'REJECTED' || s === 'DECLINED') return 'failed';
  // Reloadly's documented examples always include an explicit `status`
  // field. If a response omits it, treat the order as still processing
  // rather than assuming success - the redeem-code retrieval step will
  // naturally fail/retry until the order is actually complete.
  return 'processing';
}
