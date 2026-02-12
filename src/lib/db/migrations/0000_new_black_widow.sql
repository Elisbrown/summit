CREATE TABLE `accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(20) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'XAF',
	`account_number` varchar(100),
	`initial_balance` varchar(50) NOT NULL DEFAULT '0',
	`current_balance` varchar(50) NOT NULL DEFAULT '0',
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`company_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`token_prefix` varchar(100) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` varchar(50),
	`last_used_at` varchar(50),
	`created_at` varchar(50) NOT NULL,
	`revoked_at` varchar(50),
	CONSTRAINT `api_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_tokens_token_prefix_unique` UNIQUE(`token_prefix`)
);
--> statement-breakpoint
CREATE TABLE `boards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	CONSTRAINT `boards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`user_id` int,
	`project_id` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` varchar(20) NOT NULL DEFAULT 'event',
	`all_day` boolean NOT NULL DEFAULT false,
	`start_at` varchar(50) NOT NULL,
	`end_at` varchar(50),
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `card_assignees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`user_id` int NOT NULL,
	`created_at` varchar(50) NOT NULL,
	CONSTRAINT `card_assignees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`position` int NOT NULL DEFAULT 0,
	`priority` varchar(10) NOT NULL DEFAULT 'medium',
	`start_date` varchar(50),
	`due_date` varchar(50),
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`completed_at` varchar(50),
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_login_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires` varchar(50) NOT NULL,
	`created_at` varchar(50) NOT NULL,
	`used_at` varchar(50),
	CONSTRAINT `client_login_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_login_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `client_projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`project_id` int NOT NULL,
	`created_at` varchar(50) NOT NULL,
	CONSTRAINT `client_projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`client_id` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`token_version` int NOT NULL DEFAULT 1,
	`last_login_at` varchar(50),
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `client_users_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`payment_terms` int DEFAULT 30,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text,
	`default_currency` varchar(10) NOT NULL DEFAULT 'XAF',
	`logo_url` varchar(512),
	`bank_account` text,
	`email` varchar(255),
	`phone` varchar(50),
	`website` varchar(512),
	`tax_number` varchar(100),
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255),
	`role` varchar(20) NOT NULL DEFAULT 'staff',
	`token` varchar(255) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`expires` varchar(50) NOT NULL,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`used_at` varchar(50),
	CONSTRAINT `company_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `expense_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`category_id` int,
	`vendor_id` int,
	`vendor` varchar(255),
	`description` text,
	`amount` varchar(50) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'XAF',
	`expense_date` varchar(50) NOT NULL,
	`receipt_url` varchar(512),
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`recurring` varchar(20) NOT NULL DEFAULT 'none',
	`next_due_date` varchar(50),
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `income` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`category_id` int,
	`client_id` int,
	`invoice_id` int,
	`source` varchar(255),
	`description` text,
	`amount` varchar(50) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'XAF',
	`income_date` varchar(50) NOT NULL,
	`recurring` varchar(20) NOT NULL DEFAULT 'none',
	`next_due_date` varchar(50),
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `income_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `income_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `income_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoice_id` int NOT NULL,
	`description` text NOT NULL,
	`quantity` varchar(50) NOT NULL,
	`unit_price` varchar(50) NOT NULL,
	`amount` varchar(50) NOT NULL,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	CONSTRAINT `invoice_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`client_id` int NOT NULL,
	`invoice_number` varchar(100) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`issue_date` varchar(50) NOT NULL,
	`due_date` varchar(50) NOT NULL,
	`subtotal` varchar(50) NOT NULL,
	`tax` varchar(50) DEFAULT '0',
	`tax_rate` varchar(50) DEFAULT '0',
	`total` varchar(50) NOT NULL,
	`notes` text,
	`currency` varchar(10) NOT NULL DEFAULT 'XAF',
	`recurring` varchar(20) NOT NULL DEFAULT 'none',
	`next_due_date` varchar(50),
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`paid_at` varchar(50),
	`xendit_invoice_url` varchar(512),
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`type` varchar(30) NOT NULL,
	`account_name` varchar(255) NOT NULL,
	`account_number` varchar(100) NOT NULL,
	`bank_name` varchar(255),
	`bank_code` varchar(50),
	`bank_branch` varchar(255),
	`bank_address` text,
	`is_enabled` boolean NOT NULL DEFAULT true,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`invoice_id` int NOT NULL,
	`client_id` int NOT NULL,
	`amount` varchar(50) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'XAF',
	`payment_date` varchar(50) NOT NULL,
	`payment_method` varchar(20) NOT NULL,
	`transaction_id` int,
	`payment_processor_reference` varchar(255),
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`notes` text,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`message_id` int,
	`uploaded_by_id` int,
	`uploaded_by_client_id` int,
	`name` varchar(255) NOT NULL,
	`url` varchar(512) NOT NULL,
	`mime_type` varchar(100),
	`size` int,
	`created_at` varchar(50) NOT NULL,
	CONSTRAINT `project_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` varchar(10) NOT NULL DEFAULT 'member',
	`created_at` varchar(50) NOT NULL,
	CONSTRAINT `project_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`user_id` int,
	`client_id` int,
	`content` text NOT NULL,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`reply_to_id` int,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `project_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`priority` varchar(10) NOT NULL DEFAULT 'medium',
	`start_date` varchar(50),
	`end_date` varchar(50),
	`color_code` varchar(20),
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quote_id` int NOT NULL,
	`description` text NOT NULL,
	`quantity` varchar(50) NOT NULL,
	`unit_price` varchar(50) NOT NULL,
	`amount` varchar(50) NOT NULL,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	CONSTRAINT `quote_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`client_id` int NOT NULL,
	`quote_number` varchar(100) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`issue_date` varchar(50) NOT NULL,
	`expiry_date` varchar(50) NOT NULL,
	`subtotal` varchar(50) NOT NULL,
	`tax` varchar(50) DEFAULT '0',
	`tax_rate` varchar(50) DEFAULT '0',
	`total` varchar(50) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'XAF',
	`notes` text,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`accepted_at` varchar(50),
	`soft_delete` boolean NOT NULL DEFAULT false,
	`converted_to_invoice_id` int,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`account_id` int NOT NULL,
	`type` varchar(10) NOT NULL,
	`description` text NOT NULL,
	`amount` varchar(50) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'XAF',
	`transaction_date` varchar(50) NOT NULL,
	`category_id` int,
	`related_invoice_id` int,
	`related_expense_id` int,
	`related_income_id` int,
	`reconciled` boolean NOT NULL DEFAULT false,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255),
	`email` varchar(255) NOT NULL,
	`password` varchar(255),
	`role` varchar(20) NOT NULL DEFAULT 'staff',
	`company_id` int,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`contact_name` varchar(255),
	`email` varchar(255),
	`phone` varchar(50),
	`address` text,
	`website` varchar(512),
	`notes` text,
	`created_at` varchar(50) NOT NULL,
	`updated_at` varchar(50) NOT NULL,
	`soft_delete` boolean NOT NULL DEFAULT false,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_tokens` ADD CONSTRAINT `api_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_tokens` ADD CONSTRAINT `api_tokens_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boards` ADD CONSTRAINT `boards_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `card_assignees` ADD CONSTRAINT `card_assignees_card_id_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `card_assignees` ADD CONSTRAINT `card_assignees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cards` ADD CONSTRAINT `cards_board_id_boards_id_fk` FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_login_tokens` ADD CONSTRAINT `client_login_tokens_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_projects` ADD CONSTRAINT `client_projects_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_projects` ADD CONSTRAINT `client_projects_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_users` ADD CONSTRAINT `client_users_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_invitations` ADD CONSTRAINT `company_invitations_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expense_categories` ADD CONSTRAINT `expense_categories_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_category_id_expense_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `income` ADD CONSTRAINT `income_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `income` ADD CONSTRAINT `income_category_id_income_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `income_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `income` ADD CONSTRAINT `income_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `income` ADD CONSTRAINT `income_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `income_categories` ADD CONSTRAINT `income_categories_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoice_id_invoices_id_fk` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_files` ADD CONSTRAINT `project_files_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_files` ADD CONSTRAINT `project_files_uploaded_by_id_users_id_fk` FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_files` ADD CONSTRAINT `project_files_uploaded_by_client_id_clients_id_fk` FOREIGN KEY (`uploaded_by_client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_messages` ADD CONSTRAINT `project_messages_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_messages` ADD CONSTRAINT `project_messages_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_messages` ADD CONSTRAINT `project_messages_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quote_items` ADD CONSTRAINT `quote_items_quote_id_quotes_id_fk` FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_client_id_clients_id_fk` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotes` ADD CONSTRAINT `quotes_converted_to_invoice_id_invoices_id_fk` FOREIGN KEY (`converted_to_invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_related_invoice_id_invoices_id_fk` FOREIGN KEY (`related_invoice_id`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_related_expense_id_expenses_id_fk` FOREIGN KEY (`related_expense_id`) REFERENCES `expenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_related_income_id_income_id_fk` FOREIGN KEY (`related_income_id`) REFERENCES `income`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_company_id_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE no action ON UPDATE no action;