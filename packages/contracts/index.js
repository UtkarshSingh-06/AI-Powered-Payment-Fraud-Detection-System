import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = join(__dirname, 'schemas');

function loadSchema(filename) {
  const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, filename), 'utf-8'));
  delete schema.$schema;
  return schema;
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validators = {
  scoringRequest: ajv.compile(loadSchema('scoring-request.schema.json')),
  scoringResponse: ajv.compile(loadSchema('scoring-response.schema.json')),
  transactionIngested: ajv.compile(loadSchema('event-transaction-ingested.schema.json')),
  fraudDecision: ajv.compile(loadSchema('event-fraud-decision.schema.json'))
};

function validate(validator, data, label) {
  const valid = validator(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  const errors = validator.errors?.map((e) => `${e.instancePath || '/'} ${e.message}`) || [];
  return { valid: false, errors: [`${label} validation failed`, ...errors] };
}

export function validateScoringRequest(data) {
  return validate(validators.scoringRequest, data, 'ScoringRequest');
}

export function validateScoringResponse(data) {
  return validate(validators.scoringResponse, data, 'ScoringResponse');
}

export function validateTransactionIngestedEvent(data) {
  return validate(validators.transactionIngested, data, 'TransactionIngestedEvent');
}

export function validateFraudDecisionEvent(data) {
  return validate(validators.fraudDecision, data, 'FraudDecisionEvent');
}

export { validators };
