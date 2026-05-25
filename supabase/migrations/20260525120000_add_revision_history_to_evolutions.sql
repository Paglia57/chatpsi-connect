-- Adds revision_history to track AI-driven improvements applied to a saved evolution.
-- Each entry stores the version that was REPLACED (the previous content), the prompt that
-- triggered the improvement (text or transcribed audio), and the timestamp. The current
-- version always lives in output_content.

ALTER TABLE public.evolutions
  ADD COLUMN IF NOT EXISTS revision_history JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_evolutions_revision_history_gin
  ON public.evolutions USING GIN (revision_history);
