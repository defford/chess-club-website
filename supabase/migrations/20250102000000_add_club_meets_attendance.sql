-- Add club meets and attendance tracking tables
-- This migration adds support for tracking attendance at club meets

-- Club meets table
CREATE TABLE IF NOT EXISTS club_meets (
  id TEXT PRIMARY KEY,
  meet_date DATE NOT NULL,
  meet_name TEXT,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meet_id TEXT NOT NULL REFERENCES club_meets(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(meet_id, player_id)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_club_meets_date ON club_meets(meet_date);
CREATE INDEX IF NOT EXISTS idx_club_meets_created_at ON club_meets(created_at);
CREATE INDEX IF NOT EXISTS idx_attendance_meet_id ON attendance(meet_id);
CREATE INDEX IF NOT EXISTS idx_attendance_player_id ON attendance(player_id);

-- Add updated_at trigger for club_meets
CREATE TRIGGER update_club_meets_updated_at BEFORE UPDATE ON club_meets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

