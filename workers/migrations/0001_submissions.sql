PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor_id INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  issue_number INTEGER UNIQUE,
  created_at TEXT NOT NULL,
  status_json TEXT,
  status_checked_at INTEGER
);
CREATE TABLE IF NOT EXISTS submission_operations (
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  operation_key TEXT NOT NULL,
  operation_id TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  kind TEXT NOT NULL,
  revision INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending','sending','uncertain','completed','failed')),
  created_at TEXT NOT NULL,
  result_json TEXT,
  PRIMARY KEY (submission_id, operation_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_submission_operation
  ON submission_operations(submission_id) WHERE state IN ('pending','sending','uncertain');
CREATE INDEX IF NOT EXISTS pending_submission_operations ON submission_operations(state, created_at);
