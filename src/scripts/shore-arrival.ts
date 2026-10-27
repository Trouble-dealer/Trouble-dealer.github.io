import {ARRIVAL_SESSION_KEY,videoProgress} from '../lib/arrival';
const dialog=document.querySelector<HTMLDialogElement>('#shore-arrival');
const video=document.querySelector<HTMLVideoElement>('#shore-video');
const enter=document.querySelector<HTMLButtonElement>('#shore-enter');
const skip=document.querySelector<HTMLButtonElement>('#shore-skip');
if(dialog&&video&&enter&&skip){
  let already=false;try{already=sessionStorage.getItem(ARRIVAL_SESSION_KEY)==='yes';}catch{}
  const force=new URL(location.href).searchParams.get('intro')==='replay';
  if(!already||force){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let closed=false,finished=false;
    let readyTimer:ReturnType<typeof setTimeout>|undefined;
    function ready(){
      if(closed||finished)return;finished=true;clearTimeout(readyTimer);
      dialog!.classList.add('has-writing','is-ready');enter!.disabled=false;skip!.hidden=true;
      document.querySelector('#shore-status')!.textContent='Any one，落款 Elio。现在可以进入主页。';
    }
    function update(){
      if(closed||finished)return;
      const progress=videoProgress(video!.currentTime,video!.duration);
      if(progress.writing)dialog!.classList.add('has-writing');
      if(progress.ready)ready();
    }
    function fastForward(){
      video!.pause();
      if(Number.isFinite(video!.duration)&&video!.readyState>=2){try{video!.currentTime=Math.max(0,video!.duration-.04);}catch{}}
      ready();
    }
    function release(){clearTimeout(readyTimer);delete document.documentElement.dataset.shore;}
    function leave(){
      if(closed)return;closed=true;try{sessionStorage.setItem(ARRIVAL_SESSION_KEY,'yes');}catch{}
      release();video!.pause();document.documentElement.style.overflow='';dialog!.classList.add('is-leaving');
      const params=new URL(location.href);if(params.searchParams.get('intro')==='replay'){params.searchParams.delete('intro');history.replaceState(null,'',params.pathname+params.search+params.hash);}
      setTimeout(()=>{dialog!.close();dialog!.remove();},reduced?0:800);
    }
    try{
      // Muted inline playback also works on iOS; keep the original clip unchanged.
      video.muted=true;video.defaultMuted=true;
      dialog.showModal();dialog.focus({preventScroll:true});delete document.documentElement.dataset.shore;document.documentElement.style.overflow='hidden';
      enter.addEventListener('click',leave);skip.addEventListener('click',fastForward);
      dialog.addEventListener('cancel',event=>{event.preventDefault();fastForward();});
      addEventListener('pagehide',()=>{closed=true;release();video.pause();dialog.close();dialog.remove();document.documentElement.style.overflow='';},{once:true});
      video.addEventListener('timeupdate',update);video.addEventListener('ended',ready);
      video.addEventListener('error',ready);video.querySelector('source')?.addEventListener('error',ready);
      readyTimer=setTimeout(ready,12000); // Never trap a visitor on a stalled or blocked video.
      if(reduced){video.autoplay=false;video.pause();ready();}
      else if(video.error)ready();
      else{update();void video.play().catch(()=>{if(!closed){video.pause();ready();}});}
    }catch{release();video.pause();dialog.remove();document.documentElement.style.overflow='';}
  }else{video.pause();delete document.documentElement.dataset.shore;dialog.remove();}
}
