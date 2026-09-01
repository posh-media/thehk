import { db } from '../admin';
import { AdminPlatformConfig } from '../types';

const CONFIG_REF = db.collection('adminPanel').doc('platform');

// Seed content used only if the document doesn't exist yet (first deploy).
// The future Admin Platform will read/write this same document - this is
// NOT re-run on every request, only when the doc is missing.
const DEFAULT_CONFIG: AdminPlatformConfig = {
  onMaintenance: false,
  supportEmail: 'support@the-hk.com',
  announcements: ['Welcome to THE-HK', 'HK Coins and Referrals are now live - start earning today.'],
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
    'Convert idle NGN wallet balance to HK Coins to unlock voucher rewards.',
    'Share your referral link - you earn a reward once your friend funds their wallet for the first time.',
    'Always double-check the recipient details before confirming a payment.',
  ],
  telegramURL: 'https://www.google.com',
  appDownloadUrl: 'https://www.google.com',
  airtimeProvider: 'vtung',
  dataProvider: 'vtung',
  billProvider: 'reloadly',
  serviceVisibility: {},
  updatedAt: new Date().toISOString(),
};

export async function getPlatformConfig(): Promise<AdminPlatformConfig> {
  const snap = await CONFIG_REF.get();
  if (snap.exists) {
    const data = snap.data() as AdminPlatformConfig;
    const needsBackfill = !data.telegramURL || !data.appDownloadUrl;
    if (needsBackfill) {
      const merged = {
        ...data,
        telegramURL: data.telegramURL || DEFAULT_CONFIG.telegramURL,
        appDownloadUrl: data.appDownloadUrl || DEFAULT_CONFIG.appDownloadUrl,
        updatedAt: new Date().toISOString(),
      };
      await CONFIG_REF.set(merged, { merge: true });
      return merged;
    }
    return data;
  }
  await CONFIG_REF.set(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}
