CREATE TABLE public.candidate_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  compatibility integer,
  confidence integer NOT NULL DEFAULT 0,
  conclusive boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by text NOT NULL DEFAULT 'IA',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_analyses TO authenticated;
GRANT ALL ON public.candidate_analyses TO service_role;
ALTER TABLE public.candidate_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members manage analyses" ON public.candidate_analyses FOR ALL TO authenticated
  USING (public.is_company_member(company_id)) WITH CHECK (public.is_company_member(company_id));
CREATE INDEX candidate_analyses_candidate_idx ON public.candidate_analyses(candidate_id, created_at DESC);