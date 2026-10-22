-- =============================================================================
-- Tela "Leads sem contato" (/leads/sem-contato): lista paginada com a mesma
-- regra do relatório do n8n (_leads_sem_contato).
--
-- Empresa vem do usuário autenticado. Admin e vendedor com ver_todos_leads
-- veem todos e podem filtrar por vendedor; vendedor comum vê só os dele.
-- p_responsavel = null → todos; p_somente_sem_responsavel → só sem responsável.
-- =============================================================================

create or replace function public.get_leads_sem_contato(
  p_dias_parado integer,
  p_max_dias_parado integer default null,
  p_responsavel uuid default null,
  p_somente_sem_responsavel boolean default false,
  p_limit integer default 50,
  p_offset integer default 0
) returns table (
  lead_id uuid,
  nome text,
  telefone text,
  responsavel_id uuid,
  responsavel text,
  ultimo_contato timestamptz,
  nunca_contatado boolean,
  dias_parado integer,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_empresa_id uuid;
  v_ver_todos boolean;
  v_responsavel uuid := p_responsavel;
  v_sem_responsavel boolean := coalesce(p_somente_sem_responsavel, false);
begin
  if p_dias_parado is null or p_dias_parado < 1 then
    raise exception 'p_dias_parado deve ser >= 1';
  end if;

  select p.empresa_id, coalesce(p.is_admin, false) or coalesce(p.ver_todos_leads, false)
    into v_empresa_id, v_ver_todos
  from public.profiles p
  where p.uuid = auth.uid();

  if v_empresa_id is null then
    raise exception 'Usuario sem empresa vinculada';
  end if;

  if not v_ver_todos then
    v_responsavel := auth.uid();
    v_sem_responsavel := false;
  end if;

  return query
  select s.lead_id,
         coalesce(nullif(trim(s.nome), ''), 'Sem nome'),
         s.telefone,
         s.responsavel_id,
         coalesce(nullif(trim(pr.full_name), ''), 'Sem responsável'),
         s.ultimo_contato,
         s.ultimo_contato is null,
         floor(extract(epoch from (now() - s.referencia)) / 86400)::int,
         count(*) over ()
  from public._leads_sem_contato(
    v_empresa_id,
    now() - make_interval(days => p_dias_parado),
    case when p_max_dias_parado is not null
         then now() - make_interval(days => p_max_dias_parado) end,
    v_responsavel,
    v_sem_responsavel
  ) s
  left join public.profiles pr on pr.uuid = s.responsavel_id
  order by s.referencia asc, s.lead_id
  limit least(coalesce(p_limit, 50), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.get_leads_sem_contato(integer, integer, uuid, boolean, integer, integer)
  from public, anon;
grant execute on function public.get_leads_sem_contato(integer, integer, uuid, boolean, integer, integer)
  to authenticated;
