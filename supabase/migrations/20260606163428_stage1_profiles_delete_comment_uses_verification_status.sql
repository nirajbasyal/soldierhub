create or replace function public.delete_comment_safe(p_comment_id uuid)
returns table(ok boolean, deleted_comment_id uuid, affected_post_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_comment record;
  v_is_verified boolean := false;
  v_is_admin boolean := false;
begin
  if v_user_id is null then
    raise exception 'Please log in again before deleting this comment.'
      using errcode = '28000';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.verification_status = 'verified'
  ) into v_is_verified;

  if not v_is_verified then
    raise exception 'Your profile must be verified before deleting comments.'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.role = 'admin'
      and p.verification_status = 'verified'
  ) into v_is_admin;

  select c.id, c.post_id, c.author_id, c.deleted_at
  into v_comment
  from public.comments c
  where c.id = p_comment_id
  for update;

  if not found then
    raise exception 'This comment no longer exists.'
      using errcode = 'P0002';
  end if;

  if v_comment.deleted_at is not null then
    return query select true, v_comment.id, v_comment.post_id;
    return;
  end if;

  if v_comment.author_id <> v_user_id and not v_is_admin then
    raise exception 'You can only delete your own comment.'
      using errcode = '42501';
  end if;

  update public.comments
  set
    deleted_at = now(),
    deleted_by = v_user_id,
    deleted_reason = case
      when v_is_admin and v_comment.author_id <> v_user_id then 'admin_deleted'
      else 'user_deleted'
    end,
    body = '[deleted]'
  where id = p_comment_id
    and deleted_at is null;

  delete from public.notifications
  where comment_id = p_comment_id;

  return query select true, v_comment.id, v_comment.post_id;
end;
$$;
