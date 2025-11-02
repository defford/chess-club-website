-- Initial schema migration for Chess Club Website
-- This migration creates all tables matching the Google Sheets structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Parents table (from parents sheet)
CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  hear_about_us TEXT,
  provincial_interest TEXT,
  volunteer_interest TEXT,
  consent BOOLEAN DEFAULT false,
  photo_consent BOOLEAN DEFAULT false,
  values_acknowledgment BOOLEAN DEFAULT false,
  newsletter BOOLEAN DEFAULT false,
  create_account BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  registration_type TEXT CHECK (registration_type IN ('parent', 'self')),
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table (from students sheet)
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age TEXT,
  grade TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  medical_info TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy registrations table (from registrations sheet - for historical reference)
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  player_name TEXT,
  player_age TEXT,
  player_grade TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  medical_info TEXT,
  hear_about_us TEXT,
  provincial_interest TEXT,
  volunteer_interest TEXT,
  consent TEXT,
  photo_consent TEXT,
  values_acknowledgment TEXT,
  newsletter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (from events sheet)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME,
  location TEXT,
  participants INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 0,
  description TEXT,
  category TEXT CHECK (category IN ('tournament', 'workshop', 'training', 'social')),
  age_groups TEXT,
  status TEXT CHECK (status IN ('active', 'cancelled', 'completed')) DEFAULT 'active',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event registrations table (from event registrations sheet)
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_grade TEXT,
  additional_notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table (from games sheet)
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  player1_id TEXT NOT NULL,
  player1_name TEXT NOT NULL,
  player2_id TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  result TEXT CHECK (result IN ('player1', 'player2', 'draw')) NOT NULL,
  game_date DATE NOT NULL,
  game_time INTEGER DEFAULT 0, -- Duration in minutes
  game_type TEXT CHECK (game_type IN ('ladder', 'tournament', 'friendly', 'practice')) NOT NULL,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  notes TEXT,
  recorded_by TEXT NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  opening TEXT,
  endgame TEXT,
  rating_change JSONB, -- {player1: number, player2: number}
  is_verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player ownership table (from player_ownership sheet)
CREATE TABLE IF NOT EXISTS player_ownership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  player_email TEXT,
  owner_parent_id TEXT REFERENCES parents(id) ON DELETE CASCADE,
  pending_parent_id TEXT REFERENCES parents(id) ON DELETE SET NULL,
  approval_status TEXT CHECK (approval_status IN ('none', 'pending', 'approved', 'denied')) DEFAULT 'none',
  claim_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournaments table (from tournaments sheet)
CREATE TABLE IF NOT EXISTS tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')) DEFAULT 'upcoming',
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER NOT NULL,
  player_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  current_pairings JSONB, -- JSON string of current round pairings
  current_forced_byes JSONB, -- JSON string of current round forced byes
  current_half_point_byes JSONB -- JSON string of current round half-point byes
);

-- Tournament results table (from tournament_results sheet)
CREATE TABLE IF NOT EXISTS tournament_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  points NUMERIC(10, 2) DEFAULT 0,
  buchholz_score NUMERIC(10, 2) DEFAULT 0,
  opponents_faced TEXT[] DEFAULT ARRAY[]::TEXT[],
  bye_rounds INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  rank INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  withdrawn BOOLEAN DEFAULT false,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_parents_email ON parents(email);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_player_name ON event_registrations(player_name);
CREATE INDEX IF NOT EXISTS idx_games_player1_id ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2_id ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_game_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_game_type ON games(game_type);
CREATE INDEX IF NOT EXISTS idx_games_event_id ON games(event_id);
CREATE INDEX IF NOT EXISTS idx_player_ownership_player_id ON player_ownership(player_id);
CREATE INDEX IF NOT EXISTS idx_player_ownership_owner_parent_id ON player_ownership(owner_parent_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_player_id ON tournament_results(player_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_ownership_updated_at BEFORE UPDATE ON player_ownership
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournament_results_updated_at BEFORE UPDATE ON tournament_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for player rankings (calculated from games)
CREATE OR REPLACE VIEW player_rankings AS
WITH player_stats AS (
  SELECT 
    COALESCE(player1_id, player2_id) as player_id,
    COALESCE(player1_name, player2_name) as player_name,
    COUNT(*) as games_played,
    SUM(CASE 
      WHEN (result = 'player1' AND player1_id = COALESCE(player1_id, player2_id)) OR
           (result = 'player2' AND player2_id = COALESCE(player1_id, player2_id))
      THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN result = 'draw' THEN 1 ELSE 0 END) as draws,
    SUM(CASE 
      WHEN (result = 'player2' AND player1_id = COALESCE(player1_id, player2_id)) OR
           (result = 'player1' AND player2_id = COALESCE(player1_id, player2_id))
      THEN 1 ELSE 0 END) as losses,
    MAX(game_date) as last_active
  FROM games
  WHERE game_type = 'ladder' AND is_verified = true
  GROUP BY player_id, player_name
)
SELECT 
  player_id as id,
  player_name as name,
  '' as grade, -- Will be populated from students table if needed
  games_played,
  wins,
  draws,
  losses,
  (wins * 1.0 + draws * 0.5) as points,
  last_active::TEXT,
  ROW_NUMBER() OVER (ORDER BY (wins * 1.0 + draws * 0.5) DESC, wins DESC) as rank
FROM player_stats
WHERE games_played > 0
ORDER BY points DESC, wins DESC;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations for service role (server-side)
-- In production, you may want to add more restrictive policies
-- For now, we'll allow all reads and writes from authenticated service

-- Policy: Allow all operations for service role (bypasses RLS)
-- Note: Service role key bypasses RLS automatically, so these policies are for future client-side use

-- Public read access for events (public events)
CREATE POLICY "Events are viewable by everyone" ON events
  FOR SELECT USING (true);

-- Public read access for games (public games)
CREATE POLICY "Games are viewable by everyone" ON games
  FOR SELECT USING (true);

-- Public read access for tournaments (public tournaments)
CREATE POLICY "Tournaments are viewable by everyone" ON tournaments
  FOR SELECT USING (true);

-- Public read access for tournament results (public results)
CREATE POLICY "Tournament results are viewable by everyone" ON tournament_results
  FOR SELECT USING (true);

-- Parents can view their own data
CREATE POLICY "Parents can view own data" ON parents
  FOR SELECT USING (true); -- Will be filtered by application logic using email

-- Students are viewable by their parent
CREATE POLICY "Students are viewable by parent" ON students
  FOR SELECT USING (true); -- Will be filtered by application logic

-- Player ownership is viewable by owner
CREATE POLICY "Player ownership is viewable by owner" ON player_ownership
  FOR SELECT USING (true); -- Will be filtered by application logic

-- For write operations, we'll rely on server-side authentication
-- In a production environment, you'd add more specific policies here

