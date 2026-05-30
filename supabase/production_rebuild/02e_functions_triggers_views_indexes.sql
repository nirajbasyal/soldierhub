-- ============================================================================
-- Soldier Hub production rebuild split file
-- Run the numbered files in order in a brand-new empty Supabase project only.
-- ============================================================================

begin;

set check_function_bodies = off;
set search_path = public, extensions;

-- FUNCTIONS continued
CREATE OR REPLACE FUNCTION public.tg_cache_author_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pname  text;
  pcolor text;
begin
  if new.anonymous then
    new.author_name_cached  := null;
    new.author_color_cached := null;
  else
    select full_name, avatar_color into pname, pcolor
    from public.profiles where id = new.author_id;
    new.author_name_cached  := pname;
    new.author_color_cached := pcolor;
  end if;
  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION public.tg_cache_comment_author()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  pname  text;
  pcolor text;
begin
  select full_name, avatar_color into pname, pcolor
  from public.profiles where id = new.author_id;
  new.author_name_cached  := pname;
  new.author_color_cached := pcolor;
  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION public.tg_mark_post_reported()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.posts set status = 'reported' where id = new.post_id and status = 'active';
  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION public.tg_notify_on_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  post_author uuid;
  actor_name_local text;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id;

  if post_author is null or post_author = new.author_id then
    return new;
  end if;

  select full_name into actor_name_local
  from public.profiles
  where id = new.author_id;

  insert into public.notifications
    (recipient_user_id, actor_user_id, actor_name_cached, type, post_id, comment_id)
  values
    (post_author, new.author_id, actor_name_local, 'comment', new.post_id, new.id);

  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION public.tg_notify_on_upvote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  target_post record;
    actor_profile record;
    begin
      select p.id, p.author_id, p.body
          into target_post
            from public.posts p
              where p.id = new.post_id
                limit 1;

                  if target_post.author_id is null then
                      return new;
                        end if;

                          -- Do not notify users for their own upvotes.
                            if target_post.author_id = new.user_id then
                                return new;
                                  end if;

                                    select pr.full_name, pr.avatar_color
                                        into actor_profile
                                          from public.profiles pr
                                            where pr.id = new.user_id
                                              limit 1;

                                                insert into public.notifications (
                                                    recipient_user_id,
                                                        actor_user_id,
                                                            actor_name_cached,
                                                                type,
                                                                    post_id,
                                                                        post_title_cached,
                                                                            read
                                                                              )
                                                                                values (
                                                                                    target_post.author_id,
                                                                                        new.user_id,
                                                                                            coalesce(actor_profile.full_name, 'Someone'),
                                                                                                'upvote',
                                                                                                    new.post_id,
                                                                                                        left(coalesce(target_post.body, 'your post'), 180),
                                                                                                            false
                                                                                                              )
                                                                                                                on conflict do nothing;

                                                                                                                  return new;
                                                                                                                  end;
                                                                                                                  $function$;


CREATE OR REPLACE FUNCTION public.tg_recount_comment_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                              begin
                                                                                                                                                                                                                                                                                if tg_op = 'INSERT' then
                                                                                                                                                                                                                                                                                    perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                        return new;

                                                                                                                                                                                                                                                                                          elsif tg_op = 'DELETE' then
                                                                                                                                                                                                                                                                                              perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                                                                  return old;

                                                                                                                                                                                                                                                                                                    elsif tg_op = 'UPDATE' then
                                                                                                                                                                                                                                                                                                        if old.post_id is distinct from new.post_id then
                                                                                                                                                                                                                                                                                                              perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                                                                                    perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                        elsif old.deleted_at is distinct from new.deleted_at then
                                                                                                                                                                                                                                                                                                                              perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                                  end if;

                                                                                                                                                                                                                                                                                                                                      return new;
                                                                                                                                                                                                                                                                                                                                        end if;

                                                                                                                                                                                                                                                                                                                                          return null;
                                                                                                                                                                                                                                                                                                                                          end;
                                                                                                                                                                                                                                                                                                                                          $function$;


CREATE OR REPLACE FUNCTION public.tg_recount_report_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                                                                                                                                          begin
                                                                                                                                                                                                                                                                            if tg_op = 'INSERT' then
                                                                                                                                                                                                                                                                                perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                    return new;

                                                                                                                                                                                                                                                                                      elsif tg_op = 'DELETE' then
                                                                                                                                                                                                                                                                                          perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                                                              return old;

                                                                                                                                                                                                                                                                                                elsif tg_op = 'UPDATE' then
                                                                                                                                                                                                                                                                                                    if old.post_id is distinct from new.post_id then
                                                                                                                                                                                                                                                                                                          perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                                                                                perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                    else
                                                                                                                                                                                                                                                                                                                          perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                                                                              end if;

                                                                                                                                                                                                                                                                                                                                  return new;
                                                                                                                                                                                                                                                                                                                                    end if;

                                                                                                                                                                                                                                                                                                                                      return null;
                                                                                                                                                                                                                                                                                                                                      end;
                                                                                                                                                                                                                                                                                                                                      $function$;


CREATE OR REPLACE FUNCTION public.tg_recount_upvote_counters()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
                                                                                                                                                                                                                  begin
                                                                                                                                                                                                                    if tg_op = 'INSERT' then
                                                                                                                                                                                                                        perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                            return new;

                                                                                                                                                                                                                              elsif tg_op = 'DELETE' then
                                                                                                                                                                                                                                  perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                      return old;

                                                                                                                                                                                                                                        elsif tg_op = 'UPDATE' then
                                                                                                                                                                                                                                            if old.post_id is distinct from new.post_id then
                                                                                                                                                                                                                                                  perform public.recount_post_counters(old.post_id);
                                                                                                                                                                                                                                                        perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                            else
                                                                                                                                                                                                                                                                  perform public.recount_post_counters(new.post_id);
                                                                                                                                                                                                                                                                      end if;

                                                                                                                                                                                                                                                                          return new;
                                                                                                                                                                                                                                                                            end if;

                                                                                                                                                                                                                                                                              return null;
                                                                                                                                                                                                                                                                              end;
                                                                                                                                                                                                                                                                              $function$;


CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;


CREATE OR REPLACE FUNCTION public.toggle_post_report(p_post_id uuid, p_reason text DEFAULT ''::text)
 RETURNS TABLE(reported boolean, report_count bigint, post_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_already_reported boolean;
  v_report_count bigint;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to report a post.';
  end if;

  select exists (
    select 1
    from public.reports
    where post_id = p_post_id
      and user_id = v_user_id
  )
  into v_already_reported;

  if v_already_reported then
    delete from public.reports
    where post_id = p_post_id
      and user_id = v_user_id;
  else
    insert into public.reports (post_id, user_id, reason)
    values (p_post_id, v_user_id, coalesce(p_reason, ''))
    on conflict (post_id, user_id) do nothing;
  end if;

  select count(*)
  from public.reports
  where post_id = p_post_id
  into v_report_count;

  if v_report_count > 0 then
    v_status := 'reported';
  else
    v_status := 'active';
  end if;

  update public.posts
  set status = v_status
  where id = p_post_id;

  return query
  select
    not v_already_reported as reported,
    v_report_count as report_count,
    v_status as post_status;
end;
$function$;


-- VIEWS
create or replace view public.my_posts_with_meta as
 SELECT id,
    author_id,
    category,
    body,
    anonymous,
    status,
    edited,
    created_at,
    updated_at,
    author_name_cached AS author_name,
    author_color_cached AS author_color,
    COALESCE(upvote_count, 0)::bigint AS upvote_count,
    COALESCE(comment_count, 0)::bigint AS comment_count,
    COALESCE(report_count, 0)::bigint AS report_count,
    image_url,
    image_key,
    image_width,
    image_height,
    image_size,
    image_thumbnail_url,
    image_thumbnail_key,
    image_thumbnail_width,
    image_thumbnail_height,
    image_thumbnail_size
   FROM posts p;;

create or replace view public.posts_with_meta as
 SELECT id,
        CASE
            WHEN anonymous THEN NULL::uuid
            ELSE author_id
        END AS author_id,
    category,
    body,
    anonymous,
    status,
    edited,
    created_at,
    updated_at,
        CASE
            WHEN anonymous THEN NULL::text
            ELSE author_name_cached
        END AS author_name,
        CASE
            WHEN anonymous THEN NULL::text
            ELSE author_color_cached
        END AS author_color,
    COALESCE(upvote_count, 0)::bigint AS upvote_count,
    COALESCE(comment_count, 0)::bigint AS comment_count,
    COALESCE(report_count, 0)::bigint AS report_count,
    image_url,
    image_key,
    image_width,
    image_height,
    image_size,
    image_thumbnail_url,
    image_thumbnail_key,
    image_thumbnail_width,
    image_thumbnail_height,
    image_thumbnail_size
   FROM posts p
  WHERE status = ANY (ARRAY['active'::text, 'reported'::text]);;

create or replace view public.profile_follow_counts as
 SELECT p.id AS profile_id,
    COALESCE(followers.followers_count, 0::bigint) AS followers_count,
    COALESCE(following.following_count, 0::bigint) AS following_count
   FROM profiles p
     LEFT JOIN ( SELECT profile_follows.following_id,
            count(*) AS followers_count
           FROM profile_follows
          GROUP BY profile_follows.following_id) followers ON followers.following_id = p.id
     LEFT JOIN ( SELECT profile_follows.follower_id,
            count(*) AS following_count
           FROM profile_follows
          GROUP BY profile_follows.follower_id) following ON following.follower_id = p.id
  WHERE p.status = 'verified'::text AND p.verification_status = 'verified'::text;;

create or replace view public.public_profiles with (security_invoker=true) as
 SELECT id,
    full_name,
    bio,
    avatar_color,
    avatar_url,
    base,
    created_at
   FROM profiles
  WHERE status = 'verified'::text AND verification_status = 'verified'::text;;

-- INDEXES
create index if not exists comments_author_id_idx ON public.comments USING btree (author_id);
create index if not exists comments_deleted_by_idx ON public.comments USING btree (deleted_by) WHERE (deleted_by IS NOT NULL);
create unique index if not exists comments_pkey ON public.comments USING btree (id);
create index if not exists comments_post_active_created_idx ON public.comments USING btree (post_id, created_at) WHERE (deleted_at IS NULL);
create index if not exists comments_post_created_id_idx ON public.comments USING btree (post_id, created_at, id);
create index if not exists notifications_actor_user_id_idx ON public.notifications USING btree (actor_user_id) WHERE (actor_user_id IS NOT NULL);
create index if not exists notifications_comment_id_idx ON public.notifications USING btree (comment_id);
create unique index if not exists notifications_pkey ON public.notifications USING btree (id);
create index if not exists notifications_recipient_created_idx ON public.notifications USING btree (recipient_user_id, created_at DESC, id DESC);
create index if not exists notifications_recipient_user_id_idx ON public.notifications USING btree (recipient_user_id, created_at DESC);
create index if not exists notifications_unread_recipient_idx ON public.notifications USING btree (recipient_user_id, created_at DESC) WHERE (read = false);
create index if not exists posts_author_created_id_idx ON public.posts USING btree (author_id, created_at DESC, id DESC) WHERE ((anonymous IS FALSE) AND (status = ANY (ARRAY['active'::text, 'reported'::text])));
create index if not exists posts_created_at_idx ON public.posts USING btree (created_at DESC);
create index if not exists posts_feed_created_id_idx ON public.posts USING btree (created_at DESC, id DESC) WHERE (status = ANY (ARRAY['active'::text, 'reported'::text]));
create unique index if not exists posts_pkey ON public.posts USING btree (id);
create index if not exists profile_follows_following_created_idx ON public.profile_follows USING btree (following_id, created_at DESC);
create unique index if not exists profile_follows_pkey ON public.profile_follows USING btree (follower_id, following_id);
create index if not exists profiles_admin_queue_idx ON public.profiles USING btree (status, verification_status, created_at DESC);
create unique index if not exists profiles_email_key ON public.profiles USING btree (email);
create unique index if not exists profiles_pkey ON public.profiles USING btree (id);
create index if not exists reports_post_id_idx ON public.reports USING btree (post_id);
create unique index if not exists reports_pkey ON public.reports USING btree (post_id, user_id);
create index if not exists resources_display_idx ON public.resources USING btree (section, display_order);
create unique index if not exists resources_pkey ON public.resources USING btree (id);
create index if not exists upvotes_post_id_idx ON public.upvotes USING btree (post_id);
create unique index if not exists upvotes_pkey ON public.upvotes USING btree (post_id, user_id);
create unique index if not exists visitor_reports_post_id_visitor_key_hash_key ON public.visitor_reports USING btree (post_id, visitor_key_hash);
create index if not exists visitor_reports_post_id_idx ON public.visitor_reports USING btree (post_id);
create unique index if not exists visitor_reports_pkey ON public.visitor_reports USING btree (id);

-- TRIGGERS
drop trigger if exists on_auth_user_created on auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();;

drop trigger if exists profiles_protect_sensitive_fields on public.profiles;
CREATE TRIGGER profiles_protect_sensitive_fields BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_sensitive_fields();;

drop trigger if exists trg_cache_comment_author on public.comments;
CREATE TRIGGER trg_cache_comment_author BEFORE INSERT OR UPDATE OF author_id ON public.comments FOR EACH ROW EXECUTE FUNCTION tg_cache_comment_author();;

drop trigger if exists trg_cache_post_author_fields on public.posts;
CREATE TRIGGER trg_cache_post_author_fields BEFORE INSERT OR UPDATE OF author_id, anonymous ON public.posts FOR EACH ROW EXECUTE FUNCTION tg_cache_author_fields();;

drop trigger if exists trg_comment_notify on public.comments;
CREATE TRIGGER trg_comment_notify AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION tg_notify_on_comment();;

drop trigger if exists trg_comments_recount on public.comments;
CREATE TRIGGER trg_comments_recount AFTER INSERT OR DELETE OR UPDATE OF post_id, deleted_at ON public.comments FOR EACH ROW EXECUTE FUNCTION tg_recount_comment_counters();;

drop trigger if exists trg_posts_updated_at on public.posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();;

drop trigger if exists trg_profile_follows_notify on public.profile_follows;
CREATE TRIGGER trg_profile_follows_notify AFTER INSERT ON public.profile_follows FOR EACH ROW EXECUTE FUNCTION create_follow_notification();;

drop trigger if exists trg_report_mark_post on public.reports;
CREATE TRIGGER trg_report_mark_post AFTER INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION tg_mark_post_reported();;

drop trigger if exists trg_reports_recount on public.reports;
CREATE TRIGGER trg_reports_recount AFTER INSERT OR DELETE OR UPDATE OF post_id ON public.reports FOR EACH ROW EXECUTE FUNCTION tg_recount_report_counters();;

drop trigger if exists trg_resources_updated_at on public.resources;
CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION tg_set_updated_at();;

drop trigger if exists trg_upvote_notify on public.upvotes;
CREATE TRIGGER trg_upvote_notify AFTER INSERT ON public.upvotes FOR EACH ROW EXECUTE FUNCTION tg_notify_on_upvote();;

drop trigger if exists trg_upvotes_recount on public.upvotes;
CREATE TRIGGER trg_upvotes_recount AFTER INSERT OR DELETE OR UPDATE OF post_id ON public.upvotes FOR EACH ROW EXECUTE FUNCTION tg_recount_upvote_counters();;

drop trigger if exists trg_visitor_reports_recount on public.visitor_reports;
CREATE TRIGGER trg_visitor_reports_recount AFTER INSERT OR DELETE OR UPDATE OF post_id ON public.visitor_reports FOR EACH ROW EXECUTE FUNCTION tg_recount_report_counters();;

set check_function_bodies = on;

commit;
