import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, readData, appendData } from '../config/database.js';
import { getPostgresPool } from '../config/postgres.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runEnterpriseSchema() {
  const pool = getPostgresPool();
  if (!pool) {
    return;
  }
  const sql = readFileSync(join(__dirname, 'enterprise-schema.sql'), 'utf-8');
  await pool.query(sql);
  console.log('Enterprise schema applied.');
}

async function runMigration() {
  await initializeDatabase();
  await runEnterpriseSchema();

  // Data copy utility for file-store -> postgres execution.
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set, skipping migration copy.');
    return;
  }

  const files = ['users.json', 'transactions.json', 'fraudLogs.json', 'recommendations.json'];
  for (const filename of files) {
    const items = await readData(filename);
    for (const item of items) {
      await appendData(filename, item);
    }
    console.log(`Migrated ${items.length} records from ${filename}`);
  }
}

runMigration()
  .then(() => {
    console.log('Migration complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
