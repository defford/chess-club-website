-- Add player_school column to event_registrations table
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS player_school TEXT;
