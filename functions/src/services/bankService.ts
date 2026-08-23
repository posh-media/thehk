import { SECRETS } from '../config';

// Nigerian bank account name verification via Paystack's "Resolve Account
// Number" endpoint (https://api.paystack.co/bank/resolve). Paystack is
// already an established, credentialed provider in THE-HK (used for wallet
// funding), so this reuses the same secret key rather than introducing a
// new provider just for this feature. Requires the Paystack account to
// have this capability enabled (it works on Paystack's live and test keys
// out of the box for supported banks).
export async function verifyBankAccountNumber(bankCode: string, accountNumber: string): Promise<{ accountName: string }> {
  if (!SECRETS.paystack.secretKey) {
    throw new Error('Bank account verification is not configured. PAYSTACK_SECRET_KEY is missing.');
  }
  if (!bankCode || !accountNumber || accountNumber.length < 10) {
    throw new Error('A valid bank and 10-digit account number are required');
  }

  const url = `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${SECRETS.paystack.secretKey}` },
  });

  const data = (await response.json()) as { status: boolean; message?: string; data?: { account_name: string } };
  if (!response.ok || !data.status || !data.data) {
    throw new Error(data.message || 'Could not verify this account number');
  }

  return { accountName: data.data.account_name };
}
