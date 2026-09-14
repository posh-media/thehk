import fs from 'fs';
import path from 'path';
import { createWorker } from 'tesseract.js';

const OUTPUT_DIR = path.resolve('output');

async function main() {
  const worker = await createWorker('eng');
  const files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png'));

  for (const file of files.sort()) {
    const filePath = path.join(OUTPUT_DIR, file);
    const result = await worker.recognize(filePath);
    const ocrPath = path.join(OUTPUT_DIR, file.replace('.png', '-ocr.txt'));
    fs.writeFileSync(ocrPath, result.data.text);
    console.log(`OCR ${file} -> ${ocrPath}`);
  }

  await worker.terminate();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
