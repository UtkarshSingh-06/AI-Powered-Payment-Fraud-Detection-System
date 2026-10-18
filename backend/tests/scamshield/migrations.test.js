import { describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  runScamShieldMigrations,
  rollbackScamShieldMigration
} from '../../config/scamshieldMigrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../migrations');

describe('ScamShield migrations', () => {
  it('ships matching up/down SQL without destructive whole-table rewrites', async () => {
    const up = await fs.readFile(join(MIGRATIONS_DIR, '001_scamshield_schema.sql'), 'utf-8');
    const down = await fs.readFile(join(MIGRATIONS_DIR, '001_scamshield_schema.down.sql'), 'utf-8');

    expect(up).toMatch(/CREATE TABLE IF NOT EXISTS threat_indicators/);
    expect(up).toMatch(/CREATE TABLE IF NOT EXISTS source_observations/);
    expect(up).toMatch(/CREATE TABLE IF NOT EXISTS indicator_relationships/);
    expect(up).toMatch(/schema_migrations/);
    expect(up).not.toMatch(/TRUNCATE\s+threat_indicators/i);
    expect(up).not.toMatch(/DROP TABLE IF EXISTS users/i);

    expect(down).toMatch(/DROP TABLE IF EXISTS threat_indicators/);
    expect(down).toMatch(/DELETE FROM schema_migrations WHERE id = '001_scamshield_schema'/);
  });

  it('skips apply/rollback gracefully without Postgres', async () => {
    const applied = await runScamShieldMigrations();
    expect(applied.skipped).toBe(true);

    const rolled = await rollbackScamShieldMigration('001_scamshield_schema');
    expect(rolled.rolledBack).toBe(false);
    expect(rolled.reason).toBe('no_postgres');
  });
});
