import * as functions from 'firebase-functions';
import { GoogleGenAI, Modality } from '@google/genai';
import { buildReceiptPrompt, PrototypeTransactionData } from './aiReceiptPrompt';

const REGION = 'us-central1';
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'poshmedia-thehk';

function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  return context.auth.uid;
}

function requireEnvString(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export interface AiReceiptPrototypeRequest {
  referenceImageBase64: string;
  referenceMimeType?: string;
  transaction: PrototypeTransactionData;
  resolution?: '512' | '1K' | '2K' | '4K';
  aspectRatio?: string;
}

export interface AiReceiptPrototypeResponse {
  generatedImageBase64: string;
  mimeType: string;
  model: string;
  resolution: string;
  aspectRatio: string;
  durationMs: number;
  prompt: string;
}

export async function generateAiReceipt(input: AiReceiptPrototypeRequest): Promise<AiReceiptPrototypeResponse> {
  const start = Date.now();
  const referenceMimeType = input.referenceMimeType || 'image/jpeg';
  const resolution = input.resolution || '1K';
  const aspectRatio = input.aspectRatio || '9:16';

  if (!input.referenceImageBase64) throw new Error('referenceImageBase64 is required');
  if (!input.transaction) throw new Error('transaction is required');

  // Strip a base64 data URL prefix if present so the SDK receives raw base64.
  const rawBase64 = input.referenceImageBase64.replace(/^data:[^;]+;base64,/, '');

  const ai = new GoogleGenAI({
    vertexai: true,
    project: requireEnvString('GOOGLE_CLOUD_PROJECT'),
    location: requireEnvString('GOOGLE_CLOUD_LOCATION'),
  });

  const prompt = buildReceiptPrompt(input.transaction);
  const model = 'gemini-3.1-flash-image';

  const response = await ai.models.generateContent({
    model,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      imageConfig: {
        imageSize: resolution,
        aspectRatio,
      },
    },
    contents: [
      { text: prompt },
      { inlineData: { data: rawBase64, mimeType: referenceMimeType } },
    ],
  });

  const candidate = response.candidates?.[0];
  if (!candidate) throw new Error('No generation candidates returned');

  const imagePart = candidate.content?.parts?.find((part) => part.inlineData);
  const textPart = candidate.content?.parts?.find((part) => part.text);

  if (!imagePart?.inlineData?.data) {
    const errorText = textPart?.text || 'No image returned in the model response';
    throw new Error(`Image generation failed: ${errorText}`);
  }

  return {
    generatedImageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
    model,
    resolution,
    aspectRatio,
    durationMs: Date.now() - start,
    prompt,
  };
}

export const aiReceiptPrototypeFn = functions
  .region(REGION)
  .runWith({ memory: '1GB', timeoutSeconds: 120 })
  .https.onCall(async (data: unknown, context: functions.https.CallableContext) => {
    const uid = requireAuth(context);
    try {
      const result = await generateAiReceipt(data as AiReceiptPrototypeRequest);
      // Log prototype usage for later analysis; no user action needed.
      console.log(`[ai-receipt-prototype] uid=${uid} duration=${result.durationMs}ms model=${result.model} resolution=${result.resolution}`);
      return result;
    } catch (err) {
      console.error('[ai-receipt-prototype] error:', err);
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });
