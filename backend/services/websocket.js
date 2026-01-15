import { WebSocketServer } from 'ws';

let wss = null;

/**
 * Setup WebSocket server for real-time updates
 */
export function setupWebSocket(server, app) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection');
    
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        console.log('📨 WebSocket message received:', data);
        
        // Handle different message types
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connected successfully'
    }));
  });
  
  console.log('✅ WebSocket server initialized at /ws');
}

/**
 * Broadcast message to all connected clients
 */
export function broadcastMessage(message) {
  if (!wss) return;
  
  const messageStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(messageStr);
    }
  });
}

/**
 * Broadcast new transaction event
 */
export function broadcastTransaction(transaction) {
  broadcastMessage({
    type: 'new_transaction',
    data: transaction
  });
}

/**
 * Broadcast fraud alert
 */
export function broadcastFraudAlert(transaction) {
  if (transaction.fraudStatus?.classification === 'Fraudulent' || 
      transaction.fraudStatus?.classification === 'Suspicious') {
    broadcastMessage({
      type: 'fraud_alert',
      data: transaction
    });
  }
}
