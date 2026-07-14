update public.profiles
set verification_status = status
where verification_status is null
  and status is not null;

update public.profiles
set status = verification_status
where verification_status is not null
  and status is distinct from verification_status;
