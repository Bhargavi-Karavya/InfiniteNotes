import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const importJobStatusEnum = pgEnum("import_job_status", [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "PARTIAL",
  "FAILED",
]);

export const importRecordStatusEnum = pgEnum("import_record_status", [
  "PENDING",
  "IMPORTED",
  "UPDATED",
  "SKIPPED",
  "FAILED",
]);

export const importEntityTypeEnum = pgEnum("import_entity_type", [
  "SONG",
  "ARTIST",
]);

/**
 * Admin import job history — tracks fetch/preview/import outcomes.
 * previewPayload holds normalized records only while awaiting admin commit.
 */
export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceName: varchar("source_name", { length: 255 }).notNull(),
    sourceUrl: text("source_url").notNull(),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    status: importJobStatusEnum("status").notNull().default("PENDING"),
    totalRecords: integer("total_records").notNull().default(0),
    importedRecords: integer("imported_records").notNull().default(0),
    skippedRecords: integer("skipped_records").notNull().default(0),
    failedRecords: integer("failed_records").notNull().default(0),
    errorMessage: varchar("error_message", { length: 1000 }),
    previewPayload: jsonb("preview_payload"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("import_jobs_created_by_idx").on(table.createdBy),
    index("import_jobs_status_idx").on(table.status),
    index("import_jobs_created_at_idx").on(table.createdAt),
  ],
);

export const importRecords = pgTable(
  "import_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importJobId: uuid("import_job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 255 }),
    sourceUrl: text("source_url"),
    entityType: importEntityTypeEnum("entity_type").notNull().default("SONG"),
    entityId: uuid("entity_id"),
    status: importRecordStatusEnum("status").notNull().default("PENDING"),
    title: varchar("title", { length: 255 }),
    artistName: varchar("artist_name", { length: 255 }),
    errorMessage: varchar("error_message", { length: 1000 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("import_records_job_id_idx").on(table.importJobId),
    index("import_records_status_idx").on(table.status),
    index("import_records_entity_idx").on(table.entityType, table.entityId),
  ],
);

export type ImportJob = typeof importJobs.$inferSelect;
export type NewImportJob = typeof importJobs.$inferInsert;
export type ImportRecord = typeof importRecords.$inferSelect;
export type NewImportRecord = typeof importRecords.$inferInsert;
export type ImportJobStatus = (typeof importJobStatusEnum.enumValues)[number];
export type ImportRecordStatus =
  (typeof importRecordStatusEnum.enumValues)[number];
