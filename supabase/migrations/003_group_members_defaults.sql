-- Migration 003: Ensure group_members extra columns have safe defaults
-- These columns may have been added via SQL editor without defaults

ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS payment_date timestamptz;

-- Update existing rows that might have null values (safety net)
UPDATE group_members SET enabled = true WHERE enabled IS NULL;
UPDATE group_members SET payment_status = 'free' WHERE payment_status IS NULL;
