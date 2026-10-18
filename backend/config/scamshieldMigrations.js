/**
 * Versioned, rerunnable ScamShield migrations.
 * Tracks applied migrations in schema_migrations; supports down() for tests.
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getPostgresPool, runQuery } from './postgres.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

async function ensureMigrationsTable() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function listApplied() {
  const res = await runQuery(`SELECT id FROM schema_migrations ORDER BY id`);
  return new Set(res.rows.map((r) => r.id));
}

async function listMigrationFiles() {
  const entries = await fs.readdir(MIGRATIONS_DIR);
  return entries
    .filter((f) => /^\d+_.*\.sql$/.test(f) && !f.endsWith('.down.sql'))
    .sort();
}

function migrationIdFromFile(filename) {
  return filename.replace(/\.sql$/, '');
}

/**
 * Apply pending migrations transactionally (one migration per transaction).
 */
export async function runScamShieldMigrations() {
  if (!getPostgresPool()) {
    return { applied: [], skipped: true, reason: 'no_postgres' };
  }

  await ensureMigrationsTable();
  const applied = await listApplied();
  const files = await listMigrationFiles();
  const newlyApplied = [];

  for (const file of files) {
    const id = migrationIdFromFile(file);
    if (applied.has(id)) continue;

    const sql = await fs.readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING`, [
        id
      ]);
      await client.query('COMMIT');
      newlyApplied.push(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  if (newlyApplied.length) {
    console.log(`✅ ScamShield migrations applied: ${newlyApplied.join(', ')}`);
  }
  return { applied: newlyApplied, skipped: false };
}

/**
 * Roll back a single migration by id (e.g. 001_scamshield_schema).
 */
export async function rollbackScamShieldMigration(migrationId) {
  if (!getPostgresPool()) {
    return { rolledBack: false, reason: 'no_postgres' };
  }
  const downFile = `${migrationId}.down.sql`;
  const path = join(MIGRATIONS_DIR, downFile);
  let sql;
  try {
    sql = await fs.readFile(path, 'utf-8');
  } catch {
    throw new Error(`No down migration for ${migrationId}`);
  }

  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return { rolledBack: true, migrationId };
}
