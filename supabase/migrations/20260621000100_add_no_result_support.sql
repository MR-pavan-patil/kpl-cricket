-- Migration to add No Result (NR) match support
ALTER TABLE matches
ADD COLUMN result_type text 
CHECK (result_type IN ('win', 'loss', 'tie', 'no_result'));

ALTER TABLE matches
ADD COLUMN match_abandon_reason text;

-- Populate result_type for existing completed matches
UPDATE matches 
SET result_type = 'win' 
WHERE status = 'completed' AND winner_id IS NOT NULL;

UPDATE matches 
SET result_type = 'tie' 
WHERE status = 'completed' AND winner_id IS NULL;
