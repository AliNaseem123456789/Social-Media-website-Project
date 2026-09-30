-- Triage columns on the report queue.
--
-- A moderator opening the queue sees reports in the order they arrived, which means a death threat waits
-- behind forty reports of "I disagree with this". These columns hold a model's opinion about urgency so
-- the queue can be sorted by it.
--
-- The verdict is advisory and nothing acts on it automatically. `remove` means "a human should look at
-- this first", not "this was removed" — the existing status column still decides what actually happens,
-- and only a moderator writes to that.
--
-- Additive only: every column is nullable, so a report triaged before this ran, or one the model never
-- saw, is simply untriaged rather than wrong.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS triage_verdict    text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS triage_confidence real;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS triage_reason     text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS triage_source     text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS triaged_at        timestamptz;

-- Only the three verdicts, so a typo in application code cannot invent a fourth that the queue's sort
-- then silently drops to the bottom.
DO $$
BEGIN
  ALTER TABLE reports
  ADD CONSTRAINT reports_triage_verdict_check
  CHECK (triage_verdict IS NULL OR triage_verdict IN ('allow', 'review', 'remove'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- The queue's own query: open reports, most urgent first.
CREATE INDEX IF NOT EXISTS reports_triage_idx ON reports (status, triage_verdict, created_at DESC);

-- Finding what still needs triaging, for the catch-up pass over reports filed while the model was down.
CREATE INDEX IF NOT EXISTS reports_untriaged_idx ON reports (created_at) WHERE triaged_at IS NULL;
