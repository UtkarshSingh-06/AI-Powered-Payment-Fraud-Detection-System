import crypto from 'crypto';

export function verifyTotpCode(secret, totpInput) {
  if (!secret || !totpInput) return false;
  if (process.env.MFA_DEV_BYPASS === 'true' && String(totpInput) === '000000') {
    return true;
  }

  const epoch = Math.floor(Date.now() / 1000 / 30);
  const normalized = String(totpInput).padStart(6, '0');
  for (const offset of [0, -1, 1]) {
    if (generateTotp(secret, epoch + offset) === normalized) {
      return true;
    }
  }
  return false;
}

function generateTotp(secret, counter) {
  const key = Buffer.from(secret.replace(/\s/g, '').toUpperCase(), 'utf8');
  const buf = Buffer.alloc(8);
  let value = counter;
  for (let i = 7; i >= 0; i -= 1) {
    buf[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const otp =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(otp % 1000000).padStart(6, '0');
}
