CREATE TYPE "public"."change_action" AS ENUM('upsert', 'delete');--> statement-breakpoint
CREATE TYPE "public"."change_scope" AS ENUM('private', 'common');--> statement-breakpoint
CREATE TYPE "public"."mutation_kind" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('single_choice', 'multiple_choice');--> statement-breakpoint
CREATE TYPE "public"."quiz_attempt_status" AS ENUM('in_progress', 'submitted', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."quiz_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."resource_kind" AS ENUM('note', 'document', 'image', 'audio', 'video');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."resource_visibility" AS ENUM('private', 'common');--> statement-breakpoint
CREATE TYPE "public"."revision_session_status" AS ENUM('planned', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."sync_mutation_status" AS ENUM('applied', 'conflict', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('invited', 'active', 'disabled');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" uuid,
	"request_id" varchar(120),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"code" varchar(60) NOT NULL,
	"title" varchar(200) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(160) NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_official" boolean DEFAULT false NOT NULL,
	"source_reference" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revision_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"subject_id" uuid,
	"chapter_id" uuid,
	"title" varchar(240) NOT NULL,
	"notes" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"status" "revision_session_status" DEFAULT 'planned' NOT NULL,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attempt_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_ids" uuid[] DEFAULT '{}' NOT NULL,
	"answer_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_correct" boolean,
	"awarded_points" integer,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"type" "question_type" NOT NULL,
	"prompt" text NOT NULL,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "quiz_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"score" integer,
	"maximum_score" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"chapter_id" uuid,
	"title" varchar(240) NOT NULL,
	"description" text,
	"estimated_minutes" integer,
	"status" "quiz_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resource_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" varchar(64),
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"subject_id" uuid,
	"chapter_id" uuid,
	"kind" "resource_kind" NOT NULL,
	"visibility" "resource_visibility" DEFAULT 'private' NOT NULL,
	"status" "resource_status" DEFAULT 'draft' NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"note_content" text,
	"source_reference" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "change_feed" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "change_feed_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"scope" "change_scope" NOT NULL,
	"owner_id" uuid,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_version" integer NOT NULL,
	"action" "change_action" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"label" varchar(120),
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sync_mutations" (
	"operation_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" uuid NOT NULL,
	"kind" "mutation_kind" NOT NULL,
	"base_version" integer,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "sync_mutation_status" NOT NULL,
	"error_code" varchar(80),
	"error_message" text,
	"client_created_at" timestamp with time zone NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"token_hash" text NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"series_code" varchar(20) DEFAULT 'D' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"password_hash" text,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"storage_quota_bytes" bigint DEFAULT 262144000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"disabled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD CONSTRAINT "revision_sessions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD CONSTRAINT "revision_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD CONSTRAINT "revision_sessions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_feed" ADD CONSTRAINT "change_feed_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_mutations" ADD CONSTRAINT "sync_mutations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_mutations" ADD CONSTRAINT "sync_mutations_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_actor_created_idx" ON "admin_audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_idx" ON "admin_audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_subject_code_unique" ON "chapters" USING btree ("subject_id","code");--> statement-breakpoint
CREATE INDEX "chapters_subject_order_idx" ON "chapters" USING btree ("subject_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_code_unique" ON "subjects" USING btree ("code");--> statement-breakpoint
CREATE INDEX "subjects_order_idx" ON "subjects" USING btree ("position");--> statement-breakpoint
CREATE INDEX "revision_sessions_student_date_idx" ON "revision_sessions" USING btree ("student_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "revision_sessions_student_status_idx" ON "revision_sessions" USING btree ("student_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_answers_attempt_question_unique" ON "attempt_answers" USING btree ("attempt_id","question_id");--> statement-breakpoint
CREATE INDEX "attempt_answers_attempt_idx" ON "attempt_answers" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "question_options_question_position_unique" ON "question_options" USING btree ("question_id","position");--> statement-breakpoint
CREATE INDEX "question_options_question_idx" ON "question_options" USING btree ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_quiz_position_unique" ON "questions" USING btree ("quiz_id","position");--> statement-breakpoint
CREATE INDEX "questions_quiz_idx" ON "questions" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_student_created_idx" ON "quiz_attempts" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "quiz_attempts_quiz_status_idx" ON "quiz_attempts" USING btree ("quiz_id","status");--> statement-breakpoint
CREATE INDEX "quizzes_subject_status_idx" ON "quizzes" USING btree ("subject_id","status");--> statement-breakpoint
CREATE INDEX "quizzes_published_at_idx" ON "quizzes" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_files_storage_key_unique" ON "resource_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "resource_files_resource_idx" ON "resource_files" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "resources_owner_updated_idx" ON "resources" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "resources_subject_chapter_idx" ON "resources" USING btree ("subject_id","chapter_id");--> statement-breakpoint
CREATE INDEX "resources_visibility_status_idx" ON "resources" USING btree ("visibility","status");--> statement-breakpoint
CREATE INDEX "change_feed_private_cursor_idx" ON "change_feed" USING btree ("owner_id","id");--> statement-breakpoint
CREATE INDEX "change_feed_common_cursor_idx" ON "change_feed" USING btree ("scope","id");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_user_client_unique" ON "devices" USING btree ("user_id","client_id");--> statement-breakpoint
CREATE INDEX "devices_user_last_seen_idx" ON "devices" USING btree ("user_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "sync_mutations_user_applied_idx" ON "sync_mutations" USING btree ("user_id","applied_at");--> statement-breakpoint
CREATE INDEX "sync_mutations_entity_idx" ON "sync_mutations" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invitations_token_hash_unique" ON "invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "invitations_username_idx" ON "invitations" USING btree ("username");--> statement-breakpoint
CREATE INDEX "invitations_expires_at_idx" ON "invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "users_role_status_idx" ON "users" USING btree ("role","status");