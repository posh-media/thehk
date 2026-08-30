import * as crypto from 'crypto';

// Lightweight JWT-authenticated HTTP client for VTU.ng API v2.
// The API uses a single active JWT token, so this client fetches/caches a
// token in memory and refreshes it on 403. Token is per Cloud Function
// instance - concurrent instances may invalidate each other, so any
// authenticated request that receives 403 is retried once after a fresh
// token is obtained.

export class VtungClient {
  name = 'vtung';
  private username: string;
  private password: string;
  private apiBaseUrl: string;
  private authUrl: string;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(username: string, password: string, apiBaseUrl: string) {
    this.username = username;
    this.password = password;
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
    const rootUrl = this.apiBaseUrl.replace(/\/api\/v2\/?$/, '');
    this.authUrl = `${rootUrl}/jwt-auth/v1/token`;
  }

  isConfigured(): boolean {
    return Boolean(this.username && this.password);
  }

  private async fetchToken(): Promise<string> {
    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`VTU.ng authentication failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { token: string; expires_in?: number };
    const ttl = (data.expires_in ?? 7 * 24 * 60 * 60) * 1000;
    this.token = { value: data.token, expiresAt: Date.now() + ttl };
    return this.token.value;
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    return this.fetchToken();
  }

  private async makeRequest<T>(path: string, init: RequestInit, skipAuth: boolean): Promise<unknown> {
    const isPublic = skipAuth || path.startsWith('/variations/');
    const token = isPublic ? undefined : await this.getToken();
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    const body = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = { code: 'parse_error', message: body };
    }

    if (!response.ok) {
      const message = parsed?.message || body || `HTTP ${response.status}`;
      const error: any = new Error(`VTU.ng ${path} failed (${response.status}): ${message}`);
      error.status = response.status;
      error.code = parsed?.code;
      throw error;
    }

    return parsed as T;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const isPublic = path.startsWith('/variations/');
    try {
      return (await this.makeRequest<T>(path, init, isPublic)) as T;
    } catch (err: any) {
      if (!isPublic && err.status === 403) {
        this.token = null;
        return (await this.makeRequest<T>(path, init, isPublic)) as T;
      }
      throw err;
    }
  }
}

export function verifyVtungPayload(rawPayload: string, signature: string, userPin: string): boolean {
  const computed = crypto.createHmac('sha256', userPin).update(rawPayload, 'utf8').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}
