create or replace function public.get_public_job(_job_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object(
 'job', jsonb_build_object('id', j.id, 'title', j.title, 'sector', j.sector,
 'work_mode', j.work_mode, 'city', j.city, 'state', j.state,
 'objective', j.objective, 'responsibilities', j.responsibilities, 'routine', j.routine,
 'welcome_message', j.welcome_message,
 'contract_model', case when coalesce((j.public_visibility->>'contract')::boolean, false) then j.contract_model end,
 'salary_type', case when coalesce((j.public_visibility->>'salary')::boolean, false) then j.salary_type end,
 'salary_min', case when coalesce((j.public_visibility->>'salary')::boolean, false) then j.salary_min end,
 'salary_max', case when coalesce((j.public_visibility->>'salary')::boolean, false) then j.salary_max end,
 'benefits', case when coalesce((j.public_visibility->>'benefits')::boolean, false) then j.benefits end,
 'workload', case when coalesce((j.public_visibility->>'workload')::boolean, false) then j.workload end,
 'work_hours', case when coalesce((j.public_visibility->>'work_hours')::boolean, false) then j.work_hours end),
 'qualities', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.job_competencies where job_id = j.id),
 'skills', (select coalesce(jsonb_agg(name order by position), '[]'::jsonb) from public.job_skills where job_id = j.id),
 'questions', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'question', question, 'options', options, 'answer_type', answer_type, 'is_required', is_required, 'section', section, 'field_key', field_key) order by position), '[]'::jsonb) from public.job_questions where job_id = j.id and status = 'aprovada'),
 'assessment', (select jsonb_build_object('questions', coalesce((select jsonb_agg(jsonb_build_object('situation', q->>'situation', 'question', q->>'question', 'answer_type', 'selecao_unica', 'options', q->'options')) from jsonb_array_elements(coalesce(a.payload->'questions', '[]'::jsonb)) q), '[]'::jsonb), 'estimated_minutes', a.payload->'estimated_minutes')
   from public.assessments a where a.job_id = j.id and coalesce((a.payload->>'approved')::boolean, true) order by a.created_at desc limit 1)
 ) from public.jobs j where j.id = _job_id and j.status = 'aberta';
$$;
revoke all on function public.get_public_job(uuid) from public;
grant execute on function public.get_public_job(uuid) to anon, authenticated;