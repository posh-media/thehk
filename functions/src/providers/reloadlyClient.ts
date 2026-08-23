// Shared OAuth2 client-credentials handling for Reloadly's products.
// Reloadly issues a separate access token per product ("audience") even
// though the auth endpoint itself is shared - see
// https://support.reloadly.com/locating-your-api-credentials. This class
// centralizes that so the Airtime/Data, Gift Card, and Utility providers
// don't each re-implement token fetch/caching.

const AUTH_URL = 'https://auth.reloadly.com/oauth/token';

export class ReloadlyClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private audience: string;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(clientId: string, clientSecret: string, baseUrl: string, audience: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl;
    this.audience = audience;
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  assertConfigured(providerLabel: string): void {
    if (!this.isConfigured()) {
      throw new Error(
        `${providerLabel} provider (Reloadly) is not configured. Set RELOADLY_CLIENT_ID and RELOADLY_CLIENT_SECRET in the Cloud Functions environment.`
      );
    }
  }

  private async getAccessToken(providerLabel: string): Promise<string> {
    this.assertConfigured(providerLabel);
    if (this.token && this.token.expiresAt > Date.now() + 30_000) {
      return this.token.value;
    }

    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        audience: this.audience,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Reloadly authentication failed for ${providerLabel} (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return this.token.value;
  }

  async request<T>(providerLabel: string, path: string, accept: string, init: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken(providerLabel);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: accept,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Reloadly ${providerLabel} API request failed (${response.status}): ${text}`);
    }
    return (await response.json()) as T;
  }
}
