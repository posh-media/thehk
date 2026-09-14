import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const PROJECT_ID = 'poshmedia-thehk';
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/aiReceiptPrototypeFn`;
const ENV_PATH = path.resolve('..', '..', '.env');
const IMAGE_PATH = path.resolve('C:\\Users\\Welcome Sir\\Desktop\\Projects\\The-HK\\Opay Receipt.jpeg');
const OUTPUT_DIR = path.resolve('output');

function readFirebaseApiKey() {
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const match = content.match(/EXPO_PUBLIC_FIREBASE_API_KEY=([^\r\n]+)/);
  if (!match) throw new Error('EXPO_PUBLIC_FIREBASE_API_KEY not found in .env');
  return match[1].trim();
}

const FIREBASE_API_KEY = readFirebaseApiKey();

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function signIn() {
  const email = 'test+aireceipt@posh.media';
  const password = 'Prototype123!';

  let res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
    timeout: 60000,
  });

  if (!res.ok) {
    res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      timeout: 60000,
    });
  }

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firebase Auth failed: ${err}`);
  }

  const json = await res.json();
  return json.idToken;
}

const referenceImageBase64 = fs.readFileSync(IMAGE_PATH).toString('base64');

const transaction = {
  bankName: 'OPay',
  transactionType: 'Transfer',
  status: 'Successful',
  amount: '₦1,000,000.00',
  date: 'Sep 13th, 2026',
  time: '14:30:05',
  senderName: 'OLUWASEUN PRAISE AKINROLABU',
  senderAccountNumber: '0123456789',
  receiverName: 'AYOMIDE COLLINS AKINBANI',
  receiverAccountNumber: '9876543210',
  reference: 'HK-PAY-TEST-000123456789',
};

async function main() {
  const idToken = await signIn();
  console.log('Authenticated. Calling aiReceiptPrototypeFn with gemini-3.1-flash-image...');

  const start = Date.now();
  console.log('Sending request...');
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      data: {
        referenceImageBase64,
        referenceMimeType: 'image/jpeg',
        transaction,
        resolution: '1K',
        aspectRatio: '9:16',
      },
    }),
    timeout: 300000,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Function call failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  const result = json.result;
  const duration = Date.now() - start;

  const fileName = 'test-access-1K.png';
  const filePath = path.join(OUTPUT_DIR, fileName);
  const buffer = Buffer.from(result.generatedImageBase64, 'base64');
  fs.writeFileSync(filePath, buffer);

  console.log('Success.');
  console.log(`  file: ${filePath}`);
  console.log(`  size: ${buffer.length} bytes`);
  console.log(`  model: ${result.model}`);
  console.log(`  resolution: ${result.resolution}`);
  console.log(`  aspectRatio: ${result.aspectRatio}`);
  console.log(`  modelTimeMs: ${result.durationMs}`);
  console.log(`  roundTripMs: ${duration}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
