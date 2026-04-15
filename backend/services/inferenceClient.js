const DEFAULT_TIMEOUT_MS = Number(process.env.INFERENCE_TIMEOUT_MS || 40);

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export async function scoreTransaction(payload) {
  const inferenceUrl = process.env.INFERENCE_URL;
  if (!inferenceUrl) {
    return null;
  }

  try {
    const response = await fetch(`${inferenceUrl}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: timeoutSignal(DEFAULT_TIMEOUT_MS)
    });

    if (!response.ok) {
      throw new Error(`Inference responded with ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Inference request failed:', error.message);
    return null;
  }
}
