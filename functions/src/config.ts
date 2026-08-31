import * as functions from 'firebase-functions';

export const APP_ENV = process.env.APP_ENV || functions.config().thehk?.env || 'development';

// Provider routing: set AIRTIME_DATA_PROVIDER / BILL_PROVIDER env vars to
// switch implementations without changing service code. VTU.ng is the
// default airtime/data provider in this phase.
export const AIRTIME_DATA_PROVIDER = process.env.AIRTIME_DATA_PROVIDER || 'vtung';
export const DATA_PROVIDER = process.env.DATA_PROVIDER || 'vtung';
export const BILL_PROVIDER = process.env.BILL_PROVIDER || 'reloadly';

export const SECRETS = {
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || functions.config().paystack?.secretkey || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || functions.config().paystack?.publickey || '',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || functions.config().paystack?.webhooksecret || '',
  },
  korapay: {
    secretKey: process.env.KORAPAY_SECRET_KEY || '',
    publicKey: process.env.KORAPAY_PUBLIC_KEY || functions.config().korapay?.publickey || '',
    webhookSecret: process.env.KORAPAY_WEBHOOK_SECRET || functions.config().korapay?.webhooksecret || '',
  },
  owlet: {
    apiKey: process.env.OWLET_API_KEY || '',
    apiUrl: process.env.OWLET_API_URL || 'https://the-owlet.com/api/v2',
  },
  reloadly: {
    clientId: process.env.RELOADLY_CLIENT_ID || '',
    clientSecret: process.env.RELOADLY_CLIENT_SECRET || '',
    sandbox: process.env.RELOADLY_SANDBOX === 'true',
  },
  vtung: {
    username: process.env.VTUNG_USERNAME || '',
    password: process.env.VTUNG_PASSWORD || '',
    userPin: process.env.VTUNG_USER_PIN || '',
    apiBaseUrl: process.env.VTUNG_API_BASE_URL || 'https://vtu.ng/wp-json/api/v2',
  },
};

export const CURRENCY = {
  code: 'NGN',
  minorUnit: 100,
};

export const MIN_FUNDING_AMOUNT = 500; // NGN

// Public redirect URL used by Paystack after a funding payment.
// This can be moved to an environment variable when the production domain changes.
export const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || 'https://thehk.vercel.app/payment-success';

// HK Coins: single authoritative conversion rate. HKC is always computed from
// a naira amount as `amountNaira * HKC_PER_NAIRA`.
// Kept as one constant (rather than hardcoded across screens/functions) so
// changing it later - or eventually loading it from an admin-configurable
// Firestore doc - only requires touching this one value.
export const HKC_PER_NAIRA = 1; // 1 NGN = 1 HK Coin
export const MIN_HKC_CONVERSION_NAIRA = 100; // ₦100 minimum per conversion
export const SIGNUP_BONUS_HKC = 500; // 500 HK Coins awarded on first login
export const BANK_GEN_PRICE_NAIRA = 100; // ₦100 or 100 HKC per receipt

// Referral: flat reward credited to the referrer's referral balance when
// their referred user completes the activation event (see
// functions/src/services/referralService.ts). A configurable single value,
// not a full referral economy, per Phase 4 scope.
export const REFERRAL_REWARD_KOBO = toKobo(200); // ₦200 per activated referral

export function toKobo(amountInNaira: number): number {
  return Math.round(amountInNaira * CURRENCY.minorUnit);
}

export function fromKobo(kobo: number): number {
  return kobo / CURRENCY.minorUnit;
}
