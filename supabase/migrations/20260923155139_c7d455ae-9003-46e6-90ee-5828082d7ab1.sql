alter table public.job_stages add column if not exists public_description text, add column if not exists public_format text, add column if not exists public_duration_minutes integer, add column if not exists public_agenda_link text, add column if not exists public_meet_link text;
create or replace function public.get_candidate_journey(_token text)
returns jsonb language sql stable security definer set search_path = public as $$
 select jsonb_build_object('name',c.name,'job_title',j.title,
 'stage',case when c.status <> 'ativo' then 'concluido' when s.stage_key in ('entrevista','entrevista_gestor','case') then s.stage_key else 'analise' end,
 'stage_name',case when c.status='ativo' and s.stage_key in ('entrevista','entrevista_gestor','case') then s.name end,
 'case_token',case when c.status='ativo' and s.stage_key='case' and jc.approved_at is not null then c.access_token end,
 'case_status',case when c.status='ativo' and s.stage_key='case' then ca.status end,
 'interview',case when c.status='ativo' and s.stage_key in ('entrevista','entrevista_gestor') then jsonb_build_object('description',s.public_description,'format',s.public_format,'duration_minutes',s.public_duration_minutes,'agenda_link',s.public_agenda_link,'meet_link',s.public_meet_link) end)
 from public.candidates c join public.jobs j on j.id=c.job_id
 left join public.job_stages s on s.id=c.stage_id
 left join public.job_cases jc on jc.job_id=j.id
 left join public.case_assignments ca on ca.case_id=jc.id and ca.candidate_id=c.id
 where c.access_token=_token and length(_token)=64;
$$;