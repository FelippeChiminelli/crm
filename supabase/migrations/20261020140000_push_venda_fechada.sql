-- =============================================================================
-- Web Push Notifications — gatilho venda_fechada
--
-- Requer 20261020120000_push_notifications.sql.
-- Dispara quando o lead passa a ter sold_at (venda registrada) e notifica os
-- gestores (profiles.is_admin) da empresa. Preferência por usuário e empresa
-- ativa são checadas em criar_notificacao().
-- =============================================================================

create or replace function public.notify_venda_fechada()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valor numeric;
  v_titulo text;
  v_corpo text;
  v_destinatario uuid;
begin
  begin
    v_valor := coalesce(new.sold_value, new.value);
    v_titulo := 'Venda fechada';
    -- Único ponto de montagem do corpo (prévia na tela de bloqueio).
    v_corpo := coalesce(nullif(trim(new.name), ''), 'Lead sem nome')
      || case
           when v_valor is not null and v_valor > 0
             then ' · R$ ' || translate(to_char(v_valor, 'FM999,999,999,990.00'), ',.', '.,')
           else ''
         end;

    for v_destinatario in
      select p.uuid
      from public.profiles p
      where p.empresa_id = new.empresa_id
        and p.is_admin
    loop
      perform public.criar_notificacao(
        new.empresa_id, v_destinatario, 'venda_fechada', v_titulo, v_corpo, '/leads/' || new.id, new.id
      );
    end loop;
  exception when others then
    raise warning 'notify_venda_fechada falhou (lead %): %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists trg_notify_venda_fechada on public.leads;
create trigger trg_notify_venda_fechada
  after update of sold_at on public.leads
  for each row
  when (old.sold_at is null and new.sold_at is not null)
  execute function public.notify_venda_fechada();

revoke execute on function public.notify_venda_fechada() from public, anon, authenticated;
