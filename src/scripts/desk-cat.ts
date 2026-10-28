const cat=document.querySelector<HTMLElement>('[data-desk-cat]');
if(cat){
  const button=cat.querySelector<HTMLButtonElement>('.cat-toy')!;
  const status=cat.querySelector<HTMLElement>('#desk-cat-status')!;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,timer:ReturnType<typeof setTimeout>,index=0,point={x:0,y:0};
  const phrases=['呼噜——再陪你看一会儿。','喵，今天也要照顾好自己。','摸摸收到，送你一点好心情。'];
  function resetEyes(){cancelAnimationFrame(frame);frame=0;cat!.style.removeProperty('--eye-x');cat!.style.removeProperty('--eye-y');}
  button.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||reduced.matches||document.documentElement.dataset.motionActive!=='true')return;
    point={x:event.clientX,y:event.clientY};if(frame)return;
    frame=requestAnimationFrame(()=>{frame=0;const b=button.getBoundingClientRect();cat!.style.setProperty('--eye-x',String(Math.max(-3,Math.min(3,(point.x-b.left-b.width/2)/22)))+'px');cat!.style.setProperty('--eye-y',String(Math.max(-2,Math.min(2,(point.y-b.top-b.height/2)/24)))+'px');});
  },{passive:true});
  button.addEventListener('pointerleave',resetEyes);
  button.addEventListener('click',()=>{clearTimeout(timer);resetEyes();cat!.classList.add('is-petted');status.textContent=phrases[index++%phrases.length];timer=setTimeout(()=>{cat!.classList.remove('is-petted');},2100);});
  reduced.addEventListener('change',resetEyes);
  new MutationObserver(resetEyes).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion-active']});
  addEventListener('pagehide',()=>{clearTimeout(timer);resetEyes();cat!.classList.remove('is-petted');});
}
