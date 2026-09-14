import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { createWorker } from 'tesseract.js';

const PROJECT_ID = 'poshmedia-thehk';
const FUNCTION_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/aiReceiptPrototypeFn`;
const ENV_PATH = path.resolve('..', '..', '.env');
const IMAGE_PATH = path.resolve('C:\\Users\\Welcome Sir\\Desktop\\Projects\\The-HK\\Opay Receipt.jpeg');
const OUTPUT_DIR = path.resolve('output');

function readEnv() {
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const match = content.match(/EXPO_PUBLIC_FIREBASE_API_KEY=([^\r\n]+)/);
  if (!match) throw new Error('EXPO_PUBLIC_FIREBASE_API_KEY not found in .env');
  return match[1].trim();
}

const FIREBASE_API_KEY = readEnv();

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

const TEST_CASES = [
  {
    id: 'test-1',
    resolution: '1K',
    aspectRatio: '9:16',
    transaction: {
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
    },
  },
  {
    id: 'test-2',
    resolution: '2K',
    aspectRatio: '9:16',
    transaction: {
      bankName: 'OPay',
      transactionType: 'Payment',
      status: 'Successful',
      amount: '₦250,000.50',
      date: 'Aug 30th, 2026',
      time: '12:47:28',
      senderName: 'CHIDIEBERE OKONKWO',
      senderAccountNumber: '0000123456',
      receiverName: 'AMARACHI JOY EZE',
      receiverAccountNumber: '9999888877',
      reference: 'HK-REF-ALPHA-999888777',
    },
  },
  {
    id: 'test-3',
    resolution: '1K',
    aspectRatio: '9:16',
    transaction: {
      bankName: 'OPay',
      transactionType: 'Transfer',
      status: 'Successful',
      amount: '₦9,999.99',
      date: 'Dec 25th, 2025',
      time: '09:15:00',
      senderName: 'JOHN DOE SMITH',
      senderAccountNumber: '0011223344',
      receiverName: 'MARY JANE DOE',
      receiverAccountNumber: '5566778899',
      reference: 'HK-TRF-BETA-111222333444',
    },
  },
  {
    id: 'repeat-1',
    resolution: '1K',
    aspectRatio: '9:16',
    repeatOf: 'test-1',
    transaction: {
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
    },
  },
];

async function generateReceipt(idToken, testCase) {
  const start = Date.now();
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
        transaction: testCase.transaction,
        resolution: testCase.resolution,
        aspectRatio: testCase.aspectRatio,
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

  const fileName = `${testCase.id}-${testCase.resolution}.png`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  const buffer = Buffer.from(result.generatedImageBase64, 'base64');
  fs.writeFileSync(filePath, buffer);

  return {
    ...result,
    localFile: filePath,
    fileSizeBytes: buffer.length,
    roundTripMs: duration,
  };
}

function normalize(text) {
  return text.toUpperCase().replace(/\s+/g, ' ').trim();
}

function validate(ocrText, expected) {
  const ocrUpper = ocrText.toUpperCase();
  const results = [];

  for (const [key, value] of Object.entries(expected)) {
    if (!value) continue;
    const exact = ocrText.includes(value);
    const inexact = ocrUpper.includes(value.toUpperCase());
    const numeric = value.replace(/\D/g, '');
    const hasNumeric = numeric && ocrText.replace(/\D/g, '').includes(numeric);

    let status;
    if (exact) status = 'PASS';
    else if (inexact) status = 'ALTERED (case/spacing)';
    else if (hasNumeric) status = 'ALTERED (numeric digits present but not exact)';
    else status = 'NOT FOUND';

    results.push({
      field: key,
      expected: value,
      status,
      foundInOcr: exact ? value : (inexact ? value.toUpperCase() : (hasNumeric ? 'partial numeric' : '—')),
    });
  }

  return results;
}

async function main() {
  const idToken = await signIn();
  console.log('Authenticated.');

  const worker = await createWorker('eng');
  const allResults = [];

  for (const testCase of TEST_CASES) {
    console.log(`\nGenerating ${testCase.id} at ${testCase.resolution}...`);
    const generated = await generateReceipt(idToken, testCase);
    console.log(`  -> ${generated.localFile} (${generated.fileSizeBytes} bytes, ${generated.durationMs}ms model time, ${generated.roundTripMs}ms total)`);

    console.log(`  Running OCR...`);
    const ocrResult = await worker.recognize(generated.localFile);
    const ocrText = ocrResult.data.text;
    const ocrPath = path.join(OUTPUT_DIR, `${testCase.id}-ocr.txt`);
    fs.writeFileSync(ocrPath, ocrText);

    const validation = validate(ocrText, testCase.transaction);
    allResults.push({
      id: testCase.id,
      resolution: testCase.resolution,
      aspectRatio: generated.aspectRatio,
      model: generated.model,
      file: generated.localFile,
      fileSizeBytes: generated.fileSizeBytes,
      modelTimeMs: generated.durationMs,
      roundTripMs: generated.roundTripMs,
      ocr: ocrText,
      validation,
    });
  }

  await worker.terminate();

  const report = {
    model: 'gemini-3.1-flash-image',
    api: 'Gemini Developer API',
    project: PROJECT_ID,
    referenceImage: IMAGE_PATH,
    testedAt: new Date().toISOString(),
    results: allResults,
  };

  const reportPath = path.join(OUTPUT_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to ${reportPath}`);

  // Console summary
  for (const r of allResults) {
    console.log(`\n${r.id} (${r.resolution})`);
    for (const v of r.validation) {
      console.log(`  ${v.field.padEnd(22)} ${v.status}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
