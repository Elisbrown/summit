-- Apply PM Module Schema manually
-- Run with: psql $DATABASE_URL -f pm_module.sql

-- Create enums (IF NOT EXISTS to be safe)
DO $$ BEGIN
  CREATE TYPE "public"."calendar_event_type" AS ENUM('event', 'reminder', 'task', 'meeting');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."card_priority" AS ENUM('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."project_member_role" AS ENUM('admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."project_priority" AS ENUM('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."project_status" AS ENUM('active', 'completed', 'paused', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create tables
CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" "project_status" DEFAULT 'active' NOT NULL,
  "priority" "project_priority" DEFAULT 'medium' NOT NULL,
  "start_date" date,
  "end_date" date,
  "color_code" varchar(7),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "soft_delete" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "boards" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "title" varchar(100) NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "cards" (
  "id" serial PRIMARY KEY NOT NULL,
  "board_id" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "position" integer DEFAULT 0 NOT NULL,
  "priority" "card_priority" DEFAULT 'medium' NOT NULL,
  "start_date" date,
  "due_date" date,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "soft_delete" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "role" "project_member_role" DEFAULT 'member' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "card_assignees" (
  "id" serial PRIMARY KEY NOT NULL,
  "card_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "client_projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL,
  "project_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_files" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "message_id" integer,
  "uploaded_by_id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "url" text NOT NULL,
  "mime_type" varchar(100),
  "size" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "project_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "soft_delete" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL,
  "user_id" integer,
  "project_id" integer,
  "title" varchar(255) NOT NULL,
  "description" text,
  "type" "calendar_event_type" DEFAULT 'event' NOT NULL,
  "all_day" boolean DEFAULT false NOT NULL,
  "start_at" timestamp NOT NULL,
  "end_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "soft_delete" boolean DEFAULT false NOT NULL
);

-- Add foreign key constraints (IF NOT EXISTS pattern with exception handling)
DO $$ BEGIN
  ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "boards" ADD CONSTRAINT "boards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "cards" ADD CONSTRAINT "cards_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "card_assignees" ADD CONSTRAINT "card_assignees_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "card_assignees" ADD CONSTRAINT "card_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "client_projects" ADD CONSTRAINT "client_projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "client_projects" ADD CONSTRAINT "client_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_messages" ADD CONSTRAINT "project_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "project_members_unique" ON "project_members" USING btree ("project_id","user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "card_assignees_unique" ON "card_assignees" USING btree ("card_id","user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "client_projects_unique" ON "client_projects" USING btree ("client_id","project_id");

-- Update currency defaults
ALTER TABLE "accounts" ALTER COLUMN "currency" SET DEFAULT 'XAF';
ALTER TABLE "expenses" ALTER COLUMN "currency" SET DEFAULT 'XAF';
ALTER TABLE "income" ALTER COLUMN "currency" SET DEFAULT 'XAF';
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'XAF';
ALTER TABLE "transactions" ALTER COLUMN "currency" SET DEFAULT 'XAF';

SELECT 'PM Module schema applied successfully!' as result;
