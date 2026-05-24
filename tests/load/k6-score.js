import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.API_URL || 'http://localhost:5000';
const TOKEN = __ENV.JWT_TOKEN || '';

export const options = {
  vus: Number(__ENV.K6_VUS || 10),
  duration: __ENV.K6_DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500']
  }
};

export default function () {
  const payload = JSON.stringify({
    amount: 120 + Math.random() * 500,
    merchantName: 'Load Test Merchant',
    merchantCategory: 'Retail',
    paymentMethod: 'Credit Card',
    location: 'Mumbai',
    country: 'IN'
  });

  const headers = {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
  };

  const res = http.post(`${BASE_URL}/api/transactions`, payload, { headers });
  check(res, {
    'status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'p95 under 500ms': (r) => r.timings.duration < 500
  });
  sleep(0.2);
}
