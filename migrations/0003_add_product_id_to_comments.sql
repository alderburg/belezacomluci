
-- Migration: Add product_id column to comments table
ALTER TABLE comments ADD COLUMN product_id varchar;

-- Add foreign key constraint
ALTER TABLE comments ADD CONSTRAINT comments_product_id_products_id_fk 
FOREIGN KEY (product_id) REFERENCES products(id);
