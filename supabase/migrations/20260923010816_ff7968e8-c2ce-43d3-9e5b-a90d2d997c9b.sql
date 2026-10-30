-- 1. job_cases: configuração completa, conteúdo gerado, aprovação e link público
alter table public.job_cases
  add column if not exists title text,
  add column if not exists modality text not null default 'candidato_cria',
  add column if not exists tools text[] not null default '{}',
  add column if not exists tool_required boolean not null default false,
  add column if not exists deliverables text[] not null default '{}',
  add column if not exists delivery_description text,
  add column if not exists prep_deadline text,
  add column if not exists needs_presentation boolean not null default true,
  add column if not exists presentation_format text,
  add column if not exists presentation_minutes integer,
  add column if not exists questions_minutes integer,
  add column if not exists scheduling_mode text,
  add column if not exists agenda_link text,
  add column if not exists meet_link text,
  add column if not exists sections jsonb not null default '[]'::jsonb,
  add column if not exists evaluator_questions text[] not null default '{}',
  add column if not exists materials jsonb not null default '[]'::jsonb,
  add column if not exists status text not null default 'nao_gerado',
  add column if not exists version integer not null default 1,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists public_token text;

update public.job_cases
set public_token = replace(gen_random_uuid()::text, '-', '')
where public_token is null;

alter table public.job_cases alter column public_token set default replace(gen_random_uuid()::text, '-', '');
alter table public.job_cases alter column public_token set not null;
create unique index if not exists job_cases_public_token_key on public.job_cases (public_token);

-- 2. Atribuição do case a cada candidato
create table if not exists public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  case_id uuid not null references public.job_cases(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  status text not null default 'enviado_ao_candidato',
  sent_at timestamptz not null default now(),
  due_at timestamptz,
  delivered_at timestamptz,
  ready_at timestamptz,
  scheduled_at timestamptz,
  presented_at timestamptz,
  evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (case_id, candidate_id)
);

grant select, insert, update, delete on public.case_assignments to authenticated;
grant all on public.case_assignments to service_role;
alter table public.case_assignments enable row level security;
create policy "company scope" on public.case_assignments for all to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

-- 3. Entregas do candidato
create table if not exists public.case_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assignment_id uuid not null references public.case_assignments(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  kind text not null default 'link',
  url text,
  file_path text,
  notes text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.case_deliveries to authenticated;
grant all on public.case_deliveries to service_role;
alter table public.case_deliveries enable row level security;
create policy "company scope" on public.case_deliveries for all to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

-- 4. Avaliação do case
create table if not exists public.case_evaluations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  case_id uuid not null references public.job_cases(id) on delete cascade,
  assignment_id uuid references public.case_assignments(id) on delete set null,
  scores jsonb not null default '{}'::jsonb,
  strengths text,
  attention_points text,
  notes text,
  questions_asked text,
  next_step text,
  evaluator uuid,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.case_evaluations to authenticated;
grant all on public.case_evaluations to service_role;
alter table public.case_evaluations enable row level security;
create policy "company scope" on public.case_evaluations for all to authenticated
  using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

-- 5. Leitura pública do case aprovado, por token
create or replace function public.get_public_case(_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'case', to_jsonb(c) - 'company_id',
    'job', jsonb_build_object('id', j.id, 'title', j.title, 'city', j.city, 'state', j.state, 'work_mode', j.work_mode),
    'company', jsonb_build_object('name', co.name, 'segment', co.segment)
  )
  from public.job_cases c
  join public.jobs j on j.id = c.job_id
  join public.companies co on co.id = c.company_id
  where c.public_token = _token
    and c.approved_at is not null;
$$;

revoke all on function public.get_public_case(text) from public;
grant execute on function public.get_public_case(text) to anon, authenticated;

-- 6. Entrega do case pelo candidato (link público)
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
  order by created_at desc
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

revoke all on function public.submit_case_delivery(text, text, text, text, text) from public;
grant execute on function public.submit_case_delivery(text, text, text, text, text) to anon, authenticated;

-- 7. Confirmação de preparo (modalidade com material pronto)
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
  order by created_at desc
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

revoke all on function public.confirm_case_ready(text, text) from public;
grant execute on function public.confirm_case_ready(text, text) to anon, authenticated;