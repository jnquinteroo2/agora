ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "sin_correo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "idp_pendiente" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "idp_intentos" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "idp_ultimo_intento" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usuario_idp_pendiente" ON "usuario" ("idp_pendiente") WHERE "idp_pendiente";
