-- Add stage column to matches table to support knockout stages
ALTER TABLE matches 
ADD COLUMN stage text 
CHECK (stage IN ('league', 'quarter_final', 'semi_final_1', 'semi_final_2', 'final')) 
DEFAULT 'league' 
NOT NULL;
