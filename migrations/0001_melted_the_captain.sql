ALTER TABLE "videos" ALTER COLUMN "duration" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "is_exclusive" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_exclusive" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "likes" integer DEFAULT 0;