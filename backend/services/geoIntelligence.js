const HIGH_RISK_COUNTRIES = new Set(['NG', 'PK', 'RU', 'CN', 'Unknown']);

const COUNTRY_ALIASES = {
  india: 'IN',
  in: 'IN',
  usa: 'US',
  us: 'US',
  'united states': 'US',
  uk: 'GB',
  unknown: 'Unknown'
};

function normalizeCountry(country = '') {
  const key = String(country).trim().toLowerCase();
  if (key.length === 2) {
    return key.toUpperCase();
  }
  return COUNTRY_ALIASES[key] || country.slice(0, 2).toUpperCase() || 'Unknown';
}

function inferCountryFromIp(ipAddress = '') {
  if (!ipAddress || ipAddress.startsWith('127.') || ipAddress === '::1') {
    return 'IN';
  }
  const lastOctet = Number(ipAddress.split('.').pop() || 0);
  if (lastOctet % 5 === 0) return 'US';
  if (lastOctet % 7 === 0) return 'GB';
  return 'IN';
}

export function enrichGeoIntelligence({ ipAddress, country, location }) {
  const resolvedCountry = country
    ? normalizeCountry(country)
    : inferCountryFromIp(ipAddress);

  const riskLevel = HIGH_RISK_COUNTRIES.has(resolvedCountry) ? 'high' : 'low';
  const velocityRegion = resolvedCountry === 'Unknown' ? 'global_unknown' : `region_${resolvedCountry}`;

  return {
    country: resolvedCountry,
    location: location || resolvedCountry,
    ipAddress: ipAddress || null,
    riskLevel,
    velocityRegion,
    asn: `AS${Math.abs(hashCode(ipAddress || 'local')) % 90000 + 10000}`
  };
}

function hashCode(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
