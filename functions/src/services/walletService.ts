import { db } from '../admin';
import {
  TransactionStatus,
  Currency,
  Wallet,
  Transaction,
  LedgerEntry,
  Payment,
  HkcTransaction,
  HkcTransactionType,
} from '../types';
import { generateReference, generatePaymentReference } from '../utils';
import { CURRENCY } from '../config';
import { spendCashback, awardCashback } from './cashbackService';
import { createNotification } from './notificationService';

function walletRef(userId: string) {
  return db.collection('wallets').doc(userId);
}

function transactionRef(id: string) {
  return db.collection('transactions').doc(id);
}

function paymentRef(id: string) {
  return db.collection('payments').doc(id);
}

function ledgerRef(id: string) {
  return db.collection('ledgerEntries').doc(id);
}

function hkcTransactionRef(id: string) {
  return db.collection('hkcTransactions').doc(id);
}

function hkcBalanceFromKobo(kobo: number): number {
  return Math.round(kobo / CURRENCY.minorUnit);
}

interface CreatePaymentInput {
  userId: string;
  amount: number; // kobo
  provider: 'paystack' | 'korapay';
  description: string;
  metadata?: Record<string, unknown>;
}

export async function createPayment(input: CreatePaymentInput): Promise<{ transaction: Transaction; payment: Payment }> {
  const now = new Date().toISOString();
  const reference = generatePaymentReference();
  const transactionId = reference;
  const paymentId = db.collection('payments').doc().id;

  const transaction: Transaction = {
    id: transactionId,
    userId: input.userId,
    type: 'wallet_funding',
    amount: input.amount,
    currency: CURRENCY.code as Currency,
    status: 'pending',
    reference,
    description: input.description,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  const payment: Payment = {
    id: paymentId,
    userId: input.userId,
    transactionId,
    amount: input.amount,
    currency: CURRENCY.code as Currency,
    provider: input.provider,
    status: 'pending',
    reference,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection('transactions').doc(transactionId).set(transaction);
  await db.collection('payments').doc(paymentId).set(payment);

  return { transaction, payment };
}

interface PaymentVerificationInput {
  payment: Payment;
  providerReference: string;
  providerStatus: 'successful' | 'failed' | 'abandoned';
  verifiedAmount: number; // kobo
}

function toTransactionStatus(status: 'successful' | 'failed' | 'abandoned'): TransactionStatus {
  if (status === 'successful') return 'successful';
  if (status === 'abandoned') return 'cancelled';
  return 'failed';
}

/**
 * Verifies a payment provider webhook and credits the user's HKC primary
 * balance. The NGN wallet is NOT credited for consumer deposits; 1 HKC = ₦1
 * (whole units), so a ₦1,000 deposit becomes 1,000 HKC.
 */
export async function processPaymentVerification(input: PaymentVerificationInput): Promise<{ userId: string; isFirstFunding: boolean }> {
  const { payment } = input;
  let isFirstFunding = false;

  await db.runTransaction(async (t) => {
    const pSnap = await t.get(paymentRef(payment.id));
    if (!pSnap.exists) throw new Error('Payment not found');
    const p = pSnap.data() as Payment;

    if (p.status === 'successful') {
      return;
    }

    if (p.status === 'failed' || p.status === 'abandoned') {
      throw new Error('Payment already finalized');
    }

    if (p.amount !== input.verifiedAmount) {
      throw new Error(`Amount mismatch: expected ${p.amount}, got ${input.verifiedAmount}`);
    }

    const now = new Date().toISOString();
    const transactionStatus = toTransactionStatus(input.providerStatus);

    t.update(transactionRef(p.transactionId), {
      status: transactionStatus,
      providerReference: input.providerReference,
      updatedAt: now,
    });
    t.update(paymentRef(p.id), {
      status: input.providerStatus,
      providerReference: input.providerReference,
      updatedAt: now,
    });

    if (input.providerStatus === 'successful') {
      const walletSnap = await t.get(walletRef(p.userId));
      const wallet = walletSnap.exists ? (walletSnap.data() as Wallet) : null;

      await migrateLegacyPointsToHkc(p.userId, t);

      const hkcAmount = hkcBalanceFromKobo(p.amount);
      const currentHkc = wallet?.hkcBalance ?? 0;
      const newHkcBalance = currentHkc + hkcAmount;
      const hkcTxId = db.collection('hkcTransactions').doc().id;
      const hkcTx: HkcTransaction = {
        id: hkcTxId,
        userId: p.userId,
        type: 'deposit',
        amount: hkcAmount,
        ngnAmount: p.amount,
        balanceAfter: newHkcBalance,
        description: `Wallet funding via ${p.provider}: ${p.reference}`,
        reference: p.reference,
        metadata: { paymentId: p.id, transactionId: p.transactionId, provider: p.provider },
        createdAt: now,
      };

      isFirstFunding = !wallet?.firstFundedAt;

      t.set(hkcTransactionRef(hkcTxId), hkcTx);
      t.set(
        walletRef(p.userId),
        {
          userId: p.userId,
          hkcBalance: newHkcBalance,
          availableHkcBalance: newHkcBalance,
          pendingHkcBalance: 0,
          ...(isFirstFunding ? { firstFundedAt: now } : {}),
          updatedAt: now,
        },
        { merge: true }
      );
    }
  });

  return { userId: payment.userId, isFirstFunding };
}

interface WithdrawalInput {
  userId: string;
  amount: number; // kobo
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  note?: string;
}

export async function createWithdrawal(input: WithdrawalInput): Promise<{ transaction: Transaction; withdrawal: any; ledger: LedgerEntry }> {
  const now = new Date().toISOString();
  const transactionId = db.collection('transactions').doc().id;
  const withdrawalId = db.collection('withdrawals').doc().id;
  const ledgerId = db.collection('ledgerEntries').doc().id;
  const reference = generateReference('HK-WD');

  return db.runTransaction(async (t) => {
    const walletSnap = await t.get(walletRef(input.userId));
    if (!walletSnap.exists) throw new Error('Wallet not found');
    const wallet = walletSnap.data() as Wallet;

    if (wallet.availableBalance < input.amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = wallet.balance - input.amount;

    const transaction: Transaction = {
      id: transactionId,
      userId: input.userId,
      type: 'withdrawal',
      amount: input.amount,
      currency: CURRENCY.code as Currency,
      status: 'pending',
      reference,
      description: `Withdrawal to ${input.bankName} - ${input.accountNumber}`,
      createdAt: now,
      updatedAt: now,
    };

    const withdrawal = {
      id: withdrawalId,
      userId: input.userId,
      amount: input.amount,
      currency: CURRENCY.code as Currency,
      bankName: input.bankName,
      bankCode: input.bankCode,
      accountNumber: input.accountNumber,
      accountName: input.accountName,
      status: 'pending' as TransactionStatus,
      reference,
      note: input.note || '',
      createdAt: now,
      updatedAt: now,
    };

    const ledger: LedgerEntry = {
      id: ledgerId,
      walletId: input.userId,
      userId: input.userId,
      transactionId,
      withdrawalId,
      type: 'debit',
      amount: input.amount,
      balanceAfter: newBalance,
      description: `Withdrawal pending: ${reference}`,
      createdAt: now,
    };

    t.set(transactionRef(transactionId), transaction);
    t.set(db.collection('withdrawals').doc(withdrawalId), withdrawal);
    t.set(ledgerRef(ledgerId), ledger);
    t.set(walletRef(input.userId), { userId: input.userId, balance: newBalance, availableBalance: newBalance, pendingBalance: 0, currency: CURRENCY.code, updatedAt: now }, { merge: true });

    return { transaction, withdrawal, ledger };
  });
}

interface OrderDebitInput {
  userId: string;
  amount: number; // kobo
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function debitWalletForOrder(input: OrderDebitInput): Promise<{ transaction: Transaction; ledger: LedgerEntry }> {
  const now = new Date().toISOString();
  const transactionId = db.collection('transactions').doc().id;
  const ledgerId = db.collection('ledgerEntries').doc().id;
  const reference = generateReference('HK-ORD');

  return db.runTransaction(async (t) => {
    const walletSnap = await t.get(walletRef(input.userId));
    if (!walletSnap.exists) throw new Error('Wallet not found');
    const wallet = walletSnap.data() as Wallet;

    if (wallet.availableBalance < input.amount) {
      throw new Error('Insufficient wallet balance');
    }

    const newBalance = wallet.balance - input.amount;

    const transaction: Transaction = {
      id: transactionId,
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      currency: CURRENCY.code as Currency,
      status: 'successful',
      reference,
      description: input.description,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const ledger: LedgerEntry = {
      id: ledgerId,
      walletId: input.userId,
      userId: input.userId,
      transactionId,
      type: 'debit',
      amount: input.amount,
      balanceAfter: newBalance,
      description: input.description,
      createdAt: now,
    };

    t.set(transactionRef(transactionId), transaction);
    t.set(ledgerRef(ledgerId), ledger);
    t.set(walletRef(input.userId), { userId: input.userId, balance: newBalance, availableBalance: newBalance, pendingBalance: 0, currency: CURRENCY.code, updatedAt: now }, { merge: true });

    return { transaction, ledger };
  });
}

export async function refundWalletDebit(input: { userId: string; transactionId: string; amount: number; reason: string }): Promise<void> {
  const now = new Date().toISOString();
  const ledgerId = db.collection('ledgerEntries').doc().id;

  await db.runTransaction(async (t) => {
    const walletSnap = await t.get(walletRef(input.userId));
    const wallet = walletSnap.exists ? (walletSnap.data() as Wallet) : null;
    const currentBalance = wallet ? wallet.balance : 0;
    const newBalance = currentBalance + input.amount;

    const ledger: LedgerEntry = {
      id: ledgerId,
      walletId: input.userId,
      userId: input.userId,
      transactionId: input.transactionId,
      type: 'credit',
      amount: input.amount,
      balanceAfter: newBalance,
      description: `Refund: ${input.reason}`,
      createdAt: now,
    };

    t.set(ledgerRef(ledgerId), ledger);
    t.update(transactionRef(input.transactionId), { status: 'refunded', updatedAt: now });
    t.set(walletRef(input.userId), { userId: input.userId, balance: newBalance, availableBalance: newBalance, pendingBalance: 0, currency: CURRENCY.code, updatedAt: now }, { merge: true });
  });
}

interface CreditWalletInput {
  userId: string;
  amount: number; // kobo
  type: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function creditWalletManual(input: CreditWalletInput): Promise<{ transaction: Transaction; ledger: LedgerEntry }> {
  const now = new Date().toISOString();
  const transactionId = db.collection('transactions').doc().id;
  const ledgerId = db.collection('ledgerEntries').doc().id;
  const reference = generateReference('HK-CR');

  return db.runTransaction(async (t) => {
    const walletSnap = await t.get(walletRef(input.userId));
    const wallet = walletSnap.exists ? (walletSnap.data() as Wallet) : null;
    const currentBalance = wallet ? wallet.balance : 0;
    const newBalance = currentBalance + input.amount;

    const transaction: Transaction = {
      id: transactionId,
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      currency: CURRENCY.code as Currency,
      status: 'successful',
      reference,
      description: input.description,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const ledger: LedgerEntry = {
      id: ledgerId,
      walletId: input.userId,
      userId: input.userId,
      transactionId,
      type: 'credit',
      amount: input.amount,
      balanceAfter: newBalance,
      description: input.description,
      createdAt: now,
    };

    t.set(transactionRef(transactionId), transaction);
    t.set(ledgerRef(ledgerId), ledger);
    t.set(walletRef(input.userId), { userId: input.userId, balance: newBalance, availableBalance: newBalance, pendingBalance: 0, currency: CURRENCY.code, updatedAt: now }, { merge: true });

    return { transaction, ledger };
  });
}

export async function creditHkc(input: {
  userId: string;
  amount: number;
  type: HkcTransactionType;
  description: string;
  reference: string;
  metadata?: Record<string, unknown>;
  notify?: { title: string; body: string };
}): Promise<HkcTransaction> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('HKC credit amount must be positive');
  const now = new Date().toISOString();
  const txId = db.collection('hkcTransactions').doc().id;

  await db.runTransaction(async (t) => {
    const walletSnap = await t.get(walletRef(input.userId));
    const wallet = walletSnap.exists ? (walletSnap.data() as Wallet) : null;
    const current = wallet?.hkcBalance ?? 0;
    const newBalance = current + input.amount;

    const hkcTx: HkcTransaction = {
      id: txId,
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceAfter: newBalance,
      description: input.description,
      reference: input.reference,
      metadata: input.metadata,
      createdAt: now,
    };

    t.set(hkcTransactionRef(txId), hkcTx);
    t.set(
      walletRef(input.userId),
      {
        userId: input.userId,
        hkcBalance: newBalance,
        availableHkcBalance: newBalance,
        pendingHkcBalance: 0,
        updatedAt: now,
      },
      { merge: true }
    );
  });

  if (input.notify) {
    await createNotification({
      userId: input.userId,
      title: input.notify.title,
      body: input.notify.body,
      category: 'transaction',
    }).catch(() => undefined);
  }

  const snap = await hkcTransactionRef(txId).get();
  return snap.data() as HkcTransaction;
}

export async function debitHkc(input: {
  userId: string;
  amount: number;
  type: HkcTransactionType;
  description: string;
  reference: string;
  metadata?: Record<string, unknown>;
}): Promise<HkcTransaction> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('HKC debit amount must be positive');
  const now = new Date().toISOString();
  const txId = db.collection('hkcTransactions').doc().id;

  const hkcTx = await db.runTransaction<HkcTransaction>(async (t) => {
    const walletSnap = await t.get(walletRef(input.userId));
    if (!walletSnap.exists) throw new Error('Wallet not found');
    const wallet = walletSnap.data() as Wallet;

    if ((wallet.availableHkcBalance ?? 0) < input.amount) {
      throw new Error('Insufficient HKC balance');
    }

    const newBalance = (wallet.hkcBalance ?? 0) - input.amount;

    const record: HkcTransaction = {
      id: txId,
      userId: input.userId,
      type: input.type,
      amount: -input.amount,
      balanceAfter: newBalance,
      description: input.description,
      reference: input.reference,
      metadata: input.metadata,
      createdAt: now,
    };

    t.set(hkcTransactionRef(txId), record);
    t.set(
      walletRef(input.userId),
      {
        userId: input.userId,
        hkcBalance: newBalance,
        availableHkcBalance: newBalance,
        pendingHkcBalance: 0,
        updatedAt: now,
      },
      { merge: true }
    );

    return record;
  });

  return hkcTx;
}

export async function refundHkc(input: {
  userId: string;
  amount: number;
  reason: string;
  reference: string;
  relatedTransactionId?: string;
  metadata?: Record<string, unknown>;
}): Promise<HkcTransaction> {
  return creditHkc({
    userId: input.userId,
    amount: input.amount,
    type: 'refund',
    description: `Refund: ${input.reason}`,
    reference: input.reference,
    metadata: { relatedTransactionId: input.relatedTransactionId, ...input.metadata },
  });
}

export interface ConsumerPaymentResult {
  totalKobo: number;
  hkcUsed: number;
  cashbackUsed: number;
  ngnUsed: number;
  transaction?: Transaction;
  ledger?: LedgerEntry;
  hkcTransaction?: HkcTransaction;
  ngnTransactionId?: string;
  hkcTransactionId?: string;
}

export async function debitConsumerPayment(input: {
  userId: string;
  totalKobo: number;
  useCashback: boolean;
  description: string;
  orderReference: string;
  serviceType: string;
  metadata?: Record<string, unknown>;
}): Promise<ConsumerPaymentResult> {
  if (!Number.isFinite(input.totalKobo) || input.totalKobo <= 0) {
    throw new Error('A valid amount is required');
  }

  const now = new Date().toISOString();
  let cashbackUsed = 0;

  if (input.useCashback) {
    const cbResult = await spendCashback({
      userId: input.userId,
      requestedAmountKobo: input.totalKobo,
      description: input.description,
      relatedOrderId: input.orderReference,
    });
    cashbackUsed = cbResult.spent;
  }

  const remainingAfterCashback = input.totalKobo - cashbackUsed;

  try {
    const result = await db.runTransaction<ConsumerPaymentResult>(async (t) => {
      const walletSnap = await t.get(walletRef(input.userId));
      if (!walletSnap.exists) throw new Error('Wallet not found');
      const wallet = walletSnap.data() as Wallet;

      const hkcAvailableWhole = Math.floor(wallet.availableHkcBalance ?? 0);
      const hkcAvailableKobo = hkcAvailableWhole * CURRENCY.minorUnit;
      // HKC is whole units (1 HKC = ₦1), so only use it for whole naira.
      const hkcKoboNeeded = Math.min(
        Math.floor(remainingAfterCashback / CURRENCY.minorUnit) * CURRENCY.minorUnit,
        hkcAvailableKobo
      );
      const hkcUsed = hkcKoboNeeded / CURRENCY.minorUnit;
      const remainingAfterHkc = remainingAfterCashback - hkcKoboNeeded;

      if (remainingAfterHkc > 0 && wallet.availableBalance < remainingAfterHkc) {
        throw new Error('Insufficient HKC and wallet balance');
      }
      const ngnUsed = remainingAfterHkc;

      const newHkcBalance = (wallet.hkcBalance ?? 0) - hkcUsed;
      const newNgnBalance = wallet.balance - ngnUsed;
      const transactionId = db.collection('transactions').doc().id;
      const ledgerId = db.collection('ledgerEntries').doc().id;
      const hkcTxId = db.collection('hkcTransactions').doc().id;

      let hkcTransaction: HkcTransaction | undefined;
      let transaction: Transaction | undefined;
      let ledger: LedgerEntry | undefined;

      if (hkcUsed > 0) {
        hkcTransaction = {
          id: hkcTxId,
          userId: input.userId,
          type: 'spending',
          amount: -hkcUsed,
          balanceAfter: newHkcBalance,
          description: input.description,
          reference: input.orderReference,
          metadata: {
            serviceType: input.serviceType,
            ngnEquivalent: hkcKoboNeeded,
            ...input.metadata,
          },
          createdAt: now,
        };
        t.set(hkcTransactionRef(hkcTxId), hkcTransaction);
      }

      if (ngnUsed > 0) {
        transaction = {
          id: transactionId,
          userId: input.userId,
          type: `${input.serviceType}_purchase`,
          amount: ngnUsed,
          currency: CURRENCY.code as Currency,
          status: 'successful',
          reference: input.orderReference,
          description: input.description,
          metadata: {
            serviceType: input.serviceType,
            hkcUsed,
            cashbackUsed,
            ...input.metadata,
          },
          createdAt: now,
          updatedAt: now,
        };
        ledger = {
          id: ledgerId,
          walletId: input.userId,
          userId: input.userId,
          transactionId,
          type: 'debit',
          amount: ngnUsed,
          balanceAfter: newNgnBalance,
          description: input.description,
          createdAt: now,
        };
        t.set(transactionRef(transactionId), transaction);
        t.set(ledgerRef(ledgerId), ledger);
      }

      t.set(
        walletRef(input.userId),
        {
          userId: input.userId,
          hkcBalance: newHkcBalance,
          availableHkcBalance: newHkcBalance,
          pendingHkcBalance: 0,
          balance: newNgnBalance,
          availableBalance: newNgnBalance,
          pendingBalance: 0,
          currency: CURRENCY.code,
          updatedAt: now,
        },
        { merge: true }
      );

      return {
        totalKobo: input.totalKobo,
        hkcUsed,
        cashbackUsed,
        ngnUsed,
        transaction,
        ledger,
        hkcTransaction,
        ngnTransactionId: transaction?.id,
        hkcTransactionId: hkcTransaction?.id,
      };
    });

    return result;
  } catch (err) {
    if (cashbackUsed > 0) {
      await awardCashback({
        userId: input.userId,
        amountKobo: cashbackUsed,
        description: `Refund (payment failed): ${input.description}`,
        relatedOrderId: input.orderReference,
      }).catch(() => undefined);
    }
    throw err;
  }
}

export async function refundConsumerPayment(input: {
  userId: string;
  hkcUsed: number;
  cashbackUsed: number;
  ngnUsed: number;
  hkcTransactionId?: string;
  ngnTransactionId?: string;
  reason: string;
  orderReference: string;
}): Promise<void> {
  if (input.hkcUsed > 0) {
    await refundHkc({
      userId: input.userId,
      amount: input.hkcUsed,
      reason: input.reason,
      reference: input.orderReference,
      relatedTransactionId: input.hkcTransactionId,
    }).catch(() => undefined);
  }

  if (input.ngnUsed > 0 && input.ngnTransactionId) {
    await refundWalletDebit({
      userId: input.userId,
      transactionId: input.ngnTransactionId,
      amount: input.ngnUsed,
      reason: input.reason,
    }).catch(() => undefined);
  }

  if (input.cashbackUsed > 0) {
    await awardCashback({
      userId: input.userId,
      amountKobo: input.cashbackUsed,
      description: `Refund: ${input.reason}`,
      relatedOrderId: input.orderReference,
    }).catch(() => undefined);
  }
}

export async function migrateLegacyPointsToHkc(userId: string, t?: FirebaseFirestore.Transaction): Promise<void> {
  const ref = walletRef(userId);

  const run = async (transaction: FirebaseFirestore.Transaction) => {
    const snap = await transaction.get(ref);
    const wallet = snap.exists ? (snap.data() as Wallet) : null;

    if (wallet && typeof wallet.hkcBalance === 'number') return;

    const oldSnap = await db.collection('points').doc(userId).get();
    const oldBalance = oldSnap.exists ? (oldSnap.data() as any).balance ?? 0 : 0;
    const safeBalance = Number.isFinite(oldBalance) ? Math.max(0, oldBalance) : 0;

    const now = new Date().toISOString();
    transaction.set(
      ref,
      {
        userId,
        hkcBalance: safeBalance,
        availableHkcBalance: safeBalance,
        pendingHkcBalance: 0,
        updatedAt: now,
      },
      { merge: true }
    );

    if (safeBalance > 0) {
      const txId = db.collection('hkcTransactions').doc().id;
      transaction.set(hkcTransactionRef(txId), {
        id: txId,
        userId,
        type: 'migration',
        amount: safeBalance,
        balanceAfter: safeBalance,
        description: 'Migrated legacy HK Points balance to HK Coins',
        reference: 'HKC-MIGRATION',
        createdAt: now,
      });
    }
  };

  if (t) {
    await run(t);
  } else {
    await db.runTransaction(async (transaction) => run(transaction));
  }
}

export async function ensureWallet(userId: string): Promise<Wallet> {
  const ref = walletRef(userId);
  const snap = await ref.get();
  if (snap.exists) {
    const wallet = snap.data() as Wallet;
    if (typeof wallet.hkcBalance !== 'number') {
      await migrateLegacyPointsToHkc(userId);
      const fresh = await ref.get();
      return fresh.data() as Wallet;
    }
    return wallet;
  }

  const wallet: Wallet = {
    userId,
    balance: 0,
    availableBalance: 0,
    pendingBalance: 0,
    currency: CURRENCY.code as Currency,
    hkcBalance: 0,
    availableHkcBalance: 0,
    pendingHkcBalance: 0,
    updatedAt: new Date().toISOString(),
  };
  await ref.set(wallet);
  return wallet;
}

export async function getWallet(userId: string): Promise<Wallet> {
  return ensureWallet(userId);
}
