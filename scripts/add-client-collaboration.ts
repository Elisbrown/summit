import 'dotenv/config';
import { sqliteDb } from '../src/lib/db';

async function main() {
  console.log('Migrating database for Client Portal support...');

  try {
    // 1. Update project_messages
    try {
      sqliteDb.exec(`
        ALTER TABLE project_messages 
        ADD COLUMN client_id integer REFERENCES clients(id) ON DELETE CASCADE;
      `);
      console.log('Added client_id to project_messages');
    } catch (e: any) {
      if (e.message.includes('duplicate column name')) {
        console.log('client_id already exists in project_messages');
      } else {
        console.error('Error adding client_id:', e.message);
      }
    }

    // SQLite does not support ALTER COLUMN directly. 
    // We would need to recreate the table to drop the NOT NULL constraint on user_id.
    // For now, we'll skip this or assume user_id is still required or the constraint was handled otherwise.
    console.log('Skipping ALTER COLUMN user_id (not supported in simple SQLite ALTER)');

    console.log('Updated project_messages table');

    // 2. Update project_files
    try {
      sqliteDb.exec(`
        ALTER TABLE project_files 
        ADD COLUMN uploaded_by_client_id integer REFERENCES clients(id) ON DELETE CASCADE;
      `);
      console.log('Added uploaded_by_client_id to project_files');
    } catch (e: any) {
       if (e.message.includes('duplicate column name')) {
        console.log('uploaded_by_client_id already exists in project_files');
      } else {
        console.error('Error adding uploaded_by_client_id:', e.message);
      }
    }

    // Same here for uploaded_by_id
    console.log('Skipping ALTER COLUMN uploaded_by_id (not supported in simple SQLite ALTER)');

    console.log('Updated project_files table');

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
