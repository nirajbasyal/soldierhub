do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    execute format(
      'alter function %I.%I(%s) set search_path = public, pg_temp',
      r.schema_name,
      r.function_name,
      r.identity_arguments
    );
  end loop;
end $$;
