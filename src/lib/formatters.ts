import { Currency } from '@/types/domain';

// All financial amounts in THE-HK are stored and passed as the smallest currency unit (kobo for NGN).
// 1 NGN = 100 kobo. formatCurrency accepts kobo and displays a decimal NGN value.

const currencySymbols: Record<Currency, string> = {
  NGN: '₦',
};

const currencyMinorUnits: Record<Currency, number> = {
  NGN: 100,
};

export function toMinorUnits(amountInMainUnits: number, currency: Currency = 'NGN'): number {
  return Math.round(amountInMainUnits * currencyMinorUnits[currency]);
}

export function fromMinorUnits(amountInMinorUnits: number, currency: Currency = 'NGN'): number {
  return amountInMinorUnits / currencyMinorUnits[currency];
}

export function formatCurrency(amountInMinorUnits: number, currency: Currency = 'NGN'): string {
  const symbol = currencySymbols[currency] || currency;
  const major = fromMinorUnits(amountInMinorUnits, currency);
  const formatted = major.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

// HKC is stored in whole units where 1 HKC = ₦1. `amount` is the HKC count.
export function formatHkc(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-NG')} HKC`;
}

export function formatCompactNumber(value: number): string {
  return Intl.NumberFormat('en-NG', { notation: 'compact' }).format(value);
}

export function maskBalance(): string {
  return '****';
}

export function formatPhoneNumber(phone: string): string {
  if (phone.length === 13 && phone.startsWith('+234')) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7, 10)} ${phone.slice(10)}`;
  }
  return phone;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}
