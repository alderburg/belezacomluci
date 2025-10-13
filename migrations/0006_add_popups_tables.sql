
CREATE TABLE IF NOT EXISTS "popups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"link_url" text,
	"trigger" text NOT NULL,
	"target_page" text,
	"target_video_id" varchar,
	"show_frequency" text DEFAULT 'always' NOT NULL,
	"is_exclusive" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"start_date_time" timestamp,
	"end_date_time" timestamp,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "popup_views" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" varchar NOT NULL,
	"popup_id" varchar NOT NULL,
	"session_id" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "popups" ADD CONSTRAINT "popups_target_video_id_videos_id_fk" FOREIGN KEY ("target_video_id") REFERENCES "videos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "popup_views" ADD CONSTRAINT "popup_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "popup_views" ADD CONSTRAINT "popup_views_popup_id_popups_id_fk" FOREIGN KEY ("popup_id") REFERENCES "popups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
