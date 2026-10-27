import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,open,unlink,access} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {articleFile,articleMarkdown,noteJSON} from './content.mjs';
export const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export const STATE=join(ROOT,'.publisher');
const REMOTE=/^(?:https:\/\/github\.com\/Trouble-dealer\/Trouble-dealer\.github\.io(?:\.git)?\/?|git@github\.com:Trouble-dealer\/Trouble-dealer\.github\.io(?:\.git)?)$/i;
const site='https://jy.xn--wut303ivvd.space';
export function run(file,args,{cwd=ROOT,timeout=180000,log=()=>{}}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(file,args,{cwd,windowsHide:true,shell:false,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1',GIT_TERMINAL_PROMPT:'0'}});
    let output='',settled=false;
    const timer=setTimeout(()=>{if(process.platform==='win32'&&child.pid)spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});else child.kill();finish(new Error('操作超时；草稿已保留，可稍后重试。'));},timeout);
    function finish(error){if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(output.trim());}
    for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{const text=chunk.toString();output=(output+text).slice(-30000);log(text);});
    child.on('error',error=>finish(new Error(`无法运行 ${file}：${error.message}`)));
    child.on('close',code=>finish(code===0?null:new Error(output.trim()||`命令退出码 ${code}`)));
  });
}
const git=(args,options={})=>run('git',args,options);
async function readPending(){try{return JSON.parse(await readFile(join(STATE,'pending.json'),'utf8'));}catch{return null;}}
async function npmCLI(){
  for(const candidate of [process.env.npm_execpath,join(dirname(process.execPath),'node_modules/npm/bin/npm-cli.js')].filter(Boolean)){
    try{await access(candidate);return candidate;}catch{}
  }
  throw new Error('请双击“快速发布.cmd”启动；没有找到 npm，请安装 Node.js 24。');
}
export async function publish(content,job,{retry=false,runner=run}={}){
  await mkdir(STATE,{recursive:true});
  let lock;
  try{lock=await open(join(STATE,'publish.lock'),'wx');}catch{
    let stale=false;
    try{const previous=JSON.parse(await readFile(join(STATE,'publish.lock'),'utf8'));if(Number.isSafeInteger(previous.pid)&&previous.pid>0){try{process.kill(previous.pid,0);}catch(error){if(error.code==='ESRCH')stale=true;}}}catch{}
    if(!stale)throw new Error('另一个发布正在运行，请等待完成后重试。');
    await unlink(join(STATE,'publish.lock'));lock=await open(join(STATE,'publish.lock'),'wx');
  }
  await lock.writeFile(JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}));
  try{
    job.phase='检查仓库';
    if(await git(['branch','--show-current'])!=='main')throw new Error('当前不是 main 分支，请先切回 main 后使用发布工具。');
    if(!REMOTE.test(await git(['remote','get-url','origin'])))throw new Error('origin 不是你的博客仓库，已停止上传。');
    let pending=await readPending();
    if(pending&&!retry)throw new Error('有一份已提交、尚未上传的内容。请先点“重试上次上传”，防止重复发布。');
    if(retry){
      if(!pending)throw new Error('没有待重试的上传。');
      if(await git(['rev-parse','HEAD'])!==pending.sha)throw new Error('待重试提交后仓库又有变动。为避免上传其他改动，请先手动检查仓库。');
    }else{
      if(await git(['diff','--cached','--name-only']))throw new Error('Git 暂存区有其他改动，请先处理暂存区。工具不会把它们一起上传。');
      if(await git(['rev-list','--count','origin/main..HEAD'])!=='0')throw new Error('有其他尚未上传的 Git 提交，请先处理后再发布新内容。');
      await git(['config','user.name']);await git(['config','user.email']);
      if(await git(['status','--porcelain','--','src/content/posts','supabase/seed-posts.sql']))throw new Error('文章目录或评论索引已有未提交修改，请先处理，避免与这次发布混在一起。');
      const file=content.kind==='note'?'src/data/daily-note.json':articleFile(content);
      if(content.kind==='note'&&await git(['status','--porcelain','--',file]))throw new Error('便利贴文件已有本地改动，请先处理，避免覆盖。');
      const paths=[file,'supabase/seed-posts.sql'];
      const original=content.kind==='note'?await readFile(join(ROOT,file)):null;
      const seed=await readFile(join(ROOT,'supabase/seed-posts.sql'));
      let wrote=false,stagedOwn=false,committed=false;
      try{
      await mkdir(dirname(join(ROOT,file)),{recursive:true});
      await writeFile(join(ROOT,file),content.kind==='note'?noteJSON(content):articleMarkdown(content),content.kind==='article'?{flag:'wx'}:{});wrote=true;
      job.phase='检查与排版';
      await runner(process.execPath,[await npmCLI(),'run','build'],{log:text=>job.log(text),timeout:300000});
      if(content.kind==='article'){
        // Stage only the article/note and the corresponding generated allowlist.
        job.log('新文章已采用站内模板排版；部署后会自动启用评论。\n');
      }
      await git(['add','--',...paths]);stagedOwn=true;
      const staged=(await git(['diff','--cached','--name-only'])).split('\n').filter(Boolean);
      if(staged.some(path=>!paths.includes(path)))throw new Error('检测到无关暂存文件，已停止提交。');
      const message=content.kind==='note'?`Update daily note ${content.date}`:`Publish article: ${content.title}`;
      job.phase='保存 Git 提交';
      await git(['-c','core.quotepath=false','commit','-m',message,'--',...staged],{log:text=>job.log(text)});
      committed=true;
      const sha=await git(['rev-parse','HEAD']);
      pending={sha,kind:content.kind,title:content.kind==='note'?'便利贴':content.title,url:content.kind==='note'?site+'/':site+'/posts/'+file.split('/').at(-1).replace(/\.md$/,'')+'/',at:Date.now()};
      await writeFile(join(STATE,'pending.json'),JSON.stringify(pending));
      }catch(error){
        if(!committed&&wrote){
          if(stagedOwn)await git(['restore','--staged','--',...paths]).catch(()=>{});
          if(original)await writeFile(join(ROOT,file),original);else await unlink(join(ROOT,file));
          await writeFile(join(ROOT,'supabase/seed-posts.sql'),seed);
          job.log('检查未通过，本次工作文件已恢复；编辑草稿仍保存在本机。\n');
        }
        throw error;
      }
    }
    job.url=pending.url;job.phase='上传到 GitHub';
    let pushed=false;
    for(let attempt=0;attempt<3;attempt++){
      try{await git(['-c','http.version=HTTP/1.1','-c','credential.interactive=never','push','origin','main'],{timeout:55000,log:text=>job.log(text)});pushed=true;break;}
      catch(error){job.log(`第 ${attempt+1} 次上传未完成。\n${error.message}\n`);if(attempt<2)await new Promise(resolve=>setTimeout(resolve,2500));}
    }
    if(!pushed)throw new Error('内容已保存并提交，但上传失败。检查网络或 GitHub 登录后，点“重试上次上传”即可，不需要重写。');
    await unlink(join(STATE,'pending.json'));
    job.sha=pending.sha;job.phase='等待网站部署';
    job.actions='https://github.com/Trouble-dealer/Trouble-dealer.github.io/actions';
    const api=`https://api.github.com/repos/Trouble-dealer/Trouble-dealer.github.io/actions/runs?head_sha=${pending.sha}&per_page=5`;
    for(let attempt=0;attempt<20;attempt++){
      await new Promise(resolve=>setTimeout(resolve,8000));
      try{
        const response=await fetch(api,{signal:AbortSignal.timeout(12000),headers:{Accept:'application/vnd.github+json'}});
        if(!response.ok)continue;
        const data=await response.json();const run=data.workflow_runs?.find(run=>run.name==='Deploy blog to GitHub Pages');
        if(!run)continue;
        job.actions=run.html_url;
        if(run.status!=='completed')continue;
        if(run.conclusion!=='success')throw new Error('GitHub 部署未成功，请点“查看部署记录”查看原因。本地内容与提交仍然保留。');
        job.phase='已发布';job.state='success';return;
      }catch(error){if(error.message.startsWith('GitHub 部署'))throw error;}
    }
    job.state='uploaded';job.phase='已上传，部署状态暂未确认';job.log('GitHub 已收到内容。可打开部署记录查看进度，稍后刷新网站。\n');
  }finally{await lock.close();await unlink(join(STATE,'publish.lock')).catch(()=>{});}
}
export async function pendingStatus(){return readPending();}
