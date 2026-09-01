/**
 * Maps Firebase callable / provider errors into user-friendly messages.
 * Keeps the original error attached for diagnostics but never surfaces raw
 * provider internals to the user.
 */
export function mapCallableError(err: any): Error {
  const code = String(err?.code || '');
  const message = String(err?.message || '').toLowerCase();

  let friendly = 'Something went wrong. Please try again.';

  if (message.includes('insufficient') || message.includes('not enough')) {
    friendly = "You don't have enough HKC to complete this payment. Please fund your wallet.";
  } else if (message.includes('provider') && (message.includes('not configured') || message.includes('unavailable'))) {
    friendly = 'This service is temporarily unavailable. Please try again later.';
  } else if (message.includes('network') || message.includes('connection') || code === 'unavailable') {
    friendly = 'Please check your internet connection and try again.';
  } else if (code === 'permission-denied') {
    friendly = "You don't have permission to perform this action.";
  } else if (code === 'unauthenticated') {
    friendly = 'Please sign in to continue.';
  } else if (message.includes('already processed') || message.includes('already finalized')) {
    friendly = 'This payment has already been processed.';
  } else if (message.includes('amount mismatch') || message.includes('currency mismatch')) {
    friendly = 'Payment verification failed due to a mismatch. Please contact support.';
  } else if (message.includes('bank account verification')) {
    friendly = 'Bank account verification is not available right now.';
  } else if (message.includes('not found')) {
    friendly = 'The requested record was not found.';
  } else if (message.includes('a valid amount is required') || message.includes('amount is required')) {
    friendly = 'Please enter a valid amount for this payment.';
  } else if (message.includes('insufficient hkc and wallet balance')) {
    friendly = "You don't have enough HKC or NGN wallet balance to complete this payment. Please fund your wallet.";
  } else if (message.includes('wallet not found')) {
    friendly = "Your wallet could not be loaded. Please try again or contact support.";
  } else if (message.includes('insufficient balance')) {
    friendly = "You don't have enough balance to complete this payment. Please fund your wallet.";
  } else if (message.includes('receipt generation failed') || message.includes('receipt') || message.includes('sender name') || message.includes('receiver')) {
    friendly = 'Could not generate the receipt. Please check the details and try again.';
  }

  const mapped = new Error(friendly);
  (mapped as any).code = code;
  (mapped as any).originalError = err;
  // eslint-disable-next-line no-console
  console.error('[Callable error]', err);
  return mapped;
}
