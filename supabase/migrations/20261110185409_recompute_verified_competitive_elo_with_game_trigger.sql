-- Verified club Elo: all-time K=32, initial rating 1000.
-- Replay only verified competitive games between identifiable opponents.
-- The same replay is triggered once per statement on new, edited, verified or deleted games.
-- Statement-level trigger avoids O(n) recalculations for batch imports.

CREATE OR REPLACE FUNCTION public.recompute_club_elo()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  g record;
  ratings jsonb := '{}'::jsonb;
  r1 integer;
  r2 integer;
  e1 double precision;
  s1 double precision;
  d1 integer;
  d2 integer;
  changes jsonb;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(746211, 927);
  FOR g IN
    SELECT id, player1_id, player2_id, result
    FROM public.games
    WHERE is_verified IS TRUE
      AND game_type IN ('ladder', 'tournament')
      AND player1_id <> player2_id
      AND player1_id <> 'unknown_opponent'
      AND player2_id <> 'unknown_opponent'
    ORDER BY game_date, coalesce(game_time, 0), coalesce(recorded_at, created_at), id
  LOOP
    r1 := coalesce((ratings ->> g.player1_id)::integer, 1000);
    r2 := coalesce((ratings ->> g.player2_id)::integer, 1000);
    e1 := 1.0 / (1.0 + pg_catalog.power(10.0::double precision, (r2 - r1)::double precision / 400.0));
    s1 := CASE g.result WHEN 'player1' THEN 1.0 WHEN 'player2' THEN 0.0 ELSE 0.5 END;
    -- floor(value + 0.5) matches JavaScript Math.round, including negative half-point ties.
    d1 := pg_catalog.floor(32.0 * (s1 - e1) + 0.5)::integer;
    d2 := pg_catalog.floor(32.0 * ((1.0 - s1) - (1.0 - e1)) + 0.5)::integer;
    ratings := pg_catalog.jsonb_set(ratings, ARRAY[g.player1_id], pg_catalog.to_jsonb(r1 + d1), true);
    ratings := pg_catalog.jsonb_set(ratings, ARRAY[g.player2_id], pg_catalog.to_jsonb(r2 + d2), true);
    changes := pg_catalog.jsonb_build_object('player1', d1, 'player2', d2);

    UPDATE public.games
       SET rating_change = changes
     WHERE id = g.id
       AND rating_change IS DISTINCT FROM changes;
  END LOOP;

  -- Excluded results should not misleadingly retain historic Elo changes.
  UPDATE public.games
     SET rating_change = NULL
   WHERE rating_change IS NOT NULL
     AND NOT (
       is_verified IS TRUE
       AND game_type IN ('ladder', 'tournament')
       AND player1_id <> player2_id
       AND player1_id <> 'unknown_opponent'
       AND player2_id <> 'unknown_opponent'
     );

  -- Single final update: no compounding and no double counting on replay.
  UPDATE public.students AS s
     SET elo_rating = coalesce((ratings ->> s.id)::integer, 1000)
   WHERE s.elo_rating IS DISTINCT FROM coalesce((ratings ->> s.id)::integer, 1000);
END
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_club_elo_after_game_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM public.recompute_club_elo();
  RETURN NULL;
END
$function$
;

DROP TRIGGER IF EXISTS refresh_club_elo_after_game_change ON public.games;
CREATE TRIGGER refresh_club_elo_after_game_change
AFTER INSERT OR DELETE OR UPDATE OF
  player1_id, player2_id, result, game_date, game_time, game_type, is_verified
ON public.games
FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_club_elo_after_game_change();

REVOKE ALL ON FUNCTION public.recompute_club_elo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_club_elo_after_game_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_club_elo() TO service_role;

SELECT public.recompute_club_elo();
