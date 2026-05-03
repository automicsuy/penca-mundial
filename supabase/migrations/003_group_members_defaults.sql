-- Migration 003: Ensure group_members extra columns have safe defaults
-- These columns may have been added via SQL editor without defaults

ALTER TABLE group_members
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS payment_date timestamptz;

-- Update existing rows that might have null values (safety net)
UPDATE group_members SET enabled = true WHERE enabled IS NULL;
UPDATE group_members SET payment_status = 'free' WHERE payment_status IS NULL;

-- Fix leaderboard view: exclude disabled/rejected members
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    gm.group_id,
    gm.user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(pred.points_earned), 0) AS total_points,
    COUNT(pred.id) FILTER (WHERE pred.points_earned > 0) AS predictions_with_points,
    COUNT(pred.id) AS total_predictions,
    RANK() OVER (
      PARTITION BY gm.group_id
      ORDER BY COALESCE(SUM(pred.points_earned), 0) DESC
    ) AS rank
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  LEFT JOIN predictions pred ON pred.user_id = gm.user_id
    AND pred.group_id = gm.group_id
  WHERE gm.enabled = true
  GROUP BY gm.group_id, gm.user_id, p.full_name, p.avatar_url;
