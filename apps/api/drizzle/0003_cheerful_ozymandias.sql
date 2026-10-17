CREATE TABLE "knowledge_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalogue_item_id" uuid NOT NULL,
	"title" varchar(240) NOT NULL,
	"status" "resource_status" DEFAULT 'draft' NOT NULL,
	"trust_tier" "source_trust_tier" NOT NULL,
	"source_title" varchar(300) NOT NULL,
	"source_publisher" varchar(200) NOT NULL,
	"source_url" text,
	"source_excerpt" text NOT NULL,
	"content" jsonb NOT NULL,
	"correction_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_catalogue_item_id_catalogue_items_id_fk" FOREIGN KEY ("catalogue_item_id") REFERENCES "public"."catalogue_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_cards" ADD CONSTRAINT "knowledge_cards_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_cards_catalogue_item_unique" ON "knowledge_cards" USING btree ("catalogue_item_id");--> statement-breakpoint
CREATE INDEX "knowledge_cards_status_updated_idx" ON "knowledge_cards" USING btree ("status","updated_at");