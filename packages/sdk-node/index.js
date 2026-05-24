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

  /** Async ingest via Kafka (202) or sync score via backend when sync=true */
  async ingestTransaction(transaction, { sync = false } = {}) {
    const url = `${this.baseUrl}/api/ingest/ingest${sync ? '?sync=true' : ''}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(transaction)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Ingest failed (${response.status})`);
    }
    return response.json();
  }

  /** Direct ML + rules scoring through scoring-service */
  async scoreTransaction(payload) {
    const response = await fetch(`${this.baseUrl}/api/score/score`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Score failed (${response.status})`);
    }
    return response.json();
  }

  async screenAml(payload) {
    const response = await fetch(`${this.baseUrl}/api/aml/screen`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
    return response.json();
  }

  async notify(channel, payload) {
    const response = await fetch(`${this.baseUrl}/api/notify/notify`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ channel, payload })
    });
    return response.json();
  }
}
