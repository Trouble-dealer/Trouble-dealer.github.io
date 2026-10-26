import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {JSDOM} from 'jsdom';
import {createMarkdownRenderer} from '../src/lib/markdown.ts';
import {elapsedSince,elapsedDays} from '../src/lib/time.ts';
import {mayRecordVisit} from '../src/lib/statistics.ts';
const dom=new JSDOM('');
const markdown=createMarkdownRenderer(dom.window);
const db=new PGlite();
const alice='11111111-1111-4111-8111-111111111111';
const bob='22222222-2222-4222-8222-222222222222';
const unverified='33333333-3333-4333-8333-333333333333';
const nonce='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
let message;
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 insert into auth.users values ('${alice}',now(),'{"nickname":"Alice"}'),('${bob}',now(),'{"nickname":"Bob"}'),('${unverified}',null,'{"nickname":"未验证"}');`);
 const root=new URL('../supabase/migrations/',import.meta.url);
 for(const file of (await readdir(root)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,root),'utf8'));
});
after(async()=>{await db.close();dom.window.close();});
async function as(role,id,sql,args=[]){await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec(`set role ${role}`);try{return await db.query(sql,args);}finally{await db.exec('reset role');}}
test('纪念计时按 UTC+8 起点精确换算，未到起点不出现负数',()=>{
 const start='2025-03-26T00:00:00+08:00';
 assert.deepEqual(elapsedSince(start,Date.parse('2025-03-27T01:02:03+08:00')),{days:1,hours:1,minutes:2,seconds:3});
 assert.equal(elapsedDays(start,Date.parse('2025-03-26T16:00:00Z')),1);
 assert.equal(elapsedDays(start,0),0);assert.throws(()=>elapsedSince('bad'),/Invalid/);
});
test('访问采集仅允许同意后的正式域名，排除本地、缺失配置及账户回调路径',()=>{
 const official='https://jy.xn--wut303ivvd.space';
 assert.equal(mayRecordVisit(true,true,official,official,'/posts/welcome/'),true);
 assert.equal(mayRecordVisit(false,true,official,official,'/'),false);
 assert.equal(mayRecordVisit(true,false,official,official,'/'),false);
 assert.equal(mayRecordVisit(true,true,'http://127.0.0.1:4321',official,'/'),false);
 assert.equal(mayRecordVisit(true,true,official,'','/'),false);
 for(const path of ['/account','/account/','/auth','/auth/callback/'])assert.equal(mayRecordVisit(true,true,official,official,path),false);
});
test('Markdown 保留常用格式、代码与表格，代码中的 HTML 不执行',()=>{
 const output=markdown('**粗体** *斜体*\n\n> 引用\n\n- 一\n- 二\n\n```html\n<script>alert(1)</script>\n```\n\n| A | B |\n|---|---|\n|1|2|');
 assert.ok(output.includes('<strong>粗体</strong>'));assert.ok(output.includes('<blockquote>'));assert.ok(output.includes('<table>'));assert.ok(output.includes('&lt;script&gt;'));assert.ok(!output.includes('<script>'));
});
test('Markdown 过滤脚本、事件、样式、表单、图片、iframe 和危险链接',()=>{
 const html=markdown('<script>alert(1)</script><img src=x onerror=alert(1)><svg onload=alert(1)></svg><iframe src="https://evil.test"></iframe><form><input></form>\n\n[危险](javascript:alert%281%29)\n\n[数据](data:text/html;base64,abc)\n\n![追踪](https://evil.test/track.png)\n\n<a href="https://safe.test" onclick="alert(1)" style="color:red">安全链接</a>');
 const fragment=JSDOM.fragment(html);
 assert.equal(fragment.querySelectorAll('script,img,svg,iframe,form,input,style').length,0);
 for(const node of fragment.querySelectorAll('*')) for(const attr of node.attributes) assert.ok(!attr.name.startsWith('on')&&attr.name!=='style');
 for(const link of fragment.querySelectorAll('a[href]'))assert.ok(!/^(javascript|data):/i.test(link.getAttribute('href')));
});
test('用户链接附带安全属性，协议相对链接不被当成站内链接',()=>{
 const fragment=JSDOM.fragment(markdown('[站点](https://example.org) [站内](/about/) [相对](//evil.test)'));
 const links=[...fragment.querySelectorAll('a')];
 assert.equal(links[0].getAttribute('rel'),'noopener noreferrer nofollow ugc');
 assert.equal(links[0].getAttribute('target'),'_blank');assert.equal(links[2].hasAttribute('href'),false);
});
test('留言仅已验证用户可写，游客可读',async()=>{
 await assert.rejects(as('anon',null,`insert into public.lounge_messages(body,client_nonce) values('匿名留言','${nonce}')`),/permission denied/i);
 await assert.rejects(as('authenticated',unverified,`insert into public.lounge_messages(body,client_nonce) values('未验证','${nonce}')`),/verified_email_required/);
 const result=await as('authenticated',alice,`insert into public.lounge_messages(body,client_nonce) values('**测试消息**','${nonce}') returning *`);message=result.rows[0];
 assert.equal(message.author_name,'Alice');assert.equal(message.user_id,alice);assert.equal((await as('anon',null,'select * from public.lounge_messages')).rows.length,1);
});
test('留言不能伪造归属、昵称、时间或修改别人消息，自己可删除',async()=>{
 await assert.rejects(as('authenticated',bob,`insert into public.lounge_messages(body,client_nonce,user_id) values('伪造','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','${alice}')`),/permission denied/i);
 await assert.rejects(as('authenticated',alice,"update public.lounge_messages set body='改写'"),/permission denied/i);
 assert.equal((await as('authenticated',bob,'delete from public.lounge_messages where id=$1 returning id',[message.id])).rows.length,0);
});
test('重试 nonce 不重复发送、短间隔被拒绝，删除消息不能重置限制',async()=>{
 await assert.rejects(as('authenticated',alice,`insert into public.lounge_messages(body,client_nonce) values('重复','${nonce}')`),/duplicate_message_nonce/);
 assert.equal((await as('authenticated',alice,'delete from public.lounge_messages where id=$1 returning id',[message.id])).rows.length,1);
 await assert.rejects(as('authenticated',alice,`insert into public.lounge_messages(body,client_nonce) values('刷屏','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')`),/lounge_rate_limit/);
});
test('回复关联存在的消息；父消息删除后回复不会报废',async()=>{
 await db.exec("update private.lounge_send_events set created_at=now()-interval '10 seconds'");
 const parent=(await as('authenticated',alice,`insert into public.lounge_messages(body,client_nonce) values('父消息','cccccccc-cccc-4ccc-8ccc-cccccccccccc') returning id`)).rows[0];
 const child=(await as('authenticated',bob,`insert into public.lounge_messages(body,client_nonce,reply_to) values('回复','dddddddd-dddd-4ddd-8ddd-dddddddddddd','${parent.id}') returning id,reply_to`)).rows[0];
 assert.equal(child.reply_to,parent.id);await as('authenticated',alice,'delete from public.lounge_messages where id=$1',[parent.id]);
 assert.equal((await as('anon',null,'select reply_to from public.lounge_messages where id=$1',[child.id])).rows[0].reply_to,null);
});
test('留言每小时上限和长度约束由数据库实施',async()=>{
 await db.exec(`insert into private.lounge_send_events(user_id,created_at) select '${alice}'::uuid,now()-interval '10 minutes' from generate_series(1,60)`);
 await assert.rejects(as('authenticated',alice,`insert into public.lounge_messages(body,client_nonce) values('超限','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee')`),/lounge_rate_limit/);
 await db.exec("update private.lounge_send_events set created_at=now()-interval '2 hours'");
 await assert.rejects(as('authenticated',alice,`insert into public.lounge_messages(body,client_nonce) values('   ','ffffffff-ffff-4fff-8fff-ffffffffffff')`),/check constraint/i);
});
test('统计从真实写入累计，同浏览器同页面30分钟去重',async()=>{
 const visitor='aaaaaaaa-1111-4111-8111-111111111111';
 await as('anon',null,'select public.record_site_visit($1,$2)',[visitor,'/']);await as('anon',null,'select public.record_site_visit($1,$2)',[visitor,'/']);
 let stats=(await as('anon',null,'select * from public.get_site_statistics()')).rows[0];assert.equal(Number(stats.pageviews),1);assert.equal(Number(stats.browsers),1);
 await db.exec("update private.visit_windows set last_seen=now()-interval '31 minutes'");
 await as('anon',null,'select public.record_site_visit($1,$2)',[visitor,'/']);
 stats=(await as('anon',null,'select * from public.get_site_statistics()')).rows[0];assert.equal(Number(stats.pageviews),2);assert.equal(Number(stats.browsers),1);
});
test('统计独立浏览器与跨页计数，拒绝含参数路径；客户端读不到个体记录',async()=>{
 const visitor='bbbbbbbb-2222-4222-8222-222222222222';
 await as('anon',null,'select public.record_site_visit($1,$2)',[visitor,'/about/']);
 let stats=(await as('anon',null,'select * from public.get_site_statistics()')).rows[0];assert.equal(Number(stats.pageviews),3);assert.equal(Number(stats.browsers),2);
 await assert.rejects(as('anon',null,'select public.record_site_visit($1,$2)',[visitor,'/auth/?code=secret']),/invalid_visit/);
 await assert.rejects(as('anon',null,'select * from private.visit_browsers'),/permission denied/i);
 await assert.rejects(as('authenticated',bob,'select * from private.lounge_send_events'),/permission denied/i);
 await assert.rejects(as('anon',null,"update private.site_totals set pageviews=99999"),/permission denied/i);
});
