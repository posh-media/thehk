// Domain types used inside Cloud Functions.
// These mirror the client-side domain types but are kept independent to avoid
// coupling server internals to the client package.

export type Currency = 'NGN';

export type TransactionStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled' | 'reversed' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'abandoned';
export type PaymentProvider = 'paystack' | 'korapay' | 'flutterwave';

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
  referralCode: string;
  referredBy: string | null; // referrer's userId, set at most once
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  userId: string;
  balance: number; // kobo
  availableBalance: number; // kobo
  pendingBalance: number; // kobo
  currency: Currency;
  firstFundedAt?: string; // set once, on the first successful wallet funding - used to gate referral activation
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number; // kobo
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
  paymentId?: string;
  withdrawalId?: string;
  type: 'credit' | 'debit';
  amount: number; // kobo
  balanceAfter: number; // kobo
  description: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  transactionId: string;
  amount: number; // kobo
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

export type ServiceOrderType = 'social_media' | 'airtime' | 'data' | 'bill' | 'gift_card';
export type ServiceOrderStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'cancelled';

export interface ServiceOrderRecord {
  id: string;
  userId: string;
  serviceType: ServiceOrderType;
  serviceId: string;
  serviceName: string;
  platform: string;
  provider: string;
  link: string; // target link/username (social) or phone/account number (airtime/data/bill)
  quantity: number;
  amount: number; // kobo
  status: ServiceOrderStatus;
  reference: string;
  transactionId: string;
  providerOrderId?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Phase 4: HK Points ---

export interface PointsBalance {
  userId: string;
  balance: number; // whole HK Points
  updatedAt: string;
}

export type PointsTransactionType = 'wallet_conversion' | 'referral_conversion' | 'redeemed' | 'adjustment' | 'signup_bonus';

export interface PointsTransaction {
  id: string;
  userId: string;
  type: PointsTransactionType;
  points: number; // positive = credit, negative = debit
  amount?: number; // kobo - the naira side of a conversion, where applicable
  description: string;
  status: 'successful';
  reference: string;
  createdAt: string;
}

// --- Phase 4: Referrals ---

export type ReferralStatus = 'pending' | 'active' | 'rewarded';

export interface ReferralRecord {
  id: string; // deterministic: `${referrerId}_${referredUserId}`
  referrerId: string;
  referredUserId: string;
  status: ReferralStatus;
  rewardAmount: number; // kobo, credited to referrer's referral balance once activated
  createdAt: string;
  activatedAt?: string;
}

export interface ReferralBalance {
  userId: string;
  balance: number; // kobo
  updatedAt: string;
}

// --- Phase 4 continuation: Vouchers ---

export type VoucherUsageType = 'wallet_credit'; // more usage types (discount/service_credit) can be added later without restructuring

export interface VoucherCatalogItem {
  id: string;
  title: string;
  description: string;
  usageType: VoucherUsageType;
  value: number; // kobo - credited to wallet when redeemed (for wallet_credit vouchers)
  pointsCost: number; // HK Points required to claim; 0 = free
  usageRestrictions?: string;
  validForDays?: number; // how long an issued voucher stays usable after being claimed
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
  transactionId?: string; // set once redeemed
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
  amount: number; // kobo, always positive - `type` indicates direction
  description: string;
  relatedOrderId?: string;
  reference: string;
  createdAt: string;
}

// --- Phase 4 continuation: Admin panel platform config (read-only to users) ---

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

// --- Phase 4: Notifications ---
// Category list intentionally covers the events the future Admin platform
// will also need to send (promotion/system), even though only user/backend
// events are generated today.
export type NotificationCategory = 'transaction' | 'order' | 'security' | 'promotion' | 'reward' | 'referral' | 'system';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: NotificationCategory;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number; // kobo
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
