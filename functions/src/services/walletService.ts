import { db } from '../admin';
import { TransactionStatus, PaymentStatus, Currency, Wallet, Transaction, LedgerEntry, Payment } from '../types';
import { generateReference, generatePaymentReference } from '../utils';
import { CURRENCY } from '../config';

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

export async function processPaymentVerification(input: PaymentVerificationInput): Promise<{ userId: string; isFirstFunding: boolean }> {
  const { payment } = input;
  let isFirstFunding = false;

  await db.runTransaction(async (t) => {
    const pSnap = await t.get(paymentRef(payment.id));
    if (!pSnap.exists) throw new Error('Payment not found');
    const p = pSnap.data() as Payment;

    if (p.status === 'successful') {
      // Already processed - idempotency
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
    const paymentStatus = input.providerStatus;

    const tx: Partial<Transaction> = {
      status: transactionStatus,
      providerReference: input.providerReference,
      updatedAt: now,
    };

    const paymentUpdate: Partial<Payment> = {
      status: paymentStatus,
      providerReference: input.providerReference,
      updatedAt: now,
    };

    t.update(transactionRef(p.transactionId), tx);
    t.update(paymentRef(p.id), paymentUpdate);

    if (input.providerStatus === 'successful') {
      const walletSnap = await t.get(walletRef(p.userId));
      const wallet = walletSnap.exists ? (walletSnap.data() as Wallet) : null;
      const currentBalance = wallet ? wallet.balance : 0;
      const newBalance = currentBalance + p.amount;
      const ledgerId = db.collection('ledgerEntries').doc().id;

      const ledger: LedgerEntry = {
        id: ledgerId,
        walletId: p.userId,
        userId: p.userId,
        transactionId: p.transactionId,
        paymentId: p.id,
        type: 'credit',
        amount: p.amount,
        balanceAfter: newBalance,
        description: `Wallet funding via ${p.provider}: ${p.reference}`,
        createdAt: now,
      };

      isFirstFunding = !wallet?.firstFundedAt;

      t.set(ledgerRef(ledgerId), ledger);
      t.set(
        walletRef(p.userId),
        {
          userId: p.userId,
          balance: newBalance,
          availableBalance: newBalance,
          pendingBalance: 0,
          currency: CURRENCY.code,
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

/**
 * Generic, server-authoritative wallet debit used by Phase 3 order flows
 * (social media services, airtime/data, gift cards, marketplace, etc).
 * Creates a transaction + ledger entry atomically and rejects if the wallet
 * does not have sufficient available balance. Callers are responsible for
 * refunding via `refundWalletDebit` if downstream fulfillment fails.
 */
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

/**
 * Reverses a previous `debitWalletForOrder` call when downstream fulfillment
 * (e.g. a provider order submission) fails after the wallet was already
 * charged. Marks the original transaction as `refunded` and records a
 * credit ledger entry rather than silently mutating the balance.
 */
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

/**
 * Generic, server-authoritative wallet credit for sources other than a
 * payment provider funding event - currently used by voucher redemption
 * (`rewardsService.ts`). Mirrors `debitWalletForOrder`'s shape/ledger
 * pattern so the wallet, transaction, and ledger stay consistent no matter
 * which feature moved the money.
 */
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

export async function ensureWallet(userId: string): Promise<Wallet> {
  const ref = walletRef(userId);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as Wallet;

  const wallet: Wallet = {
    userId,
    balance: 0,
    availableBalance: 0,
    pendingBalance: 0,
    currency: CURRENCY.code as Currency,
    updatedAt: new Date().toISOString(),
  };
  await ref.set(wallet);
  return wallet;
}
