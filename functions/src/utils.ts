import * as crypto from 'crypto';

export function generateReference(prefix: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generatePaymentReference(): string {
  const now = new Date();
  const y = String(now.getFullYear() % 100).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const random = crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 10);
  return `HK-PAY-${y}${m}${d}-${random}`;
}

export function hmacSha512(secret: string, payload: string): string {
  return crypto.createHmac('sha512', secret).update(payload, 'utf8').digest('hex');
}

export function hmacSha256(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}
