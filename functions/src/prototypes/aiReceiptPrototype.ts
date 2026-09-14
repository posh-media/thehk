import * as functions from 'firebase-functions';
import { buildReceiptPrompt, PrototypeTransactionData } from './aiReceiptPrompt';

const REGION = 'us-central1';

function requireAuth(context: functions.https.CallableContext): string {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  return context.auth.uid;
}

function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim();
}

function getRequiredEnv(name: string): string {
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
  api: string;
  resolution: string;
  aspectRatio: string;
  durationMs: number;
  prompt: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: { mimeType?: string; data?: string };
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message: string; code: number; status: string };
}

async function callGeminiDeveloperApi(
  apiKey: string,
  requestBody: unknown
): Promise<GeminiGenerateResponse> {
  const fetch = (globalThis as any).fetch;
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const json = (await res.json()) as GeminiGenerateResponse;

    if (!res.ok) {
      const message = json.error?.message || `Gemini API returned ${res.status}`;
      const err = new Error(`Gemini API error ${res.status}: ${message}`);
      (err as any).status = res.status;
      (err as any).isAuthError = res.status === 401 || message.includes('UNAUTHENTICATED') || message.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED');
      throw err;
    }

    return json;
  } finally {
    clearTimeout(timeout);
  }
}

async function callVertexAiApi(requestBody: unknown): Promise<GeminiGenerateResponse> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const location = getRequiredEnv('GOOGLE_CLOUD_LOCATION');

  const { GoogleGenAI, Modality } = await import('@google/genai');
  const ai = new GoogleGenAI({ vertexai: true, project: projectId, location });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
      // Cast config loosely because the SDK's typed union can reject unknown fields at discovery.
      ...(requestBody as any).generationConfig,
    },
    contents: (requestBody as any).contents,
  });

  const candidate = response.candidates?.[0];
  if (!candidate) return { candidates: [] };

  return {
    candidates: [
      {
        content: {
          parts: candidate.content?.parts?.map((part: any) => ({
            text: part.text,
            inlineData: part.inlineData,
          })) || [],
        },
        finishReason: candidate.finishReason,
      },
    ],
  };
}

function extractImageFromResponse(response: GeminiGenerateResponse): {
  generatedImageBase64: string;
  mimeType: string;
  text?: string;
} {
  const candidate = response.candidates?.[0];
  if (!candidate) throw new Error('No generation candidates returned');
  if (candidate.finishReason && candidate.finishReason !== 'STOP') {
    throw new Error(`Generation stopped: ${candidate.finishReason}`);
  }

  const imagePart = candidate.content?.parts?.find((part) => part.inlineData?.data);
  const textPart = candidate.content?.parts?.find((part) => part.text);

  if (!imagePart?.inlineData?.data) {
    const errorText = textPart?.text || 'No image returned in the model response';
    throw new Error(`Image generation failed: ${errorText}`);
  }

  return {
    generatedImageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
    text: textPart?.text,
  };
}

export async function generateAiReceipt(input: AiReceiptPrototypeRequest): Promise<AiReceiptPrototypeResponse> {
  const start = Date.now();
  const referenceMimeType = input.referenceMimeType || 'image/jpeg';
  const resolution = input.resolution || '1K';
  const aspectRatio = input.aspectRatio || '9:16';

  if (!input.referenceImageBase64) throw new Error('referenceImageBase64 is required');
  if (!input.transaction) throw new Error('transaction is required');

  const rawBase64 = input.referenceImageBase64.replace(/^data:[^;]+;base64,/, '');
  const prompt = buildReceiptPrompt(input.transaction);

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: referenceMimeType, data: rawBase64 } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        imageSize: resolution,
        aspectRatio,
      },
    },
  };

  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const response = await callGeminiDeveloperApi(apiKey, requestBody);
      const image = extractImageFromResponse(response);
      return {
        generatedImageBase64: image.generatedImageBase64,
        mimeType: image.mimeType,
        model: 'gemini-3.1-flash-image',
        api: 'Gemini Developer API',
        resolution,
        aspectRatio,
        durationMs: Date.now() - start,
        prompt,
      };
    } catch (err: any) {
      if (err.isAuthError) {
        console.warn('[ai-receipt-prototype] Gemini Developer API key rejected; falling back to Vertex AI');
      } else {
        throw err;
      }
    }
  }

  // Fallback: Vertex AI with the generally available image model.
  const response = await callVertexAiApi(requestBody);
  const image = extractImageFromResponse(response);
  return {
    generatedImageBase64: image.generatedImageBase64,
    mimeType: image.mimeType,
    model: 'gemini-2.5-flash-image',
    api: 'Vertex AI',
    resolution,
    aspectRatio,
    durationMs: Date.now() - start,
    prompt,
  };
}

export const aiReceiptPrototypeFn = functions
  .region(REGION)
  .runWith({
    memory: '1GB',
    timeoutSeconds: 300,
    secrets: ['GEMINI_API_KEY'],
  })
  .https.onCall(async (data: unknown, context: functions.https.CallableContext) => {
    const uid = requireAuth(context);
    try {
      const result = await generateAiReceipt(data as AiReceiptPrototypeRequest);
      const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'unknown';
      console.log(`[ai-receipt-prototype] uid=${uid} project=${projectId} api=${result.api} model=${result.model} duration=${result.durationMs}ms resolution=${result.resolution}`);
      return result;
    } catch (err) {
      console.error('[ai-receipt-prototype] error:', err);
      throw new functions.https.HttpsError('failed-precondition', (err as Error).message);
    }
  });
