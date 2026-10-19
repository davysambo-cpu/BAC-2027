ALTER TABLE "catalogue_items" ADD COLUMN "admin_series_d_scope" "series_scope_status";--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD COLUMN "validation_note" text;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD COLUMN "validation_source_url" text;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD COLUMN "validated_by" uuid;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD COLUMN "validated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD COLUMN "validation_version" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogue_items" ADD CONSTRAINT "catalogue_items_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalogue_items_admin_validation_idx" ON "catalogue_items" USING btree ("admin_series_d_scope","validation_status","is_active");