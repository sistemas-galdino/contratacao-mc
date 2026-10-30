-- Instalação própria: cada cliente roda o sistema no próprio Supabase.

-- 1. Dados de demonstração: a primeira migração cria a "Empresa Exemplo" com candidatos
--    fictícios. Numa instalação nova ninguém está ligado a ela, então ela é removida.
--    Se já houver alguém usando a empresa de exemplo, nada é apagado.
delete from public.companies c
where c.id = '11111111-1111-1111-1111-111111111111'
  and c.is_demo
  and not exists (select 1 from public.company_members m where m.company_id = c.id);

-- 2. Acesso restrito: só entra quem o administrador cadastrou (npm run usuario:adicionar).
--    Antes, qualquer conta nova podia criar empresas e se vincular a elas pela API.
drop policy if exists "create own membership" on public.company_members;
revoke insert, delete on public.company_members from authenticated;
drop policy if exists "anyone create company" on public.companies;
revoke insert on public.companies from authenticated;

create or replace function public.bootstrap_current_user(_full_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_company uuid;
begin
  if v_user is null then raise exception 'Sem sessão'; end if;

  select company_id into v_company from public.company_members where user_id = v_user order by created_at limit 1;

  if v_company is null then
    -- Sem nenhum membro ainda (instalação manual, sem o script de configuração):
    -- o primeiro usuário vira dono. Depois disso, só o administrador libera acessos.
    perform pg_advisory_xact_lock(hashtext('public.bootstrap_current_user'));
    if exists (select 1 from public.company_members) then
      raise exception 'Seu acesso ainda não foi liberado. Peça ao administrador do sistema para cadastrar você.'
        using errcode = '42501';
    end if;

    select id into v_company from public.companies where not is_demo order by created_at limit 1;
    if v_company is null then
      insert into public.companies (name) values ('Minha empresa') returning id into v_company;
    end if;

    insert into public.company_members (company_id, user_id, role) values (v_company, v_user, 'owner')
    on conflict do nothing;
  end if;

  insert into public.profiles (id, full_name, email)
  select v_user, _full_name, u.email from auth.users u where u.id = v_user
  on conflict (id) do update set full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return v_company;
end $$;

revoke all on function public.bootstrap_current_user(text) from public, anon;
grant execute on function public.bootstrap_current_user(text) to authenticated;

-- 3. Currículos: o bucket era criado manualmente pelo Lovable e não existia em instalações novas.
insert into storage.buckets (id, name, public, file_size_limit)
values ('curriculos', 'curriculos', false, 10485760)
on conflict (id) do nothing;

-- Só quem faz parte da equipe lê os currículos (antes bastava ter qualquer conta).
drop policy if exists "empresa le curriculos" on storage.objects;
create policy "empresa le curriculos" on storage.objects for select to authenticated
  using (
    bucket_id = 'curriculos'
    and exists (select 1 from public.company_members m where m.user_id = auth.uid())
  );
