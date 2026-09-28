CREATE TYPE "public"."import_entity_type" AS ENUM('SONG', 'ARTIST');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."import_record_status" AS ENUM('PENDING', 'IMPORTED', 'UPDATED', 'SKIPPED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."song_rights_status" AS ENUM('PENDING_PERMISSION', 'AUTHORIZED', 'PUBLIC_DOMAIN', 'NOT_PROVIDED', 'REMOVED');--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" varchar(255) NOT NULL,
	"source_url" text NOT NULL,
	"provider_id" varchar(64) NOT NULL,
	"status" "import_job_status" DEFAULT 'PENDING' NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"imported_records" integer DEFAULT 0 NOT NULL,
	"skipped_records" integer DEFAULT 0 NOT NULL,
	"failed_records" integer DEFAULT 0 NOT NULL,
	"error_message" varchar(1000),
	"preview_payload" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_job_id" uuid NOT NULL,
	"external_id" varchar(255),
	"source_url" text,
	"entity_type" "import_entity_type" DEFAULT 'SONG' NOT NULL,
	"entity_id" uuid,
	"status" "import_record_status" DEFAULT 'PENDING' NOT NULL,
	"title" varchar(255),
	"artist_name" varchar(255),
	"error_message" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "album_name" varchar(255);--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "release_year" integer;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "rights_status" "song_rights_status" DEFAULT 'NOT_PROVIDED' NOT NULL;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "source_name" varchar(255);--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "external_id" varchar(255);--> statement-breakpoint
ALTER TABLE "songs" ADD COLUMN "imported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_records" ADD CONSTRAINT "import_records_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_jobs_created_by_idx" ON "import_jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "import_jobs_status_idx" ON "import_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "import_records_job_id_idx" ON "import_records" USING btree ("import_job_id");--> statement-breakpoint
CREATE INDEX "import_records_status_idx" ON "import_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_records_entity_idx" ON "import_records" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "songs_artist_id_idx" ON "songs" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "songs_rights_status_idx" ON "songs" USING btree ("rights_status");--> statement-breakpoint
CREATE UNIQUE INDEX "songs_source_external_uidx" ON "songs" USING btree ("source_name","external_id") WHERE "songs"."external_id" is not null;