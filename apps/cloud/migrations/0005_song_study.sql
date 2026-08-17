-- Whole-song study: one AI call teaches every line. Per-line grammar/notes
-- and the song-level character breakdown are stored on the song row; one
-- session is created per line for history and review context.
ALTER TABLE songs ADD COLUMN study TEXT NOT NULL DEFAULT '[]';
