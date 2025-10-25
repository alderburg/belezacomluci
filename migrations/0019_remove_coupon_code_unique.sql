
-- Remove unique constraint from coupons.code
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_code_unique;
