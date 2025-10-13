CREATE TABLE "video_likes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"video_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "page" text DEFAULT 'home' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "video_id" varchar;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "show_title" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "show_description" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "show_button" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "product_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "video_likes" ADD CONSTRAINT "video_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_likes" ADD CONSTRAINT "video_likes_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" DROP COLUMN "views";