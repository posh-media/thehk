// Generic abstraction for airtime/data top-up providers. Mirrors the
// SocialServiceProvider pattern from Phase 3A: THE-HK backend code depends
// on this interface, not on a specific vendor (Reloadly today, potentially
// another aggregator later).

export interface RemoteOperator {
  id: string;
  name: string;
  networkCode: string;
  countryCode: string;
  supportsAirtime: boolean;
  supportsData: boolean;
  minAmountNaira?: number;
  maxAmountNaira?: number;
}

export interface RemoteDataPlan {
  id: string; // encodes enough info for the provider to redeem it (e.g. "<operatorId>:<amount>")
  operatorId: string;
  description: string;
  amountNaira: number;
}

export interface RemoteTopupResult {
  providerTransactionId: string;
  providerRequestId?: string;
  status: 'successful' | 'processing' | 'failed';
}

export interface AirtimeDataProvider {
  name: string;
  isConfigured(): boolean;
  listOperators(countryCode: string): Promise<RemoteOperator[]>;
  detectOperator(phone: string, countryCode: string): Promise<RemoteOperator | null>;
  getDataPlans(operatorId: string): Promise<RemoteDataPlan[]>;
  purchaseAirtime(input: {
    operatorId: string;
    phone: string;
    amountNaira: number;
    requestId: string;
  }): Promise<RemoteTopupResult>;
  purchaseData(input: {
    operatorId: string;
    phone: string;
    plan: RemoteDataPlan;
    requestId: string;
  }): Promise<RemoteTopupResult>;
  requeryOrder?(requestId: string): Promise<RemoteTopupResult>;
}

export interface BillCategory {
  id: string; // provider's category/type code, e.g. "ELECTRICITY_BILL_PAYMENT"
  name: string; // human-readable, e.g. "Electricity"
}

export interface Biller {
  id: string;
  name: string;
  categoryId: string;
  countryCode: string;
  serviceType: 'PREPAID' | 'POSTPAID' | 'FIXED';
  minAmountNaira?: number;
  maxAmountNaira?: number;
}

/**
 * Generic bill-payment abstraction (electricity, cable TV, internet, water,
 * etc). `verifyCustomer` is optional at the interface level because not
 * every provider/biller supports pre-payment customer validation - a
 * provider without it should return `null` rather than fabricate a name.
 */
export interface BillProvider {
  getCategories(countryCode: string): Promise<BillCategory[]>;
  getBillers(countryCode: string, categoryId?: string): Promise<Biller[]>;
  verifyCustomer(billerId: string, customerNumber: string): Promise<{ customerName: string } | null>;
  payBill(input: { billerId: string; customerNumber: string; amountNaira: number; reference: string }): Promise<RemoteTopupResult>;
}
