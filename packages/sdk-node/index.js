export class FraudShieldClient {
  constructor({ baseUrl, apiKey, tenantId }) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.tenantId = tenantId || 'default';
  }

  headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'x-tenant-id': this.tenantId,
      ...extra
    };
  }

  async ingestTransaction(transaction, { sync = false } = {}) {
    const url = `${this.baseUrl}/api/ingest/ingest${sync ? '?sync=true' : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(transaction)
    });
    return response.json();
  }

  async scoreTransaction(payload) {
    const response = await fetch(`${this.baseUrl}/api/score/score`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
    return response.json();
  }
}
