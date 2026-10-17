CREATE TYPE "public"."revision_assessment" AS ENUM('difficult', 'fragile', 'comfortable', 'mastered');--> statement-breakpoint
CREATE TABLE "topic_revision_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"catalogue_item_id" uuid NOT NULL,
	"assessment" "revision_assessment" NOT NULL,
	"note" text,
	"reviewed_at" timestamp with time zone NOT NULL,
	"next_review_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topic_revision_reviews" ADD CONSTRAINT "topic_revision_reviews_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_revision_reviews" ADD CONSTRAINT "topic_revision_reviews_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "topic_revision_reviews_student_next_idx" ON "topic_revision_reviews" USING btree ("student_id","next_review_at");--> statement-breakpoint
CREATE INDEX "topic_revision_reviews_student_item_idx" ON "topic_revision_reviews" USING btree ("student_id","catalogue_item_id","reviewed_at");