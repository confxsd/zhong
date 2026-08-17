CREATE TABLE IF NOT EXISTS vocab (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  hanzi         TEXT NOT NULL UNIQUE,
  pinyin        TEXT NOT NULL DEFAULT '',
  meaning       TEXT NOT NULL DEFAULT '',
  example       TEXT NOT NULL DEFAULT '',
  example_trans TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','learning','known')),
  box           INTEGER NOT NULL DEFAULT 0,
  review_count  INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  next_review_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  input_text    TEXT NOT NULL,
  pinyin        TEXT NOT NULL DEFAULT '',
  translation   TEXT NOT NULL DEFAULT '',
  segments      TEXT NOT NULL DEFAULT '[]',
  breakdown     TEXT NOT NULL DEFAULT '[]',
  grammar       TEXT NOT NULL DEFAULT '[]',
  notes         TEXT NOT NULL DEFAULT '[]',
  recognized    TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS session_vocab (
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  vocab_id   INTEGER NOT NULL REFERENCES vocab(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, vocab_id)
);

CREATE TABLE IF NOT EXISTS review_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  vocab_id    INTEGER NOT NULL REFERENCES vocab(id) ON DELETE CASCADE,
  grade       TEXT NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip           TEXT PRIMARY KEY,
  window_start TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vocab_status ON vocab(status);
CREATE INDEX IF NOT EXISTS idx_vocab_next_review ON vocab(next_review_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_log_date ON review_log(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
