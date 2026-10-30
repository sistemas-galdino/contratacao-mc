create or replace function public._case_candidate(_token text, _email text)
returns public.candidates language plpgsql stable security definer set search_path to 'public' as $$
declare v public.candidates;
begin
 if length(_token) = 64 then
   select c.* into v from public.candidates c where c.access_token = _token and c.status = 'ativo';
 else
   select c.* into v from public.candidates c join public.job_cases jc on jc.job_id = c.job_id
   where jc.public_token = _token and jc.approved_at is not null and c.status = 'ativo'
     and lower(btrim(c.email)) = lower(btrim(coalesce(_email,''))) and nullif(btrim(_email),'') is not null
   order by c.applied_at desc limit 1;
 end if;
 return v;
end $$;
revoke all on function public._case_candidate(text,text) from public, anon, authenticated;

create or replace function public.get_public_case(_token text)
returns jsonb language sql stable security definer set search_path to 'public' as $$
 select jsonb_build_object('shared', length(_token) <> 64, 'case', jsonb_build_object('title', jc.title, 'sections', jc.sections,
 'objective', jc.objective, 'evaluate_what', jc.evaluate_what, 'criteria', jc.criteria, 'content', jc.content,
 'delivery_format', jc.delivery_format,
 'modality', jc.modality, 'tools', jc.tools, 'tool_required', jc.tool_required, 'deliverables', jc.deliverables,
 'delivery_description', jc.delivery_description, 'prep_deadline', jc.prep_deadline, 'deadline_days', jc.deadline_days,
 'needs_presentation', jc.needs_presentation, 'presentation_format', jc.presentation_format,
 'presentation_minutes', jc.presentation_minutes, 'questions_minutes', jc.questions_minutes,
 'agenda_link', jc.agenda_link, 'meet_link', jc.meet_link, 'materials', jc.materials),
 'job', jsonb_build_object('title', j.title, 'city', j.city, 'state', j.state, 'work_mode', j.work_mode),
 'company', jsonb_build_object('name', co.name, 'segment', co.segment))
 from public.job_cases jc join public.jobs j on j.id = jc.job_id
 join public.companies co on co.id = j.company_id
 where jc.approved_at is not null and (
   (length(_token) <> 64 and jc.public_token = _token)
   or (length(_token) = 64 and exists (select 1 from public.candidates c join public.job_stages s on s.id = c.stage_id and s.stage_key='case'
        where c.access_token = _token and c.job_id = jc.job_id and c.status='ativo')))
 limit 1;
$$;
grant execute on function public.get_public_case(text) to anon, authenticated;

create or replace function public.submit_case_delivery(_token text, _email text, _kind text, _url text, _notes text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_case public.job_cases; v_candidate public.candidates; v_assignment_id uuid;
begin
 v_candidate := public._case_candidate(_token, _email);
 if v_candidate.id is null then raise exception 'Não encontramos sua candidatura com este e-mail'; end if;
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
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_case public.job_cases; v_candidate public.candidates; v_assignment_id uuid;
begin
 v_candidate := public._case_candidate(_token, _email);
 if v_candidate.id is null then raise exception 'Não encontramos sua candidatura com este e-mail'; end if;
 select * into v_case from public.job_cases where job_id = v_candidate.job_id and approved_at is not null;
 if v_case.id is null or v_case.modality <> 'material_pronto' then raise exception 'Preparo indisponível'; end if;
 insert into public.case_assignments (company_id,job_id,case_id,candidate_id,status,ready_at)
 values (v_case.company_id,v_case.job_id,v_case.id,v_candidate.id,'pronto_para_apresentar',now())
 on conflict (case_id,candidate_id) do update set status = 'pronto_para_apresentar', ready_at = now() returning id into v_assignment_id;
 insert into public.candidate_events(company_id,candidate_id,type,title,detail) values(v_case.company_id,v_candidate.id,'case','Candidato confirmou preparo','Pronto para apresentar o case');
 return v_assignment_id;
end $$;