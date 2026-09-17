ALTER TABLE "ba_account" ADD COLUMN IF NOT EXISTS "issuer" text;--> statement-breakpoint

UPDATE "ba_account" SET "issuer" = 'local:' || "provider_id" WHERE "issuer" IS NULL;--> statement-breakpoint

ALTER TABLE "ba_account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "ba_user" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint

ALTER TABLE "ba_two_factor" ADD COLUMN IF NOT EXISTS "verified" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "ba_two_factor" ADD COLUMN IF NOT EXISTS "failed_verification_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ba_two_factor" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;
