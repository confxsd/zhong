-- Session dedup: normalized input key (backfilled in code on write).
ALTER TABLE sessions ADD COLUMN input_norm TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_input_norm ON sessions(input_norm);
