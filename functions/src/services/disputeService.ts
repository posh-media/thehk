import { db } from '../admin';
import { Dispute } from '../types';

function disputeRef(id: string) {
  return db.collection('disputes').doc(id);
}

interface CreateDisputeInput {
  userId: string;
  transactionId?: string;
  orderReference?: string;
  category: string;
  subject: string;
  description: string;
}

export async function createDispute(input: CreateDisputeInput): Promise<Dispute> {
  if (!input.category || !input.subject || !input.description) {
    throw new Error('Category, subject and description are required');
  }

  // If a transaction is referenced, verify it actually belongs to this
  // user before attaching it - never trust a client-submitted transaction
  // ID at face value for something that will eventually be reviewed by an
  // admin.
  if (input.transactionId) {
    const txSnap = await db.collection('transactions').doc(input.transactionId).get();
    if (!txSnap.exists || (txSnap.data() as { userId: string }).userId !== input.userId) {
      throw new Error('The referenced transaction could not be verified for this account');
    }
  }

  const now = new Date().toISOString();
  const id = db.collection('disputes').doc().id;
  const dispute: Dispute = {
    id,
    userId: input.userId,
    transactionId: input.transactionId,
    orderReference: input.orderReference,
    category: input.category,
    subject: input.subject,
    description: input.description,
    status: 'open',
    createdAt: now,
    updatedAt: now,
  };
  await disputeRef(id).set(dispute);
  return dispute;
}

export async function listDisputes(userId: string): Promise<Dispute[]> {
  const snap = await db.collection('disputes').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => d.data() as Dispute);
}
