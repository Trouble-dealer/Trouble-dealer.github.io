// Reference ideas: https://reactbits.dev — no React runtime or animation dependency.
const root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const pointer=matchMedia('(hover: hover) and (pointer: fine)');
const hero=document.querySelector<HTMLElement>('.hero');
const revealTargets=[...document.querySelectorAll<HTMLElement>('.hero-copy > *, .post-card, .friend-card, .daily-note, .home-bottom > *, main > .page-intro, .taxonomy-card, .metric-card')];
const seen=new WeakSet<Element>();
const reveals=new Map<Element,Animation>();
let revealObserver:IntersectionObserver|undefined,ambientObserver:IntersectionObserver|undefined;
let started=false,pageActive=true,heroVisible=false;
let pointerFrame=0;
let activeCard:HTMLElement|null=null,activeMagnet:HTMLElement|null=null;
let point={x:0,y:0};
const cards=[...document.querySelectorAll<HTMLElement>('.post-card,.friend-card,.lounge-invitation,.metric-card')];
const magnets=[...document.querySelectorAll<HTMLElement>('.read-link,.hero-bottom a,.invitation-action,.friend-rss,.social-links > a')];
cards.forEach(card=>card.classList.add('motion-spotlight'));
magnets.forEach(magnet=>magnet.classList.add('motion-magnet'));
const enabled=()=>started&&pageActive&&!document.hidden&&!reduced.matches&&root.dataset.motion!=='false';
const canPoint=()=>enabled()&&pointer.matches&&!document.querySelector('dialog[open]');
function clearPointer(){
  cancelAnimationFrame(pointerFrame);pointerFrame=0;
  activeCard?.removeAttribute('data-spot-active');
  activeMagnet?.style.removeProperty('--mag-x');activeMagnet?.style.removeProperty('--mag-y');
  activeCard=null;activeMagnet=null;
}
function paintPointer(){
  pointerFrame=0;if(!canPoint()){clearPointer();return;}
  if(activeCard){const b=activeCard.getBoundingClientRect();activeCard.style.setProperty('--spot-x',`${point.x-b.left}px`);activeCard.style.setProperty('--spot-y',`${point.y-b.top}px`);activeCard.setAttribute('data-spot-active','');}
  if(activeMagnet){const b=activeMagnet.getBoundingClientRect();const clamp=(n:number)=>Math.max(-3,Math.min(3,n));activeMagnet.style.setProperty('--mag-x',`${clamp((point.x-b.left-b.width/2)*.09)}px`);activeMagnet.style.setProperty('--mag-y',`${clamp((point.y-b.top-b.height/2)*.09)}px`);}
}
document.addEventListener('pointermove',event=>{
  if(event.pointerType!=='mouse'||!canPoint()){if(activeCard||activeMagnet)clearPointer();return;}
  const target=event.target instanceof Element?event.target:null;
  const card=target?.closest<HTMLElement>('.motion-spotlight')||null;
  const magnet=target?.closest<HTMLElement>('.motion-magnet')||null;
  if(card!==activeCard){activeCard?.removeAttribute('data-spot-active');activeCard=card;}
  if(magnet!==activeMagnet){activeMagnet?.style.removeProperty('--mag-x');activeMagnet?.style.removeProperty('--mag-y');activeMagnet=magnet;}
  point={x:event.clientX,y:event.clientY};
  if(!pointerFrame&&(activeCard||activeMagnet))pointerFrame=requestAnimationFrame(paintPointer);
},{passive:true});
document.addEventListener('pointerleave',clearPointer);
addEventListener('blur',clearPointer);
function finishReveals(){for(const animation of reveals.values())animation.cancel();reveals.clear();}
function observeReveals(){
  if(!enabled()||!('IntersectionObserver' in window)||!Element.prototype.animate)return;
  revealObserver??=new IntersectionObserver(entries=>{
    if(!enabled())return;
    let index=0;
    for(const entry of entries){
      if(!entry.isIntersecting||seen.has(entry.target))continue;
      seen.add(entry.target);revealObserver!.unobserve(entry.target);
      // Animate only at the moment of entry: content stays readable without JS or observers.
      const animation=entry.target.animate([{opacity:.12,translate:'0 14px'},{opacity:1,translate:'0 0'}],{duration:620,delay:Math.min(index++,3)*65,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      reveals.set(entry.target,animation);
      const done=()=>{if(reveals.get(entry.target)===animation)reveals.delete(entry.target);};
      animation.onfinish=done;animation.oncancel=done;
    }
  },{threshold:.08,rootMargin:'0px 0px -18px 0px'});
  for(const target of revealTargets)if(!seen.has(target))revealObserver.observe(target);
}
function sync(){
  root.dataset.motionActive=String(enabled());
  hero?.toggleAttribute('data-ambient-visible',enabled()&&heroVisible);
  if(enabled())observeReveals();
  else{revealObserver?.disconnect();finishReveals();clearPointer();}
}
function start(){
  if(started)return;started=true;
  if(hero&&'IntersectionObserver' in window){ambientObserver=new IntersectionObserver(entries=>{heroVisible=entries[0]?.isIntersecting??false;sync();},{threshold:0});ambientObserver.observe(hero);}
  sync();
}
// Wait for the existing video gate; its Enter/skip/session behaviour stays independent.
const arrival=document.querySelector<HTMLDialogElement>('#shore-arrival');
if(arrival){
  const gate=new MutationObserver(checkGate);
  function checkGate(){if(root.dataset.shore==='pending'||arrival?.isConnected&&arrival.open&&!arrival.classList.contains('is-leaving'))return;gate.disconnect();start();}
  gate.observe(arrival,{attributes:true,attributeFilter:['open','class']});gate.observe(document.body,{childList:true});gate.observe(root,{attributes:true,attributeFilter:['data-shore']});checkGate();
}else start();
new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-motion']});
reduced.addEventListener('change',sync);pointer.addEventListener('change',clearPointer);
document.addEventListener('visibilitychange',sync);
document.addEventListener('focusin',event=>{if(!(event.target instanceof Element))return;for(const [target,animation] of reveals)if(target.contains(event.target))animation.cancel();});
addEventListener('pagehide',()=>{pageActive=false;sync();ambientObserver?.disconnect();});
addEventListener('pageshow',event=>{if(event.persisted){pageActive=true;if(hero)ambientObserver?.observe(hero);sync();updateReading();}});

// This line reflects the article body, stopping at its end rather than counting comments.
const prose=document.querySelector<HTMLElement>('.article-card > .prose');
const header=document.querySelector<HTMLElement>('.site-header');
let readingFrame=0;
function updateReading(){
  readingFrame=0;if(!prose||!header)return;
  const top=prose.getBoundingClientRect().top,available=Math.max(1,prose.offsetHeight-innerHeight+header.offsetHeight);
  const progress=Math.max(0,Math.min(1,(header.offsetHeight-top)/available));
  header.style.setProperty('--reading-progress',String(progress));
}
if(prose&&header){
  const track=document.createElement('div');track.className='reading-track';track.setAttribute('aria-hidden','true');track.append(document.createElement('span'));header.append(track);
  const schedule=()=>{if(!readingFrame)readingFrame=requestAnimationFrame(updateReading);};
  addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
  if('ResizeObserver' in window)new ResizeObserver(schedule).observe(prose);
  addEventListener('pagehide',()=>{cancelAnimationFrame(readingFrame);readingFrame=0;});updateReading();
}
