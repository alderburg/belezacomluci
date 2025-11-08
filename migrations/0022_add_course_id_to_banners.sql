
-- Add courseId field to banners table for course-specific banners
ALTER TABLE "banners" ADD COLUMN IF NOT EXISTS "course_id" varchar;

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "banners" ADD CONSTRAINT "banners_course_id_products_id_fk" FOREIGN KEY ("course_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
