// One-off manual sandbox verification script for Phase 3C.
// Run with: node scripts/testReloadly.js
// Reads credentials from functions/.env (parsed manually - no extra
// dependency). Not deployed, not part of the build.
const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  const content = fs.readFileSync(file, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv(path.join(__dirname, '..', '.env'));

const CLIENT_ID = process.env.RELOADLY_CLIENT_ID;
const CLIENT_SECRET = process.env.RELOADLY_CLIENT_SECRET;

async function getToken(audience) {
  const res = await fetch('https://auth.reloadly.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials', audience }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Auth failed for ${audience}: ${res.status} ${text}`);
  return JSON.parse(text).access_token;
}

async function main() {
  console.log('--- AIRTIME ---');
  const airtimeToken = await getToken('https://topups-sandbox.reloadly.com');
  const balRes = await fetch('https://topups-sandbox.reloadly.com/accounts/balance', {
    headers: { Authorization: `Bearer ${airtimeToken}`, Accept: 'application/com.reloadly.topups-v1+json' },
  });
  console.log('Balance:', await balRes.text());

  const opsRes = await fetch('https://topups-sandbox.reloadly.com/operators/countries/NG', {
    headers: { Authorization: `Bearer ${airtimeToken}`, Accept: 'application/com.reloadly.topups-v1+json' },
  });
  const ops = await opsRes.json();
  console.log('NG operators count:', Array.isArray(ops) ? ops.length : ops);
  if (Array.isArray(ops)) console.log(ops.slice(0, 3).map((o) => ({ id: o.operatorId, name: o.name, data: o.data, bundle: o.bundle })));

  const detectRes = await fetch('https://topups-sandbox.reloadly.com/operators/auto-detect/phone/2348031234567/countries/NG', {
    headers: { Authorization: `Bearer ${airtimeToken}`, Accept: 'application/com.reloadly.topups-v1+json' },
  });
  console.log('Auto-detect status:', detectRes.status, await detectRes.text());

  console.log('\n--- UTILITY ---');
  const utilToken = await getToken('https://utilities-sandbox.reloadly.com');
  const billersRes = await fetch('https://utilities-sandbox.reloadly.com/billers?countryISOCode=NG&size=10', {
    headers: { Authorization: `Bearer ${utilToken}`, Accept: 'application/com.reloadly.utilities-v1+json' },
  });
  console.log('Billers status:', billersRes.status);
  const billersText = await billersRes.text();
  console.log('Billers body (first 1500 chars):', billersText.slice(0, 1500));

  console.log('\n--- GIFT CARDS ---');
  const gcToken = await getToken('https://giftcards-sandbox.reloadly.com');
  const productsRes = await fetch('https://giftcards-sandbox.reloadly.com/products?size=5&countryCode=NG', {
    headers: { Authorization: `Bearer ${gcToken}`, Accept: 'application/com.reloadly.giftcards-v1+json' },
  });
  console.log('Products status:', productsRes.status);
  const productsText = await productsRes.text();
  console.log('Products body (first 2000 chars):', productsText.slice(0, 2000));
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
