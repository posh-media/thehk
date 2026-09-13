export interface PrototypeTransactionData {
  bankName: string;
  senderName: string;
  senderAccountNumber: string;
  receiverName: string;
  receiverAccountNumber: string;
  amount: string;
  date: string;
  time: string;
  reference: string;
  transactionType?: string;
  status?: string;
}

export function buildReceiptPrompt(data: PrototypeTransactionData): string {
  const txnType = data.transactionType || 'Transfer';
  const status = data.status || 'Successful';

  return `You are a high-fidelity financial receipt generator. I will give you a reference receipt image and an exact set of transaction fields. Your job is to generate a new receipt image that copies the visual style, layout, colors, typography, spacing, alignment, visual hierarchy, background, borders, card/container structure, logo placement, icon placement, and overall visual character of the reference image, but inserts the transaction fields I provide exactly as written.

The generated receipt must be a finished, authentic-looking image. Do not include any explanation, caption, watermark, promotional text that is not in the provided data, or any AI-generated commentary.

REFERENCE IMAGE PURPOSE:
- Use the reference image only to understand the overall layout, dimensions, typography style, spacing, alignment, visual hierarchy, colors, background, borders, card/container structure, logo placement, icon placement, and visual style.
- Do NOT copy the transaction numbers, names, amounts, account numbers, dates, times, references, or statuses from the reference image.

TRANSACTION INFORMATION (THIS IS AUTHORITATIVE - DO NOT INVENT OR ALTER):
- Bank / Receipt title: "${data.bankName}"
- Transaction type: "${txnType}"
- Status: "${status}"
- Amount: "${data.amount}"
- Date: "${data.date}"
- Time: "${data.time}"
- Sender name: "${data.senderName}"
- Sender account number: "${data.senderAccountNumber}"
- Receiver name: "${data.receiverName}"
- Receiver account number: "${data.receiverAccountNumber}"
- Transaction reference: "${data.reference}"

STRICT RULES:
1. Reproduce the visual structure of the supplied reference receipt.
2. Treat the supplied transaction data as authoritative and exact.
3. NEVER invent, alter, shorten, merge, or rearrange transaction information.
4. NEVER alter numbers, account numbers, references, amounts, names, dates, or times.
5. NEVER replace ₦ with another currency symbol.
6. NEVER omit any required transaction field.
7. Preserve the exact spelling, character sequence, leading zeroes, decimal places, and comma formatting of the supplied values.
8. Do not add extra text, watermarks, promotional messages, explanations, or captions.
9. Do not redesign, modernize, or "improve" the receipt; keep it as close to the reference style as possible.
10. The result must look like a finished authentic receipt image.

TRANSACTION INFORMATION ALWAYS TAKES PRECEDENCE OVER THE REFERENCE IMAGE.

Generate the receipt image now.`;
}
