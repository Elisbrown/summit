ALTER TABLE `invoices` ADD `discount_type` varchar(20);--> statement-breakpoint
ALTER TABLE `invoices` ADD `discount_value` varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `invoices` ADD `discount_amount` varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `invoices` ADD `amount_paid` varchar(50) DEFAULT '0' NOT NULL;