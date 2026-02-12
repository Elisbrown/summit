import { mysqlTable, varchar, int, boolean, text, double } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// ============ COMPANIES ============
export const companies = mysqlTable('companies', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address'),
  defaultCurrency: varchar('default_currency', { length: 10 }).default('XAF').notNull(),
  logoUrl: varchar('logo_url', { length: 512 }),
  bankAccount: text('bank_account'),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  website: varchar('website', { length: 512 }),
  taxNumber: varchar('tax_number', { length: 100 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ USERS ============
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  role: varchar('role', { length: 20 }).$type<'admin' | 'staff' | 'accountant'>().default('staff').notNull(),
  companyId: int('company_id').references(() => companies.id),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ CLIENTS ============
export const clients = mysqlTable('clients', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  paymentTerms: int('payment_terms').default(30),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ INVOICES ============
export const invoices = mysqlTable('invoices', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  clientId: int('client_id').notNull().references(() => clients.id),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).$type<'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>().default('draft').notNull(),
  issueDate: varchar('issue_date', { length: 50 }).notNull(),
  dueDate: varchar('due_date', { length: 50 }).notNull(),
  subtotal: varchar('subtotal', { length: 50 }).notNull(),
  tax: varchar('tax', { length: 50 }).default('0'),
  taxRate: varchar('tax_rate', { length: 50 }).default('0'),
  total: varchar('total', { length: 50 }).notNull(),
  notes: text('notes'),
  currency: varchar('currency', { length: 10 }).default('XAF').notNull(),
  recurring: varchar('recurring', { length: 20 }).$type<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>().default('none').notNull(),
  nextDueDate: varchar('next_due_date', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  paidAt: varchar('paid_at', { length: 50 }),
  xenditInvoiceUrl: varchar('xendit_invoice_url', { length: 512 }),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ INVOICE ITEMS ============
export const invoiceItems = mysqlTable('invoice_items', {
  id: int('id').primaryKey().autoincrement(),
  invoiceId: int('invoice_id').notNull().references(() => invoices.id),
  description: text('description').notNull(),
  quantity: varchar('quantity', { length: 50 }).notNull(),
  unitPrice: varchar('unit_price', { length: 50 }).notNull(),
  amount: varchar('amount', { length: 50 }).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ QUOTES ============
export const quotes = mysqlTable('quotes', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  clientId: int('client_id').notNull().references(() => clients.id),
  quoteNumber: varchar('quote_number', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).$type<'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'>().default('draft').notNull(),
  issueDate: varchar('issue_date', { length: 50 }).notNull(),
  expiryDate: varchar('expiry_date', { length: 50 }).notNull(),
  subtotal: varchar('subtotal', { length: 50 }).notNull(),
  tax: varchar('tax', { length: 50 }).default('0'),
  taxRate: varchar('tax_rate', { length: 50 }).default('0'),
  total: varchar('total', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('XAF').notNull(),
  notes: text('notes'),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  acceptedAt: varchar('accepted_at', { length: 50 }),
  softDelete: boolean('soft_delete').default(false).notNull(),
  convertedToInvoiceId: int('converted_to_invoice_id').references(() => invoices.id),
});

// ============ QUOTE ITEMS ============
export const quoteItems = mysqlTable('quote_items', {
  id: int('id').primaryKey().autoincrement(),
  quoteId: int('quote_id').notNull().references(() => quotes.id),
  description: text('description').notNull(),
  quantity: varchar('quantity', { length: 50 }).notNull(),
  unitPrice: varchar('unit_price', { length: 50 }).notNull(),
  amount: varchar('amount', { length: 50 }).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ EXPENSE CATEGORIES ============
export const expenseCategories = mysqlTable('expense_categories', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ VENDORS ============
export const vendors = mysqlTable('vendors', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  website: varchar('website', { length: 512 }),
  notes: text('notes'),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ EXPENSES ============
export const expenses = mysqlTable('expenses', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  categoryId: int('category_id').references(() => expenseCategories.id),
  vendorId: int('vendor_id').references(() => vendors.id),
  vendor: varchar('vendor', { length: 255 }),
  description: text('description'),
  amount: varchar('amount', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('XAF').notNull(),
  expenseDate: varchar('expense_date', { length: 50 }).notNull(),
  receiptUrl: varchar('receipt_url', { length: 512 }),
  status: varchar('status', { length: 20 }).$type<'pending' | 'approved' | 'rejected'>().default('pending').notNull(),
  recurring: varchar('recurring', { length: 20 }).$type<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>().default('none').notNull(),
  nextDueDate: varchar('next_due_date', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ INCOME CATEGORIES ============
export const incomeCategories = mysqlTable('income_categories', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ INCOME ============
export const income = mysqlTable('income', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  categoryId: int('category_id').references(() => incomeCategories.id),
  clientId: int('client_id').references(() => clients.id),
  invoiceId: int('invoice_id').references(() => invoices.id),
  source: varchar('source', { length: 255 }),
  description: text('description'),
  amount: varchar('amount', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('XAF').notNull(),
  incomeDate: varchar('income_date', { length: 50 }).notNull(),
  recurring: varchar('recurring', { length: 20 }).$type<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>().default('none').notNull(),
  nextDueDate: varchar('next_due_date', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ API TOKENS ============
export const apiTokens = mysqlTable('api_tokens', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  companyId: int('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  tokenPrefix: varchar('token_prefix', { length: 100 }).notNull().unique(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: varchar('expires_at', { length: 50 }),
  lastUsedAt: varchar('last_used_at', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  revokedAt: varchar('revoked_at', { length: 50 }),
});

// ============ CLIENT LOGIN TOKENS ============
export const clientLoginTokens = mysqlTable('client_login_tokens', {
  id: int('id').primaryKey().autoincrement(),
  clientId: int('client_id').notNull().references(() => clients.id),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires: varchar('expires', { length: 50 }).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  usedAt: varchar('used_at', { length: 50 }),
});

// ============ CLIENT USERS ============
export const clientUsers = mysqlTable('client_users', {
  id: int('id').primaryKey().autoincrement(),
  clientId: int('client_id').notNull().references(() => clients.id),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  tokenVersion: int('token_version').default(1).notNull(),
  lastLoginAt: varchar('last_login_at', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ COMPANY INVITATIONS ============
export const companyInvitations = mysqlTable('company_invitations', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  role: varchar('role', { length: 20 }).$type<'admin' | 'staff' | 'accountant'>().default('staff').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).$type<'pending' | 'accepted' | 'expired' | 'cancelled'>().default('pending').notNull(),
  expires: varchar('expires', { length: 50 }).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  usedAt: varchar('used_at', { length: 50 }),
});

// ============ PAYMENT METHODS ============
export const paymentMethods = mysqlTable('payment_methods', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  type: varchar('type', { length: 30 }).$type<'mtn_momo' | 'orange_money' | 'bank_transfer'>().notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 100 }).notNull(),
  bankName: varchar('bank_name', { length: 255 }),
  bankCode: varchar('bank_code', { length: 50 }),
  bankBranch: varchar('bank_branch', { length: 255 }),
  bankAddress: text('bank_address'),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ ACCOUNTS ============
export const accounts = mysqlTable('accounts', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).$type<'bank' | 'credit_card' | 'cash'>().notNull(),
  currency: varchar('currency', { length: 10 }).default('XAF').notNull(),
  accountNumber: varchar('account_number', { length: 100 }),
  initialBalance: varchar('initial_balance', { length: 50 }).default('0').notNull(),
  currentBalance: varchar('current_balance', { length: 50 }).default('0').notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ TRANSACTIONS ============
export const transactions = mysqlTable('transactions', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  accountId: int('account_id').notNull().references(() => accounts.id),
  type: varchar('type', { length: 10 }).$type<'debit' | 'credit'>().notNull(),
  description: text('description').notNull(),
  amount: varchar('amount', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('XAF').notNull(),
  transactionDate: varchar('transaction_date', { length: 50 }).notNull(),
  categoryId: int('category_id'),
  relatedInvoiceId: int('related_invoice_id').references(() => invoices.id),
  relatedExpenseId: int('related_expense_id').references(() => expenses.id),
  relatedIncomeId: int('related_income_id').references(() => income.id),
  reconciled: boolean('reconciled').default(false).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ PAYMENTS ============
export const payments = mysqlTable('payments', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  invoiceId: int('invoice_id').notNull().references(() => invoices.id),
  clientId: int('client_id').notNull().references(() => clients.id),
  amount: varchar('amount', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('XAF').notNull(),
  paymentDate: varchar('payment_date', { length: 50 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).$type<'card' | 'bank_transfer' | 'cash' | 'other'>().notNull(),
  transactionId: int('transaction_id').references(() => transactions.id),
  paymentProcessorReference: varchar('payment_processor_reference', { length: 255 }),
  status: varchar('status', { length: 20 }).$type<'pending' | 'completed' | 'failed'>().default('pending').notNull(),
  notes: text('notes'),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ PROJECTS ============
export const projects = mysqlTable('projects', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).$type<'active' | 'completed' | 'paused' | 'cancelled'>().default('active').notNull(),
  priority: varchar('priority', { length: 10 }).$type<'low' | 'medium' | 'high' | 'urgent'>().default('medium').notNull(),
  startDate: varchar('start_date', { length: 50 }),
  endDate: varchar('end_date', { length: 50 }),
  colorCode: varchar('color_code', { length: 20 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ PROJECT MEMBERS ============
export const projectMembers = mysqlTable('project_members', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => projects.id),
  userId: int('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 10 }).$type<'admin' | 'member' | 'viewer'>().default('member').notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ BOARDS ============
export const boards = mysqlTable('boards', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => projects.id),
  title: varchar('title', { length: 255 }).notNull(),
  position: int('position').default(0).notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ CARDS ============
export const cards = mysqlTable('cards', {
  id: int('id').primaryKey().autoincrement(),
  boardId: int('board_id').notNull().references(() => boards.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  position: int('position').default(0).notNull(),
  priority: varchar('priority', { length: 10 }).$type<'low' | 'medium' | 'high' | 'urgent'>().default('medium').notNull(),
  startDate: varchar('start_date', { length: 50 }),
  dueDate: varchar('due_date', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: varchar('completed_at', { length: 50 }),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ CARD ASSIGNEES ============
export const cardAssignees = mysqlTable('card_assignees', {
  id: int('id').primaryKey().autoincrement(),
  cardId: int('card_id').notNull().references(() => cards.id),
  userId: int('user_id').notNull().references(() => users.id),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ CLIENT PROJECTS ============
export const clientProjects = mysqlTable('client_projects', {
  id: int('id').primaryKey().autoincrement(),
  clientId: int('client_id').notNull().references(() => clients.id),
  projectId: int('project_id').notNull().references(() => projects.id),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ PROJECT FILES ============
export const projectFiles = mysqlTable('project_files', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => projects.id),
  messageId: int('message_id'),
  uploadedById: int('uploaded_by_id').references(() => users.id),
  uploadedByClientId: int('uploaded_by_client_id').references(() => clients.id),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 512 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  size: int('size'),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ PROJECT MESSAGES ============
export const projectMessages = mysqlTable('project_messages', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => projects.id),
  userId: int('user_id').references(() => users.id),
  clientId: int('client_id').references(() => clients.id),
  content: text('content').notNull(),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  replyToId: int('reply_to_id'),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ CALENDAR EVENTS ============
export const calendarEvents = mysqlTable('calendar_events', {
  id: int('id').primaryKey().autoincrement(),
  companyId: int('company_id').notNull().references(() => companies.id),
  userId: int('user_id').references(() => users.id),
  projectId: int('project_id').references(() => projects.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).$type<'event' | 'reminder' | 'task' | 'meeting'>().default('event').notNull(),
  allDay: boolean('all_day').default(false).notNull(),
  startAt: varchar('start_at', { length: 50 }).notNull(),
  endAt: varchar('end_at', { length: 50 }),
  createdAt: varchar('created_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: varchar('updated_at', { length: 50 }).notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: boolean('soft_delete').default(false).notNull(),
});

// ============ RELATIONS ============

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  invoices: many(invoices),
  quotes: many(quotes),
  expenseCategories: many(expenseCategories),
  expenses: many(expenses),
  incomeCategories: many(incomeCategories),
  income: many(income),
  accounts: many(accounts),
  transactions: many(transactions),
  payments: many(payments),
  invitations: many(companyInvitations),
  apiTokens: many(apiTokens),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  apiTokens: many(apiTokens),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  company: one(companies, {
    fields: [clients.companyId],
    references: [companies.id],
  }),
  invoices: many(invoices),
  quotes: many(quotes),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  company: one(companies, {
    fields: [quotes.companyId],
    references: [companies.id],
  }),
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  items: many(quoteItems),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
  }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  company: one(companies, {
    fields: [expenseCategories.companyId],
    references: [companies.id],
  }),
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  company: one(companies, {
    fields: [expenses.companyId],
    references: [companies.id],
  }),
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  vendorRef: one(vendors, {
    fields: [expenses.vendorId],
    references: [vendors.id],
  }),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  company: one(companies, {
    fields: [vendors.companyId],
    references: [companies.id],
  }),
  expenses: many(expenses),
}));

export const incomeCategoriesRelations = relations(incomeCategories, ({ one, many }) => ({
  company: one(companies, {
    fields: [incomeCategories.companyId],
    references: [companies.id],
  }),
  incomeItems: many(income),
}));

export const incomeRelations = relations(income, ({ one }) => ({
  company: one(companies, {
    fields: [income.companyId],
    references: [companies.id],
  }),
  category: one(incomeCategories, {
    fields: [income.categoryId],
    references: [incomeCategories.id],
  }),
  client: one(clients, {
    fields: [income.clientId],
    references: [clients.id],
  }),
  invoice: one(invoices, {
    fields: [income.invoiceId],
    references: [invoices.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  company: one(companies, {
    fields: [accounts.companyId],
    references: [companies.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  company: one(companies, {
    fields: [transactions.companyId],
    references: [companies.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  invoice: one(invoices, {
    fields: [transactions.relatedInvoiceId],
    references: [invoices.id],
  }),
  expense: one(expenses, {
    fields: [transactions.relatedExpenseId],
    references: [expenses.id],
  }),
  incomeItem: one(income, {
    fields: [transactions.relatedIncomeId],
    references: [income.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  company: one(companies, {
    fields: [payments.companyId],
    references: [companies.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [payments.clientId],
    references: [clients.id],
  }),
  transaction: one(transactions, {
    fields: [payments.transactionId],
    references: [transactions.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, {
    fields: [projects.companyId],
    references: [companies.id],
  }),
  members: many(projectMembers),
  boards: many(boards),
  clientProjects: many(clientProjects),
  files: many(projectFiles),
  messages: many(projectMessages),
  calendarEvents: many(calendarEvents),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  project: one(projects, {
    fields: [boards.projectId],
    references: [projects.id],
  }),
  cards: many(cards),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  board: one(boards, {
    fields: [cards.boardId],
    references: [boards.id],
  }),
  assignees: many(cardAssignees),
}));

export const cardAssigneesRelations = relations(cardAssignees, ({ one }) => ({
  card: one(cards, {
    fields: [cardAssignees.cardId],
    references: [cards.id],
  }),
  user: one(users, {
    fields: [cardAssignees.userId],
    references: [users.id],
  }),
}));

export const clientProjectsRelations = relations(clientProjects, ({ one }) => ({
  client: one(clients, {
    fields: [clientProjects.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [clientProjects.projectId],
    references: [projects.id],
  }),
}));

export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
  uploadedBy: one(users, {
    fields: [projectFiles.uploadedById],
    references: [users.id],
  }),
}));

export const projectMessagesRelations = relations(projectMessages, ({ one }) => ({
  project: one(projects, {
    fields: [projectMessages.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMessages.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [projectMessages.clientId],
    references: [clients.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  company: one(companies, {
    fields: [calendarEvents.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [calendarEvents.projectId],
    references: [projects.id],
  }),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  user: one(users, {
    fields: [apiTokens.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [apiTokens.companyId],
    references: [companies.id],
  }),
}));

export const companyInvitationsRelations = relations(companyInvitations, ({ one }) => ({
  company: one(companies, {
    fields: [companyInvitations.companyId],
    references: [companies.id],
  }),
}));

export const clientLoginTokensRelations = relations(clientLoginTokens, ({ one }) => ({
  client: one(clients, {
    fields: [clientLoginTokens.clientId],
    references: [clients.id],
  }),
}));
