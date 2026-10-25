begin;
alter table private.comment_events add column id uuid not null default gen_random_uuid();
alter table private.comment_events add primary key (id);
-- 明确拒绝普通客户端访问。只有服务端触发器与管理连接使用此表。
create policy "deny direct client access" on private.comment_events
  for all to anon, authenticated using (false) with check (false);
commit;
