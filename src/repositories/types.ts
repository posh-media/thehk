import {
  User,
  Wallet,
  Transaction,
  Payment,
  Withdrawal,
  Service,
  ServiceCategory,
  SocialMediaService,
  SocialProfile,
  ServiceOrder,
  Listing,
  MarketplaceOrder,
  Notification,
  Referral,
  ReferralSummary,
  Reward,
  HkcTransaction,
  HkcBalance,
  SupportTicket,
  Tutorial,
  Bank,
  NetworkOperator,
  DataPlan,
  BillCategory,
  Biller,
  GiftCardProduct,
  VoucherCatalogItem,
  UserVoucher,
  CashbackBalance,
  CashbackTransaction,
  AdminPlatformConfig,
  Dispute,
  ReceiptRecord,
} from '@/types/domain';

export interface AuthRepository {
  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string, data: Partial<User>): Promise<User>;
  updateProfile(userId: string, data: Partial<User>): Promise<User>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  resendVerification(): Promise<void>;
  verifyEmail(): Promise<User>;
  getCurrentUser(): User | null;
}

export interface WalletRepository {
  getWallet(userId: string): Promise<Wallet>;
  fund(userId: string, amount: number, provider: string): Promise<Payment>;
  verifyPaystackPayment(reference: string): Promise<{ processed: boolean; message: string; transactionId?: string }>;
  withdraw(userId: string, withdrawal: Omit<Withdrawal, 'id' | 'userId' | 'status' | 'reference' | 'createdAt' | 'updatedAt'>): Promise<Withdrawal>;
}

export interface TransactionRepository {
  getTransactions(userId: string, options?: { limit?: number; cursor?: string }): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | null>;
}

export interface ServiceRepository {
  getCategories(): Promise<ServiceCategory[]>;
  getServices(categoryId?: string): Promise<Service[]>;
  getSocialMediaServices(categoryId?: string): Promise<SocialMediaService[]>;
  placeServiceOrder(order: Omit<ServiceOrder, 'id' | 'status' | 'reference' | 'createdAt' | 'updatedAt'>): Promise<ServiceOrder>;
  getOrders(userId: string): Promise<ServiceOrder[]>;
}

export interface UtilityRepository {
  getNetworkOperators(): Promise<NetworkOperator[]>;
  detectNetworkOperator(phone: string): Promise<NetworkOperator | null>;
  getDataPlans(operatorId: string): Promise<DataPlan[]>;
  purchaseAirtime(input: { operatorId: string; phone: string; amount: number }): Promise<ServiceOrder>;
  purchaseData(input: { operatorId: string; phone: string; planId: string }): Promise<ServiceOrder>;
  getBillCategories(): Promise<BillCategory[]>;
  getBillers(categoryId?: string): Promise<Biller[]>;
  verifyBillCustomer(billerId: string, customerNumber: string): Promise<{ customerName: string } | null>;
  payBill(input: { billerId: string; customerNumber: string; amount: number }): Promise<ServiceOrder>;
}

export interface GiftCardRepository {
  getProducts(): Promise<GiftCardProduct[]>;
  getProduct(productId: string): Promise<GiftCardProduct | null>;
  purchaseGiftCard(input: { productId: string; unitPrice: number; quantity: number; recipientEmail: string; senderName?: string; useCashback?: boolean }): Promise<ServiceOrder>;
  getRedeemCode(orderId: string): Promise<{ cardNumber: string; pinCode?: string }[]>;
}

export interface SocialProfileRepository {
  getProfiles(userId: string): Promise<SocialProfile[]>;
  saveProfile(profile: Omit<SocialProfile, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<SocialProfile>;
  deleteProfile(id: string): Promise<void>;
}

export interface MarketplaceRepository {
  getListings(options?: { search?: string; category?: string }): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | null>;
  createListing(listing: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Promise<Listing>;
  getMyListings(userId: string): Promise<Listing[]>;
  getOrders(userId: string, role: 'buyer' | 'seller'): Promise<MarketplaceOrder[]>;
  placeOrder(order: Omit<MarketplaceOrder, 'id' | 'status' | 'reference' | 'createdAt' | 'updatedAt'>): Promise<MarketplaceOrder>;
  deliverOrder(orderId: string, credentials: string): Promise<void>;
}

export interface NotificationRepository {
  getNotifications(userId: string): Promise<Notification[]>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
}

export interface RewardsRepository {
  getReferralSummary(): Promise<ReferralSummary>;
  applyReferralCode(code: string): Promise<void>;
  getRewards(userId: string): Promise<Reward[]>;
  getHkcBalance(): Promise<HkcBalance>;
  getHkcTransactions(userId: string): Promise<HkcTransaction[]>;
  convertWalletToHkc(amountNaira: number): Promise<HkcTransaction>;
  convertReferralToHkc(amountNaira: number): Promise<HkcTransaction>;
  getVoucherCatalog(): Promise<VoucherCatalogItem[]>;
  getMyVouchers(): Promise<UserVoucher[]>;
  claimVoucher(voucherId: string): Promise<UserVoucher>;
  redeemVoucher(userVoucherId: string): Promise<UserVoucher>;
}

export interface CashbackRepository {
  getBalance(): Promise<CashbackBalance>;
  getHistory(): Promise<CashbackTransaction[]>;
}

export interface AdminRepository {
  getPlatformConfig(): Promise<AdminPlatformConfig>;
}

export interface SupportRepository {
  getTickets(userId: string): Promise<SupportTicket[]>;
  createTicket(ticket: Omit<SupportTicket, 'id' | 'status' | 'priority' | 'createdAt' | 'updatedAt'>): Promise<SupportTicket>;
  getTutorials(): Promise<Tutorial[]>;
  createDispute(input: { transactionId?: string; orderReference?: string; category: string; subject: string; description: string }): Promise<Dispute>;
  getDisputes(): Promise<Dispute[]>;
}

export interface BankRepository {
  getBanks(): Promise<Bank[]>;
  verifyAccount(bankCode: string, accountNumber: string): Promise<{ accountName: string }>;
}

export interface ReceiptRepository {
  generateReceipt(data: {
    transactionId?: string;
    amount: number;
    senderName: string;
    senderAccountNumber?: string;
    receiverBankName: string;
    receiverAccountNumber: string;
    receiverAccountName: string;
  }): Promise<ReceiptRecord>;
  purchaseBankGenReceipt(data: {
    amount: number;
    senderName: string;
    senderAccountNumber?: string;
    receiverBankName: string;
    receiverAccountNumber: string;
    receiverAccountName: string;
    useCashback?: boolean;
  }): Promise<ReceiptRecord>;
  getReceipt(receiptId: string): Promise<ReceiptRecord>;
}
