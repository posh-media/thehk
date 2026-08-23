// Generic gift-card provider abstraction. Mirrors the pattern already
// established for SocialServiceProvider (Phase 3A) and AirtimeDataProvider
// (Phase 3B): business logic, orders, and UI depend on this interface, not
// on Reloadly-specific response shapes.

export interface GiftCardProduct {
  id: string;
  brandId: string;
  brandName: string;
  countryCode: string;
  currencyCode: string;
  logoUrl?: string;
  discountPercentage?: number;
  denominationType: 'fixed' | 'range';
  fixedDenominations: number[]; // in the product's own currencyCode
  minAmount?: number;
  maxAmount?: number;
}

export interface GiftCardOrderResult {
  providerTransactionId: string;
  status: 'successful' | 'processing' | 'failed';
  chargedAmount?: number; // as reported by the provider, in THE-HK's account currency
  chargedCurrency?: string;
}

export interface GiftCardRedeemCode {
  cardNumber: string;
  pinCode?: string;
}

export interface GiftCardProvider {
  listProducts(countryCode: string): Promise<GiftCardProduct[]>;
  getProduct(productId: string): Promise<GiftCardProduct | null>;
  orderGiftCard(input: {
    productId: string;
    unitPrice: number;
    quantity: number;
    recipientEmail: string;
    senderName: string;
    reference: string;
  }): Promise<GiftCardOrderResult>;
  getRedeemCodes(providerTransactionId: string): Promise<GiftCardRedeemCode[]>;
}
