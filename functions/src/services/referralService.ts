import { db } from '../admin';
import { REFERRAL_REWARD_KOBO, fromKobo } from '../config';
import { ReferralBalance, ReferralRecord, User } from '../types';
import { createNotification } from './notificationService';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)

function randomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function referralCodeRef(code: string) {
  return db.collection('referralCodes').doc(code);
}

function referralRef(id: string) {
  return db.collection('referrals').doc(id);
}

function referralBalanceRef(userId: string) {
  return db.collection('referralBalances').doc(userId);
}

function referralId(referrerId: string, referredUserId: string): string {
  return `${referrerId}_${referredUserId}`;
}

/**
 * Generates and reserves a unique referral code for a newly created user.
 * Called once from the `onUserCreated` auth trigger. Retries a handful of
 * times on the (very unlikely) event of a collision.
 */
export async function assignReferralCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const ref = referralCodeRef(code);
    try {
      await db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (snap.exists) throw new Error('collision');
        t.set(ref, { code, userId, createdAt: new Date().toISOString() });
      });
      return code;
    } catch {
      // collision - try again with a new random code
    }
  }
  throw new Error('Could not generate a unique referral code');
}

export async function ensureReferralBalance(userId: string): Promise<ReferralBalance> {
  const ref = referralBalanceRef(userId);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as ReferralBalance;
  const balance: ReferralBalance = { userId, balance: 0, updatedAt: new Date().toISOString() };
  await ref.set(balance);
  return balance;
}

/**
 * Applies a referral code to a newly registered user. Called by the client
 * shortly after sign-up (Firebase Auth's createUser flow has no room for
 * custom payloads), so this intentionally re-validates everything
 * server-side rather than trusting that the client only calls it once with
 * a legitimate code.
 */
export async function applyReferralCode(newUserId: string, code: string): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) throw new Error('A referral code is required');

  const userRef = db.collection('users').doc(newUserId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new Error('User not found');
  const user = userSnap.data() as User;

  if (user.referredBy) {
    throw new Error('A referral code has already been applied to this account');
  }

  const codeSnap = await referralCodeRef(normalizedCode).get();
  if (!codeSnap.exists) throw new Error('Invalid referral code');
  const referrerId = (codeSnap.data() as { userId: string }).userId;

  if (referrerId === newUserId) {
    throw new Error('You cannot refer yourself');
  }

  const id = referralId(referrerId, newUserId);
  const now = new Date().toISOString();

  await db.runTransaction(async (t) => {
    const existing = await t.get(referralRef(id));
    if (existing.exists) throw new Error('Referral already recorded');

    const record: ReferralRecord = {
      id,
      referrerId,
      referredUserId: newUserId,
      status: 'pending',
      rewardAmount: REFERRAL_REWARD_KOBO,
      createdAt: now,
    };
    t.set(referralRef(id), record);
    t.update(userRef, { referredBy: referrerId, updatedAt: now });
  });
}

/**
 * Activation event: the referred user's FIRST successful wallet funding.
 * This was a deliberate, documented choice (see
 * docs/THE-HK-DATABASE-SCHEMA.md and PHASE_4_COMPLETION_REPORT.md) - a
 * bare account signup is trivial to farm for referral rewards, whereas
 * requiring the referred user to actually fund their wallet at least once
 * is a simple, meaningful signal of a real user, without building a more
 * elaborate fraud/scoring system.
 */
export async function maybeRewardReferralActivation(referredUserId: string): Promise<void> {
  const userSnap = await db.collection('users').doc(referredUserId).get();
  if (!userSnap.exists) return;
  const user = userSnap.data() as User;
  if (!user.referredBy) return;

  const id = referralId(user.referredBy, referredUserId);
  const now = new Date().toISOString();

  const wasJustRewarded = await db.runTransaction(async (t) => {
    const refSnap = await t.get(referralRef(id));
    if (!refSnap.exists) return false;
    const referral = refSnap.data() as ReferralRecord;
    if (referral.status === 'rewarded') return false; // idempotency guard

    const balanceSnap = await t.get(referralBalanceRef(referral.referrerId));
    const currentBalance = balanceSnap.exists ? (balanceSnap.data() as ReferralBalance).balance : 0;

    t.set(
      referralBalanceRef(referral.referrerId),
      { userId: referral.referrerId, balance: currentBalance + referral.rewardAmount, updatedAt: now },
      { merge: true }
    );
    t.update(referralRef(id), { status: 'rewarded', activatedAt: now });
    return true;
  });

  if (wasJustRewarded) {
    try {
      await createNotification({
        userId: user.referredBy,
        title: 'Referral Reward Earned',
        body: `You earned ₦${fromKobo(REFERRAL_REWARD_KOBO).toLocaleString()} for a successful referral.`,
        category: 'referral',
        actionUrl: '/rewards/referrals',
      });
    } catch (err) {
      console.error('Failed to create referral reward notification:', err);
    }
  }
}

export async function getReferralSummary(userId: string) {
  const [referralsSnap, balance] = await Promise.all([
    db.collection('referrals').where('referrerId', '==', userId).orderBy('createdAt', 'desc').get(),
    ensureReferralBalance(userId),
  ]);
  const referrals = referralsSnap.docs.map((d) => d.data() as ReferralRecord);
  return {
    referrals,
    totalReferrals: referrals.length,
    successfulReferrals: referrals.filter((r) => r.status === 'rewarded').length,
    balance: balance.balance,
  };
}
