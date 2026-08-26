import { db } from '../admin';
import { debitWalletForOrder, refundWalletDebit } from './walletService';
import { HK_POINTS_PER_NAIRA, MIN_POINTS_CONVERSION_NAIRA, fromKobo, toKobo } from '../config';
import { generateReference } from '../utils';
import { createNotification } from './notificationService';
import { PointsBalance, PointsTransaction } from '../types';

const SIGNUP_BONUS_POINTS = 500;

function pointsRef(userId: string) {
  return db.collection('points').doc(userId);
}

function pointsTxRef(id: string) {
  return db.collection('pointsTransactions').doc(id);
}

function signupBonusRef(userId: string) {
  return db.collection('signupBonuses').doc(userId);
}

export async function ensurePoints(userId: string): Promise<PointsBalance> {
  const ref = pointsRef(userId);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as PointsBalance;

  const balance: PointsBalance = { userId, balance: 0, updatedAt: new Date().toISOString() };
  await ref.set(balance);
  return balance;
}

async function creditPoints(userId: string, points: number, entry: Omit<PointsTransaction, 'id' | 'userId' | 'points' | 'createdAt' | 'status'>): Promise<PointsTransaction> {
  const now = new Date().toISOString();
  const id = db.collection('pointsTransactions').doc().id;

  await db.runTransaction(async (t) => {
    const snap = await t.get(pointsRef(userId));
    const current = snap.exists ? (snap.data() as PointsBalance).balance : 0;
    t.set(pointsRef(userId), { userId, balance: current + points, updatedAt: now }, { merge: true });
  });

  const record: PointsTransaction = { id, userId, points, status: 'successful', createdAt: now, ...entry };
  await pointsTxRef(id).set(record);
  return record;
}

interface ConvertWalletInput {
  userId: string;
  amountNaira: number;
}

/**
 * Wallet -> HK Points. Server-authoritative: debits the wallet through the
 * existing `debitWalletForOrder` primitive (same one used by every
 * service order) and only then credits points - if the points credit
 * somehow fails, the wallet debit is reversed via `refundWalletDebit`
 * rather than leaving the user out of pocket.
 */
export async function convertWalletToPoints(input: ConvertWalletInput): Promise<PointsTransaction> {
  if (!Number.isFinite(input.amountNaira) || input.amountNaira < MIN_POINTS_CONVERSION_NAIRA) {
    throw new Error(`Minimum conversion amount is ₦${MIN_POINTS_CONVERSION_NAIRA}`);
  }

  const amountKobo = toKobo(input.amountNaira);
  const points = Math.round(input.amountNaira * HK_POINTS_PER_NAIRA);
  const reference = generateReference('HK-PTS');

  const { transaction } = await debitWalletForOrder({
    userId: input.userId,
    amount: amountKobo,
    type: 'points_conversion',
    description: `Converted ₦${input.amountNaira.toLocaleString()} to ${points.toLocaleString()} HK Points`,
  });

  try {
    return await creditPoints(input.userId, points, {
      type: 'wallet_conversion',
      amount: amountKobo,
      description: `Converted from wallet (${reference})`,
      reference,
    });
  } catch (err) {
    await refundWalletDebit({
      userId: input.userId,
      transactionId: transaction.id,
      amount: amountKobo,
      reason: 'HK Points conversion failed after wallet debit',
    });
    throw err;
  }
}

interface ConvertReferralInput {
  userId: string;
  amountNaira: number;
}

/**
 * Referral balance -> HK Points, at the same authoritative
 * `HK_POINTS_PER_NAIRA` rate. Debits `referralBalances/{userId}` in its own
 * Firestore transaction (mirroring the wallet debit pattern) before
 * crediting points.
 */
export async function convertReferralBalanceToPoints(input: ConvertReferralInput): Promise<PointsTransaction> {
  if (!Number.isFinite(input.amountNaira) || input.amountNaira < MIN_POINTS_CONVERSION_NAIRA) {
    throw new Error(`Minimum conversion amount is ₦${MIN_POINTS_CONVERSION_NAIRA}`);
  }

  const amountKobo = toKobo(input.amountNaira);
  const points = Math.round(input.amountNaira * HK_POINTS_PER_NAIRA);
  const reference = generateReference('HK-PTS');
  const referralBalanceRef = db.collection('referralBalances').doc(input.userId);

  await db.runTransaction(async (t) => {
    const snap = await t.get(referralBalanceRef);
    const current = snap.exists ? snap.data()!.balance : 0;
    if (current < amountKobo) throw new Error('Insufficient referral balance');
    t.set(referralBalanceRef, { userId: input.userId, balance: current - amountKobo, updatedAt: new Date().toISOString() }, { merge: true });
  });

  return creditPoints(input.userId, points, {
    type: 'referral_conversion',
    amount: amountKobo,
    description: `Converted from referral balance (${reference})`,
    reference,
  });
}

export async function getPointsTransactionHistory(userId: string, limit = 50): Promise<PointsTransaction[]> {
  const snap = await db
    .collection('pointsTransactions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as PointsTransaction);
}

/**
 * Server-authoritative, idempotent signup bonus. A dedicated
 * `signupBonuses/{userId}` document acts as the one-time lock; the entire
 * check-and-credit runs inside a Firestore transaction so retries and
 * concurrent triggers cannot award the bonus twice.
 */
export async function awardSignupBonus(userId: string): Promise<PointsTransaction | null> {
  const bonusRef = signupBonusRef(userId);
  const now = new Date().toISOString();
  const reference = generateReference('HK-WELCOME');
  const txId = db.collection('pointsTransactions').doc().id;

  try {
    await db.runTransaction(async (t) => {
      const bonusSnap = await t.get(bonusRef);
      if (bonusSnap.exists) throw new Error('already-awarded');

      const pointsSnap = await t.get(pointsRef(userId));
      const current = pointsSnap.exists ? (pointsSnap.data() as PointsBalance).balance : 0;
      t.set(
        pointsRef(userId),
        { userId, balance: current + SIGNUP_BONUS_POINTS, updatedAt: now },
        { merge: true }
      );
      t.set(bonusRef, { userId, points: SIGNUP_BONUS_POINTS, createdAt: now, transactionId: txId });
    });
  } catch (err: any) {
    if (err.message === 'already-awarded') return null;
    throw err;
  }

  const record: PointsTransaction = {
    id: txId,
    userId,
    type: 'signup_bonus',
    points: SIGNUP_BONUS_POINTS,
    description: 'Welcome bonus: 500 HK Points',
    status: 'successful',
    reference,
    createdAt: now,
  };
  await pointsTxRef(txId).set(record);

  await createNotification({
    userId,
    title: 'Welcome Bonus',
    body: "🎉 Welcome to THE-HK! You've received 500 HK Points as your signup bonus.",
    category: 'reward',
  });

  return record;
}

interface DebitPointsInput {
  userId: string;
  points: number;
  description: string;
  reference?: string;
}

/**
 * Server-authoritative HK Points debit, mirroring the wallet debit pattern.
 * Rejects if the user does not have enough points and records a negative
 * points transaction for audit.
 */
export async function debitPoints(input: DebitPointsInput): Promise<PointsTransaction> {
  if (!Number.isFinite(input.points) || input.points <= 0) {
    throw new Error('Points amount must be a positive number');
  }

  const now = new Date().toISOString();
  const id = db.collection('pointsTransactions').doc().id;

  await db.runTransaction(async (t) => {
    const snap = await t.get(pointsRef(input.userId));
    const current = snap.exists ? (snap.data() as PointsBalance).balance : 0;
    if (current < input.points) {
      throw new Error('Insufficient HK Points balance');
    }
    t.set(pointsRef(input.userId), { userId: input.userId, balance: current - input.points, updatedAt: now }, { merge: true });
  });

  const record: PointsTransaction = {
    id,
    userId: input.userId,
    type: 'redeemed',
    points: -input.points,
    description: input.description,
    status: 'successful',
    reference: input.reference || generateReference('HK-PTS'),
    createdAt: now,
  };
  await pointsTxRef(id).set(record);
  return record;
}

export { fromKobo };
