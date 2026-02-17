-- Migration 0008: Drop unused legacy tables
-- The `games` and `level_configs` tables were superseded by
-- campaign_episodes + campaign_levels in migration 0006.

DROP TABLE IF EXISTS "level_configs";
DROP TABLE IF EXISTS "games";
