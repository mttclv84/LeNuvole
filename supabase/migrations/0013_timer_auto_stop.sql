-- Un timer non può restare acceso più di 8 ore di seguito: chi si dimentica
-- di fermarlo non gonfia le ore del cantiere.
--
-- La funzione chiude ogni timer partito da più di 8 ore a esattamente 8 ore
-- (ended_at = started_at + 8h, minutes = 480). Il portale la richiama ogni
-- volta che si aprono Tempi, Monitor o Timing e prima di avviare un timer:
-- il risultato è lo stesso di uno stop allo scoccare delle 8 ore, anche se
-- in quel momento nessuno aveva la pagina aperta.
--
-- Da eseguire dopo 0012_cantieri_clienti_timing.sql.

create or replace function public.close_stale_timers()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  closed_count integer;
begin
  if not public.is_staff() then
    return 0;
  end if;

  update public.time_entries
  set ended_at = started_at + interval '8 hours',
      minutes = 480,
      note = case
        when note is null or note = '' then 'Fermato automaticamente dopo 8 ore'
        else note || ' · fermato automaticamente dopo 8 ore'
      end
  where ended_at is null
    and started_at <= now() - interval '8 hours';

  get diagnostics closed_count = row_count;
  return closed_count;
end;
$$;

revoke all on function public.close_stale_timers() from public, anon;
grant execute on function public.close_stale_timers() to authenticated;
