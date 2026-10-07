-- ==============================================================================
-- KPL CRICKET: SEASON 2 PLAYER TRANSFER & HISTORICAL DATA PRESERVATION MIGRATION
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Make team_id NULLABLE in players table so players can be released / free agents
--    without deleting them or losing their historical stats!
ALTER TABLE players ALTER COLUMN team_id DROP NOT NULL;

-- 2. Drop the existing foreign key constraint if it was CASCADE
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_id_fkey;

-- 3. Re-add foreign key with ON DELETE SET NULL so deleting a team NEVER deletes players
ALTER TABLE players 
  ADD CONSTRAINT players_team_id_fkey 
  FOREIGN KEY (team_id) 
  REFERENCES teams(id) 
  ON DELETE SET NULL;

-- 4. In match_players, ensure player_id is preserved
ALTER TABLE match_players DROP CONSTRAINT IF EXISTS match_players_player_id_fkey;
ALTER TABLE match_players 
  ADD CONSTRAINT match_players_player_id_fkey 
  FOREIGN KEY (player_id) 
  REFERENCES players(id) 
  ON DELETE CASCADE;

-- 5. Add an index on players(team_id) for faster squad lookups
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- 6. Add is_active column if not present (default true)
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
