import { db } from '../admin';
import { ReceiptRecord, Transaction } from '../types';
import { generateReference } from '../utils';

interface GenerateReceiptInput {
  userId: string;
  transactionId?: string;
  amount: number; // kobo
  senderName: string;
  senderAccountNumber?: string;
  receiverBankName: string;
  receiverAccountNumber: string;
  receiverAccountName: string;
}

export async function generateReceipt(input: GenerateReceiptInput): Promise<ReceiptRecord> {
  if (!input.amount || input.amount <= 0) throw new Error('A valid amount is required');
  if (!input.senderName || !input.receiverBankName || !input.receiverAccountNumber || !input.receiverAccountName) {
    throw new Error('Sender name, receiver bank, account number and account name are required');
  }

  // If a transaction is referenced, verify it belongs to this user - a
  // receipt should never be generated referencing someone else's
  // transaction, even though the amount/details themselves are otherwise
  // user-supplied for the (non-transactional) manual receipt case.
  if (input.transactionId) {
    const txSnap = await db.collection('transactions').doc(input.transactionId).get();
    const tx = txSnap.data() as Transaction | undefined;
    if (!txSnap.exists || tx?.userId !== input.userId) {
      throw new Error('The referenced transaction could not be verified for this account');
    }
    if (tx.status !== 'successful') {
      throw new Error('Receipts can only be generated for successful transactions');
    }
  }

  const now = new Date().toISOString();
  const id = db.collection('receipts').doc().id;
  const receipt: ReceiptRecord = {
    id,
    userId: input.userId,
    transactionId: input.transactionId,
    amount: input.amount,
    senderName: input.senderName,
    senderAccountNumber: input.senderAccountNumber,
    receiverBankName: input.receiverBankName,
    receiverAccountNumber: input.receiverAccountNumber,
    receiverAccountName: input.receiverAccountName,
    reference: generateReference('HK-RCT'),
    createdAt: now,
  };
  await db.collection('receipts').doc(id).set(receipt);
  return receipt;
}

export async function getReceipt(userId: string, receiptId: string): Promise<ReceiptRecord> {
  const snap = await db.collection('receipts').doc(receiptId).get();
  if (!snap.exists) throw new Error('Receipt not found');
  const receipt = snap.data() as ReceiptRecord;
  if (receipt.userId !== userId) throw new Error('Not authorized to view this receipt');
  return receipt;
}
