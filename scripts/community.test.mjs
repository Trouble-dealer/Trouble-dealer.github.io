import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { validatePublicBackend } from '../src/lib/backend-config.ts';
const db = new PGlite();
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const unverified = '33333333-3333-4333-8333-333333333333';
let comment;
before(async () => {
  await db.exec(`create role anon; create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values
      ('${alice}', now(), '{"nickname":"Alice"}'),
      ('${bob}', now(), '{"nickname":"Bob"}'),
      ('${unverified}', null, '{"nickname":"Unverified"}');`);
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, migrations), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/seed-posts.sql', import.meta.url), 'utf8'));
});
after(async () => { await db.close(); });
async function as(role, uid, sql, args = []) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']);
  await db.exec(`set role ${role}`);
  try { return await db.query(sql, args); }
  finally { await db.exec('reset role'); }
}
test('匿名用户无法提交评论', async () => {
  await assert.rejects(as('anon', null, "insert into public.comments (post_id,body) values ('welcome','匿名评论')"), /permission denied/i);
});
test('未验证邮箱不能提交；无效文章也不能提交', async () => {
  await assert.rejects(as('authenticated', unverified, "insert into public.comments (post_id,body) values ('welcome','未验证评论')"), /verified_email_required/);
  await assert.rejects(as('authenticated', alice, "insert into public.comments (post_id,body) values ('nonexistent','无效文章评论')"), /post_comments_unavailable/);
});
test('已验证用户提交后，数据库直接公开并确定作者', async () => {
  const result = await as('authenticated', alice, "insert into public.comments (post_id,body) values ('welcome','<script>不会执行的纯文本</script>') returning *");
  comment = result.rows[0];
  assert.equal(comment.user_id, alice); assert.equal(comment.author_name, 'Alice'); assert.equal(comment.status, 'approved');
  assert.equal(comment.body, '<script>不会执行的纯文本</script>');
});
test('新评论立即对游客可见；管理员隐藏后仅作者可读', async () => {
  assert.equal((await as('anon', null, 'select * from public.comments')).rows.length, 1);
  await db.query("update public.comments set status='rejected' where id=$1", [comment.id]);
  assert.equal((await as('anon', null, 'select * from public.comments')).rows.length, 0);
  assert.equal((await as('authenticated', bob, 'select * from public.comments')).rows.length, 0);
  assert.equal((await as('authenticated', alice, 'select * from public.comments')).rows.length, 1);
});
test('前端无法伪造作者、审核状态或时间，也不能自己批准', async () => {
  await assert.rejects(as('authenticated', bob, "insert into public.comments(post_id,body,status) values ('welcome','伪造批准评论','approved')"), /permission denied/i);
  await assert.rejects(as('authenticated', bob, `insert into public.comments(post_id,body,user_id) values ('welcome','伪造作者评论','${alice}')`), /permission denied/i);
  await assert.rejects(as('authenticated', alice, "update public.comments set status='approved'"), /permission denied/i);
});
test('管理员可以恢复公开，结果中没有邮箱和密码字段', async () => {
  await db.query("update public.comments set status='approved' where id=$1", [comment.id]);
  const result = (await as('anon', null, 'select * from public.comments')).rows;
  assert.equal(result.length, 1); assert.equal(result[0].status, 'approved');
  assert.ok(!Object.keys(result[0]).some(key => /email|password/.test(key)));
});
test('其他用户不能删除，作者能删除；删除后仍不能绕过频率限制', async () => {
  assert.equal((await as('authenticated', bob, 'delete from public.comments where id=$1 returning id', [comment.id])).rows.length, 0);
  assert.equal((await as('authenticated', alice, 'delete from public.comments where id=$1 returning id', [comment.id])).rows.length, 1);
  await assert.rejects(as('authenticated', alice, "insert into public.comments(post_id,body) values ('welcome','重复提交评论')"), /comment_rate_limit/);
});
test('数据库拒绝过短正文、关闭评论文章和每小时超过十次提交', async () => {
  await assert.rejects(as('authenticated', bob, "insert into public.comments(post_id,body) values ('welcome','a')"), /check constraint/i);
  await db.exec("update public.blog_posts set comments_enabled=false where id='rss-reading'");
  await assert.rejects(as('authenticated', bob, "insert into public.comments(post_id,body) values ('rss-reading','关闭评论文章')"), /post_comments_unavailable/);
  await db.exec(`insert into private.comment_events(user_id,submitted_at) select '${bob}'::uuid, now()-interval '2 minutes' from generate_series(1,10)`);
  await assert.rejects(as('authenticated', bob, "insert into public.comments(post_id,body) values ('welcome','超过每小时上限')"), /comment_rate_limit/);
  await assert.rejects(as('authenticated', bob, 'select * from private.comment_events'), /permission denied/i);
});
test('公开后端配置拒绝 secret、service_role 和不安全项目地址', () => {
  assert.throws(() => validatePublicBackend('https://a.supabase.co', 'sb_secret_test'), /secret/);
  const secretJwt = `x.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.x`;
  assert.throws(() => validatePublicBackend('https://a.supabase.co', secretJwt), /service_role/);
  assert.throws(() => validatePublicBackend('http://a.supabase.co', 'sb_publishable_test'), /URL/);
  assert.equal(validatePublicBackend('https://a.supabase.co', 'sb_publishable_test').configured, true);
});
