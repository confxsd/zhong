-- Songs: dedicated song study. Lyrics are glossed line-by-line once (pinyin +
-- translation) and each line can then be taught through the existing teach
-- pipeline, so its words enter the shared vocab table and FSRS review queue.
CREATE TABLE IF NOT EXISTS songs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  artist     TEXT NOT NULL DEFAULT '',
  lyrics     TEXT NOT NULL,
  gloss      TEXT NOT NULL DEFAULT '[]',
  notes      TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS song_study (
  song_id    INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  line_idx   INTEGER NOT NULL,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  studied_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (song_id, line_idx)
);

CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_study_session ON song_study(session_id);
