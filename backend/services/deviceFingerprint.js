import crypto from 'crypto';

export function buildDeviceFingerprint({
  userAgent = '',
  deviceId,
  clientFingerprint = {},
  ipAddress = ''
}) {
  const components = [
    userAgent,
    deviceId || '',
    clientFingerprint.screenResolution || '',
    clientFingerprint.timezone || '',
    clientFingerprint.platform || '',
    ipAddress
  ].join('|');

  const hash = crypto.createHash('sha256').update(components).digest('hex').slice(0, 32);

  return {
    deviceId: deviceId || `fp_${hash.slice(0, 12)}`,
    fingerprintHash: hash,
    userAgent,
    screenResolution: clientFingerprint.screenResolution || null,
    timezone: clientFingerprint.timezone || null,
    platform: clientFingerprint.platform || null,
    trustScore: clientFingerprint.trustScore ?? 0.5
  };
}
