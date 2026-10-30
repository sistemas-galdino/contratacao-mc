create or replace function public.submit_case_delivery(
  _token text,
  _email text,
  _kind text,
  _url text,
  _notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.job_cases;
  v_candidate public.candidates;
  v_assignment_id uuid;
begin
  select * into v_case from public.job_cases where public_token = _token and approved_at is not null;
  if v_case.id is null then
    raise exception 'Case não encontrado';
  end if;

  select * into v_candidate
  from public.candidates
  where job_id = v_case.job_id and lower(email) = lower(btrim(_email))
  limit 1;

  if v_candidate.id is null then
    raise exception 'Não encontramos sua inscrição com este e-mail';
  end if;

  insert into public.case_assignments (company_id, job_id, case_id, candidate_id, status, delivered_at)
  values (v_case.company_id, v_case.job_id, v_case.id, v_candidate.id, 'entregue', now())
  on conflict (case_id, candidate_id)
  do update set status = 'entregue', delivered_at = now()
  returning id into v_assignment_id;

  insert into public.case_deliveries (company_id, assignment_id, candidate_id, kind, url, notes)
  values (v_case.company_id, v_assignment_id, v_candidate.id, coalesce(nullif(btrim(_kind), ''), 'link'),
          nullif(btrim(_url), ''), nullif(btrim(_notes), ''));

  insert into public.candidate_events (company_id, candidate_id, type, title, detail)
  values (v_case.company_id, v_candidate.id, 'case', 'Case entregue', coalesce(nullif(btrim(_url), ''), 'Entrega registrada'));

  return v_assignment_id;
end;
$$;

create or replace function public.confirm_case_ready(_token text, _email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.job_cases;
  v_candidate public.candidates;
  v_assignment_id uuid;
begin
  select * into v_case from public.job_cases where public_token = _token and approved_at is not null;
  if v_case.id is null then
    raise exception 'Case não encontrado';
  end if;

  select * into v_candidate
  from public.candidates
  where job_id = v_case.job_id and lower(email) = lower(btrim(_email))
  limit 1;

  if v_candidate.id is null then
    raise exception 'Não encontramos sua inscrição com este e-mail';
  end if;

  insert into public.case_assignments (company_id, job_id, case_id, candidate_id, status, ready_at)
  values (v_case.company_id, v_case.job_id, v_case.id, v_candidate.id, 'pronto_para_apresentar', now())
  on conflict (case_id, candidate_id)
  do update set status = 'pronto_para_apresentar', ready_at = now()
  returning id into v_assignment_id;

  insert into public.candidate_events (company_id, candidate_id, type, title, detail)
  values (v_case.company_id, v_candidate.id, 'case', 'Candidato confirmou preparo', 'Pronto para apresentar o case');

  return v_assignment_id;
end;
$$;

revoke all on function public.submit_case_delivery(text, text, text, text, text) from public;
revoke all on function public.confirm_case_ready(text, text) from public;
grant execute on function public.submit_case_delivery(text, text, text, text, text) to anon, authenticated;
grant execute on function public.confirm_case_ready(text, text) to anon, authenticated;