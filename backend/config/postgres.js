import pg from 'pg';

const { Pool } = pg;

let pool;

export function getPostgresPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
}

export async function runQuery(text, params = []) {
  const pgPool = getPostgresPool();
  if (!pgPool) {
    throw new Error('DATABASE_URL is not configured');
  }
  return pgPool.query(text, params);
}
