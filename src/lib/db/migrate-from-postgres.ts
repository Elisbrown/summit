#!/usr/bin/env npx tsx
/**
 * Migration Script: PostgreSQL to SQLite
 * 
 * This script exports all data from the PostgreSQL database and imports it into SQLite.
 * Run with: npx tsx src/lib/db/migrate-from-postgres.ts
 * 
 * Prerequisites:
 * - PostgreSQL database must be running and accessible via DATABASE_URL
 * - SQLite database path configured in DATABASE_PATH
 */

import postgres from 'postgres';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Get environment variables
const pgUrl = process.env.DATABASE_URL;
const sqlitePath = process.env.DATABASE_PATH || './data/sigalix.db';

if (!pgUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Ensure data directory exists
const dataDir = path.dirname(sqlitePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Table order matters due to foreign key constraints
const tables = [
  'companies',
  'users',
  'clients',
  'invoices',
  'invoice_items',
  'quotes',
  'quote_items',
  'expense_categories',
  'vendors',
  'expenses',
  'income_categories',
  'income',
  'api_tokens',
  'client_login_tokens',
  'company_invitations',
  'accounts',
  'transactions',
  'payments',
  'projects',
  'project_members',
  'boards',
  'cards',
  'card_assignees',
  'client_projects',
  'project_files',
  'project_messages',
  'calendar_events',
];

// Column mappings for timestamp conversions
const timestampColumns = ['created_at', 'updated_at', 'paid_at', 'accepted_at', 'expires', 'used_at', 'last_used_at', 'expires_at', 'revoked_at', 'start_at', 'end_at', 'start_date', 'due_date', 'completed_at'];
const dateColumns = ['issue_date', 'expiry_date', 'expense_date', 'income_date', 'payment_date', 'transaction_date', 'next_due_date'];

async function migrate() {
  console.log('🚀 Starting PostgreSQL to SQLite migration...\n');
  
  // Initialize SQLite tables first by importing the db module
  console.log('📂 Initializing SQLite tables...');
  const { initializeDatabase } = await import('./index');
  initializeDatabase();
  
  // Connect to PostgreSQL
  console.log('📡 Connecting to PostgreSQL...');
  const pg = postgres(pgUrl!);
  
  // Create/open SQLite database
  console.log('📁 Opening SQLite database...');
  const sqlite = new Database(sqlitePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = OFF'); // Disable during migration
  
  try {
    let totalRows = 0;
    
    for (const table of tables) {
      console.log(`\n📋 Migrating table: ${table}`);
      
      try {
        // Fetch all rows from PostgreSQL
        const rows = await pg.unsafe(`SELECT * FROM ${table}`);
        
        if (rows.length === 0) {
          console.log(`   ⏭️  No rows to migrate`);
          continue;
        }
        
        // Columns to exclude (removed from SQLite schema)
        const excludedColumns = [
          'xendit_invoice_id', 'xendit_invoice_url',  // Removed payment gateway
          'payment_settings',  // Not in current schema
        ];
        
        // Get column names from first row and filter out excluded ones
        const columns = Object.keys(rows[0]).filter(col => !excludedColumns.includes(col));
        
        // Prepare insert statement
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
        const insert = sqlite.prepare(insertSql);
        
        // Begin SQLite transaction
        const insertMany = sqlite.transaction((items: any[]) => {
          for (const item of items) {
            const values = columns.map(col => {
              let val = item[col];
              
              // Convert timestamps to ISO strings
              if (val instanceof Date) {
                return val.toISOString();
              }
              
              // Convert booleans to integers
              if (typeof val === 'boolean') {
                return val ? 1 : 0;
              }
              
              // Convert decimals to strings
              if (typeof val === 'number' && !Number.isInteger(val)) {
                return val.toString();
              }
              
              return val;
            });
            
            insert.run(...values);
          }
        });
        
        // Execute migration for this table
        insertMany(rows);
        
        console.log(`   ✅ Migrated ${rows.length} rows`);
        totalRows += rows.length;
        
      } catch (error: any) {
        if (error.message?.includes('does not exist')) {
          console.log(`   ⚠️  Table does not exist in PostgreSQL, skipping`);
        } else {
          console.error(`   ❌ Error migrating table: ${error.message}`);
        }
      }
    }
    
    // Re-enable foreign keys
    sqlite.pragma('foreign_keys = ON');
    
    console.log(`\n✨ Migration complete! Total rows migrated: ${totalRows}`);
    console.log(`📁 SQLite database saved to: ${sqlitePath}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pg.end();
    sqlite.close();
  }
}

migrate().catch(console.error);
