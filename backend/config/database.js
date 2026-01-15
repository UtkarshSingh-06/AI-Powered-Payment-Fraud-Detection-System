import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');

// Ensure data directory exists
export async function initializeDatabase() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const files = [
      'users.json',
      'transactions.json',
      'fraudLogs.json',
      'recommendations.json'
    ];
    
    for (const file of files) {
      const filePath = join(DATA_DIR, file);
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, create with empty array
        await fs.writeFile(filePath, JSON.stringify([], null, 2));
      }
    }
    
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

// Read JSON file
export async function readData(filename) {
  try {
    const filePath = join(DATA_DIR, filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

// Write JSON file
export async function writeData(filename, data) {
  try {
    const filePath = join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    throw error;
  }
}

// Append to JSON file (for logs)
export async function appendData(filename, item) {
  try {
    const data = await readData(filename);
    data.push(item);
    await writeData(filename, data);
    return true;
  } catch (error) {
    console.error(`Error appending to ${filename}:`, error);
    throw error;
  }
}
