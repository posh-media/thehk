import { AirtimeDataProvider, BillProvider } from './utilityProvider';
import { ReloadlyProvider } from './reloadlyProvider';
import { VtungProvider } from './vtungProvider';
import { ReloadlyUtilityProvider } from './reloadlyUtilityProvider';
import { SECRETS, APP_ENV } from '../config';

// Provider factory so the backend can switch between VTU.ng, Reloadly, a
// future Owlet integration, or any other Airtime/Data aggregator without
// touching the order/wallet logic in functions/src/services/utilityService.ts.
// VTU.ng is the default airtime/data provider in this phase.

type AirtimeDataProviderName = 'vtung' | 'reloadly' | 'owlet';
type BillProviderName = 'reloadly';

const envAirtimeProvider: AirtimeDataProviderName =
  (process.env.AIRTIME_DATA_PROVIDER as AirtimeDataProviderName) || 'vtung';
const envDataProvider: AirtimeDataProviderName =
  (process.env.DATA_PROVIDER as AirtimeDataProviderName) || 'vtung';
const envBillProvider: BillProviderName =
  (process.env.BILL_PROVIDER as BillProviderName) || 'reloadly';

const reloadlyProvider = new ReloadlyProvider(
  SECRETS.reloadly.clientId,
  SECRETS.reloadly.clientSecret,
  SECRETS.reloadly.sandbox
);

const vtungProvider = new VtungProvider(
  SECRETS.vtung.username,
  SECRETS.vtung.password,
  SECRETS.vtung.apiBaseUrl
);

const reloadlyBillProvider = new ReloadlyUtilityProvider(
  SECRETS.reloadly.clientId,
  SECRETS.reloadly.clientSecret,
  SECRETS.reloadly.sandbox
);

function resolveAirtimeProviderName(
  requested?: AirtimeDataProviderName | string | null
): AirtimeDataProviderName {
  if (requested === 'vtung' || requested === 'owlet' || requested === 'reloadly') return requested;
  return envAirtimeProvider;
}

function resolveDataProviderName(
  requested?: AirtimeDataProviderName | string | null
): AirtimeDataProviderName {
  if (requested === 'vtung' || requested === 'owlet' || requested === 'reloadly') return requested;
  return envDataProvider;
}

function resolveBillProviderName(
  requested?: BillProviderName | string | null
): BillProviderName {
  if (requested === 'reloadly') return requested;
  return envBillProvider;
}

export function getAirtimeDataProvider(
  requested?: AirtimeDataProviderName | string | null
): AirtimeDataProvider {
  const name = resolveAirtimeProviderName(requested);
  switch (name) {
    case 'vtung':
      if (!vtungProvider.isConfigured()) {
        throw new Error('Airtime/Data provider (VTU.ng) is not configured.');
      }
      return vtungProvider;
    case 'reloadly':
      if (!reloadlyProvider.isConfigured()) {
        throw new Error('Airtime/Data provider (Reloadly) is not configured.');
      }
      return reloadlyProvider;
    case 'owlet':
      // Owlet has no documented Airtime/Data API today. If that changes,
      // implement an OwletAirtimeProvider and return it here.
      throw new Error('Airtime/Data provider (Owlet) is not available. No documented API exists at this time.');
    default:
      if (APP_ENV !== 'production') {
        console.warn(`Unknown Airtime/Data provider "${name}", falling back to VTU.ng.`);
      }
      if (!vtungProvider.isConfigured()) {
        throw new Error('Airtime/Data provider (VTU.ng) is not configured.');
      }
      return vtungProvider;
  }
}

export function getDataProvider(
  requested?: AirtimeDataProviderName | string | null
): AirtimeDataProvider {
  const name = resolveDataProviderName(requested);
  // Airtime and Data currently use the same provider abstraction.
  return getAirtimeDataProvider(name);
}

export function getBillProvider(
  requested?: BillProviderName | string | null
): BillProvider {
  const name = resolveBillProviderName(requested);
  switch (name) {
    case 'reloadly':
      if (!reloadlyBillProvider.isConfigured()) {
        throw new Error('Bill provider (Reloadly) is not configured.');
      }
      return reloadlyBillProvider;
    default:
      if (!reloadlyBillProvider.isConfigured()) {
        throw new Error('Bill provider (Reloadly) is not configured.');
      }
      return reloadlyBillProvider;
  }
}

export function isAirtimeDataProviderConfigured(
  requested?: AirtimeDataProviderName | string | null
): boolean {
  try {
    return getAirtimeDataProvider(requested).isConfigured();
  } catch {
    return false;
  }
}
