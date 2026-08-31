import { db } from '../admin';
import {
  HkcTransaction,
  Wallet,
} from '../types';
import { generateReference } from '../utils';
import { MIN_HKC_CONVERSION_NAIRA, HKC_PER_NAIRA } from '../config';
import { ensureWallet, debitWalletForOrder, creditHkc } from './walletService';
import { getReferralBalance, updateReferralBalance } from './referralService';

function hkcTransactionRef(id: string) {
  return db.collection('hkcTransactions').doc(id);
}

/**
 * Returns the user's HKC balance view. HKC lives on the wallet document, so
 * this is a thin wrapper over `ensureWallet`.
 */
export async function ensureHkcBalance(userId: string): Promise<{ userId: string; balance: number; updatedAt: string }> {
  const wallet = await ensureWallet(userId);
  return {
    userId,
    balance: wallet.hkcBalance ?? 0,
    updatedAt: wallet.updatedAt,
  };
}

export async function getHkcTransactionHistory(userId: string, limit = 50): Promise<HkcTransaction[]> {
  const snap = await db
    .collection('hkcTransactions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as HkcTransaction);
}

/**
 * One-time 500 HKC signup bonus. Idempotent: a lock document in
 * `signupBonuses/{userId}` prevents duplicate awards if the function is ever
 * re-invoked or the auth trigger runs more than once.
 */
export async function awardSignupBonus(userId: string): Promise<HkcTransaction | null> {
  const lockRef = db.collection('signupBonuses').doc(userId);
  const hkcTxId = db.collection('hkcTransactions').doc().id;
  const now = new Date().toISOString();

  return db.runTransaction(async (t) => {
    const lockSnap = await t.get(lockRef);
    if (lockSnap.exists) return null;

    const walletSnap = await t.get(db.collection('wallets').doc(userId));
    const wallet = walletSnap.exists ? (walletSnap.data() as Wallet) : null;
    const currentHkc = wallet?.hkcBalance ?? 0;
    const newHkc = currentHkc + 500;

    const hkcTx: HkcTransaction = {
      id: hkcTxId,
      userId,
      type: 'signup_bonus',
      amount: 500,
      balanceAfter: newHkc,
      description: 'Welcome bonus - 500 HK Coins',
      reference: generateReference('HKC-SIGNUP'),
      createdAt: now,
    };

    t.set(hkcTransactionRef(hkcTxId), hkcTx);
    t.set(
      db.collection('wallets').doc(userId),
      {
        userId,
        hkcBalance: newHkc,
        availableHkcBalance: newHkc,
        pendingHkcBalance: 0,
        updatedAt: now,
      },
      { merge: true }
    );
    t.set(lockRef, { userId, awardedAt: now, amount: 500 });
    return hkcTx;
  });
}

/**
 * Safe migration for existing users created before the signup bonus trigger.
 * Awards 500 HKC only if the user has no signup bonus lock document and no
 * signup_bonus HKC transaction. Calling this multiple times is idempotent.
 */
export async function awardMissingSignupBonus(userId: string): Promise<HkcTransaction | null> {
  const lockRef = db.collection('signupBonuses').doc(userId);
  const existingTxSnap = await db
    .collection('hkcTransactions')
    .where('userId', '==', userId)
    .where('type', '==', 'signup_bonus')
    .limit(1)
    .get();
  if (!existingTxSnap.empty) return null;
  const lock = await lockRef.get();
  if (lock.exists) return null;
  return awardSignupBonus(userId);
}

/**
 * Converts NGN wallet balance to HKC. Debits the NGN wallet and credits HKC
 * 1:1 (1 NGN = 1 HKC).
 */
export async function convertWalletToHkc(input: { userId: string; amountNaira: number }): Promise<HkcTransaction> {
  const { userId, amountNaira } = input;
  if (!Number.isFinite(amountNaira) || amountNaira < MIN_HKC_CONVERSION_NAIRA) {
    throw new Error(`Minimum conversion amount is ₦${MIN_HKC_CONVERSION_NAIRA}`);
  }

  await ensureWallet(userId);
  const amountKobo = Math.round(amountNaira * 100);
  const reference = generateReference('HKC-CONV');

  await debitWalletForOrder({
    userId,
    amount: amountKobo,
    type: 'hkc_conversion',
    description: `Converted ₦${amountNaira} to HKC`,
    metadata: { conversionType: 'wallet_to_hkc', nairaAmount: amountNaira },
  });

  const hkcAmount = Math.round(amountNaira * HKC_PER_NAIRA);
  return creditHkc({
    userId,
    amount: hkcAmount,
    type: 'conversion',
    description: `Converted ₦${amountNaira} to ${hkcAmount} HK Coins`,
    reference,
    metadata: { nairaAmount: amountNaira, koboAmount: amountKobo },
  });
}

/**
 * Converts referral balance to HKC. Debits the referral balance and credits
 * HKC 1:1.
 */
export async function convertReferralBalanceToHkc(input: { userId: string; amountNaira: number }): Promise<HkcTransaction> {
  const { userId, amountNaira } = input;
  if (!Number.isFinite(amountNaira) || amountNaira < MIN_HKC_CONVERSION_NAIRA) {
    throw new Error(`Minimum conversion amount is ₦${MIN_HKC_CONVERSION_NAIRA}`);
  }

  const amountKobo = Math.round(amountNaira * 100);
  const referral = await getReferralBalance(userId);
  if (referral.balance < amountKobo) {
    throw new Error('Insufficient referral balance');
  }

  await updateReferralBalance(userId, -amountKobo, `Converted ₦${amountNaira} referral balance to HKC`);

  const hkcAmount = Math.round(amountNaira * HKC_PER_NAIRA);
  return creditHkc({
    userId,
    amount: hkcAmount,
    type: 'conversion',
    description: `Converted ₦${amountNaira} referral balance to ${hkcAmount} HK Coins`,
    reference: generateReference('HKC-REF'),
    metadata: { source: 'referral', nairaAmount: amountNaira, koboAmount: amountKobo },
  });
}
