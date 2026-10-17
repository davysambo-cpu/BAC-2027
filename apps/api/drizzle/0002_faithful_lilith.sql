CREATE TYPE "public"."attachment_processing_status" AS ENUM('stored', 'queued', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."content_validation_status" AS ENUM('owner_provided', 'pedagogically_validated', 'institutionally_validated', 'excluded');--> statement-breakpoint
CREATE TYPE "public"."correction_review_status" AS ENUM('proposed', 'accepted', 'rejected', 'ask_teacher');--> statement-breakpoint
CREATE TYPE "public"."curriculum_source_kind" AS ENUM('administrative', 'pedagogical_catalogue', 'school_material', 'web');--> statement-breakpoint
CREATE TYPE "public"."daily_report_attachment_kind" AS ENUM('image', 'audio');--> statement-breakpoint
CREATE TYPE "public"."daily_report_status" AS ENUM('draft', 'saved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."enrichment_status" AS ENUM('not_requested', 'queued', 'processing', 'needs_review', 'accepted', 'failed');--> statement-breakpoint
CREATE TYPE "public"."series_scope_status" AS ENUM('explicitly_includes', 'unspecified', 'explicitly_excludes');--> statement-breakpoint
CREATE TYPE "public"."source_trust_tier" AS ENUM('institutional', 'curated', 'catalogue', 'web');--> statement-breakpoint
CREATE TABLE "academic_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(160) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"education_level" varchar(40) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalogue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"subject_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"canonical_chapter_id" uuid,
	"source_section" varchar(80) NOT NULL,
	"source_position" integer NOT NULL,
	"subject_position" integer NOT NULL,
	"title" varchar(400) NOT NULL,
	"source_url" text,
	"series_mention" varchar(80),
	"series_labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"series_d_scope" "series_scope_status" NOT NULL,
	"validation_status" "content_validation_status" DEFAULT 'owner_provided' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"title" varchar(240) NOT NULL,
	"kind" "curriculum_source_kind" NOT NULL,
	"validation_status" "content_validation_status" DEFAULT 'owner_provided' NOT NULL,
	"publisher_label" varchar(160),
	"original_file_name" varchar(255),
	"checksum_sha256" varchar(64),
	"page_count" integer,
	"source_url" text,
	"captured_at" timestamp with time zone,
	"received_at" timestamp with time zone NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_subjects" (
	"series_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"validation_status" "content_validation_status" DEFAULT 'owner_provided' NOT NULL,
	"source_reference" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_subjects_series_id_subject_id_pk" PRIMARY KEY("series_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "course_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"generation_number" integer NOT NULL,
	"base_report_version" integer NOT NULL,
	"status" "enrichment_status" DEFAULT 'queued' NOT NULL,
	"provider" varchar(100),
	"model" varchar(160),
	"prompt_version" varchar(80),
	"content" jsonb,
	"failure_code" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "daily_report_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"kind" "daily_report_attachment_kind" NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"duration_seconds" integer,
	"processing_status" "attachment_processing_status" DEFAULT 'stored' NOT NULL,
	"extracted_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"catalogue_item_id" uuid,
	"chapter_id" uuid,
	"lesson_date" date NOT NULL,
	"title" varchar(240) NOT NULL,
	"original_summary" text NOT NULL,
	"understood_points" text,
	"questions" text,
	"status" "daily_report_status" DEFAULT 'saved' NOT NULL,
	"enrichment_status" "enrichment_status" DEFAULT 'not_requested' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "draft_citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"correction_id" uuid,
	"position" integer NOT NULL,
	"trust_tier" "source_trust_tier" NOT NULL,
	"title" varchar(300) NOT NULL,
	"publisher" varchar(200),
	"url" text,
	"excerpt" text,
	"retrieved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"original_excerpt" text NOT NULL,
	"proposed_text" text NOT NULL,
	"explanation" text NOT NULL,
	"review_status" "correction_review_status" DEFAULT 'proposed' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_source_id_curriculum_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."curriculum_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_canonical_chapter_id_chapters_id_fk" FOREIGN KEY ("canonical_chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_subjects" ADD CONSTRAINT "series_subjects_series_id_academic_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."academic_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_subjects" ADD CONSTRAINT "series_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_drafts" ADD CONSTRAINT "course_drafts_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_report_attachments" ADD CONSTRAINT "daily_report_attachments_report_id_daily_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."daily_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_citations" ADD CONSTRAINT "draft_citations_draft_id_course_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."course_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_citations" ADD CONSTRAINT "draft_citations_correction_id_draft_corrections_id_fk" FOREIGN KEY ("correction_id") REFERENCES "public"."draft_corrections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_corrections" ADD CONSTRAINT "draft_corrections_draft_id_course_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."course_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_series_code_unique" ON "academic_series" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "catalogue_items_code_unique" ON "catalogue_items" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "catalogue_items_source_position_unique" ON "catalogue_items" USING btree ("source_id","source_position");--> statement-breakpoint
CREATE INDEX "catalogue_items_subject_order_idx" ON "catalogue_items" USING btree ("subject_id","subject_position");--> statement-breakpoint
CREATE INDEX "catalogue_items_student_visibility_idx" ON "catalogue_items" USING btree ("subject_id","series_d_scope","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_sources_code_unique" ON "curriculum_sources" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_sources_checksum_unique" ON "curriculum_sources" USING btree ("checksum_sha256");--> statement-breakpoint
CREATE INDEX "curriculum_sources_validation_idx" ON "curriculum_sources" USING btree ("validation_status");--> statement-breakpoint
CREATE INDEX "series_subjects_series_order_idx" ON "series_subjects" USING btree ("series_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "course_drafts_report_generation_unique" ON "course_drafts" USING btree ("report_id","generation_number");--> statement-breakpoint
CREATE INDEX "course_drafts_status_created_idx" ON "course_drafts" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_report_attachments_storage_key_unique" ON "daily_report_attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "daily_report_attachments_report_idx" ON "daily_report_attachments" USING btree ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "daily_report_attachments_processing_idx" ON "daily_report_attachments" USING btree ("processing_status","updated_at");--> statement-breakpoint
CREATE INDEX "daily_reports_student_date_idx" ON "daily_reports" USING btree ("student_id","lesson_date");--> statement-breakpoint
CREATE INDEX "daily_reports_student_updated_idx" ON "daily_reports" USING btree ("student_id","updated_at");--> statement-breakpoint
CREATE INDEX "daily_reports_subject_item_idx" ON "daily_reports" USING btree ("subject_id","catalogue_item_id");--> statement-breakpoint
CREATE INDEX "daily_reports_enrichment_idx" ON "daily_reports" USING btree ("enrichment_status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "draft_citations_draft_position_unique" ON "draft_citations" USING btree ("draft_id","position");--> statement-breakpoint
CREATE INDEX "draft_citations_correction_idx" ON "draft_citations" USING btree ("correction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "draft_corrections_draft_position_unique" ON "draft_corrections" USING btree ("draft_id","position");--> statement-breakpoint
CREATE INDEX "draft_corrections_review_idx" ON "draft_corrections" USING btree ("draft_id","review_status");