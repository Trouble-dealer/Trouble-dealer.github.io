-- 2026-10-26：Elio 已核对并授权启用。此新增迁移只运行一次。
begin;

create table public.lounge_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null check (char_length(btrim(author_name)) between 2 and 40),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  reply_to uuid references public.lounge_messages(id) on delete set null,
  client_nonce uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, client_nonce)
);
create index lounge_messages_time_idx on public.lounge_messages(created_at desc, id desc);
create index lounge_messages_reply_idx on public.lounge_messages(reply_to);
alter table public.lounge_messages enable row level security;
revoke all on public.lounge_messages from anon, authenticated;
grant select on public.lounge_messages to anon, authenticated;
grant insert (body,reply_to,client_nonce) on public.lounge_messages to authenticated;
grant delete on public.lounge_messages to authenticated;
create policy "read public lounge" on public.lounge_messages for select to anon,authenticated using (true);
create policy "send own lounge messages" on public.lounge_messages for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "delete own lounge messages" on public.lounge_messages for delete to authenticated using ((select auth.uid()) = user_id);

create table private.lounge_send_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index lounge_send_user_time_idx on private.lounge_send_events(user_id,created_at desc);
alter table private.lounge_send_events enable row level security;
create policy "no direct lounge log access" on private.lounge_send_events for all to anon,authenticated using(false) with check(false);

create function private.prepare_lounge_message() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid(); profile record;
begin
  if actor is null then raise exception 'verified_email_required'; end if;
  select email_confirmed_at,raw_user_meta_data into profile from auth.users where id=actor;
  if profile.email_confirmed_at is null then raise exception 'verified_email_required'; end if;
  new.author_name := btrim(profile.raw_user_meta_data->>'nickname');
  if new.author_name is null or char_length(new.author_name) not between 2 and 40 then raise exception 'comment_name_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('lounge:' || actor::text,0));
  -- HTTP 超时后重试相同 nonce，不产生重复消息或消耗发送额度。
  if exists(select 1 from public.lounge_messages where user_id=actor and client_nonce=new.client_nonce) then
    raise exception using errcode='23505', message='duplicate_message_nonce';
  end if;
  if exists(select 1 from private.lounge_send_events where user_id=actor and created_at>now()-interval '3 seconds')
    or (select count(*) from private.lounge_send_events where user_id=actor and created_at>now()-interval '1 hour')>=60 then
    raise exception 'lounge_rate_limit';
  end if;
  delete from private.lounge_send_events where user_id=actor and created_at<now()-interval '1 day';
  insert into private.lounge_send_events(user_id) values(actor);
  new.id:=gen_random_uuid(); new.user_id:=actor; new.body:=btrim(new.body); new.created_at:=now();
  return new;
end; $$;
revoke all on function private.prepare_lounge_message() from public,anon,authenticated;
create trigger prepare_lounge before insert on public.lounge_messages for each row execute function private.prepare_lounge_message();

-- DELETE 只广播主键；客户端把事件当作重新读取数据库的信号。
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.lounge_messages;
  end if;
end; $$;

-- 统计只公开聚合数据，不暴露浏览器随机标识或浏览历史。
create table private.site_totals (
  singleton boolean primary key default true check(singleton),
  pageviews bigint not null default 0,
  browsers bigint not null default 0,
  started_at timestamptz not null default now()
);
insert into private.site_totals(singleton) values(true);
create table private.visit_browsers (
  id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create table private.visit_windows (
  visitor_id uuid not null references private.visit_browsers(id) on delete cascade,
  path text not null,
  last_seen timestamptz not null default now(),
  primary key(visitor_id,path)
);
alter table private.site_totals enable row level security;
alter table private.visit_browsers enable row level security;
alter table private.visit_windows enable row level security;
create policy "no direct totals access" on private.site_totals for all to anon,authenticated using(false) with check(false);
create policy "no direct visitor access" on private.visit_browsers for all to anon,authenticated using(false) with check(false);
create policy "no direct visit access" on private.visit_windows for all to anon,authenticated using(false) with check(false);

-- 公共 RPC 需要聚合私有表，使用固定 search_path 和显式授权。
create function public.get_site_statistics() returns table(pageviews bigint,browsers bigint,started_at timestamptz)
language sql stable security definer set search_path='' as $$
  select t.pageviews,t.browsers,t.started_at from private.site_totals t where singleton;
$$;
revoke all on function public.get_site_statistics() from public;
grant execute on function public.get_site_statistics() to anon,authenticated;

create function public.record_site_visit(visitor uuid, page text) returns void
language plpgsql security definer set search_path='' as $$
declare is_new boolean; changed integer; recent timestamptz;
begin
  if visitor is null or visitor='00000000-0000-0000-0000-000000000000'::uuid or page is null
    or char_length(page)>240 or page !~ '^/[A-Za-z0-9_/%~.\-]*$' or page like '%..%' then
    raise exception 'invalid_visit';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('visit:'||visitor::text,0));
  insert into private.visit_browsers(id) values(visitor) on conflict do nothing;
  get diagnostics changed=row_count; is_new:=changed=1;
  select last_seen into recent from private.visit_windows where visitor_id=visitor and path=page;
  -- 同一浏览器同一页面 30 分钟内重复刷新不累加；不收集 URL 参数、IP 或 UA。
  if recent is not null and recent>now()-interval '30 minutes' then return; end if;
  -- 单个浏览器 3 秒内最多新增一次计数。
  if not is_new and exists(select 1 from private.visit_windows where visitor_id=visitor and last_seen>now()-interval '3 seconds') then return; end if;
  insert into private.visit_windows(visitor_id,path) values(visitor,page)
    on conflict(visitor_id,path) do update set last_seen=now();
  update private.visit_browsers set last_seen=now() where id=visitor;
  delete from private.visit_windows where visitor_id=visitor and last_seen<now()-interval '1 day';
  update private.site_totals set pageviews=pageviews+1,browsers=browsers+(case when is_new then 1 else 0 end) where singleton;
end; $$;
revoke all on function public.record_site_visit(uuid,text) from public;
grant execute on function public.record_site_visit(uuid,text) to anon,authenticated;
comment on table public.lounge_messages is 'Public Markdown lounge. Verified email required to write; author may delete own messages. No client UPDATE.';
commit;
