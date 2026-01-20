import 'dotenv/config';
import { sqliteDb } from '@/lib/db';

async function main() {
  console.log('Adding reply_to_id column...');
  try {
    sqliteDb.exec(`ALTER TABLE project_messages ADD COLUMN reply_to_id integer`);
    console.log('Column added successfully.');
  } catch (error: any) {
    if (error.message.includes('duplicate column name')) {
        console.log('Column reply_to_id already exists.');
    } else {
        console.error('Error adding column:', error);
    }
  }
  process.exit(0);
}

main();
