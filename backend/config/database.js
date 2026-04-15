import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPostgresPool, runQuery } from './postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

const filenameToTable = {
  'users.json': { table: 'users', key: 'userId' },
  'transactions.json': { table: 'transactions', key: 'transactionId' },
  'fraudLogs.json': { table: 'fraud_logs', key: 'logId' },
  'recommendations.json': { table: 'recommendations', key: 'recommendationId' },
  'labels.json': { table: 'labels', key: 'labelId' },
  'modelVersions.json': { table: 'model_versions', key: 'modelVersionId' },
  'auditLogs.json': { table: 'audit_logs', key: 'auditId' }
};

async function initializeFileStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = Object.keys(filenameToTable);
  for (const file of files) {
    const filePath = join(DATA_DIR, file);
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify([], null, 2));
    }
  }
}

async function initializePostgres() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await runQuery(`
    CREATE TABLE IF NOT EXISTS transactions (
      transaction_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await runQuery(`
    CREATE TABLE IF NOT EXISTS fraud_logs (
      log_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await runQuery(`
    CREATE TABLE IF NOT EXISTS recommendations (
      recommendation_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await runQuery(`
    CREATE TABLE IF NOT EXISTS labels (
      label_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await runQuery(`
    CREATE TABLE IF NOT EXISTS model_versions (
      model_version_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await runQuery(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      audit_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

export async function initializeDatabase() {
  const pool = getPostgresPool();
  if (pool) {
    await initializePostgres();
    console.log('✅ PostgreSQL initialized');
    return;
  }

  await initializeFileStore();
  console.log('✅ File-based fallback datastore initialized');
}

export async function readData(filename) {
  const mapped = filenameToTable[filename];
  const pool = getPostgresPool();

  if (mapped && pool) {
    const rows = await runQuery(`SELECT payload FROM ${mapped.table} ORDER BY created_at DESC`);
    return rows.rows.map((row) => row.payload);
  }

  try {
    const filePath = join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function writeData(filename, data) {
  const mapped = filenameToTable[filename];
  const pool = getPostgresPool();

  if (mapped && pool) {
    await runQuery(`DELETE FROM ${mapped.table}`);
    for (const item of data) {
      const idValue = item[mapped.key] || item.id || crypto.randomUUID();
      await runQuery(
        `INSERT INTO ${mapped.table} (${camelToSnake(mapped.key)}, payload) VALUES ($1, $2)`,
        [idValue, item]
      );
    }
    return true;
  }

  const filePath = join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return true;
}

function camelToSnake(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export async function appendData(filename, item) {
  const mapped = filenameToTable[filename];
  const pool = getPostgresPool();

  if (mapped && pool) {
    const idColumn = camelToSnake(mapped.key);
    const idValue = item[mapped.key] || item.id || crypto.randomUUID();
    await runQuery(
      `INSERT INTO ${mapped.table} (${idColumn}, payload) VALUES ($1, $2)
       ON CONFLICT (${idColumn}) DO UPDATE SET payload = EXCLUDED.payload`,
      [idValue, item]
    );
    return true;
  }

  const existing = await readData(filename);
  existing.push(item);
  return writeData(filename, existing);
}
