import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config.js";

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
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

CREATE INDEX IF NOT EXISTS idx_vocab_status ON vocab(status);
CREATE INDEX IF NOT EXISTS idx_vocab_next_review ON vocab(next_review_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_log_date ON review_log(reviewed_at);
`);

export type VocabRow = {
  id: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  example: string;
  example_trans: string;
  status: "new" | "learning" | "known";
  box: number;
  review_count: number;
  correct_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string;
};