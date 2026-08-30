import { db } from '../admin';
import { AdminPlatformConfig } from '../types';

const CONFIG_REF = db.collection('adminPanel').doc('platform');

// Seed content used only if the document doesn't exist yet (first deploy).
// The future Admin Platform will read/write this same document - this is
// NOT re-run on every request, only when the doc is missing.
const DEFAULT_CONFIG: AdminPlatformConfig = {
  onMaintenance: false,
  supportEmail: 'support@the-hk.com',
  announcements: ['Welcome to THE-HK', 'HK Points and Referrals are now live - start earning today.'],
  tutorials: [
    {
      id: 'tut-fund-wallet',
      title: 'Getting Started with THE-HK',
      description: 'A quick walkthrough of funding your wallet and using THE-HK services.',
      category: 'youtube',
      videoUrl: 'https://www.youtube.com/watch?v=YUWBku1cNEA',
      createdAt: new Date().toISOString(),
    },
  ],
  tips: [
    'Convert idle wallet balance to HK Points to unlock voucher rewards.',
    'Share your referral link - you earn a reward once your friend funds their wallet for the first time.',
    'Always double-check the recipient details before confirming a payment.',
  ],
  airtimeProvider: 'vtung',
  dataProvider: 'vtung',
  billProvider: 'reloadly',
  serviceVisibility: {},
  updatedAt: new Date().toISOString(),
};

export async function getPlatformConfig(): Promise<AdminPlatformConfig> {
  const snap = await CONFIG_REF.get();
  if (snap.exists) return snap.data() as AdminPlatformConfig;
  await CONFIG_REF.set(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}
