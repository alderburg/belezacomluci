
CREATE TABLE IF NOT EXISTS "api_settings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "google_client_id" text,
  "google_client_secret" text,
  "youtube_api_key" text,
  "youtube_channel_id" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "api_settings_user_id_unique" UNIQUE("user_id")
);
