import {readFile,readdir} from 'node:fs/promises';
import {communityConfig} from '../community.config.mjs';
const folder=new URL('../src/content/posts/',import.meta.url);
const expected=[];
for(const name of await readdir(folder)){
  if(!name.endsWith('.md'))continue;
  const text=await readFile(new URL(name,folder),'utf8');
  const frontmatter=text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if(frontmatter&&!/^draft:\s*true\s*$/m.test(frontmatter[1]))expected.push(name.replace(/\.md$/,''));
}
let failure,synced=false;
for(let attempt=0;attempt<5;attempt++){
  try{
    const response=await fetch(communityConfig.url+'/functions/v1/sync-blog-posts',{method:'POST',headers:{apikey:communityConfig.publishableKey,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error('评论同步服务返回 '+response.status);
    const {registered}=await response.json();
    if(!Array.isArray(registered)||expected.some(id=>!registered.includes(id)))throw new Error('等待新发布的文章索引刷新');
    console.log(`评论允许列表已同步：${expected.length} 篇公开文章。原先关闭的评论保持关闭。`);synced=true;break;
  }catch(error){failure=error;console.log(`评论同步重试 ${attempt+1}/5：${error.message}`);if(attempt<4)await new Promise(resolve=>setTimeout(resolve,11000));}
}
if(!synced)throw failure;
