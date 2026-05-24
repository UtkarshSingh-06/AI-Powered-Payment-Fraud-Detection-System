export const FEATURE_NAMES = [
  'amount',
  'velocity_5m',
  'velocity_1h',
  'amount_ratio',
  'device_known',
  'hour_of_day'
];

export const FEATURE_DESCRIPTIONS = {
  amount: 'Transaction amount',
  velocity_5m: 'Transactions in last 5 minutes',
  velocity_1h: 'Transactions in last hour',
  amount_ratio: 'Amount vs user average',
  device_known: 'Device seen before (1/0)',
  hour_of_day: 'Hour of transaction (0-23)'
};
