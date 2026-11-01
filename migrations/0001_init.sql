-- One row per participant (upsert by client-generated id). The whole answer sheet is kept as JSON
-- so the survey can change between workshop rounds without a schema migration.
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS responses_created ON responses (created_at);
