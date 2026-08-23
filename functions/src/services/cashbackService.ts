import { db } from '../admin';
import { CashbackBalance, CashbackTransaction } from '../types';
import { generateReference } from '../utils';

function balanceRef(userId: string) {
  return db.collection('cashbackBalances').doc(userId);
}

export async function ensureCashbackBalance(userId: string): Promise<CashbackBalance> {
  const ref = balanceRef(userId);
  const snap = await ref.get();
  if (snap.exists) return snap.data() as CashbackBalance;
  const balance: CashbackBalance = { userId, balance: 0, updatedAt: new Date().toISOString() };
  await ref.set(balance);
  return balance;
}

async function recordTransaction(entry: Omit<CashbackTransaction, 'id' | 'createdAt' | 'reference'>): Promise<CashbackTransaction> {
  const id = db.collection('cashbackTransactions').doc().id;
  const record: CashbackTransaction = { id, reference: generateReference('HK-CB'), createdAt: new Date().toISOString(), ...entry };
  await db.collection('cashbackTransactions').doc(id).set(record);
  return record;
}

/**
 * Credits a user's cashback balance. This is the ONLY place cashback is
 * ever awarded - it is NOT called automatically by any order flow yet,
 * because the actual cashback calculation/eligibility rules haven't been
 * defined (see PHASE_4_CONTINUATION_REPORT.md). The hook exists so a
 * future rule engine (e.g. "N% cashback on eligible airtime orders") can
 * call this without touching wallet/order/ledger code.
 */
export async function awardCashback(input: { userId: string; amountKobo: number; description: string; relatedOrderId?: string }): Promise<CashbackTransaction> {
  if (input.amountKobo <= 0) throw new Error('Cashback amount must be positive');
  const now = new Date().toISOString();

  await db.runTransaction(async (t) => {
    const snap = await t.get(balanceRef(input.userId));
    const current = snap.exists ? (snap.data() as CashbackBalance).balance : 0;
    t.set(balanceRef(input.userId), { userId: input.userId, balance: current + input.amountKobo, updatedAt: now }, { merge: true });
  });

  return recordTransaction({
    userId: input.userId,
    type: 'earned',
    amount: input.amountKobo,
    description: input.description,
    relatedOrderId: input.relatedOrderId,
  });
}

/**
 * Debits up to `requestedAmountKobo` from the user's cashback balance and
 * returns the amount actually spent (capped at the available balance) plus
 * the resulting remainder that still needs to be paid from another source.
 * Used by `paymentService.resolvePayment` to implement the
 * "cashback first, then wallet/points" priority.
 */
export async function spendCashback(input: { userId: string; requestedAmountKobo: number; description: string; relatedOrderId?: string }): Promise<{ spent: number }> {
  if (input.requestedAmountKobo <= 0) return { spent: 0 };
  const now = new Date().toISOString();

  const spent = await db.runTransaction(async (t) => {
    const snap = await t.get(balanceRef(input.userId));
    const current = snap.exists ? (snap.data() as CashbackBalance).balance : 0;
    const amountToSpend = Math.min(current, input.requestedAmountKobo);
    if (amountToSpend <= 0) return 0;
    t.set(balanceRef(input.userId), { userId: input.userId, balance: current - amountToSpend, updatedAt: now }, { merge: true });
    return amountToSpend;
  });

  if (spent > 0) {
    await recordTransaction({
      userId: input.userId,
      type: 'spent',
      amount: spent,
      description: input.description,
      relatedOrderId: input.relatedOrderId,
    });
  }

  return { spent };
}

export async function getCashbackHistory(userId: string, limit = 50): Promise<CashbackTransaction[]> {
  const snap = await db
    .collection('cashbackTransactions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as CashbackTransaction);
}
