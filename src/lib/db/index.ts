import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

// Get database path from environment variable or use default
const dbPath = process.env.DATABASE_PATH || './data/sigalix.db';

// Ensure the data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create the SQLite database connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create Drizzle instance with schema
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite connection for direct queries if needed
export const sqliteDb = sqlite;

// Initialize database tables
export function initializeDatabase() {
  // Create all tables
  sqlite.exec(`
    -- Companies
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      default_currency TEXT DEFAULT 'XAF' NOT NULL,
      logo_url TEXT,
      bank_account TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      tax_number TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'staff' NOT NULL,
      company_id INTEGER REFERENCES companies(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Clients
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      payment_terms INTEGER DEFAULT 30,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Invoices
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      client_id INTEGER NOT NULL REFERENCES clients(id),
      invoice_number TEXT NOT NULL,
      status TEXT DEFAULT 'draft' NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      subtotal TEXT NOT NULL,
      tax TEXT DEFAULT '0',
      tax_rate TEXT DEFAULT '0',
      total TEXT NOT NULL,
      notes TEXT,
      currency TEXT DEFAULT 'XAF' NOT NULL,
      recurring TEXT DEFAULT 'none' NOT NULL,
      next_due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Invoice Items
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      description TEXT NOT NULL,
      quantity TEXT NOT NULL,
      unit_price TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Quotes
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      client_id INTEGER NOT NULL REFERENCES clients(id),
      quote_number TEXT NOT NULL,
      status TEXT DEFAULT 'draft' NOT NULL,
      issue_date TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      subtotal TEXT NOT NULL,
      tax TEXT DEFAULT '0',
      tax_rate TEXT DEFAULT '0',
      total TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_at TEXT,
      soft_delete INTEGER DEFAULT 0 NOT NULL,
      converted_to_invoice_id INTEGER REFERENCES invoices(id)
    );

    -- Quote Items
    CREATE TABLE IF NOT EXISTS quote_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_id INTEGER NOT NULL REFERENCES quotes(id),
      description TEXT NOT NULL,
      quantity TEXT NOT NULL,
      unit_price TEXT NOT NULL,
      amount TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Expense Categories
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Vendors
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      website TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      category_id INTEGER REFERENCES expense_categories(id),
      vendor_id INTEGER REFERENCES vendors(id),
      vendor TEXT,
      description TEXT,
      amount TEXT NOT NULL,
      currency TEXT DEFAULT 'XAF' NOT NULL,
      expense_date TEXT NOT NULL,
      receipt_url TEXT,
      status TEXT DEFAULT 'pending' NOT NULL,
      recurring TEXT DEFAULT 'none' NOT NULL,
      next_due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Income Categories
    CREATE TABLE IF NOT EXISTS income_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Income
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      category_id INTEGER REFERENCES income_categories(id),
      client_id INTEGER REFERENCES clients(id),
      invoice_id INTEGER REFERENCES invoices(id),
      source TEXT,
      description TEXT,
      amount TEXT NOT NULL,
      currency TEXT DEFAULT 'XAF' NOT NULL,
      income_date TEXT NOT NULL,
      recurring TEXT DEFAULT 'none' NOT NULL,
      next_due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- API Tokens
    CREATE TABLE IF NOT EXISTS api_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      token_prefix TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL,
      expires_at TEXT,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      revoked_at TEXT
    );

    -- Client Login Tokens
    CREATE TABLE IF NOT EXISTS client_login_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      used_at TEXT
    );

    -- Company Invitations
    CREATE TABLE IF NOT EXISTS company_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      email TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'staff' NOT NULL,
      token TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending' NOT NULL,
      expires TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      used_at TEXT
    );

    -- Accounts
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      currency TEXT DEFAULT 'XAF' NOT NULL,
      account_number TEXT,
      initial_balance TEXT DEFAULT '0' NOT NULL,
      current_balance TEXT DEFAULT '0' NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Transactions
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount TEXT NOT NULL,
      currency TEXT DEFAULT 'XAF' NOT NULL,
      transaction_date TEXT NOT NULL,
      category_id INTEGER,
      related_invoice_id INTEGER REFERENCES invoices(id),
      related_expense_id INTEGER REFERENCES expenses(id),
      related_income_id INTEGER REFERENCES income(id),
      reconciled INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      invoice_id INTEGER NOT NULL REFERENCES invoices(id),
      client_id INTEGER NOT NULL REFERENCES clients(id),
      amount TEXT NOT NULL,
      currency TEXT DEFAULT 'XAF' NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_id INTEGER REFERENCES transactions(id),
      payment_processor_reference TEXT,
      status TEXT DEFAULT 'pending' NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'active' NOT NULL,
      priority TEXT DEFAULT 'medium' NOT NULL,
      start_date TEXT,
      end_date TEXT,
      color_code TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Project Members
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT DEFAULT 'member' NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(project_id, user_id)
    );

    -- Boards
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      title TEXT NOT NULL,
      position INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Cards
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL REFERENCES boards(id),
      title TEXT NOT NULL,
      description TEXT,
      position INTEGER DEFAULT 0 NOT NULL,
      priority TEXT DEFAULT 'medium' NOT NULL,
      start_date TEXT,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Card Assignees
    CREATE TABLE IF NOT EXISTS card_assignees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL REFERENCES cards(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(card_id, user_id)
    );

    -- Client Projects
    CREATE TABLE IF NOT EXISTS client_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES clients(id),
      project_id INTEGER NOT NULL REFERENCES projects(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(client_id, project_id)
    );

    -- Project Files
    CREATE TABLE IF NOT EXISTS project_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      message_id INTEGER,
      uploaded_by_id INTEGER REFERENCES users(id),
      uploaded_by_client_id INTEGER REFERENCES clients(id),
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT,
      size INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Project Messages
    CREATE TABLE IF NOT EXISTS project_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id),
      user_id INTEGER REFERENCES users(id),
      client_id INTEGER REFERENCES clients(id),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      reply_to_id INTEGER,
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );

    -- Calendar Events
    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      user_id INTEGER REFERENCES users(id),
      project_id INTEGER REFERENCES projects(id),
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'event' NOT NULL,
      all_day INTEGER DEFAULT 0 NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      soft_delete INTEGER DEFAULT 0 NOT NULL
    );
  `);
  
  console.log('SQLite database initialized successfully');
}

// Auto-initialize on import
try {
  initializeDatabase();
} catch (error) {
  console.error('Failed to initialize SQLite database:', error);
}