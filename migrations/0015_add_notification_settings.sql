
CREATE TABLE "notification_settings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL UNIQUE,
  "email_enabled" boolean DEFAULT true,
  "whatsapp_enabled" boolean DEFAULT false,
  "sms_enabled" boolean DEFAULT false,
  "sound_enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

ALTER TABLE "notification_settings" 
ADD CONSTRAINT "notification_settings_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") 
ON DELETE no action ON UPDATE no action;
