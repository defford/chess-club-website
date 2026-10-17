-- Track annual club registration without duplicating parent/student records.
CREATE TABLE IF NOT EXISTS season_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_key TEXT NOT NULL,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'withdrawn')),
  participation_consent BOOLEAN NOT NULL DEFAULT false,
  photo_consent BOOLEAN NOT NULL DEFAULT false,
  values_acknowledgment BOOLEAN NOT NULL DEFAULT false,
  newsletter BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_key, student_id)
);

CREATE INDEX IF NOT EXISTS idx_season_enrollments_season
  ON season_enrollments(season_key);
CREATE INDEX IF NOT EXISTS idx_season_enrollments_parent
  ON season_enrollments(parent_id);
CREATE INDEX IF NOT EXISTS idx_season_enrollments_student
  ON season_enrollments(student_id);

ALTER TABLE season_enrollments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_season_enrollments_updated_at
  BEFORE UPDATE ON season_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Link verified Supabase Auth users to one or more legacy parent records.
CREATE TABLE IF NOT EXISTS parent_auth_links (
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (auth_user_id, parent_id),
  UNIQUE (parent_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_auth_links_user
  ON parent_auth_links(auth_user_id);

ALTER TABLE parent_auth_links ENABLE ROW LEVEL SECURITY;
