ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS recording_link text,
  ADD COLUMN IF NOT EXISTS source_file_name text,
  ADD COLUMN IF NOT EXISTS source_file_text text,
  ADD COLUMN IF NOT EXISTS recruiter_observations text,
  ADD COLUMN IF NOT EXISTS analysis_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz;