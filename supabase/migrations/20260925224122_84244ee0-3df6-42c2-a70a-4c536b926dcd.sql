UPDATE public.assessments
SET payload = jsonb_set(
  payload,
  '{questions}',
  (
    SELECT coalesce(jsonb_agg(
      CASE
        WHEN q->>'question' LIKE 'Qual alternativa mais se aproxima%'
        THEN jsonb_set(q, '{question}', to_jsonb('Como você agiria nessa situação?'::text))
        ELSE q
      END
    ), '[]'::jsonb)
    FROM jsonb_array_elements(coalesce(payload->'questions', '[]'::jsonb)) AS q
  )
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(coalesce(payload->'questions', '[]'::jsonb)) AS q
  WHERE q->>'question' LIKE 'Qual alternativa mais se aproxima%'
);