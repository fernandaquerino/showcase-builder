CREATE TABLE "extraction_rate_limits" (
	"user_id" uuid NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "extraction_rate_limits_user_id_window_start_pk" PRIMARY KEY("user_id","window_start")
);
--> statement-breakpoint
CREATE TABLE "product_extraction_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url_hash" text NOT NULL,
	"source_url" text NOT NULL,
	"final_url" text,
	"name" text,
	"image_url" text,
	"price" numeric(12, 2),
	"color" text,
	"metadata" jsonb,
	"extraction_source" text,
	"status" text NOT NULL,
	"error_code" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_extraction_cache_url_hash_unique" UNIQUE("url_hash")
);
--> statement-breakpoint
ALTER TABLE "extraction_rate_limits" ADD CONSTRAINT "extraction_rate_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extraction_rate_limits_window_idx" ON "extraction_rate_limits" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "extraction_cache_expires_at_idx" ON "product_extraction_cache" USING btree ("expires_at");