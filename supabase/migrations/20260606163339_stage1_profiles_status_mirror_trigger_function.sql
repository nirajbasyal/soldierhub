create or replace function public.sync_profile_verification_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.verification_status := coalesce(nullif(new.verification_status, ''), nullif(new.status, ''), 'pending');
    new.status := new.verification_status;
  else
    if new.verification_status is distinct from old.verification_status then
      new.verification_status := coalesce(nullif(new.verification_status, ''), 'pending');
      new.status := new.verification_status;
    elsif new.status is distinct from old.status then
      new.status := coalesce(nullif(new.status, ''), 'pending');
      new.verification_status := new.status;
    else
      new.verification_status := coalesce(nullif(new.verification_status, ''), 'pending');
      new.status := new.verification_status;
    end if;
  end if;

  return new;
end;
$$;
