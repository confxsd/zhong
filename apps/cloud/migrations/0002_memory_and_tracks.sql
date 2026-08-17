-- Memory spine (FSRS) + structured curriculum tracks.
ALTER TABLE vocab ADD COLUMN fsrs_state TEXT;
ALTER TABLE sessions ADD COLUMN kind TEXT NOT NULL DEFAULT 'teach';

CREATE TABLE IF NOT EXISTS tracks (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  slug     TEXT NOT NULL UNIQUE,
  title    TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  kind     TEXT NOT NULL DEFAULT 'hsk',
  meta     TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS track_items (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  sort     INTEGER NOT NULL,
  type     TEXT NOT NULL CHECK (type IN ('word','grammar')),
  payload  TEXT NOT NULL,
  UNIQUE (track_id, sort)
);

CREATE TABLE IF NOT EXISTS track_progress (
  track_id   INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES track_items(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','learning','done')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (track_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_track_items_track ON track_items(track_id);
CREATE INDEX IF NOT EXISTS idx_track_progress_item ON track_progress(item_id);
