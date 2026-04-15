import dotenv from 'dotenv';
import { initializeDatabase, readData, appendData } from '../config/database.js';

dotenv.config();

async function runMigration() {
  await initializeDatabase();

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
