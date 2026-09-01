export type Currency = 'NGN';

// All monetary 'amount' fields are stored and transferred as the smallest currency unit (kobo for NGN).
export type TransactionStatus = 'pending' | 'processing' | 'successful' | 'completed' | 'failed' | 'cancelled' | 'reversed' | 'refunded';
export type TransactionType =
  | 'wallet_funding'
  | 'withdrawal'
  | 'airtime'
  | 'data'
  | 'bill_payment'
  | 'social_media_order'
  | 'gift_card_purchase'
  | 'gift_card_sale'
  | 'marketplace_purchase'
  | 'marketplace_refund'
  | 'referral_reward'
  // Legacy points_conversion transactions are historical only; new conversions use hkc_conversion.
  | 'points_conversion'
  | 'hkc_conversion';

export interface UserPreferences {
  emailNotification: boolean;
  pushNotification: boolean;
  appearance: 'dark' | 'light' | 'system';
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  country: string | null;
  dateOfBirth: string | null;
  preferences: UserPreferences;
  role: 'user' | 'seller' | 'admin' | 'support';
  isVerified: boolean;
  isSeller: boolean;
  rank: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  userId: string;
  // NGN wallet (secondary - seller/withdrawal balance). Stored in kobo.
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  currency: Currency;
  // HK Coins (primary consumer spending balance). Stored in whole HKC: 1 HKC = ₦1.
  hkcBalance: number;
  availableHkcBalance: number;
  pendingHkcBalance: number;
  updatedAt: string;
}

// Standalone HKC balance view (mirrors the wallet fields for HKC).
export interface HkcBalance {
  userId: string;
  balance: number; // whole HKC
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  status: TransactionStatus;
  reference: string;
  providerReference?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  walletId: string;
  userId: string;
  transactionId: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export type PaymentProvider = 'paystack' | 'korapay' | 'flutterwave';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned';

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  status: PaymentStatus;
  reference: string;
  providerReference?: string;
  authorizationUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  status: TransactionStatus;
  reference: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bank {
  id: string;
  name: string;
  code: string;
  // Paystack fields (kept for future provider flexibility).
  slug?: string;
  longcode?: string;
  type?: string;
  country?: string;
  currency?: string;
  active?: boolean;
  logoUrl?: string;
  // Local asset module (e.g. require('./assets/...')) for bank logos that
  // ship with the app. Takes precedence over logoUrl when present.
  logoAsset?: number;
  implemented?: boolean;
  receiptTemplate?: string;
  // 'bank' for traditional Nigerian banks, 'wallet' for Bank Gen wallets (Coinbase, PayPal, Binance, etc.).
  category?: 'bank' | 'wallet';
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  icon: string;
  isActive: boolean;
  route?: string;
  // Visibility / rollout flags. `isActive` is the legacy visibility flag.
  // `visible` and `implemented` are the future Admin Panel controls.
  visible?: boolean;
  implemented?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
}

export interface ServiceVisibilityOverride {
  visible?: boolean;
  implemented?: boolean;
  isPopular?: boolean;
  sortOrder?: number;
}

export interface SocialMediaService {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  rate: number;
  minQuantity: number;
  maxQuantity: number;
  refill: boolean;
  cancel: boolean;
  platform: string;
  averageTime?: string;
}

export interface SocialProfile {
  id: string;
  userId: string;
  platform: string;
  displayName: string;
  username: string;
  profileUrl?: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ServiceOrderType = 'social_media' | 'airtime' | 'data' | 'bill' | 'gift_card';

export interface ServiceOrder {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  platform: string;
  link: string; // target link/username (social media) or phone/account number (airtime/data/bill)
  quantity: number;
  amount: number;
  status: TransactionStatus;
  reference: string;
  serviceType?: ServiceOrderType; // absent/undefined implies 'social_media' for orders created before Phase 3B
  provider?: string;
  providerReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkOperator {
  id: string;
  name: string; // e.g. "MTN Nigeria"
  networkCode: string; // e.g. "MTN"
  countryCode: string;
  supportsAirtime: boolean;
  supportsData: boolean;
}

export interface DataPlan {
  id: string; // stable identifier for this plan within its operator
  operatorId: string;
  description: string; // e.g. "1GB - 30 Days"
  amount: number; // price in kobo
}

export interface BillCategory {
  id: string;
  name: string;
}

export interface Biller {
  id: string;
  name: string;
  categoryId: string;
  serviceType: 'PREPAID' | 'POSTPAID' | 'FIXED';
  minAmount?: number; // kobo
  maxAmount?: number; // kobo
}

export interface GiftCardProduct {
  id: string;
  brandId: string;
  brandName: string;
  countryCode: string;
  logoUrl?: string;
  discountPercentage?: number;
  denominationType: 'fixed' | 'range';
  fixedDenominations: number[]; // kobo
  minAmount?: number; // kobo
  maxAmount?: number; // kobo
}

export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'sold_out' | 'rejected';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  type: string;
  yearCreated?: string;
  warranty?: string;
  accountLevel?: string;
  shortDescription?: string;
}

export interface Listing {
  id: string;
  sellerId: string;
  productId: string;
  product: Product;
  price: number;
  stock: number;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceOrder {
  id: string;
  buyerId: string;
  listingId: string;
  listing?: Listing;
  sellerId: string;
  quantity: number;
  totalPrice: number;
  status: TransactionStatus;
  reference: string;
  deliveryDetails?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: 'transaction' | 'system' | 'promotion' | 'security';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  status: 'pending' | 'active' | 'rewarded';
  rewardAmount: number; // kobo
  createdAt: string;
  activatedAt?: string;
}

export interface ReferralSummary {
  referralCode?: string;
  referrals: Referral[];
  totalReferrals: number;
  successfulReferrals: number;
  balance: number; // kobo
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  hkcCost: number;
  type: 'voucher' | 'streak' | 'cashback' | 'discount';
  isAvailable: boolean;
  expiresAt?: string;
}

// HK Coins (HKC) transaction & balance types.

export type HkcTransactionType =
  | 'signup_bonus'
  | 'deposit'
  | 'spending'
  | 'conversion'
  | 'refund'
  | 'adjustment'
  // Legacy migration type for points converted to HKC.
  | 'migration';

export interface HkcTransaction {
  id: string;
  userId: string;
  type: HkcTransactionType;
  amount: number; // whole HK Coins, positive = credit, negative = debit
  ngnAmount?: number; // kobo - the NGN side of a conversion, where applicable
  balanceAfter: number; // whole HK Coins after this transaction
  description: string;
  reference: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: 'youtube' | 'announcement' | 'tip' | 'guide';
  thumbnailUrl?: string;
  videoUrl?: string;
  createdAt: string;
}

export type ProviderName = 'paystack' | 'korapay' | 'reloadly' | 'owlet' | 'flutterwave';

// --- Phase 4 continuation: Vouchers ---

export type VoucherUsageType = 'wallet_credit';

export interface VoucherCatalogItem {
  id: string;
  title: string;
  description: string;
  usageType: VoucherUsageType;
  value: number; // kobo
  hkcCost: number;
  usageRestrictions?: string;
  validForDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserVoucherStatus = 'issued' | 'redeemed' | 'expired' | 'locked';

export interface UserVoucher {
  id: string;
  userId: string;
  voucherId: string;
  title: string;
  description: string;
  usageType: VoucherUsageType;
  value: number; // kobo
  usageRestrictions?: string;
  status: UserVoucherStatus;
  issuedAt: string;
  expiresAt?: string;
  redeemedAt?: string;
  transactionId?: string;
}

// --- Phase 4 continuation: Cashback ---

export interface CashbackBalance {
  userId: string;
  balance: number; // kobo
  updatedAt: string;
}

export type CashbackTransactionType = 'earned' | 'spent' | 'adjustment';

export interface CashbackTransaction {
  id: string;
  userId: string;
  type: CashbackTransactionType;
  amount: number; // kobo
  description: string;
  relatedOrderId?: string;
  reference: string;
  createdAt: string;
}

// --- Phase 4 continuation: Admin panel platform config ---

export interface AdminTutorial {
  id: string;
  title: string;
  description: string;
  category: 'youtube' | 'guide';
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface AdminPlatformConfig {
  onMaintenance: boolean;
  supportEmail: string;
  announcements: string[];
  tutorials: AdminTutorial[];
  tips: string[];
  airtimeProvider?: 'reloadly' | 'owlet' | string;
  dataProvider?: 'reloadly' | 'owlet' | string;
  billProvider?: 'reloadly' | string;
  // Future Admin Panel service visibility overrides. The client merges these
  // with the static service catalog so services can be hidden/activated
  // without a deployment.
  serviceVisibility?: Record<string, ServiceVisibilityOverride>;
  updatedAt: string;
}

// --- Phase 4 continuation: Disputes ---

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

export interface Dispute {
  id: string;
  userId: string;
  transactionId?: string;
  orderReference?: string;
  category: string;
  subject: string;
  description: string;
  status: DisputeStatus;
  adminResponse?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Phase 4 continuation: Receipts ---

export interface ReceiptRecord {
  id: string;
  userId: string;
  transactionId?: string;
  amount: number; // kobo
  senderName: string;
  senderAccountNumber?: string;
  receiverBankName: string;
  receiverAccountNumber: string;
  receiverAccountName: string;
  reference: string;
  createdAt: string;
}
