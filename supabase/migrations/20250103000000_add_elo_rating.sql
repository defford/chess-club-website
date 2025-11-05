-- Add ELO rating system to students table
-- This migration adds ELO rating support where all players start at 1000

-- Add elo_rating column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000;

-- Initialize all existing students with 1000 ELO rating
UPDATE students SET elo_rating = 1000 WHERE elo_rating IS NULL;

-- Create index on elo_rating for efficient queries
CREATE INDEX IF NOT EXISTS idx_students_elo_rating ON students(elo_rating);


