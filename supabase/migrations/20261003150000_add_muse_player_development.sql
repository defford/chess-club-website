-- Muse voice/event infrastructure and persistent player development records.
-- All writes stay server-side through the service role. Public/client roles receive no direct table access.

CREATE TABLE IF NOT EXISTS muse_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type TEXT NOT NULL,
  transcript TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'reversed', 'failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  reversed_by TEXT
);

CREATE TABLE IF NOT EXISTS player_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  muse_action_id UUID REFERENCES muse_actions(id) ON DELETE SET NULL,
  player_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  activity TEXT,
  skill_key TEXT,
  value_numeric NUMERIC,
  value_text TEXT,
  notes TEXT,
  meet_id TEXT REFERENCES club_meets(id) ON DELETE SET NULL,
  game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'muse_voice',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  recorded_by TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_at TIMESTAMPTZ,
  reversed_by TEXT,
  reversal_reason TEXT
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL,
  game_id TEXT REFERENCES games(id) ON DELETE SET NULL,
  source_event_id UUID REFERENCES player_events(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_muse_actions_created_at
  ON muse_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_muse_actions_status
  ON muse_actions(status);
CREATE INDEX IF NOT EXISTS idx_player_events_player_recorded
  ON player_events(player_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_events_skill
  ON player_events(player_id, skill_key)
  WHERE reversed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_player_events_meet
  ON player_events(meet_id);
CREATE INDEX IF NOT EXISTS idx_player_events_game
  ON player_events(game_id);
CREATE INDEX IF NOT EXISTS idx_achievements_player_earned
  ON achievements(player_id, earned_at DESC);

ALTER TABLE muse_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Club meets/attendance were created before RLS was added. They are only accessed
-- through server routes today, so lock them to the service role as well.
ALTER TABLE club_meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE muse_actions, player_events, achievements, club_meets, attendance
  FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE muse_actions, player_events, achievements, club_meets, attendance
  TO service_role;

-- Correct, deterministic ELO rebuild used when a Muse-recorded game is undone.
CREATE OR REPLACE FUNCTION public.recalculate_all_elo_ratings()
RETURNS TABLE(processed INTEGER, errors INTEGER)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  game_record RECORD;
  player1_rating INTEGER;
  player2_rating INTEGER;
  player1_new_rating INTEGER;
  player2_new_rating INTEGER;
  changes RECORD;
  processed_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  UPDATE students SET elo_rating = 1000;
  UPDATE games SET rating_change = NULL;

  FOR game_record IN
    SELECT id, player1_id, player2_id, result
    FROM games
    WHERE is_verified = true
    ORDER BY game_date ASC, created_at ASC
  LOOP
    BEGIN
      SELECT COALESCE(elo_rating, 1000)
      INTO player1_rating
      FROM students
      WHERE id = game_record.player1_id;

      SELECT COALESCE(elo_rating, 1000)
      INTO player2_rating
      FROM students
      WHERE id = game_record.player2_id;

      player1_rating := COALESCE(player1_rating, 1000);
      player2_rating := COALESCE(player2_rating, 1000);

      SELECT * INTO changes
      FROM calculate_elo_change(player1_rating, player2_rating, game_record.result);

      player1_new_rating := player1_rating + changes.player1_change;
      player2_new_rating := player2_rating + changes.player2_change;

      UPDATE students SET elo_rating = player1_new_rating
      WHERE id = game_record.player1_id;
      UPDATE students SET elo_rating = player2_new_rating
      WHERE id = game_record.player2_id;

      UPDATE games
      SET rating_change = jsonb_build_object(
        'player1', changes.player1_change,
        'player2', changes.player2_change
      )
      WHERE id = game_record.id;

      processed_count := processed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT processed_count, error_count;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_all_elo_ratings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_all_elo_ratings() TO service_role;
