import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServiceAuthMiddleware } from '@fraudshield/platform-auth';

const app = express();
const PORT = process.env.PORT || 5007;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireAuth = createServiceAuthMiddleware();

const DEFAULT_SANCTIONS = [
  'blocked_merchant_1',
  'blocked_user_99',
  'sanctioned_entity_alpha',
  'terror_finance_co'
];

function loadSanctionsList() {
  const filePath = process.env.SANCTIONS_LIST_PATH || path.join(__dirname, 'data', 'sanctions.txt');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw.split('\n').map((line) => line.trim().toLowerCase()).filter(Boolean);
  } catch {
    return DEFAULT_SANCTIONS;
  }
}

const sanctions = new Set(loadSanctionsList());

async function vendorScreen(payload) {
  const vendorUrl = process.env.AML_VENDOR_URL;
  if (!vendorUrl) return null;
  try {
    const response = await fetch(vendorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: process.env.AML_VENDOR_API_KEY ? `Bearer ${process.env.AML_VENDOR_API_KEY}` : undefined
      },
      body: JSON.stringify(payload)
    });
    if (response.ok) return response.json();
  } catch {
    return null;
  }
  return null;
}

function fuzzyMatch(value) {
  if (!value) return [];
  const normalized = String(value).toLowerCase();
  const hits = [];
  for (const entry of sanctions) {
    if (normalized.includes(entry) || entry.includes(normalized)) {
      hits.push({ list: 'INTERNAL_SANCTIONS', match: entry, confidence: 0.92 });
    }
  }
  return hits;
}

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'aml-service', listSize: sanctions.size }));

app.post('/screen', requireAuth, async (req, res) => {
  const { merchantName, userId, beneficiaryName, country } = req.body;
  const tenantId = req.headers['x-tenant-id'] || req.body.tenantId || 'default';

  const vendorResult = await vendorScreen({ merchantName, userId, beneficiaryName, country, tenantId });
  if (vendorResult) {
    return res.json({ tenantId, ...vendorResult, provider: process.env.AML_PROVIDER || 'vendor' });
  }

  const hits = [...fuzzyMatch(merchantName), ...fuzzyMatch(userId), ...fuzzyMatch(beneficiaryName)];
  if (country && ['KP', 'IR', 'SY'].includes(String(country).toUpperCase())) {
    hits.push({ list: 'HIGH_RISK_JURISDICTION', match: country, confidence: 0.88 });
  }

  const unique = hits.filter((hit, index, arr) => arr.findIndex((h) => h.match === hit.match) === index);

  res.json({
    tenantId,
    status: unique.length ? 'match' : 'clear',
    hits: unique,
    screenedAt: new Date().toISOString(),
    provider: process.env.AML_PROVIDER || 'internal'
  });
});

app.listen(PORT, () => console.log(`AML service on :${PORT}`));
