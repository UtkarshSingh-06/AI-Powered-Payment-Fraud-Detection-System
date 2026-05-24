const AML_SERVICE_URL = process.env.AML_SERVICE_URL || 'http://localhost:5007';

export async function screenTransactionAml({ merchantName, userId, tenantId }) {
  try {
    const response = await fetch(`${AML_SERVICE_URL}/screen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId || 'default'
      },
      body: JSON.stringify({ merchantName, userId, tenantId })
    });
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.warn('AML screening unavailable:', error.message);
  }
  return { status: 'clear', hits: [], screenedAt: new Date().toISOString(), fallback: true };
}
