-- Column + unique index were added by 0002_sessions_dedup.sql; this migration
-- only exists to keep the bookkeeping aligned on databases created before it.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_input_norm ON sessions(input_norm);
