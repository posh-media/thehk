import { db } from '../admin';
import { VoucherCatalogItem, UserVoucher } from '../types';
import { creditWalletManual } from './walletService';
import { generateReference } from '../utils';

// HK Points debit is implemented directly here (rather than importing
// pointsService, which only exposes credit helpers today) to avoid a
// circular dependency between rewardsService and pointsService. If a
// future feature needs to spend points from more than one place, this
// should be promoted into pointsService as a shared `debitPoints` helper.
async function debitPoints(userId: string, points: number): Promise<void> {
  const ref = db.collection('points').doc(userId);
  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const current = snap.exists ? (snap.data() as { balance: number }).balance : 0;
    if (current < points) throw new Error('Insufficient HK Points balance');
    t.set(ref, { userId, balance: current - points, updatedAt: new Date().toISOString() }, { merge: true });
  });
  const pointsTxId = db.collection('pointsTransactions').doc().id;
  await db.collection('pointsTransactions').doc(pointsTxId).set({
    id: pointsTxId,
    userId,
    type: 'redeemed',
    points: -points,
    status: 'successful',
    reference: generateReference('HK-PTS'),
    description: 'Redeemed for a THE-HK voucher',
    createdAt: new Date().toISOString(),
  });
}

function voucherRef(id: string) {
  return db.collection('vouchers').doc(id);
}

function userVoucherRef(id: string) {
  return db.collection('userVouchers').doc(id);
}

// Seed a small starter catalog if none exists yet, mirroring the same
// lazy-seed pattern used for the adminPanel platform config. The future
// Admin Platform will create/manage real vouchers directly in this
// collection - this is only here so the feature isn't empty before that
// exists.
const DEFAULT_VOUCHERS: Omit<VoucherCatalogItem, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'voucher-welcome-500',
    title: '₦500 Welcome Voucher',
    description: 'A welcome bonus credited straight to your wallet.',
    usageType: 'wallet_credit',
    value: 50000,
    pointsCost: 0,
    usageRestrictions: 'One per account.',
    validForDays: 30,
    isActive: true,
  },
  {
    id: 'voucher-1000-for-2000pts',
    title: '₦1,000 Wallet Voucher',
    description: 'Redeem 2,000 HK Points for ₦1,000 credited to your wallet.',
    usageType: 'wallet_credit',
    value: 100000,
    pointsCost: 2000,
    usageRestrictions: 'Requires sufficient HK Points balance.',
    validForDays: 60,
    isActive: true,
  },
];

async function ensureVoucherCatalogSeed(): Promise<void> {
  const snap = await db.collection('vouchers').limit(1).get();
  if (!snap.empty) return;
  const now = new Date().toISOString();
  await Promise.all(
    DEFAULT_VOUCHERS.map((v) => voucherRef(v.id).set({ ...v, createdAt: now, updatedAt: now }))
  );
}

export async function listVoucherCatalog(): Promise<VoucherCatalogItem[]> {
  await ensureVoucherCatalogSeed();
  const snap = await db.collection('vouchers').where('isActive', '==', true).get();
  return snap.docs.map((d) => d.data() as VoucherCatalogItem);
}

export async function listUserVouchers(userId: string): Promise<UserVoucher[]> {
  const snap = await db.collection('userVouchers').where('userId', '==', userId).orderBy('issuedAt', 'desc').get();
  const now = Date.now();
  const vouchers = snap.docs.map((d) => d.data() as UserVoucher);

  // Lazily expire vouchers whose expiry date has passed - avoids needing a
  // scheduled function for what is, for now, a low-volume feature.
  const updates = vouchers
    .filter((v) => v.status === 'issued' && v.expiresAt && new Date(v.expiresAt).getTime() < now)
    .map((v) => userVoucherRef(v.id).update({ status: 'expired' }).then(() => { v.status = 'expired'; }));
  await Promise.all(updates);

  return vouchers;
}

/**
 * Claims a catalog voucher for a user, spending HK Points if the voucher
 * has a cost. Creates an issued `userVouchers` record. THE-HK doesn't have
 * an admin app yet to issue vouchers directly to specific users, so
 * "claiming" from the shared catalog is the mechanism for now - a future
 * admin-issued voucher would simply write directly to `userVouchers`.
 */
export async function claimVoucher(userId: string, voucherId: string): Promise<UserVoucher> {
  const snap = await voucherRef(voucherId).get();
  if (!snap.exists) throw new Error('Voucher not found');
  const voucher = snap.data() as VoucherCatalogItem;
  if (!voucher.isActive) throw new Error('This voucher is no longer available');

  if (voucher.pointsCost > 0) {
    await debitPoints(userId, voucher.pointsCost);
  }

  const now = new Date().toISOString();
  const id = db.collection('userVouchers').doc().id;
  const expiresAt = voucher.validForDays
    ? new Date(Date.now() + voucher.validForDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const userVoucher: UserVoucher = {
    id,
    userId,
    voucherId: voucher.id,
    title: voucher.title,
    description: voucher.description,
    usageType: voucher.usageType,
    value: voucher.value,
    usageRestrictions: voucher.usageRestrictions,
    status: 'issued',
    issuedAt: now,
    expiresAt,
  };
  await userVoucherRef(id).set(userVoucher);
  return userVoucher;
}

/**
 * Redeems (uses) an issued voucher. Only `wallet_credit` is supported
 * today - see the `VoucherUsageType` comment in functions/src/types.ts for
 * why other usage types are deferred rather than half-built.
 */
export async function redeemVoucher(userId: string, userVoucherId: string): Promise<UserVoucher> {
  const snap = await userVoucherRef(userVoucherId).get();
  if (!snap.exists) throw new Error('Voucher not found');
  const voucher = snap.data() as UserVoucher;
  if (voucher.userId !== userId) throw new Error('Not authorized to redeem this voucher');
  if (voucher.status === 'expired' || (voucher.expiresAt && new Date(voucher.expiresAt).getTime() < Date.now())) {
    await userVoucherRef(userVoucherId).update({ status: 'expired' });
    throw new Error('This voucher has expired');
  }
  if (voucher.status !== 'issued') throw new Error(`This voucher is already ${voucher.status}`);

  if (voucher.usageType === 'wallet_credit') {
    const { transaction } = await creditWalletManual({
      userId,
      amount: voucher.value,
      type: 'voucher_redemption',
      description: `Voucher redeemed: ${voucher.title}`,
    });
    const now = new Date().toISOString();
    await userVoucherRef(userVoucherId).update({ status: 'redeemed', redeemedAt: now, transactionId: transaction.id });
    return { ...voucher, status: 'redeemed', redeemedAt: now, transactionId: transaction.id };
  }

  throw new Error(`Voucher usage type "${voucher.usageType}" is not supported yet`);
}
