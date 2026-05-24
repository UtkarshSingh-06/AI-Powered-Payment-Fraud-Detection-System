import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';

let wss = null;
const clientMeta = new WeakMap();

function parseTokenFromRequest(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const queryToken = url.searchParams.get('token');
    if (queryToken) return queryToken;
    const auth = req.headers.authorization || req.headers['sec-websocket-protocol'];
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7);
    }
  } catch {
    return null;
  }
  return null;
}

function verifyWsToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret || !token) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

export function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const token = parseTokenFromRequest(req);
    const user = verifyWsToken(token);

    if (process.env.WS_REQUIRE_AUTH === 'true' && !user) {
      ws.close(4401, 'Unauthorized');
      return;
    }

    clientMeta.set(ws, {
      userId: user?.userId,
      role: user?.role || 'anonymous',
      tenantId: user?.tenantId || req.headers['x-tenant-id'] || 'default'
    });

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error.message);
      }
    });

    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'WebSocket connected',
        authenticated: Boolean(user)
      })
    );
  });

  console.log('✅ WebSocket server initialized at /ws');
}

function canReceiveTransaction(meta, transaction) {
  if (!meta) return false;
  if (meta.role === 'admin' || meta.role === 'analyst') {
    if (meta.tenantId && meta.tenantId !== 'default' && transaction.tenantId !== meta.tenantId) {
      return false;
    }
    return true;
  }
  if (meta.role === 'anonymous' && process.env.WS_REQUIRE_AUTH !== 'true') {
    return true;
  }
  return transaction.userId === meta.userId;
}

function broadcastToClients(message, transaction) {
  if (!wss) return;
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState !== 1) return;
    const meta = clientMeta.get(client);
    if (transaction && !canReceiveTransaction(meta, transaction)) return;
    client.send(payload);
  });
}

export function broadcastTransaction(transaction) {
  const envelope = { type: 'transaction_update', data: transaction };
  broadcastToClients(envelope, transaction);
  broadcastToClients({ type: 'new_transaction', data: transaction }, transaction);
}

export function broadcastFraudAlert(transaction) {
  if (
    transaction.fraudStatus?.classification === 'Fraudulent' ||
    transaction.fraudStatus?.classification === 'Suspicious' ||
    transaction.status === 'blocked' ||
    transaction.status === 'flagged'
  ) {
    broadcastToClients({ type: 'fraud_alert', data: transaction }, transaction);
  }
}
