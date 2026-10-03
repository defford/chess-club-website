-- Follow-up hardening for Muse schema after advisor review.

CREATE INDEX IF NOT EXISTS idx_player_events_muse_action
  ON player_events(muse_action_id);

CREATE INDEX IF NOT EXISTS idx_achievements_game
  ON achievements(game_id);

CREATE INDEX IF NOT EXISTS idx_achievements_source_event
  ON achievements(source_event_id);

ALTER FUNCTION public.recalculate_all_elo_ratings()
  SET search_path = public;
