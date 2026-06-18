ALTER TABLE "dodas" ADD COLUMN "last_checked_at" timestamp;--> statement-breakpoint
ALTER TABLE "dodas" ADD COLUMN "is_monitored" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dodas" ADD COLUMN "is_resolved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"related_id" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
