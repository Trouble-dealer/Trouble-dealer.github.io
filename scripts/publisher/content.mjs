import {randomBytes} from 'node:crypto';
export const colors=['sage','sand','lavender','blue','rose'];
export function beijingDate(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const p=name=>parts.find(part=>part.type===name).value;
  return `${p('year')}-${p('month')}-${p('day')}`;
}
const clean=(value,max,name,required=true)=>{
  if(typeof value!=='string')throw new Error(`请填写${name}。`);
  const result=value.replaceAll('\r\n','\n').replaceAll('\r','\n').trim();
  if(required&&!result)throw new Error(`请填写${name}。`);
  if([...result].length>max)throw new Error(`${name}最多 ${max} 字。`);
  if(result.includes('\0'))throw new Error(`${name}包含无效字符。`);
  return result;
};
export function normalizeContent(input,now=new Date()){
  if(!input||!['note','article'].includes(input.kind))throw new Error('请选择便利贴或文章。');
  const date=input.date||beijingDate(now);
  const timestamp=Date.parse(date+'T00:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==date)throw new Error('日期格式不正确。');
  const body=clean(input.body,input.kind==='note'?500:100000,input.kind==='note'?'便利贴文字':'正文');
  if(input.kind==='note')return {kind:'note',body,date};
  const title=clean(input.title,120,'标题');
  const category=clean(input.category||'生活随笔',40,'分类');
  const rawTags=Array.isArray(input.tags)?input.tags:String(input.tags||'记录').split(/[,，、\n]/);
  const tags=[...new Set(rawTags.map(tag=>clean(tag,30,'标签',false)).filter(Boolean))];
  if(tags.length>12)throw new Error('标签最多 12 个。');
  for(const item of [category,...tags])if(/[/\\?#\r\n]/u.test(item))throw new Error('分类与标签不能包含斜线、问号、井号或换行。');
  const description=clean(input.description||body.replace(/```[\s\S]*?```/g,' ').replace(/<[^>]*>/g,' ').replace(/!?(?:\[([^\]]*)\])\([^)]*\)/g,'$1').replace(/[#>*_`~|\n]+/g,' ').replace(/\s+/g,' ').slice(0,120),180,'简介');
  return {kind:'article',title,body,date,category,tags,description,color:colors.includes(input.color)?input.color:'blue'};
}
export function articleFile(content,nonce=randomBytes(4).toString('hex')){
  if(!/^[a-f0-9]{8}$/.test(nonce))throw new Error('Invalid nonce');
  return `src/content/posts/${content.date}-${nonce}.md`;
}
export function articleMarkdown(content){
  if(content.kind!=='article')throw new Error('Expected article');
  const json=JSON.stringify;
  return `---\ntitle: ${json(content.title)}\ndescription: ${json(content.description)}\npublished: ${content.date}\ncategory: ${json(content.category)}\ntags: ${json(content.tags)}\ncolor: ${content.color}\ndraft: false\npinned: false\n---\n\n${content.body}\n`;
}
export function noteJSON(content,now=new Date()){
  return JSON.stringify({text:content.body,date:content.date,updatedAt:now.toISOString()},null,2)+'\n';
}
