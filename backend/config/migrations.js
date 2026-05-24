import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPostgresPool, runQuery } from './postgres.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, '..', 'scripts', 'enterprise-schema.sql');

export async function runEnterpriseMigrations() {
  if (!getPostgresPool()) {
    return;
  }
  try {
    const sql = await fs.readFile(SCHEMA_PATH, 'utf-8');
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length && !s.startsWith('--'));

    for (const statement of statements) {
      await runQuery(statement);
    }
    console.log('✅ Enterprise schema migrations applied');
  } catch (error) {
    console.warn('Enterprise schema migration skipped:', error.message);
  }
}
