export function publishedIds(index,origin){
  if(!Array.isArray(index)||index.length>1000)throw new Error('Invalid publication index');
  return [...new Set(index.map(post=>{
    if(typeof post.url!=='string')throw new Error('Invalid post URL');
    const url=new URL(post.url,origin);
    if(url.origin!==origin||url.search||url.hash)throw new Error('Invalid publication origin');
    const match=decodeURIComponent(url.pathname).match(/^\/posts\/([\p{L}\p{N}][\p{L}\p{N}_-]{0,150})\/$/u);
    if(!match)throw new Error('Invalid post path');
    return match[1];
  }))];
}
export function createSyncHandler({publicKey,serviceKey,apiUrl,fetcher=fetch,now=Date.now}){
  const origin='https://jy.xn--wut303ivvd.space';let cache=null,cachedAt=0,inflight;
  return async request=>{
    const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    if(!publicKey||request.headers.get('apikey')!==publicKey)return json({error:'Unauthorized'},401);
    let size=0;const parts=[];
    if(request.body)for await(const part of request.body){size+=part.length;if(size>512)return json({error:'Body too large'},413);parts.push(part);}
    try{const joined=new Uint8Array(size);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.length;}const text=new TextDecoder().decode(joined);if(text.trim()&&Object.keys(JSON.parse(text)).length)return json({error:'This endpoint does not accept post IDs or URLs'},400);}catch{return json({error:'Invalid request'},400);}
    if(!serviceKey||!apiUrl)return json({error:'Server configuration unavailable'},503);
    if(cache&&now()-cachedAt<10000)return json(cache);
    if(!inflight)inflight=(async()=>{
      // No user-supplied URL or ID is used. Only the site's deployed index is authoritative.
      const manifest=await fetcher(origin+'/search-index.json?sync='+now(),{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'},redirect:'error'});
      if(!manifest.ok)throw new Error('Publication index unavailable');
      const raw=await manifest.text();if(raw.length>2000000)throw new Error('Publication index too large');
      const ids=publishedIds(JSON.parse(raw),origin);
      if(ids.length){
        const response=await fetcher(apiUrl+'/rest/v1/blog_posts?on_conflict=id',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify(ids.map(id=>({id}))),signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error('Registration failed');
      }
      cache={registered:ids};cachedAt=now();return cache;
    })().finally(()=>{inflight=null;});
    try{return json(await inflight);}catch{return json({error:'Could not synchronize published posts; retry later'},502);}
  };
}
