import express from 'express';

const app = express();
const PORT = process.env.PORT || 5007;

const SANCTIONS_STUB = new Set(['blocked_merchant_1', 'blocked_user_99']);

app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'aml-service' }));

app.post('/screen', (req, res) => {
  const { merchantName, userId } = req.body;
  const hits = [];
  if (SANCTIONS_STUB.has(merchantName) || SANCTIONS_STUB.has(userId)) {
    hits.push({ list: 'OFAC_STUB', match: merchantName || userId });
  }
  res.json({
    status: hits.length ? 'match' : 'clear',
    hits,
    screenedAt: new Date().toISOString()
  });
});

app.listen(PORT, () => console.log(`AML service on :${PORT}`));
