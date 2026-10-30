ALTER TABLE public.job_requirements
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS detail jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.job_questions
  ADD COLUMN IF NOT EXISTS answer_type text NOT NULL DEFAULT 'selecao_unica',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sugerida',
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS origin_type text,
  ADD COLUMN IF NOT EXISTS origin_label text,
  ADD COLUMN IF NOT EXISTS related_competency text,
  ADD COLUMN IF NOT EXISTS related_skill text;

UPDATE public.job_questions SET status = 'aprovada' WHERE status = 'sugerida';
UPDATE public.job_questions SET answer_type = 'selecao_unica' WHERE answer_type IS NULL;

UPDATE public.job_requirements SET category = 'equipamento'
  WHERE category = 'outro' AND (description ILIKE '%notebook%' OR description ILIKE '%celular%' OR description ILIKE '%internet%');
UPDATE public.job_requirements SET category = 'contratacao'
  WHERE category = 'outro' AND (description ILIKE '%PJ%' OR description ILIKE '%CLT%');