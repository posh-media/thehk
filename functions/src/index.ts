import * as functions from 'firebase-functions';
import { db } from './admin';
import { createWithdrawal, ensureWallet, createPayment } from './services/walletService';
import { initiateFunding, handleWebhook } from './services/paymentService';
import { getSocialCatalog, placeSocialOrder, refreshSocialOrderStatus } from './services/socialService';
import { listNetworkOperators, detectNetworkOperator, listDataPlans, placeAirtimeOrder, placeDataOrder } from './services/utilityService';
import { listBillCategories, listBillers, verifyBillCustomer, payBill } from './services/billService';
import { listGiftCardProducts, getGiftCardProduct, placeGiftCardOrder, getGiftCardRedeemCodes } from './services/giftCardService';
import { assignReferralCode, applyReferralCode, getReferralSummary } from './services/referralService';
import { ensureHkcBalance, convertWalletToHkc as convertWalletToHkcImpl, convertReferralBalanceToHkc, getHkcTransactionHistory, awardSignupBonus } from './services/pointsService';
import { getPlatformConfig } from './services/adminPanelService';
import { ensureCashbackBalance, getCashbackHistory } from './services/cashbackService';
import { listVoucherCatalog, listUserVouchers, claimVoucher, redeemVoucher } from './services/rewardsService';
import { createDispute, listDisputes } from './services/disputeService';
import { verifyBankAccountNumber } from './services/bankService';
import { generateReceipt, getReceipt, purchaseBankGenReceipt } from './services/receiptService';
import { OwletProvider } from './providers/owletProvider';
import { ReloadlyGiftCardProvider } from './providers/reloadlyGiftCardProvider';
import { getAirtimeDataProvider, getDataProvider, getBillProvider } from './providers/providerFactory';
import { toKobo, SECRETS } from './config';
import { verifyVtungPayload } from './providers/vtungClient';
import { processVtungWebhook, reconcileVtungOrder } from './services/vtungWebhookService';

const owletProvider = new OwletProvider(SECRETS.owlet.apiKey, SECRETS.owlet.apiUrl);
const reloadlyGiftCardProvider = new ReloadlyGiftCardProvider(SECRETS.reloadly.clientId, SECRETS.reloadly.clientSecret, SECRETS.reloadly.sandbox);

// Provider instances are resolved per-request so the admin platform config
// (airtimeProvider / dataProvider) can override the env defaults without a
// redeploy. Unconfigured providers are detected before any network call is
// made, so users see a friendly "unavailable" message rather than raw
// authentication errors.
async function resolveAirtimeProvider() {
  const config = await getPlatformConfig();
  return getAirtimeDataProvider(config.airtimeProvider);
}

async function resolveDataProvider() {
  const config = await getPlatformConfig();
  return getDataProvider(config.dataProvider);
}

async function resolveBillProvider() {
  const config = await getPlatformConfig();
  return getBillProvider(config.billProvider);
}

const REGION = 'us-central1';
const RUNTIME_OPTS: functions.RuntimeOptions = {
  memory: '256MB',
  timeoutSeconds: 60,
};

function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  return context.auth.uid;
}

// --- User lifecycle ---

export const onUserCreated = functions
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const now = new Date().toISOString();
    const referralCode = await assignReferralCode(user.uid);
    const displayName = user.displayName || '';
    const nameParts = displayName.trim().split(/\s+/);
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;
    const userDoc = {
      id: user.uid,
      email: user.email || '',
      phone: user.phoneNumber || null,
      displayName: displayName || null,
      firstName,
      lastName,
      username: null,
      photoUrl: user.photoURL || null,
      country: null,
      dateOfBirth: null,
      preferences: {
        emailNotification: true,
        pushNotification: true,
        appearance: 'system',
      },
      role: 'user',
      isVerified: user.emailVerified,
      referralCode,
      referredBy: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('users').doc(user.uid).set(userDoc);
    await db.collection('wallets').doc(user.uid).set({
      userId: user.uid,
      balance: 0,
      availableBalance: 0,
      pendingBalance: 0,
      currency: 'NGN',
      hkcBalance: 0,
      availableHkcBalance: 0,
      pendingHkcBalance: 0,
      updatedAt: now,
    });

    // One-time signup bonus: this is wrapped in a server-side guard so
    // retries/idempotent triggers never award it twice.
    try {
      await awardSignupBonus(user.uid);
    } catch (err) {
      console.error(`Signup bonus failed for ${user.uid}:`, err);
    }
  });

export const applyReferral = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data?.code) throw new functions.https.HttpsError('invalid-argument', 'code is required.');
    try {
      await applyReferralCode(uid, String(data.code));
      return { success: true };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const getReferralInfo = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const [profile, summary] = await Promise.all([
      db.collection('users').doc(uid).get(),
      getReferralSummary(uid),
    ]);
    const referralCode = profile.exists ? (profile.data() as { referralCode?: string }).referralCode : undefined;
    return { referralCode, ...summary };
  });

export const convertReferralToHkc = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data?.amount) throw new functions.https.HttpsError('invalid-argument', 'amount is required.');
    try {
      const result = await convertReferralBalanceToHkc({ userId: uid, amountNaira: Number(data.amount) });
      return { transaction: result };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

// --- Phase 5: HK Coins ---

export const getHkc = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const balance = await ensureHkcBalance(uid);
    return balance;
  });

export const convertWalletToHkc = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data?.amount) throw new functions.https.HttpsError('invalid-argument', 'amount is required.');
    try {
      const result = await convertWalletToHkcImpl({ userId: uid, amountNaira: Number(data.amount) });
      return { transaction: result };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const getHkcHistory = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const history = await getHkcTransactionHistory(uid, Math.min(Number(data?.limit) || 50, 100));
    return { history };
  });

export const updateUserProfile = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const now = new Date().toISOString();
    const update: Record<string, any> = {
      updatedAt: now,
    };
    if (data.displayName !== undefined) update.displayName = data.displayName;
    if (data.firstName !== undefined) update.firstName = data.firstName;
    if (data.lastName !== undefined) update.lastName = data.lastName;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.username !== undefined) update.username = data.username;
    if (data.country !== undefined) update.country = data.country;
    if (data.dateOfBirth !== undefined) update.dateOfBirth = data.dateOfBirth;
    if (data.photoUrl !== undefined) update.photoUrl = data.photoUrl;
    if (data.preferences !== undefined) update.preferences = data.preferences;
    await db.collection('users').doc(uid).update(update);
  });

export const getUserProfile = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found');
    return snap.data();
  });

// --- Wallet ---

export const getWallet = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const wallet = await ensureWallet(uid);
    return wallet;
  });

export const initiateWalletFunding = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const email = context.auth?.token?.email as string | undefined;
    if (!email) throw new functions.https.HttpsError('failed-precondition', 'No email found for this account.');

    const amount = toKobo(Number(data.amount));
    const provider = data.provider as 'paystack' | 'korapay';
    if (!provider) throw new functions.https.HttpsError('invalid-argument', 'Payment provider is required.');

    const result = await initiateFunding({
      userId: uid,
      email,
      amount,
      provider,
    });
    return result;
  });

export const initiateWithdrawal = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { bankName, bankCode, accountNumber, accountName, amount, note } = data;
    if (!bankName || !bankCode || !accountNumber || !accountName || !amount) {
      throw new functions.https.HttpsError('invalid-argument', 'All withdrawal fields are required.');
    }
    const result = await createWithdrawal({
      userId: uid,
      amount: toKobo(Number(amount)),
      bankName,
      bankCode,
      accountNumber,
      accountName,
      note,
    });
    return result;
  });

export const getTransactionHistory = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const limit = Math.min(Number(data.limit) || 20, 100);
    const q = db.collection('transactions')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (data.cursor) {
      const startDoc = await db.collection('transactions').doc(data.cursor).get();
      if (startDoc.exists) {
        q.startAfter(startDoc);
      }
    }

    const snap = await q.get();
    return snap.docs.map((d) => d.data());
  });

// --- Webhooks ---

function verifyWebhook(req: functions.Request, res: functions.Response, provider: 'paystack' | 'korapay') {
  res.set('Content-Type', 'application/json');
  const signature = provider === 'paystack'
    ? req.headers['x-paystack-signature'] as string | undefined
    : req.headers['x-korapay-signature'] as string | undefined;

  const rawPayload = (((req as any).rawBody as Buffer | undefined)?.toString() || JSON.stringify(req.body)) || '{}';

  handleWebhook({ provider, rawPayload, signature })
    .then((result) => res.status(200).send(result))
    .catch((err) => {
      console.error(`${provider} webhook error:`, err);
      res.status(400).send({ processed: false, error: err.message });
    });
}

export const paystackWebhook = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onRequest((req, res) => verifyWebhook(req, res, 'paystack'));

export const korapayWebhook = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onRequest((req, res) => verifyWebhook(req, res, 'korapay'));

// --- Notifications ---

export const getNotifications = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const limit = Math.min(Number(data.limit) || 50, 200);
    const snap = await db.collection('notifications')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((d) => d.data());
  });

export const markNotificationRead = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data.id) throw new functions.https.HttpsError('invalid-argument', 'Notification id is required.');
    await db.collection('notifications').doc(data.id).update({ isRead: true, updatedAt: new Date().toISOString() });
  });

// --- Phase 3: Social media services (The Owlet) ---

const SOCIAL_RUNTIME_OPTS: functions.RuntimeOptions = {
  memory: '256MB',
  timeoutSeconds: 30,
};

export const getSocialServices = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    requireAuth(context);
    try {
      const catalog = await getSocialCatalog(owletProvider, Boolean(data?.forceRefresh));
      return { categories: catalog.categories, services: catalog.services, updatedAt: catalog.updatedAt };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const placeSocialMediaOrder = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { serviceId, link, quantity } = data || {};
    if (!serviceId || !link || !quantity) {
      throw new functions.https.HttpsError('invalid-argument', 'serviceId, link and quantity are required.');
    }
    try {
      const order = await placeSocialOrder(owletProvider, {
        userId: uid,
        serviceId: String(serviceId),
        link: String(link),
        quantity: Number(quantity),
      });
      return { order };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const refreshSocialMediaOrder = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data?.orderId) throw new functions.https.HttpsError('invalid-argument', 'orderId is required.');
    try {
      const order = await refreshSocialOrderStatus(owletProvider, uid, String(data.orderId));
      return { order };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

// --- Phase 3B: Airtime & Data (Reloadly) ---

export const getNetworkOperators = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    requireAuth(context);
    try {
      const operators = await listNetworkOperators(await resolveAirtimeProvider());
      return { operators };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const detectOperatorForPhone = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    requireAuth(context);
    if (!data?.phone) throw new functions.https.HttpsError('invalid-argument', 'phone is required.');
    try {
      const operator = await detectNetworkOperator(await resolveAirtimeProvider(), String(data.phone));
      return { operator };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const getDataPlans = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    requireAuth(context);
    if (!data?.operatorId) throw new functions.https.HttpsError('invalid-argument', 'operatorId is required.');
    try {
      const plans = await listDataPlans(await resolveDataProvider(), String(data.operatorId));
      return { plans };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const purchaseAirtime = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { operatorId, phone, amount } = data || {};
    if (!operatorId || !phone || !amount) {
      throw new functions.https.HttpsError('invalid-argument', 'operatorId, phone and amount are required.');
    }
    try {
      const order = await placeAirtimeOrder(await resolveAirtimeProvider(), {
        userId: uid,
        operatorId: String(operatorId),
        phone: String(phone),
        amountNaira: Number(amount),
      });
      return { order };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const purchaseData = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { operatorId, phone, planId } = data || {};
    if (!operatorId || !phone || !planId) {
      throw new functions.https.HttpsError('invalid-argument', 'operatorId, phone and planId are required.');
    }
    try {
      const order = await placeDataOrder(await resolveDataProvider(), {
        userId: uid,
        operatorId: String(operatorId),
        phone: String(phone),
        planId: String(planId),
      });
      return { order };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

// --- Phase 3C: Utility / Bill Payments (Reloadly) ---

export const getBillCategories = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    requireAuth(context);
    try {
      const categories = await listBillCategories(await resolveBillProvider());
      return { categories };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const getBillers = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    requireAuth(context);
    try {
      const billers = await listBillers(await resolveBillProvider(), data?.categoryId ? String(data.categoryId) : undefined);
      return { billers };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const verifyBillerCustomer = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    requireAuth(context);
    const { billerId, customerNumber } = data || {};
    if (!billerId || !customerNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'billerId and customerNumber are required.');
    }
    try {
      const customer = await verifyBillCustomer(await resolveBillProvider(), String(billerId), String(customerNumber));
      return { customer };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const payUtilityBill = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { billerId, customerNumber, amount } = data || {};
    if (!billerId || !customerNumber || !amount) {
      throw new functions.https.HttpsError('invalid-argument', 'billerId, customerNumber and amount are required.');
    }
    try {
      const order = await payBill(await resolveBillProvider(), {
        userId: uid,
        billerId: String(billerId),
        customerNumber: String(customerNumber),
        amountNaira: Number(amount),
      });
      return { order };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

// --- Phase 3B/3C continuation: VTU.ng webhook and requery ---

export const vtungWebhook = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onRequest(async (req, res) => {
    res.set('Content-Type', 'application/json');
    if (req.method !== 'POST') {
      res.status(405).send({ processed: false, error: 'Method not allowed' });
      return;
    }

    const signature = req.headers['x-signature'] as string | undefined;
    if (!signature) {
      res.status(400).send({ processed: false, error: 'Missing X-Signature' });
      return;
    }

    if (!SECRETS.vtung.userPin) {
      res.status(500).send({ processed: false, error: 'VTU.ng user PIN is not configured' });
      return;
    }

    const rawPayload = (((req as any).rawBody as Buffer | undefined)?.toString() || JSON.stringify(req.body)) || '{}';
    if (!verifyVtungPayload(rawPayload, signature, SECRETS.vtung.userPin)) {
      res.status(403).send({ processed: false, error: 'Invalid signature' });
      return;
    }

    try {
      const result = await processVtungWebhook(rawPayload, signature, SECRETS.vtung.userPin);
      res.status(200).send(result);
    } catch (err) {
      console.error('VTU.ng webhook error:', err);
      res.status(500).send({ processed: false, error: (err as Error).message });
    }
  });

export const requeryAirtimeOrder = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const requestId = data?.requestId as string | undefined;
    if (!requestId) throw new functions.https.HttpsError('invalid-argument', 'requestId is required.');

    const provider = await resolveAirtimeProvider();
    if (!provider.requeryOrder) {
      throw new functions.https.HttpsError('failed-precondition', 'Requery is not supported for the active airtime provider.');
    }

    try {
      const result = await provider.requeryOrder(requestId);
      await reconcileVtungOrder(requestId, result);
      return { result };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const requeryDataOrder = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const requestId = data?.requestId as string | undefined;
    if (!requestId) throw new functions.https.HttpsError('invalid-argument', 'requestId is required.');

    const provider = await resolveDataProvider();
    if (!provider.requeryOrder) {
      throw new functions.https.HttpsError('failed-precondition', 'Requery is not supported for the active data provider.');
    }

    try {
      const result = await provider.requeryOrder(requestId);
      await reconcileVtungOrder(requestId, result);
      return { result };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

// --- Phase 3C: Gift Cards (Reloadly) ---

export const getGiftCardProducts = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    requireAuth(context);
    try {
      const products = await listGiftCardProducts(reloadlyGiftCardProvider);
      return { products };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const getGiftCardProductDetail = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    requireAuth(context);
    if (!data?.productId) throw new functions.https.HttpsError('invalid-argument', 'productId is required.');
    try {
      const product = await getGiftCardProduct(reloadlyGiftCardProvider, String(data.productId));
      return { product };
    } catch (err) {
      throw new functions.https.HttpsError('unavailable', (err as Error).message);
    }
  });

export const purchaseGiftCard = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { productId, unitPrice, quantity, recipientEmail, senderName, useCashback } = data || {};
    if (!productId || !unitPrice || !quantity || !recipientEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'productId, unitPrice, quantity and recipientEmail are required.');
    }
    try {
      const order = await placeGiftCardOrder(reloadlyGiftCardProvider, {
        userId: uid,
        productId: String(productId),
        unitPrice: Number(unitPrice),
        quantity: Number(quantity),
        recipientEmail: String(recipientEmail),
        senderName: senderName ? String(senderName) : 'THE-HK',
        useCashback: Boolean(useCashback),
      });
      return { order };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const getGiftCardRedeemCode = functions
  .region(REGION)
  .runWith(SOCIAL_RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data?.orderId) throw new functions.https.HttpsError('invalid-argument', 'orderId is required.');
    try {
      const codes = await getGiftCardRedeemCodes(reloadlyGiftCardProvider, uid, String(data.orderId));
      return { codes };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

// --- Phase 4 continuation: Cashback ---

export const getCashback = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    return ensureCashbackBalance(uid);
  });

export const getCashbackHistoryFn = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const history = await getCashbackHistory(uid, Math.min(Number(data?.limit) || 50, 100));
    return { history };
  });

// --- Phase 4 continuation: Rewards / Vouchers ---

export const getVoucherCatalog = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    requireAuth(context);
    const vouchers = await listVoucherCatalog();
    return { vouchers };
  });

export const getMyVouchers = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const vouchers = await listUserVouchers(uid);
    return { vouchers };
  });

export const claimVoucherFn = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data?.voucherId) throw new functions.https.HttpsError('invalid-argument', 'voucherId is required.');
    try {
      const voucher = await claimVoucher(uid, String(data.voucherId));
      return { voucher };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const redeemVoucherFn = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data?.userVoucherId) throw new functions.https.HttpsError('invalid-argument', 'userVoucherId is required.');
    try {
      const voucher = await redeemVoucher(uid, String(data.userVoucherId));
      return { voucher };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

// --- Phase 4 continuation: Admin panel platform config (read-only) ---

export const getPlatformConfigFn = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async () => {
    return getPlatformConfig();
  });

// --- Phase 4 continuation: Dispute Center ---

export const createDisputeFn = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { transactionId, orderReference, category, subject, description } = data || {};
    try {
      const dispute = await createDispute({
        userId: uid,
        transactionId: transactionId ? String(transactionId) : undefined,
        orderReference: orderReference ? String(orderReference) : undefined,
        category: String(category || ''),
        subject: String(subject || ''),
        description: String(description || ''),
      });
      return { dispute };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const getMyDisputes = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (_data, context) => {
    const uid = requireAuth(context);
    const disputes = await listDisputes(uid);
    return { disputes };
  });

// --- Phase 4 continuation: Bank verification (Paystack) ---

export const verifyBankAccount = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    requireAuth(context);
    const { bankCode, accountNumber } = data || {};
    try {
      const result = await verifyBankAccountNumber(String(bankCode || ''), String(accountNumber || ''));
      return result;
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

// --- Phase 4 continuation: Receipts ---

export const generateReceiptFn = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    try {
      const receipt = await generateReceipt({
        userId: uid,
        transactionId: data?.transactionId ? String(data.transactionId) : undefined,
        amount: toKobo(Number(data?.amount || 0)),
        senderName: String(data?.senderName || ''),
        senderAccountNumber: data?.senderAccountNumber ? String(data.senderAccountNumber) : undefined,
        receiverBankName: String(data?.receiverBankName || ''),
        receiverAccountNumber: String(data?.receiverAccountNumber || ''),
        receiverAccountName: String(data?.receiverAccountName || ''),
      });
      return { receipt };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const purchaseBankGenReceiptFn = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    const { amount, senderName, senderAccountNumber, receiverBankName, receiverAccountNumber, receiverAccountName, useCashback } = data || {};
    if (!amount || !senderName || !receiverBankName || !receiverAccountNumber || !receiverAccountName) {
      throw new functions.https.HttpsError('invalid-argument', 'amount, senderName, receiverBankName, receiverAccountNumber and receiverAccountName are required.');
    }
    try {
      const receipt = await purchaseBankGenReceipt({
        userId: uid,
        amount: toKobo(Number(amount || 0)),
        senderName: String(senderName),
        senderAccountNumber: senderAccountNumber ? String(senderAccountNumber) : undefined,
        receiverBankName: String(receiverBankName),
        receiverAccountNumber: String(receiverAccountNumber),
        receiverAccountName: String(receiverAccountName),
        useCashback: Boolean(useCashback),
      });
      return { receipt };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });

export const getReceiptFn = functions
  .region(REGION)
  .runWith(RUNTIME_OPTS)
  .https.onCall(async (data, context) => {
    const uid = requireAuth(context);
    if (!data?.receiptId) throw new functions.https.HttpsError('invalid-argument', 'receiptId is required.');
    try {
      const receipt = await getReceipt(uid, String(data.receiptId));
      return { receipt };
    } catch (err) {
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });
