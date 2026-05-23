export function collectClientFingerprint() {
  return {
    screenResolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: typeof navigator !== 'undefined' ? navigator.platform : null,
    trustScore: 0.5
  };
}
