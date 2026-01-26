import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============ ENUMS (stored as text in SQLite) ============
// SQLite doesn't have native enums, so we use text with type constraints

// ============ COMPANIES ============
export const companies = sqliteTable('companies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address'),
  defaultCurrency: text('default_currency').default('XAF').notNull(),
  logoUrl: text('logo_url'),
  bankAccount: text('bank_account'),
  email: text('email'),
  phone: text('phone'),
  website: text('website'),
  taxNumber: text('tax_number'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ USERS ============
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  email: text('email').notNull().unique(),
  password: text('password'),
  role: text('role').$type<'admin' | 'staff' | 'accountant'>().default('staff').notNull(),
  companyId: integer('company_id').references(() => companies.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ CLIENTS ============
export const clients = sqliteTable('clients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  paymentTerms: integer('payment_terms').default(30),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ INVOICES ============
export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  clientId: integer('client_id').notNull().references(() => clients.id),
  invoiceNumber: text('invoice_number').notNull(),
  status: text('status').$type<'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>().default('draft').notNull(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  subtotal: text('subtotal').notNull(),
  tax: text('tax').default('0'),
  taxRate: text('tax_rate').default('0'),
  total: text('total').notNull(),
  notes: text('notes'),
  currency: text('currency').default('XAF').notNull(),
  recurring: text('recurring').$type<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>().default('none').notNull(),
  nextDueDate: text('next_due_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  paidAt: text('paid_at'),
  xenditInvoiceUrl: text('xendit_invoice_url'),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ INVOICE ITEMS ============
export const invoiceItems = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  description: text('description').notNull(),
  quantity: text('quantity').notNull(),
  unitPrice: text('unit_price').notNull(),
  amount: text('amount').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ QUOTES ============
export const quotes = sqliteTable('quotes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  clientId: integer('client_id').notNull().references(() => clients.id),
  quoteNumber: text('quote_number').notNull(),
  status: text('status').$type<'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'>().default('draft').notNull(),
  issueDate: text('issue_date').notNull(),
  expiryDate: text('expiry_date').notNull(),
  subtotal: text('subtotal').notNull(),
  tax: text('tax').default('0'),
  taxRate: text('tax_rate').default('0'),
  total: text('total').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  acceptedAt: text('accepted_at'),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
  convertedToInvoiceId: integer('converted_to_invoice_id').references(() => invoices.id),
});

// ============ QUOTE ITEMS ============
export const quoteItems = sqliteTable('quote_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  quoteId: integer('quote_id').notNull().references(() => quotes.id),
  description: text('description').notNull(),
  quantity: text('quantity').notNull(),
  unitPrice: text('unit_price').notNull(),
  amount: text('amount').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ EXPENSE CATEGORIES ============
export const expenseCategories = sqliteTable('expense_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ VENDORS ============
export const vendors = sqliteTable('vendors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  website: text('website'),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ EXPENSES ============
export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  categoryId: integer('category_id').references(() => expenseCategories.id),
  vendorId: integer('vendor_id').references(() => vendors.id),
  vendor: text('vendor'),
  description: text('description'),
  amount: text('amount').notNull(),
  currency: text('currency').default('XAF').notNull(),
  expenseDate: text('expense_date').notNull(),
  receiptUrl: text('receipt_url'),
  status: text('status').$type<'pending' | 'approved' | 'rejected'>().default('pending').notNull(),
  recurring: text('recurring').$type<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>().default('none').notNull(),
  nextDueDate: text('next_due_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ INCOME CATEGORIES ============
export const incomeCategories = sqliteTable('income_categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ INCOME ============
export const income = sqliteTable('income', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  categoryId: integer('category_id').references(() => incomeCategories.id),
  clientId: integer('client_id').references(() => clients.id),
  invoiceId: integer('invoice_id').references(() => invoices.id),
  source: text('source'),
  description: text('description'),
  amount: text('amount').notNull(),
  currency: text('currency').default('XAF').notNull(),
  incomeDate: text('income_date').notNull(),
  recurring: text('recurring').$type<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>().default('none').notNull(),
  nextDueDate: text('next_due_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ API TOKENS ============
export const apiTokens = sqliteTable('api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  companyId: integer('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  tokenPrefix: text('token_prefix').notNull().unique(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at'),
  lastUsedAt: text('last_used_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  revokedAt: text('revoked_at'),
});

// ============ CLIENT LOGIN TOKENS ============
export const clientLoginTokens = sqliteTable('client_login_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  expires: text('expires').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  usedAt: text('used_at'),
});

// ============ CLIENT USERS ============
export const clientUsers = sqliteTable('client_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id),
  email: text('email').notNull(),
  name: text('name'),
  tokenVersion: integer('token_version').default(1).notNull(),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ COMPANY INVITATIONS ============
export const companyInvitations = sqliteTable('company_invitations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').$type<'admin' | 'staff' | 'accountant'>().default('staff').notNull(),
  token: text('token').notNull().unique(),
  status: text('status').$type<'pending' | 'accepted' | 'expired' | 'cancelled'>().default('pending').notNull(),
  expires: text('expires').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  usedAt: text('used_at'),
});

// ============ PAYMENT METHODS ============
export const paymentMethods = sqliteTable('payment_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  type: text('type').$type<'mtn_momo' | 'orange_money' | 'bank_transfer'>().notNull(),
  accountName: text('account_name').notNull(),
  accountNumber: text('account_number').notNull(),
  bankName: text('bank_name'),
  bankCode: text('bank_code'),
  bankBranch: text('bank_branch'),
  bankAddress: text('bank_address'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ ACCOUNTS ============
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  type: text('type').$type<'bank' | 'credit_card' | 'cash'>().notNull(),
  currency: text('currency').default('XAF').notNull(),
  accountNumber: text('account_number'),
  initialBalance: text('initial_balance').default('0').notNull(),
  currentBalance: text('current_balance').default('0').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ TRANSACTIONS ============
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  type: text('type').$type<'debit' | 'credit'>().notNull(),
  description: text('description').notNull(),
  amount: text('amount').notNull(),
  currency: text('currency').default('XAF').notNull(),
  transactionDate: text('transaction_date').notNull(),
  categoryId: integer('category_id'),
  relatedInvoiceId: integer('related_invoice_id').references(() => invoices.id),
  relatedExpenseId: integer('related_expense_id').references(() => expenses.id),
  relatedIncomeId: integer('related_income_id').references(() => income.id),
  reconciled: integer('reconciled', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ PAYMENTS ============
export const payments = sqliteTable('payments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  invoiceId: integer('invoice_id').notNull().references(() => invoices.id),
  clientId: integer('client_id').notNull().references(() => clients.id),
  amount: text('amount').notNull(),
  currency: text('currency').default('XAF').notNull(),
  paymentDate: text('payment_date').notNull(),
  paymentMethod: text('payment_method').$type<'card' | 'bank_transfer' | 'cash' | 'other'>().notNull(),
  transactionId: integer('transaction_id').references(() => transactions.id),
  paymentProcessorReference: text('payment_processor_reference'),
  status: text('status').$type<'pending' | 'completed' | 'failed'>().default('pending').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ PROJECTS ============
export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<'active' | 'completed' | 'paused' | 'cancelled'>().default('active').notNull(),
  priority: text('priority').$type<'low' | 'medium' | 'high' | 'urgent'>().default('medium').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  colorCode: text('color_code'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ PROJECT MEMBERS ============
export const projectMembers = sqliteTable('project_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: text('role').$type<'admin' | 'member' | 'viewer'>().default('member').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ BOARDS ============
export const boards = sqliteTable('boards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  title: text('title').notNull(),
  position: integer('position').default(0).notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ CARDS ============
export const cards = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  boardId: integer('board_id').notNull().references(() => boards.id),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').default(0).notNull(),
  priority: text('priority').$type<'low' | 'medium' | 'high' | 'urgent'>().default('medium').notNull(),
  startDate: text('start_date'),
  dueDate: text('due_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text('completed_at'),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ CARD ASSIGNEES ============
export const cardAssignees = sqliteTable('card_assignees', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cardId: integer('card_id').notNull().references(() => cards.id),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ CLIENT PROJECTS ============
export const clientProjects = sqliteTable('client_projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => clients.id),
  projectId: integer('project_id').notNull().references(() => projects.id),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ PROJECT FILES ============
export const projectFiles = sqliteTable('project_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  messageId: integer('message_id'),
  uploadedById: integer('uploaded_by_id').references(() => users.id),
  uploadedByClientId: integer('uploaded_by_client_id').references(() => clients.id),
  name: text('name').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type'),
  size: integer('size'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============ PROJECT MESSAGES ============
export const projectMessages = sqliteTable('project_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').references(() => users.id),
  clientId: integer('client_id').references(() => clients.id),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  replyToId: integer('reply_to_id'),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
});

// ============ CALENDAR EVENTS ============
export const calendarEvents = sqliteTable('calendar_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.id),
  userId: integer('user_id').references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').$type<'event' | 'reminder' | 'task' | 'meeting'>().default('event').notNull(),
  allDay: integer('all_day', { mode: 'boolean' }).default(false).notNull(),
  startAt: text('start_at').notNull(),
  endAt: text('end_at'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
  softDelete: integer('soft_delete', { mode: 'boolean' }).default(false).notNull(),
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
