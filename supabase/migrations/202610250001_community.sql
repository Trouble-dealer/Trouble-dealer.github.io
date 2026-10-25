-- 在 Supabase SQL Editor 中运行，或通过 apply_migration 应用。
-- 账户密码由 Supabase Auth 管理；评论表没有邮箱和密码字段。
begin;

create table public.blog_posts (
  id text primary key,
  comments_enabled boolean not null default true
);
alter table public.blog_posts enable row level security;
grant select on public.blog_posts to anon, authenticated;
create policy "read enabled posts" on public.blog_posts for select to anon, authenticated
  using (comments_enabled);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.blog_posts(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(btrim(author_name)) between 2 and 40),
  body text not null check (char_length(btrim(body)) between 3 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index comments_post_created_idx on public.comments(post_id, created_at desc, id desc);
create index comments_user_created_idx on public.comments(user_id, created_at desc);
alter table public.comments enable row level security;

-- 频率记录独立保存，删除评论不会重置限制；不暴露给 REST API。
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.comment_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  submitted_at timestamptz not null default now()
);
create index comment_events_user_time_idx on private.comment_events(user_id, submitted_at desc);
alter table private.comment_events enable row level security;

-- 浏览器只能写正文与文章 ID。作者、状态、时间由服务端确定。
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, body) on public.comments to authenticated;
grant delete on public.comments to authenticated;
create policy "read approved or own comments" on public.comments for select to anon, authenticated
  using (status = 'approved' or (select auth.uid()) = user_id);
create policy "insert own pending comments" on public.comments for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');
create policy "delete own comments" on public.comments for delete to authenticated
  using ((select auth.uid()) = user_id);

create function public.prepare_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  profile record;
begin
  if actor is null then raise exception 'verified_email_required'; end if;
  select email_confirmed_at, raw_user_meta_data into profile from auth.users where id = actor;
  if profile.email_confirmed_at is null then raise exception 'verified_email_required'; end if;
  if not exists (select 1 from public.blog_posts where id = new.post_id and comments_enabled) then
    raise exception using errcode = '23503', message = 'post_comments_unavailable';
  end if;
  new.author_name := btrim(profile.raw_user_meta_data->>'nickname');
  if new.author_name is null or char_length(new.author_name) not between 2 and 40 then
    raise exception 'comment_name_required';
  end if;
  -- 同一用户的提交串行化，避免并发绕过频率限制。
  perform pg_advisory_xact_lock(hashtextextended(actor::text, 0));
  if exists (select 1 from private.comment_events where user_id = actor and submitted_at > now() - interval '30 seconds')
     or (select count(*) from private.comment_events where user_id = actor and submitted_at > now() - interval '1 hour') >= 10 then
    raise exception 'comment_rate_limit';
  end if;
  delete from private.comment_events where user_id = actor and submitted_at < now() - interval '1 day';
  insert into private.comment_events (user_id) values (actor);
  new.id := gen_random_uuid();
  new.user_id := actor;
  new.body := btrim(new.body);
  new.status := 'pending';
  new.created_at := now();
  return new;
end;
$$;
revoke all on function public.prepare_comment() from public, anon, authenticated;
create trigger prepare_comment_before_insert before insert on public.comments
  for each row execute function public.prepare_comment();

-- 仅博主在控制台审核；前端没有 UPDATE 权限，不存在伪造管理员入口。
comment on table public.comments is 'Email-verified reader comments. Public reads approved only; owners also read pending/rejected. Moderation through Supabase dashboard.';
commit;
