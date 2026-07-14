create or replace function public.admin_reject_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject profiles.';
  end if;

  update public.profiles
  set
    verification_status = 'rejected',
    status = 'rejected',
    updated_at = now()
  where id = p_profile_id
    and verification_status = 'pending';
end;
$$;

create or replace function public.admin_revoke_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can revoke profiles.';
  end if;

  update public.profiles
  set
    verification_status = 'revoked',
    status = 'revoked',
    updated_at = now()
  where id = p_profile_id
    and verification_status = 'verified';
end;
$$;

create or replace function public.request_profile_rereview(p_phone text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to request re-review.';
  end if;

  update public.profiles
  set
    verification_status = 'pending',
    status = 'pending',
    phone = coalesce(nullif(p_phone, ''), phone),
    updated_at = now()
  where id = auth.uid()
    and verification_status in ('rejected', 'revoked');
end;
$$;
