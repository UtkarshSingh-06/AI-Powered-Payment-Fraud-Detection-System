/**
 * Render bootstrap: migrations + optional seed on first deploy.
 */
import { initializeDatabase } from '../config/database.js';
import { runEnterpriseMigrations } from '../config/migrations.js';
import { readData } from '../config/database.js';

async function main() {
  console.log('🚀 Render bootstrap starting...');
  await initializeDatabase();
  await runEnterpriseMigrations();

  if (process.env.SEED_ON_START !== 'true') {
    console.log('⏭️  SEED_ON_START not enabled');
    return;
  }

  const users = await readData('users.json');
  if (users.length > 0) {
    console.log('✅ Database already seeded');
    return;
  }

  console.log('🌱 Seeding demo data...');
  await import('./seedData.js');
}

main().catch((error) => {
  console.error('Bootstrap failed:', error);
  process.exit(1);
});
