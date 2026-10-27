import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {Marked} from 'marked';
import createDOMPurify from 'dompurify';
import {JSDOM} from 'jsdom';
import {ROOT,STATE,publish,pendingStatus} from './publish.mjs';
import {beijingDate,normalizeContent} from './content.mjs';
const purifier=createDOMPurify(new JSDOM('').window);
const markdown=new Marked({gfm:true,breaks:true});
async function draftList(storage=STATE){try{return JSON.parse(await readFile(join(storage,'drafts.json'),'utf8'));}catch{return [];}}
async function requestBody(req){
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>600000)throw new Error('内容过大，请将正文控制在十万字以内。');chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
}
export function createPublisherServer({publishContent=publish,storage=STATE}={}){
  const token=randomBytes(32).toString('hex');const jobs=new Map();let active=false;
  const server=createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${server.address().port}`;
    const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
    if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin))return send(403,{error:'只接受本机编辑窗口的请求。'});
    try{
      const path=new URL(req.url,origin).pathname;
      if(req.method==='GET'&&path==='/'){
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"});
        return res.end((await readFile(new URL('./ui.html',import.meta.url),'utf8')).replace('__PUBLISHER_TOKEN__',token));
      }
      if(req.method==='GET'&&path==='/api/config'){
        const note=JSON.parse(await readFile(join(ROOT,'src/data/daily-note.json'),'utf8'));
        return send(200,{date:beijingDate(),note,drafts:await draftList(storage),pending:await pendingStatus()});
      }
      if(req.method==='GET'&&path.startsWith('/api/jobs/')){const job=jobs.get(path.split('/').at(-1));return send(job?200:404,job||{error:'没有找到这次发布记录。'});}
      if(req.method!=='POST')return send(404,{error:'页面不存在。'});
      if(req.headers['x-publisher-token']!==token||!req.headers['content-type']?.startsWith('application/json'))return send(403,{error:'请从本机工具页面操作。'});
      const body=await requestBody(req);
      if(path==='/api/preview'){
        const safe=purifier.sanitize(markdown.parse(String(body.body||'').slice(0,100000)),{FORBID_TAGS:['img','iframe','form','input','button','style','script']});
        return send(200,{html:safe});
      }
      if(path==='/api/drafts'){
        if(!['note','article'].includes(body.kind))return send(400,{error:'请选择内容类型。'});
        await mkdir(storage,{recursive:true});
        const list=await draftList(storage);const id=/^[a-f0-9-]{36}$/.test(body.draftId||'')?body.draftId:randomUUID();
        const draft={draftId:id,kind:body.kind,title:String(body.title||'').slice(0,120),body:String(body.body||'').slice(0,100000),date:String(body.date||beijingDate()),category:String(body.category||'生活随笔').slice(0,40),tags:String(body.tags||'').slice(0,400),description:String(body.description||'').slice(0,180),color:String(body.color||'blue'),savedAt:new Date().toISOString()};
        await writeFile(join(storage,'drafts.json'),JSON.stringify([draft,...list.filter(item=>item.draftId!==id)].slice(0,80),null,2));
        return send(200,{draftId:id,savedAt:draft.savedAt});
      }
      if(path==='/api/publish'||path==='/api/retry'){
        if(active)return send(409,{error:'已有发布正在运行，请等待完成。'});
        const retry=path==='/api/retry';const content=retry?null:normalizeContent(body);
        active=true;
        const id=randomUUID();const job={id,state:'running',phase:'准备发布',logs:'',url:'',actions:''};
        const log=text=>job.logs=(job.logs+text).slice(-40000);
        jobs.set(id,job);if(jobs.size>30)jobs.delete(jobs.keys().next().value);
        const worker={log,get state(){return job.state;},set state(v){job.state=v;},set phase(v){job.phase=v;},set url(v){job.url=v;},set sha(v){job.sha=v;},set actions(v){job.actions=v;}};
        void publishContent(content,worker,{retry}).catch(error=>{job.state='error';job.phase='发布未完成';job.error=error.message;log('\n'+error.message+'\n');}).finally(()=>{active=false;});
        return send(202,{id});
      }
      return send(404,{error:'接口不存在。'});
    }catch(error){send(400,{error:error.message||'请求未完成。'});}
  });
  return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const server=createPublisherServer();
  server.listen(0,'127.0.0.1',()=>{
    const url=`http://127.0.0.1:${server.address().port}/`;
    console.log(`\nElio 写作与发布工具\n${url}\n\n仅本机可用。写作时保留此窗口；完成后按 Ctrl+C 关闭。\n`);
    if(process.argv.includes('--open')&&!process.argv.includes('--no-open')){
      if(process.platform==='win32')spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true,stdio:'ignore'}).on('error',()=>console.log('请手动打开上面的地址。'));
    }
  });
  process.on('SIGINT',()=>server.close(()=>process.exit(0)));
}
