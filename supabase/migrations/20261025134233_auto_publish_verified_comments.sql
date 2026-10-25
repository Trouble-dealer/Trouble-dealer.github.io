begin;
-- 保留既有邮箱验证、作者归属、文章开关与频率检查，只改变服务端发布状态。
do $$
declare definition text;
begin
  definition := pg_get_functiondef('public.prepare_comment()'::regprocedure);
  if position('new.status := ''pending'';' in definition) = 0 then
    raise exception 'Unexpected comment trigger definition; migration aborted';
  end if;
  execute replace(definition, 'new.status := ''pending'';', 'new.status := ''approved'';');
end;
$$;
alter table public.comments alter column status set default 'approved';
drop policy "insert own pending comments" on public.comments;
create policy "insert own public comments" on public.comments for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'approved');
comment on table public.comments is 'Verified-email comments publish immediately. Client cannot set author/status or update records. Owner can delete own comments; operator may hide content after publication.';
commit;
