drop policy if exists "public read company basics" on public.companies;
revoke select on public.companies from anon;

create or replace function public.get_public_job(_job_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object(
 'job', jsonb_build_object('id', j.id, 'title', j.title, 'sector', j.sector,
 'work_mode', j.work_mode, 'city', case when coalesce((j.public_visibility->>'location')::boolean,false) then j.city end,
 'state', case when coalesce((j.public_visibility->>'location')::boolean,false) then j.state end,
 'objective', j.objective, 'responsibilities', j.responsibilities, 'routine', j.routine,
 'welcome_message', j.welcome_message,
 'contract_model', case when coalesce((j.public_visibility->>'contract')::boolean,false) then j.contract_model end,
 'salary_type', case when coalesce((j.public_visibility->>'salary')::boolean,false) then j.salary_type end,
 'salary_min', case when coalesce((j.public_visibility->>'salary')::boolean,false) then j.salary_min end,
 'salary_max', case when coalesce((j.public_visibility->>'salary')::boolean,false) then j.salary_max end,
 'benefits', case when coalesce((j.public_visibility->>'benefits')::boolean,false) then j.benefits end,
 'workload', case when coalesce((j.public_visibility->>'workload')::boolean,false) then j.workload end,
 'work_hours', case when coalesce((j.public_visibility->>'work_hours')::boolean,false) then j.work_hours end),
 'qualities', (select coalesce(jsonb_agg(name order by position),'[]'::jsonb) from public.job_competencies where job_id=j.id),
 'skills', (select coalesce(jsonb_agg(name order by position),'[]'::jsonb) from public.job_skills where job_id=j.id),
 'questions', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'question',question,'options',options,'answer_type',answer_type,'is_required',is_required,'section',section,'field_key',field_key) order by position),'[]'::jsonb) from public.job_questions where job_id=j.id and status='aprovada'),
 'assessment', (select jsonb_build_object('questions',coalesce((select jsonb_agg(jsonb_build_object('situation',q->>'situation','question',q->>'question','answer_type',q->>'answer_type','options',q->'options')) from jsonb_array_elements(coalesce(a.payload->'questions','[]'::jsonb)) q),'[]'::jsonb),'estimated_minutes',a.payload->'estimated_minutes') from public.assessments a where a.job_id=j.id order by a.created_at desc limit 1)
 ) from public.jobs j where j.id=_job_id and j.status='aberta';
$$;

create or replace function public.apply_to_job_with_access(_job_id uuid, _name text, _email text, _phone text, _city text, _state text, _linkedin text, _employed_now boolean, _current_company text, _current_position text, _current_tenure text, _salary_expectation text, _answers jsonb, _assessment jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_token text; v_answer jsonb; v_job public.jobs;
begin
 select * into v_job from public.jobs where id=_job_id and status='aberta';
 if v_job.id is null then raise exception 'Vaga não disponível'; end if;
 if nullif(btrim(_name),'') is null or nullif(btrim(_email),'') is null then raise exception 'Nome e e-mail são necessários'; end if;
 v_id := public.apply_to_job(_job_id,_name,_email,_phone,_city,_state,_linkedin,_employed_now,
 case when _employed_now then _current_company end,case when _employed_now then _current_position end,
 _current_tenure,_salary_expectation,_answers,_assessment);
 for v_answer in select * from jsonb_array_elements(coalesce(_answers,'[]'::jsonb)) loop
  if v_answer->>'question_id' is null and nullif(btrim(v_answer->>'question_text'),'') is not null then
   insert into public.candidate_answers(company_id,candidate_id,question_text,answer,is_disqualifying)
   values(v_job.company_id,v_id,left(v_answer->>'question_text',500),left(coalesce(v_answer->>'answer',''),5000),false);
  end if;
 end loop;
 select access_token into v_token from public.candidates where id=v_id;
 return v_token;
end $$;