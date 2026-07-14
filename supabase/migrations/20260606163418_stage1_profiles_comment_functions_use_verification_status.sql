create or replace function public.create_comment_safe(p_post_id uuid, p_body text)
returns table(
  id uuid,
  comment_id uuid,
  post_id uuid,
  body text,
  created_at timestamptz,
  author_id uuid,
  author_user_id uuid,
  author_name_cached text,
  author_color_cached text,
  author_avatar_url text,
  author_avatar_url_cached text,
  profile_avatar_url text,
  avatar_url text,
  is_anonymous_author boolean,
  viewer_is_author boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_comment_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be logged in to comment.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id
      and p.verification_status = 'verified'
  ) then
    raise exception 'Your profile must be verified before you can comment.';
  end if;

  if p_post_id is null then
    raise exception 'Post was not identified.';
  end if;

  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'Please write a comment before posting.';
  end if;

  if length(trim(p_body)) > 2000 then
    raise exception 'Comment must be 2000 characters or less.';
  end if;

  insert into public.comments (post_id, author_id, body)
  values (p_post_id, v_user_id, trim(p_body))
  returning comments.id into v_comment_id;

  return query
  select gc.*
  from public.get_public_comments_for_post(p_post_id, 100) gc
  where gc.id = v_comment_id;
end;
$$;
