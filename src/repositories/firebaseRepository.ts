import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentSnapshot } from 'firebase/firestore';
import { auth, db, functions } from '@infrastructure/firebase';
import { useAuthStore } from '@stores/authStore';
import {
  AuthRepository,
  WalletRepository,
  TransactionRepository,
  NotificationRepository,
  ServiceRepository,
  UtilityRepository,
  GiftCardRepository,
  SocialProfileRepository,
  MarketplaceRepository,
  RewardsRepository,
  CashbackRepository,
  AdminRepository,
  SupportRepository,
  BankRepository,
  ReceiptRepository,
} from './types';
import {
  Bank,
  User,
  Wallet,
  Transaction,
  Payment,
  Withdrawal,
  Notification,
  Service,
  SocialMediaService,
  ServiceOrder,
  NetworkOperator,
  DataPlan,
  BillCategory,
  Biller,
  GiftCardProduct,
  ReferralSummary,
  Reward,
  HkcBalance,
  HkcTransaction,
  VoucherCatalogItem,
  UserVoucher,
  CashbackBalance,
  CashbackTransaction,
  AdminPlatformConfig,
  Dispute,
  ReceiptRecord,
} from '@/types/domain';
import {
  mockUser,
  mockWallet,
  mockTransactions,
  mockNotifications,
  mockServiceCategories,
  mockServices,
  mockSocialProfiles,
  mockListings,
  mockMarketplaceOrders,
  mockRewards,
  mockSupportTickets,
  mockTutorials,
} from '@/data/mocks';
import paystackBanks from '@/data/paystackBanks.json';
import { bankLogoAssets, walletLogoAssets } from '@/data/bankLogos';
import { toMinorUnits } from '@lib/formatters';
import { mapCallableError } from '@lib/errors';

// Cloud Functions region
const REGION = 'us-central1';

function getCallable<T = any, R = any>(name: string) {
  const fn = httpsCallable<T, R>(functions, name, { limitedUseAppCheckTokens: false });
  return async (data: T) => {
    try {
      return await fn(data);
    } catch (err) {
      throw mapCallableError(err);
    }
  };
}

// Merge the static service catalog with optional admin-panel overrides so
// visibility/rollout can be controlled from the cloud without redeploying
// the client. Any service missing from the override map keeps its default
// values. Hidden services are removed from the catalog.
function applyServiceVisibility(
  services: Service[],
  overrides: AdminPlatformConfig['serviceVisibility'] = {}
): Service[] {
  return services
    .map((service) => {
      const override = overrides?.[service.id];
      if (!override) return service;
      return {
        ...service,
        visible: override.visible !== undefined ? override.visible : service.visible,
        implemented: override.implemented !== undefined ? override.implemented : service.implemented,
        isPopular: override.isPopular !== undefined ? override.isPopular : service.isPopular,
        sortOrder: override.sortOrder !== undefined ? override.sortOrder : service.sortOrder,
      };
    })
    .filter((service) => (service.visible === undefined ? service.isActive !== false : service.visible !== false))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function mapFirebaseUser(fu: FirebaseUser | null): User | null {
  if (!fu) return null;
  const nameParts = (fu.displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    id: fu.uid,
    email: fu.email || '',
    phone: fu.phoneNumber,
    displayName: fu.displayName,
    firstName: nameParts[0] || null,
    lastName: nameParts.slice(1).join(' ') || null,
    username: null,
    photoUrl: fu.photoURL,
    country: null,
    dateOfBirth: null,
    preferences: {
      emailNotification: true,
      pushNotification: true,
      appearance: 'system',
    },
    role: 'user',
    isVerified: fu.emailVerified,
    createdAt: fu.metadata.creationTime || new Date().toISOString(),
    updatedAt: fu.metadata.lastSignInTime || new Date().toISOString(),
  };
}

async function fetchUserProfile(uid: string): Promise<Partial<User>> {
  const fn = getCallable<string, any>('getUserProfile');
  const { data } = await fn('');
  return data as Partial<User>;
}

async function syncUserProfile(fu: FirebaseUser): Promise<User> {
  let profile: Partial<User> = {};
  try {
    profile = await fetchUserProfile(fu.uid);
  } catch {
    // allow fallback to local mapping
  }
  const base = mapFirebaseUser(fu)!;
  return { ...base, ...profile };
}

class FirebaseAuthRepository implements AuthRepository {
  private currentUser: User | null = null;

  constructor() {
    const store = useAuthStore.getState();
    store.setLoading(true);

    let authResolved = false;

    const unsubscribe = onAuthStateChanged(auth, async (fu) => {
      if (authResolved) return;
      authResolved = true;

      try {
        if (fu) {
          this.currentUser = await syncUserProfile(fu);
          store.signIn(this.currentUser);
          // Fire-and-forget signup bonus migration for existing users.
          getCallable<{}, void>('ensureSignupBonus')({}).catch(() => undefined);
        } else {
          this.currentUser = null;
          store.signOut();
        }
      } catch (err) {
        this.currentUser = null;
        store.setAuthError((err as Error).message);
      }
    }, (err) => {
      if (authResolved) return;
      authResolved = true;
      this.currentUser = null;
      store.setAuthError(err.message);
    });

    // Safety fallback: if auth state never resolves (e.g. corrupted
    // AsyncStorage, dead native module, no network on first launch), force
    // the app out of the loading state so the splash screen does not hang.
    setTimeout(() => {
      if (!authResolved) {
        authResolved = true;
        unsubscribe();
        this.currentUser = null;
        store.setAuthError('Auth initialization timed out. Please restart the app.');
      }
    }, 7000);
  }

  async signIn(email: string, password: string): Promise<User> {
    const cred: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      // still allow login, but consumer can enforce verification
    }
    this.currentUser = await syncUserProfile(cred.user);
    return this.currentUser;
  }

  async signUp(email: string, password: string, data: Partial<User>): Promise<User> {
    const cred: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const displayName = [data.firstName, data.lastName].filter(Boolean).join(' ');
    await updateFirebaseProfile(cred.user, { displayName: displayName || '' });
    await sendEmailVerification(cred.user);
    this.currentUser = {
      ...mapFirebaseUser(cred.user)!,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
    };
    return this.currentUser;
  }

  async updateProfile(_userId: string, data: Partial<User>): Promise<User> {
    const fn = getCallable<Partial<User>, void>('updateUserProfile');
    await fn({ ...data });
    const authUser = auth.currentUser;
    if (authUser && (data.displayName !== undefined || data.photoUrl !== undefined)) {
      await updateFirebaseProfile(authUser, {
        displayName: data.displayName ?? authUser.displayName ?? '',
        photoURL: data.photoUrl ?? authUser.photoURL ?? '',
      });
    }
    if (!this.currentUser) {
      throw new Error('No current user');
    }
    this.currentUser = { ...this.currentUser, ...data, updatedAt: new Date().toISOString() };
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    await signOut(auth);
    this.currentUser = null;
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  async resendVerification(): Promise<void> {
    const u = auth.currentUser;
    if (!u) throw new Error('No authenticated user');
    await sendEmailVerification(u);
  }

  async verifyEmail(): Promise<boolean> {
    const u = auth.currentUser;
    if (!u) return false;
    await u.reload();
    const verified = u.emailVerified;
    if (verified && this.currentUser) {
      this.currentUser = { ...this.currentUser, isVerified: true };
    }
    return verified;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }
}

class FirebaseWalletRepository implements WalletRepository {
  async getWallet(_userId: string): Promise<Wallet> {
    const fn = getCallable('getWallet');
    const { data } = await fn('');
    return data as Wallet;
  }

  async fund(_userId: string, amount: number, provider: string): Promise<Payment> {
    const fn = getCallable<{ amount: number; provider: string }, { payment: Payment }>('initiateWalletFunding');
    const { data } = await fn({ amount, provider });
    return data.payment;
  }

  async verifyPaystackPayment(reference: string): Promise<{ processed: boolean; message: string; transactionId?: string }> {
    const fn = getCallable<{ reference: string }, { processed: boolean; message: string; transactionId?: string }>('verifyPaystackPaymentFn');
    const { data } = await fn({ reference });
    return data;
  }

  async withdraw(
    _userId: string,
    withdrawal: Omit<Withdrawal, 'id' | 'userId' | 'status' | 'reference' | 'createdAt' | 'updatedAt'>
  ): Promise<Withdrawal> {
    const fn = getCallable('initiateWithdrawal');
    const { data } = await fn({ ...withdrawal, amount: withdrawal.amount });
    return data.withdrawal as Withdrawal;
  }
}

class FirebaseTransactionRepository implements TransactionRepository {
  async getTransactions(userId: string, options?: { limit?: number; cursor?: string }): Promise<Transaction[]> {
    const pageLimit = options?.limit || 20;
    let q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageLimit)
    );

    if (options?.cursor) {
      const cursorDoc: DocumentSnapshot = await getDoc(doc(db, 'transactions', options.cursor));
      if (cursorDoc.exists()) {
        q = query(q, startAfter(cursorDoc));
      }
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Transaction);
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    const snap = await getDoc(doc(db, 'transactions', id));
    return snap.exists() ? (snap.data() as Transaction) : null;
  }
}

class FirebaseNotificationRepository implements NotificationRepository {
  async getNotifications(userId: string): Promise<Notification[]> {
    const fn = getCallable<{ limit?: number }, Notification[]>('getNotifications');
    const { data } = await fn({ limit: 50 });
    return data;
  }

  async markAsRead(id: string): Promise<void> {
    const fn = getCallable<{ id: string }, void>('markNotificationRead');
    await fn({ id });
  }

  async markAllAsRead(userId: string): Promise<void> {
    // Mark all as read individually for now
    const notes = await this.getNotifications(userId);
    await Promise.all(notes.filter((n) => !n.isRead).map((n) => this.markAsRead(n.id)));
  }
}

interface RemoteSocialService {
  id: string;
  category: string;
  name: string;
  rateNaira: number; // per 1000 units
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  description?: string;
}

// The generic services hub (category tiles, non-social services) is still
// backed by mock data - Airtime/Data/Bills providers are not yet configured
// (see PHASE_3_COMPLETION_REPORT.md). Social media services are real,
// backed by The Owlet via Cloud Functions.
class FirebaseServiceRepository implements ServiceRepository {
  async getCategories() { return mockServiceCategories; }

  async getServices(categoryId?: string) {
    // Static defaults define the visible catalog. The `serviceVisibility`
    // field on `AdminPlatformConfig` is the future override point: when the
    // admin panel writes visibility/rollout flags, merge them here with
    // `applyServiceVisibility(mockServices, config.serviceVisibility)`.
    const services = applyServiceVisibility(mockServices, {});
    return categoryId ? services.filter((s: Service) => s.categoryId === categoryId) : services;
  }

  async getSocialMediaServices(categoryId?: string): Promise<SocialMediaService[]> {
    const fn = getCallable<{ forceRefresh?: boolean }, { categories: string[]; services: RemoteSocialService[] }>('getSocialServices');
    const { data } = await fn({});
    const services: SocialMediaService[] = data.services.map((s) => ({
      id: s.id,
      categoryId: s.category,
      name: s.name,
      description: s.description || '',
      // Rates from the provider are per 1000 units; converted here to a
      // per-unit kobo rate purely for display. The Cloud Function
      // recalculates the authoritative total price at order time.
      rate: toMinorUnits(s.rateNaira / 1000),
      minQuantity: s.min,
      maxQuantity: s.max,
      refill: s.refill,
      cancel: s.cancel,
      platform: s.category,
    }));
    return categoryId ? services.filter((s) => s.platform === categoryId) : services;
  }

  async placeServiceOrder(order: Omit<ServiceOrder, 'id' | 'status' | 'reference' | 'createdAt' | 'updatedAt'>): Promise<ServiceOrder> {
    const fn = getCallable<{ serviceId: string; link: string; quantity: number }, { order: ServiceOrder }>('placeSocialMediaOrder');
    const { data } = await fn({ serviceId: order.serviceId, link: order.link, quantity: order.quantity });
    return data.order;
  }

  async getOrders(userId: string): Promise<ServiceOrder[]> {
    const q = query(collection(db, 'serviceOrders'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ServiceOrder);
  }
}

// Airtime/Data via Reloadly. The provider abstraction and backend order flow
// are fully implemented (see functions/src/services/utilityService.ts); if
// Reloadly credentials are not configured server-side, these calls surface a
// clear "provider unavailable" error rather than a fake success.
class FirebaseUtilityRepository implements UtilityRepository {
  async getNetworkOperators(): Promise<NetworkOperator[]> {
    const fn = getCallable<{}, { operators: NetworkOperator[] }>('getNetworkOperators');
    const { data } = await fn({});
    return data.operators;
  }

  async detectNetworkOperator(phone: string): Promise<NetworkOperator | null> {
    const fn = getCallable<{ phone: string }, { operator: NetworkOperator | null }>('detectOperatorForPhone');
    const { data } = await fn({ phone });
    return data.operator;
  }

  async getDataPlans(operatorId: string): Promise<DataPlan[]> {
    const fn = getCallable<{ operatorId: string }, { plans: { id: string; operatorId: string; description: string; amountNaira: number }[] }>('getDataPlans');
    const { data } = await fn({ operatorId });
    return data.plans.map((p) => ({ id: p.id, operatorId: p.operatorId, description: p.description, amount: toMinorUnits(p.amountNaira) }));
  }

  async purchaseAirtime(input: { operatorId: string; phone: string; amount: number }): Promise<ServiceOrder> {
    const fn = getCallable<{ operatorId: string; phone: string; amount: number }, { order: ServiceOrder }>('purchaseAirtime');
    const { data } = await fn(input);
    return data.order;
  }

  async purchaseData(input: { operatorId: string; phone: string; planId: string }): Promise<ServiceOrder> {
    const fn = getCallable<{ operatorId: string; phone: string; planId: string }, { order: ServiceOrder }>('purchaseData');
    const { data } = await fn(input);
    return data.order;
  }

  async getBillCategories(): Promise<BillCategory[]> {
    const fn = getCallable<{}, { categories: BillCategory[] }>('getBillCategories');
    const { data } = await fn({});
    return data.categories;
  }

  async getBillers(categoryId?: string): Promise<Biller[]> {
    const fn = getCallable<{ categoryId?: string }, { billers: { id: string; name: string; categoryId: string; serviceType: Biller['serviceType']; minAmountNaira?: number; maxAmountNaira?: number }[] }>('getBillers');
    const { data } = await fn({ categoryId });
    return data.billers.map((b) => ({
      id: b.id,
      name: b.name,
      categoryId: b.categoryId,
      serviceType: b.serviceType,
      minAmount: b.minAmountNaira !== undefined ? toMinorUnits(b.minAmountNaira) : undefined,
      maxAmount: b.maxAmountNaira !== undefined ? toMinorUnits(b.maxAmountNaira) : undefined,
    }));
  }

  async verifyBillCustomer(billerId: string, customerNumber: string): Promise<{ customerName: string } | null> {
    const fn = getCallable<{ billerId: string; customerNumber: string }, { customer: { customerName: string } | null }>('verifyBillerCustomer');
    const { data } = await fn({ billerId, customerNumber });
    return data.customer;
  }

  async payBill(input: { billerId: string; customerNumber: string; amount: number }): Promise<ServiceOrder> {
    const fn = getCallable<{ billerId: string; customerNumber: string; amount: number }, { order: ServiceOrder }>('payUtilityBill');
    const { data } = await fn(input);
    return data.order;
  }
}

// Gift Cards via Reloadly. Only NGN-denominated products are exposed (see
// functions/src/services/giftCardService.ts for why) - if Reloadly
// credentials are not configured, these calls surface a clear
// "provider unavailable" error rather than a fake success.
class FirebaseGiftCardRepository implements GiftCardRepository {
  async getProducts(): Promise<GiftCardProduct[]> {
    const fn = getCallable<{}, { products: { id: string; brandId: string; brandName: string; countryCode: string; logoUrl?: string; discountPercentage?: number; denominationType: 'fixed' | 'range'; fixedDenominations: number[]; minAmount?: number; maxAmount?: number }[] }>('getGiftCardProducts');
    const { data } = await fn({});
    return data.products.map(mapGiftCardProduct);
  }

  async getProduct(productId: string): Promise<GiftCardProduct | null> {
    const fn = getCallable<{ productId: string }, { product: Parameters<typeof mapGiftCardProduct>[0] | null }>('getGiftCardProductDetail');
    const { data } = await fn({ productId });
    return data.product ? mapGiftCardProduct(data.product) : null;
  }

  async purchaseGiftCard(input: { productId: string; unitPrice: number; quantity: number; recipientEmail: string; senderName?: string; useCashback?: boolean }): Promise<ServiceOrder> {
    const fn = getCallable<typeof input & { unitPrice: number }, { order: ServiceOrder }>('purchaseGiftCard');
    // unitPrice/amounts stored client-side in kobo; Reloadly expects naira.
    const { data } = await fn({ ...input, unitPrice: input.unitPrice / 100 } as any);
    return data.order;
  }

  async getRedeemCode(orderId: string): Promise<{ cardNumber: string; pinCode?: string }[]> {
    const fn = getCallable<{ orderId: string }, { codes: { cardNumber: string; pinCode?: string }[] }>('getGiftCardRedeemCode');
    const { data } = await fn({ orderId });
    return data.codes;
  }
}

function mapGiftCardProduct(p: { id: string; brandId: string; brandName: string; countryCode: string; logoUrl?: string; discountPercentage?: number; denominationType: 'fixed' | 'range'; fixedDenominations: number[]; minAmount?: number; maxAmount?: number }): GiftCardProduct {
  return {
    id: p.id,
    brandId: p.brandId,
    brandName: p.brandName,
    countryCode: p.countryCode,
    logoUrl: p.logoUrl,
    discountPercentage: p.discountPercentage,
    denominationType: p.denominationType,
    fixedDenominations: (p.fixedDenominations || []).map((d) => toMinorUnits(d)),
    minAmount: p.minAmount !== undefined ? toMinorUnits(p.minAmount) : undefined,
    maxAmount: p.maxAmount !== undefined ? toMinorUnits(p.maxAmount) : undefined,
  };
}

class MockFallbackSocialProfileRepository {
  async getProfiles(): Promise<any[]> { return mockSocialProfiles; }
  async saveProfile(): Promise<any> { throw new Error('Social profile save not yet implemented in Phase 2'); }
  async deleteProfile(): Promise<void> { return; }
}

class MockFallbackMarketplaceRepository {
  async getListings(options?: { search?: string; category?: string }): Promise<any[]> {
    let listings = mockListings as any[];
    if (options?.category) {
      const explicitCategories = ['Socials', 'Gaming', 'Streaming', 'Tools'];
      if (options.category === 'Others') {
        listings = listings.filter((l) => !explicitCategories.includes(l.product?.category));
      } else {
        listings = listings.filter((l) => l.product?.category === options!.category);
      }
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      listings = listings.filter((l) => l.product?.name?.toLowerCase().includes(q) || l.product?.category?.toLowerCase().includes(q));
    }
    return listings;
  }
  async getListing(id: string): Promise<any | null> { return mockListings.find((l) => l.id === id) || null; }
  async createListing(): Promise<any> { throw new Error('Create listing not yet implemented in Phase 2'); }
  async getMyListings(): Promise<any[]> { return []; }
  async getOrders(): Promise<any[]> { return mockMarketplaceOrders; }
  async placeOrder(): Promise<any> { throw new Error('Marketplace order not yet implemented in Phase 2'); }
  async deliverOrder(): Promise<void> { throw new Error('Delivery not yet implemented in Phase 2'); }
}

// HK Points, Referrals, and Vouchers are real (Phase 4), backed by Cloud
// Functions and server-authoritative Firestore transactions. The generic
// "Available Rewards" catalog (non-voucher rewards) still uses mock data -
// see PHASE_4_CONTINUATION_REPORT.md.
class FirebaseRewardsRepository implements RewardsRepository {
  async getReferralSummary(): Promise<ReferralSummary> {
    const fn = getCallable<{}, ReferralSummary>('getReferralInfo');
    const { data } = await fn({});
    return data;
  }

  async applyReferralCode(code: string): Promise<void> {
    const fn = getCallable<{ code: string }, { success: boolean }>('applyReferral');
    await fn({ code });
  }

  async getRewards(_userId?: string): Promise<Reward[]> { return mockRewards; }

  async getHkcBalance(): Promise<HkcBalance> {
    const fn = getCallable<{}, HkcBalance>('getHkc');
    const { data } = await fn({});
    return data;
  }

  async getHkcTransactions(_userId?: string): Promise<HkcTransaction[]> {
    const fn = getCallable<{ limit?: number }, { history: HkcTransaction[] }>('getHkcHistory');
    const { data } = await fn({ limit: 50 });
    return data.history;
  }

  async convertWalletToHkc(amountNaira: number): Promise<HkcTransaction> {
    const fn = getCallable<{ amount: number }, { transaction: HkcTransaction }>('convertWalletToHkc');
    const { data } = await fn({ amount: amountNaira });
    return data.transaction;
  }

  async convertReferralToHkc(amountNaira: number): Promise<HkcTransaction> {
    const fn = getCallable<{ amount: number }, { transaction: HkcTransaction }>('convertReferralToHkc');
    const { data } = await fn({ amount: amountNaira });
    return data.transaction;
  }

  async getVoucherCatalog(): Promise<VoucherCatalogItem[]> {
    const fn = getCallable<{}, { vouchers: VoucherCatalogItem[] }>('getVoucherCatalog');
    const { data } = await fn({});
    return data.vouchers;
  }

  async getMyVouchers(): Promise<UserVoucher[]> {
    const fn = getCallable<{}, { vouchers: UserVoucher[] }>('getMyVouchers');
    const { data } = await fn({});
    return data.vouchers;
  }

  async claimVoucher(voucherId: string): Promise<UserVoucher> {
    const fn = getCallable<{ voucherId: string }, { voucher: UserVoucher }>('claimVoucherFn');
    const { data } = await fn({ voucherId });
    return data.voucher;
  }

  async redeemVoucher(userVoucherId: string): Promise<UserVoucher> {
    const fn = getCallable<{ userVoucherId: string }, { voucher: UserVoucher }>('redeemVoucherFn');
    const { data } = await fn({ userVoucherId });
    return data.voucher;
  }
}

class FirebaseCashbackRepository implements CashbackRepository {
  async getBalance(): Promise<CashbackBalance> {
    const fn = getCallable<{}, CashbackBalance>('getCashback');
    const { data } = await fn({});
    return data;
  }

  async getHistory(): Promise<CashbackTransaction[]> {
    const fn = getCallable<{ limit?: number }, { history: CashbackTransaction[] }>('getCashbackHistoryFn');
    const { data } = await fn({ limit: 50 });
    return data.history;
  }
}

class FirebaseAdminRepository implements AdminRepository {
  async getPlatformConfig(): Promise<AdminPlatformConfig> {
    const fn = getCallable<{}, AdminPlatformConfig>('getPlatformConfigFn');
    const { data } = await fn({});
    return data;
  }
}

// FAQs/tickets/tutorials (the old mock-only fields) remain mock data.
// The Dispute Center is real (Phase 4 continuation), backed by Cloud
// Functions - see functions/src/services/disputeService.ts.
class FirebaseSupportRepository implements SupportRepository {
  async getTickets(): Promise<any[]> { return mockSupportTickets; }
  async createTicket(): Promise<any> { throw new Error('Ticket creation not yet implemented'); }
  async getTutorials(): Promise<any[]> { return mockTutorials; }

  async createDispute(input: { transactionId?: string; orderReference?: string; category: string; subject: string; description: string }): Promise<Dispute> {
    const fn = getCallable<typeof input, { dispute: Dispute }>('createDisputeFn');
    const { data } = await fn(input);
    return data.dispute;
  }

  async getDisputes(): Promise<Dispute[]> {
    const fn = getCallable<{}, { disputes: Dispute[] }>('getMyDisputes');
    const { data } = await fn({});
    return data.disputes;
  }
}

// Bank list is loaded from a one-time Paystack snapshot (src/data/paystackBanks.json).
// Logos are attached locally for the banks we have assets for; the rest show initials.
// Account-name verification is real, via Paystack's "Resolve Account Number" endpoint
// (functions/src/services/bankService.ts) - the same provider/secret already used for wallet funding.
const walletEntries: Bank[] = [
  { id: 'wallet-coinbase', name: 'Coinbase', code: 'COINBASE', category: 'wallet', implemented: false, receiptTemplate: 'generic', logoAsset: walletLogoAssets.coinbase },
  { id: 'wallet-paypal', name: 'PayPal', code: 'PAYPAL', category: 'wallet', implemented: false, receiptTemplate: 'generic', logoAsset: walletLogoAssets.paypal },
  { id: 'wallet-binance', name: 'Binance', code: 'BINANCE', category: 'wallet', implemented: false, receiptTemplate: 'generic', logoAsset: walletLogoAssets.binance },
];

class FirebaseBankRepository implements BankRepository {
  async getBanks(): Promise<Bank[]> {
    const banks = (paystackBanks.banks || []).map((b) => ({
      ...b,
      logoAsset: b.slug ? bankLogoAssets[b.slug] : undefined,
    })) as Bank[];
    return [...banks, ...walletEntries];
  }

  async verifyAccount(bankCode: string, accountNumber: string): Promise<{ accountName: string }> {
    const fn = getCallable<{ bankCode: string; accountNumber: string }, { accountName: string }>('verifyBankAccount');
    const { data } = await fn({ bankCode, accountNumber });
    return data;
  }
}

class FirebaseReceiptRepository implements ReceiptRepository {
  async generateReceipt(data: {
    transactionId?: string;
    amount: number;
    senderName: string;
    senderAccountNumber?: string;
    receiverBankName: string;
    receiverAccountNumber: string;
    receiverAccountName: string;
  }): Promise<ReceiptRecord> {
    const fn = getCallable<typeof data, { receipt: ReceiptRecord }>('generateReceiptFn');
    const { data: result } = await fn(data);
    return result.receipt;
  }

  async purchaseBankGenReceipt(data: {
    amount: number;
    senderName: string;
    senderAccountNumber?: string;
    receiverBankName: string;
    receiverAccountNumber: string;
    receiverAccountName: string;
    useCashback?: boolean;
  }): Promise<ReceiptRecord> {
    const fn = getCallable<typeof data, { receipt: ReceiptRecord }>('purchaseBankGenReceiptFn');
    const { data: result } = await fn(data);
    return result.receipt;
  }

  async getReceipt(receiptId: string): Promise<ReceiptRecord> {
    const fn = getCallable<{ receiptId: string }, { receipt: ReceiptRecord }>('getReceiptFn');
    const { data } = await fn({ receiptId });
    return data.receipt;
  }
}

export const repositories: {
  auth: AuthRepository;
  wallet: WalletRepository;
  transaction: TransactionRepository;
  notification: NotificationRepository;
  service: ServiceRepository;
  utility: UtilityRepository;
  giftCard: GiftCardRepository;
  socialProfile: SocialProfileRepository;
  marketplace: MarketplaceRepository;
  rewards: RewardsRepository;
  cashback: CashbackRepository;
  admin: AdminRepository;
  support: SupportRepository;
  bank: BankRepository;
  receipt: ReceiptRepository;
} = {
  auth: new FirebaseAuthRepository(),
  wallet: new FirebaseWalletRepository(),
  transaction: new FirebaseTransactionRepository(),
  notification: new FirebaseNotificationRepository(),
  service: new FirebaseServiceRepository(),
  utility: new FirebaseUtilityRepository(),
  giftCard: new FirebaseGiftCardRepository(),
  socialProfile: new MockFallbackSocialProfileRepository() as unknown as SocialProfileRepository,
  marketplace: new MockFallbackMarketplaceRepository() as unknown as MarketplaceRepository,
  rewards: new FirebaseRewardsRepository(),
  cashback: new FirebaseCashbackRepository(),
  admin: new FirebaseAdminRepository(),
  support: new FirebaseSupportRepository(),
  bank: new FirebaseBankRepository(),
  receipt: new FirebaseReceiptRepository(),
};
