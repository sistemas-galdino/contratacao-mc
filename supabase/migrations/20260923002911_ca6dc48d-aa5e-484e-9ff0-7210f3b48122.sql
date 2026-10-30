CREATE OR REPLACE FUNCTION public.apply_to_job(_job_id uuid, _name text, _email text, _phone text, _city text, _state text, _linkedin text, _employed_now boolean, _current_company text, _current_position text, _current_tenure text, _salary_expectation text, _answers jsonb DEFAULT '[]'::jsonb, _assessment jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job public.jobs;
  v_stage uuid;
  v_candidate uuid;
  v_answer jsonb;
  v_question public.job_questions;
  v_disqualified boolean := false;
  v_reason text;
  v_tags text[] := '{}';
  v_assessment uuid;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = _job_id AND status = 'aberta';
  IF v_job.id IS NULL THEN RAISE EXCEPTION 'Vaga não disponível'; END IF;

  SELECT id INTO v_stage FROM public.job_stages WHERE job_id = _job_id ORDER BY position LIMIT 1;

  IF _employed_now IS TRUE THEN v_tags := array_append(v_tags, 'TRABALHANDO ATUALMENTE'); END IF;

  INSERT INTO public.candidates (company_id, job_id, stage_id, name, email, phone, city, state, linkedin,
    employed_now, current_company, current_position, current_tenure, salary_expectation, tags)
  VALUES (v_job.company_id, _job_id, v_stage, _name, _email, _phone, _city, _state, _linkedin,
    _employed_now, _current_company, _current_position, _current_tenure, _salary_expectation, v_tags)
  RETURNING id INTO v_candidate;

  FOR v_answer IN SELECT * FROM jsonb_array_elements(coalesce(_answers, '[]'::jsonb))
  LOOP
    SELECT * INTO v_question FROM public.job_questions WHERE id = (v_answer->>'question_id')::uuid AND job_id = _job_id;
    IF v_question.id IS NOT NULL THEN
      INSERT INTO public.candidate_answers (company_id, candidate_id, question_id, question_text, answer, is_disqualifying)
      VALUES (v_job.company_id, v_candidate, v_question.id, v_question.question, v_answer->>'answer',
        v_question.kind = 'eliminatoria' AND v_question.disqualifying_answer IS NOT NULL
          AND lower(v_answer->>'answer') = lower(v_question.disqualifying_answer));

      IF v_question.kind = 'eliminatoria' AND v_question.disqualifying_answer IS NOT NULL
         AND lower(v_answer->>'answer') = lower(v_question.disqualifying_answer) THEN
        v_disqualified := true;
        v_reason := coalesce(v_reason || ' | ', '') || v_question.question || ' -> ' || (v_answer->>'answer');
      END IF;

      IF v_question.kind = 'classificatoria' AND v_question.tag IS NOT NULL
         AND length(btrim(v_question.tag)) BETWEEN 1 AND 30
         AND lower(v_answer->>'answer') = 'sim' THEN
        UPDATE public.candidates
        SET tags = (
          SELECT array_agg(DISTINCT t)
          FROM unnest(array_append(tags, upper(btrim(v_question.tag)))) AS t
        )
        WHERE id = v_candidate;
      END IF;
    END IF;
  END LOOP;

  IF jsonb_array_length(coalesce(_assessment, '[]'::jsonb)) > 0 THEN
    SELECT id INTO v_assessment FROM public.assessments WHERE job_id = _job_id ORDER BY created_at DESC LIMIT 1;
    INSERT INTO public.assessment_responses (company_id, candidate_id, assessment_id, payload)
    VALUES (v_job.company_id, v_candidate, v_assessment, _assessment);
    INSERT INTO public.candidate_events (company_id, candidate_id, type, title, detail)
    VALUES (v_job.company_id, v_candidate, 'assessment', 'Assessment respondido', 'Respostas enviadas junto da candidatura');
  END IF;

  INSERT INTO public.candidate_events (company_id, candidate_id, type, title, detail)
  VALUES (v_job.company_id, v_candidate, 'inscricao', 'Inscrição recebida', 'Candidatura pelo link público da vaga');

  IF v_disqualified THEN
    UPDATE public.candidates SET status = 'nao_atende_requisito' WHERE id = v_candidate;
    INSERT INTO public.rejections (company_id, candidate_id, reason, notes)
    VALUES (v_job.company_id, v_candidate, 'Não atendeu requisito objetivo', v_reason);
    INSERT INTO public.candidate_events (company_id, candidate_id, type, title, detail, metadata)
    VALUES (v_job.company_id, v_candidate, 'status', 'Status alterado para NÃO ATENDE REQUISITO OBJETIVO', v_reason,
      jsonb_build_object('regra', 'resposta eliminatória no formulário de inscrição'));
  END IF;

  RETURN v_candidate;
END $function$;

REVOKE ALL ON FUNCTION public.apply_to_job(uuid, text, text, text, text, text, text, boolean, text, text, text, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_to_job(uuid, text, text, text, text, text, text, boolean, text, text, text, text, jsonb, jsonb) TO anon, authenticated;

DELETE FROM public.candidates WHERE name = 'Candidato Teste';