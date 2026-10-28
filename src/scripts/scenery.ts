const scenes=[...document.querySelectorAll<HTMLElement>('.ambient-scene')];
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.toggleAttribute('data-in-view',entry.isIntersecting&&!document.hidden);},{threshold:.05});
  const observe=()=>scenes.forEach(scene=>observer.observe(scene));observe();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)scenes.forEach(scene=>scene.removeAttribute('data-in-view'));else{observer.disconnect();observe();}});
  addEventListener('pagehide',()=>{observer.disconnect();scenes.forEach(scene=>scene.removeAttribute('data-in-view'));});
  addEventListener('pageshow',event=>{if(event.persisted)observe();});
}
