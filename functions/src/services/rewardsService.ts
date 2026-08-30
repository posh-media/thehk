import { db } from '../admin';
import { VoucherCatalogItem, UserVoucher } from '../types';
import { creditHkc, debitHkc } from './walletService';
import { generateReference } from '../utils';

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
    description: 'A welcome bonus credited straight to your HKC wallet.',
    usageType: 'wallet_credit',
    value: 50000,
    hkcCost: 0,
    usageRestrictions: 'One per account.',
    validForDays: 30,
    isActive: true,
  },
  {
    id: 'voucher-1000-for-2000hkc',
    title: '₦1,000 Wallet Voucher',
    description: 'Redeem 2,000 HK Coins for ₦1,000 credited to your HKC wallet.',
    usageType: 'wallet_credit',
    value: 100000,
    hkcCost: 2000,
    usageRestrictions: 'Requires sufficient HK Coins balance.',
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

  const updates = vouchers
    .filter((v) => v.status === 'issued' && v.expiresAt && new Date(v.expiresAt).getTime() < now)
    .map((v) => userVoucherRef(v.id).update({ status: 'expired' }).then(() => { v.status = 'expired'; }));
  await Promise.all(updates);

  return vouchers;
}

/**
 * Claims a catalog voucher for a user, spending HK Coins if the voucher
 * has a cost. Creates an issued `userVouchers` record.
 */
export async function claimVoucher(userId: string, voucherId: string): Promise<UserVoucher> {
  const snap = await voucherRef(voucherId).get();
  if (!snap.exists) throw new Error('Voucher not found');
  const voucher = snap.data() as VoucherCatalogItem;
  if (!voucher.isActive) throw new Error('This voucher is no longer available');

  if (voucher.hkcCost > 0) {
    await debitHkc({
      userId,
      amount: voucher.hkcCost,
      type: 'spending',
      description: `Claimed voucher: ${voucher.title}`,
      reference: generateReference('HKC-VOUCHER'),
      metadata: { voucherId: voucher.id },
    });
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
 * today. The voucher value (kobo) is converted 1:1 to HK Coins.
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
    const hkcAmount = Math.round(voucher.value / 100);
    const tx = await creditHkc({
      userId,
      amount: hkcAmount,
      type: 'deposit',
      description: `Voucher redeemed: ${voucher.title}`,
      reference: generateReference('HKC-REDEEM'),
      metadata: { userVoucherId, voucherId: voucher.voucherId, voucherValueKobo: voucher.value },
    });
    const now = new Date().toISOString();
    await userVoucherRef(userVoucherId).update({ status: 'redeemed', redeemedAt: now, transactionId: tx.id });
    return { ...voucher, status: 'redeemed', redeemedAt: now, transactionId: tx.id };
  }

  throw new Error(`Voucher usage type "${voucher.usageType}" is not supported yet`);
}
