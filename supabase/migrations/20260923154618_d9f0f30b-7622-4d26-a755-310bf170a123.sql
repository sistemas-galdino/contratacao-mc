alter table public.jobs add column if not exists public_visibility jsonb not null default '{"salary":false,"contract":false,"benefits":false,"workload":false,"work_hours":false,"location":true}'::jsonb, add column if not exists welcome_message text;
alter table public.candidates add column if not exists access_token text not null default encode(gen_random_bytes(32), 'hex');
create unique index if not exists candidates_access_token_key on public.candidates(access_token);

-- Public reads must not see full administrative rows, even through a direct Data API request.
drop policy if exists "public read open jobs" on public.jobs;
revoke select on public.jobs from anon;
drop policy if exists "public read questions of open jobs" on public.job_questions;
revoke select on public.job_questions from anon;
drop policy if exists "public read stages of open jobs" on public.job_stages;
revoke select on public.job_stages from anon;
drop policy if exists "anon reads assessments of open jobs" on public.assessments;
revoke select on public.assessments from anon;

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
 'assessment', (select jsonb_build_object('questions', coalesce((select jsonb_agg(jsonb_build_object('situation', q->>'situation', 'question', q->>'question', 'answer_type', q->>'answer_type', 'options', q->'options')) from jsonb_array_elements(coalesce(a.payload->'questions', '[]'::jsonb)) q), '[]'::jsonb), 'estimated_minutes', a.payload->'estimated_minutes') from public.assessments a where a.job_id = j.id order by a.created_at desc limit 1)
 ) from public.jobs j where j.id = _job_id and j.status = 'aberta';
$$;
revoke all on function public.get_public_job(uuid) from public;
grant execute on function public.get_public_job(uuid) to anon, authenticated;

-- Keep the existing evaluator intact, but prevent calls that bypass the private link return.
revoke execute on function public.apply_to_job(uuid,text,text,text,text,text,text,boolean,text,text,text,text,jsonb,jsonb) from anon, authenticated;
create or replace function public.apply_to_job_with_access(_job_id uuid, _name text, _email text, _phone text, _city text, _state text, _linkedin text, _employed_now boolean, _current_company text, _current_position text, _current_tenure text, _salary_expectation text, _answers jsonb, _assessment jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_token text;
begin
 if nullif(btrim(_name),'') is null or nullif(btrim(_email),'') is null then raise exception 'Nome e e-mail são necessários'; end if;
 v_id := public.apply_to_job(_job_id, _name, _email, _phone, _city, _state, _linkedin, _employed_now,
 case when _employed_now then _current_company end, case when _employed_now then _current_position end,
 _current_tenure, _salary_expectation, _answers, _assessment);
 select access_token into v_token from public.candidates where id = v_id;
 return v_token;
end $$;
revoke all on function public.apply_to_job_with_access(uuid,text,text,text,text,text,text,boolean,text,text,text,text,jsonb,jsonb) from public;
grant execute on function public.apply_to_job_with_access(uuid,text,text,text,text,text,text,boolean,text,text,text,text,jsonb,jsonb) to anon, authenticated;

create or replace function public.get_candidate_journey(_token text)
returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object('name', c.name, 'job_title', j.title,
 'stage', case when c.status <> 'ativo' then 'concluido' when s.stage_key in ('entrevista','entrevista_gestor','case') then s.stage_key else 'analise' end,
 'stage_name', case when c.status = 'ativo' and s.stage_key in ('entrevista','entrevista_gestor','case') then s.name end,
 'case_token', case when c.status = 'ativo' and s.stage_key = 'case' and jc.approved_at is not null then c.access_token end,
 'case_status', case when c.status = 'ativo' and s.stage_key = 'case' then ca.status end,
 'interview', case when c.status = 'ativo' and s.stage_key in ('entrevista','entrevista_gestor') then
 (select jsonb_build_object('scheduled_at', i.interviewed_at, 'notes', i.notes) from public.interviews i where i.candidate_id = c.id order by i.created_at desc limit 1) end)
 from public.candidates c join public.jobs j on j.id = c.job_id
 left join public.job_stages s on s.id = c.stage_id
 left join public.job_cases jc on jc.job_id = j.id
 left join public.case_assignments ca on ca.case_id = jc.id and ca.candidate_id = c.id
 where c.access_token = _token and length(_token) = 64;
$$;
revoke all on function public.get_candidate_journey(text) from public;
grant execute on function public.get_candidate_journey(text) to anon, authenticated;

-- Replace shared case-token access with the individual candidate's stage-scoped token.
create or replace function public.get_public_case(_token text)
returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object('case', jsonb_build_object('title', jc.title, 'sections', jc.sections,
 'modality', jc.modality, 'tools', jc.tools, 'tool_required', jc.tool_required, 'deliverables', jc.deliverables,
 'delivery_description', jc.delivery_description, 'prep_deadline', jc.prep_deadline, 'deadline_days', jc.deadline_days,
 'needs_presentation', jc.needs_presentation, 'presentation_format', jc.presentation_format,
 'presentation_minutes', jc.presentation_minutes, 'questions_minutes', jc.questions_minutes,
 'agenda_link', jc.agenda_link, 'meet_link', jc.meet_link, 'materials', jc.materials),
 'job', jsonb_build_object('title', j.title, 'city', j.city, 'state', j.state, 'work_mode', j.work_mode),
 'company', jsonb_build_object('name', co.name, 'segment', co.segment))
 from public.candidates c join public.jobs j on j.id = c.job_id
 join public.job_stages s on s.id = c.stage_id and s.stage_key = 'case'
 join public.job_cases jc on jc.job_id = j.id and jc.approved_at is not null
 join public.companies co on co.id = j.company_id
 where c.access_token = _token and length(_token) = 64 and c.status = 'ativo';
$$;
revoke all on function public.get_public_case(text) from public;
grant execute on function public.get_public_case(text) to anon, authenticated;

create or replace function public.submit_case_delivery(_token text, _email text, _kind text, _url text, _notes text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_case public.job_cases; v_candidate public.candidates; v_assignment_id uuid;
begin
 select c.* into v_candidate from public.candidates c join public.job_stages s on s.id = c.stage_id
 where c.access_token = _token and length(_token) = 64 and s.stage_key = 'case' and c.status = 'ativo';
 if v_candidate.id is null then raise exception 'Etapa não disponível'; end if;
 select * into v_case from public.job_cases where job_id = v_candidate.job_id and approved_at is not null;
 if v_case.id is null or v_case.modality = 'material_pronto' or nullif(btrim(_url),'') is null then raise exception 'Entrega indisponível'; end if;
 insert into public.case_assignments (company_id, job_id, case_id, candidate_id, status, delivered_at)
 values (v_case.company_id, v_case.job_id, v_case.id, v_candidate.id, 'entregue', now())
 on conflict (case_id,candidate_id) do update set status = 'entregue', delivered_at = now() returning id into v_assignment_id;
 insert into public.case_deliveries (company_id, assignment_id, candidate_id, kind, url, notes)
 values (v_case.company_id, v_assignment_id, v_candidate.id, 'link', _url, nullif(btrim(_notes),''));
 insert into public.candidate_events (company_id,candidate_id,type,title,detail) values (v_case.company_id,v_candidate.id,'case','Case entregue','Entrega registrada');
 return v_assignment_id;
end $$;
create or replace function public.confirm_case_ready(_token text, _email text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_case public.job_cases; v_candidate public.candidates; v_assignment_id uuid;
begin
 select c.* into v_candidate from public.candidates c join public.job_stages s on s.id = c.stage_id
 where c.access_token = _token and length(_token) = 64 and s.stage_key = 'case' and c.status = 'ativo';
 if v_candidate.id is null then raise exception 'Etapa não disponível'; end if;
 select * into v_case from public.job_cases where job_id = v_candidate.job_id and approved_at is not null;
 if v_case.id is null or v_case.modality <> 'material_pronto' then raise exception 'Preparo indisponível'; end if;
 insert into public.case_assignments (company_id,job_id,case_id,candidate_id,status,ready_at)
 values (v_case.company_id,v_case.job_id,v_case.id,v_candidate.id,'pronto_para_apresentar',now())
 on conflict (case_id,candidate_id) do update set status = 'pronto_para_apresentar', ready_at = now() returning id into v_assignment_id;
 insert into public.candidate_events(company_id,candidate_id,type,title,detail) values(v_case.company_id,v_candidate.id,'case','Candidato confirmou preparo','Pronto para apresentar o case');
 return v_assignment_id;
end $$;
revoke all on function public.submit_case_delivery(text,text,text,text,text) from public;
revoke all on function public.confirm_case_ready(text,text) from public;
grant execute on function public.submit_case_delivery(text,text,text,text,text) to anon, authenticated;
grant execute on function public.confirm_case_ready(text,text) to anon, authenticated;