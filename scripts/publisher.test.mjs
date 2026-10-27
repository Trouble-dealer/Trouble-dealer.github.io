import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {normalizeContent,articleMarkdown,articleFile,noteJSON,beijingDate} from './publisher/content.mjs';
import {createPublisherServer} from './publisher/server.mjs';
import {createSyncHandler,publishedIds} from '../supabase/functions/sync-blog-posts/handler.mjs';
test('便利贴保留换行、拒绝空白及过长文字，日期使用北京时间',()=>{
  const now=new Date('2026-10-26T17:00:00Z');assert.equal(beijingDate(now),'2026-10-27');
  const note=normalizeContent({kind:'note',body:' 第一行\r\n第二行 '},now);assert.equal(note.body,'第一行\n第二行');assert.equal(JSON.parse(noteJSON(note,now)).text,note.body);
  assert.throws(()=>normalizeContent({kind:'note',body:' '}));assert.throws(()=>normalizeContent({kind:'note',body:'x'.repeat(501)}));assert.throws(()=>normalizeContent({kind:'note',body:'a',date:'2026-02-30'}));
});
test('文章自动简介与路径安全，标题中的 YAML、换行不会逃逸 frontmatter',()=>{
  const content=normalizeContent({kind:'article',title:'标题"\n---\n恶意: true',body:'## 今天\n\n**学习**与记录',category:'技术笔记',tags:'AI，工具,AI'});
  assert.deepEqual(content.tags,['AI','工具']);assert.ok(content.description.includes('学习'));assert.ok(!content.description.includes('**'));
  const result=articleMarkdown(content);assert.equal(result.split('\n').filter(line=>line==='---').length,2);assert.ok(result.includes('draft: false'));assert.match(articleFile(content,'abcdef12'),/^src\/content\/posts\/\d{4}-\d{2}-\d{2}-abcdef12\.md$/);
  assert.throws(()=>normalizeContent({kind:'article',title:'test',body:'text',category:'../../secret'}));assert.throws(()=>articleFile(content,'../x'));
});
test('本地发布接口拒绝跨站请求和缺少令牌；草稿与预览不执行 HTML',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'elio-writer-'));let calls=0;
  const server=createPublisherServer({storage:folder,publishContent:async(_content,job)=>{calls++;job.state='success';}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  try{
    const html=await(await fetch(origin)).text();const token=html.match(/const token='([a-f0-9]+)'/)[1];const headers={'Content-Type':'application/json','X-Publisher-Token':token};
    assert.equal((await fetch(origin+'/api/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(origin+'/api/publish',{method:'POST',headers:{...headers,Origin:'https://evil.test'},body:'{}'})).status,403);assert.equal(calls,0);
    const preview=await(await fetch(origin+'/api/preview',{method:'POST',headers,body:JSON.stringify({body:'**hello**<script>alert(1)</script><img src=x onerror=alert(1)>'})})).json();assert.ok(preview.html.includes('<strong>hello</strong>'));assert.ok(!preview.html.includes('<script'));assert.ok(!preview.html.includes('<img'));
    await fetch(origin+'/api/drafts',{method:'POST',headers,body:JSON.stringify({kind:'note',body:'保存在本机的内容'})});const drafts=JSON.parse(await readFile(join(folder,'drafts.json'),'utf8'));assert.equal(drafts[0].body,'保存在本机的内容');
  }finally{await new Promise(resolve=>server.close(resolve));assert.ok(resolve(folder).startsWith(resolve(tmpdir())+sep+'elio-writer-'));await rm(folder,{recursive:true,force:true});}
});
test('评论同步只接受站点已发布索引，不接受任意 ID，不重新打开已关闭的评论',async()=>{
  const origin='https://jy.xn--wut303ivvd.space';
  assert.throws(()=>publishedIds([{url:'https://evil.test/posts/test/'}],origin));assert.throws(()=>publishedIds([{url:'/posts/../../admin/'}],origin));
  const requests=[];const handler=createSyncHandler({publicKey:'public-test-key',serviceKey:'server-only-test-key',apiUrl:'https://backend.test',fetcher:async(url,options)=>{requests.push({url,options});return url.startsWith(origin)?Response.json([{url:'/posts/new-article/'}]):new Response(null,{status:201});}});
  assert.equal((await handler(new Request('https://function.test',{method:'POST'}))).status,401);
  const request=body=>new Request('https://function.test',{method:'POST',headers:{apikey:'public-test-key'},body:JSON.stringify(body)});
  assert.equal((await handler(request({ids:['invented']}))).status,400);assert.equal(requests.length,0);
  const result=await(await handler(request({}))).json();assert.deepEqual(result.registered,['new-article']);assert.deepEqual(JSON.parse(requests[1].options.body),[{id:'new-article'}]);assert.ok(requests[1].options.headers.Prefer.includes('ignore-duplicates'));assert.ok(!JSON.stringify(result).includes('server-only'));
});
