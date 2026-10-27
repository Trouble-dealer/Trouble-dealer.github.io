import {ARRIVAL_SESSION_KEY,waveProgress} from '../lib/arrival';
import {createShoreRenderer,type ShoreRenderer} from '../lib/shore-renderer';
const dialog=document.querySelector<HTMLDialogElement>('#shore-arrival');
const canvas=document.querySelector<HTMLCanvasElement>('#shore-canvas');
const scene=document.querySelector<HTMLCanvasElement>('#shore-scene');
const enter=document.querySelector<HTMLButtonElement>('#shore-enter');
const skip=document.querySelector<HTMLButtonElement>('#shore-skip');
if(dialog&&canvas&&scene&&enter&&skip){
  let already=false;try{already=sessionStorage.getItem(ARRIVAL_SESSION_KEY)==='yes';}catch{}
  const force=new URL(location.href).searchParams.get('intro')==='replay';
  if(!already||force){
    const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const image=new Image();image.decoding='async';image.fetchPriority='high';
    let width=0,height=0,raf=0,closed=false,finished=false,loaded=false,skipped=false,retreatAnnounced=false,start=0,last=0;
    let readyTimer:ReturnType<typeof setTimeout>,renderer:ShoreRenderer|null=null;
    const smooth=(a:number,b:number,v:number)=>{const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x);};
    function resize(){width=innerWidth;height=innerHeight;const d=Math.min(devicePixelRatio||1,1.4);canvas!.width=Math.round(width*d);canvas!.height=Math.round(height*d);ctx?.setTransform(d,0,0,d,0,0);renderer?.resize(width,height);}
    function writing(alpha:number,shore:number){
      if(!ctx)return;ctx.clearRect(0,0,width,height);ctx.save();
      const size=Math.min(92,width*.165,height*.14),x=width*.5,y=height*(height<600?.60:width<600?.655:.68);
      ctx.font=`italic ${size}px "Segoe Script", "Apple Chancery", Georgia, serif`;ctx.textAlign='center';ctx.shadowColor='#0008';ctx.shadowOffsetY=1;ctx.shadowBlur=3;ctx.fillStyle='#e6e8e3';
      ctx.globalAlpha=alpha*(1-smooth(y/height-.08,y/height+.08,shore));ctx.fillText('Any one',x,y);
      const signatureY=y+size*.53;ctx.globalAlpha=alpha*(1-smooth(signatureY/height-.04,signatureY/height+.07,shore));ctx.font=`italic ${Math.max(21,size*.28)}px "Segoe Script", Georgia, serif`;ctx.textAlign='right';ctx.fillStyle='#d8dddf';ctx.fillText('Elio',x+size*1.45,signatureY);ctx.restore();
    }
    function draw(t:number){
      const seconds=Math.max(0,(t-start)/1000),progress=waveProgress(seconds);
      renderer?.draw(reduced?0:seconds,progress.shore);writing(progress.writing,progress.shore);
      if(seconds>=2.3&&!retreatAnnounced&&!finished){retreatAnnounced=true;document.querySelector('#shore-status')!.textContent='海浪正在退回海里，文字逐渐显现。';}
      if(progress.ready)ready();
    }
    function frame(t:number){if(closed)return;if(t-last>(finished?125:40)){draw(t);last=t;}raf=requestAnimationFrame(frame);}
    function ready(){if(finished)return;finished=true;dialog!.classList.add('is-ready');enter!.disabled=false;skip!.hidden=true;if(!ctx||!loaded)document.querySelector<HTMLElement>('.shore-fallback')!.hidden=false;document.querySelector('#shore-status')!.textContent='浪退后，沙滩上浮现 Any one，落款 Elio。现在可以进入主页。';}
    function fastForward(){skipped=true;if(loaded){start=performance.now()-5200;draw(performance.now());}ready();}
    function release(){cancelAnimationFrame(raf);clearTimeout(readyTimer);removeEventListener('resize',resize);delete document.documentElement.dataset.shore;}
    function leave(){if(closed)return;closed=true;try{sessionStorage.setItem(ARRIVAL_SESSION_KEY,'yes');}catch{}release();dialog!.classList.add('is-leaving');const params=new URL(location.href);if(params.searchParams.get('intro')==='replay'){params.searchParams.delete('intro');history.replaceState(null,'',params.pathname+params.search+params.hash);}setTimeout(()=>{renderer?.destroy();dialog!.close();dialog!.remove();},reduced?0:800);}
    try{
      resize();dialog.showModal();dialog.focus({preventScroll:true});delete document.documentElement.dataset.shore;document.documentElement.style.overflow='hidden';
      enter.addEventListener('click',()=>{document.documentElement.style.overflow='';leave();});skip.addEventListener('click',fastForward);
      dialog.addEventListener('cancel',event=>{event.preventDefault();fastForward();});addEventListener('resize',resize);
      addEventListener('pagehide',()=>{closed=true;release();renderer?.destroy();dialog!.close();dialog!.remove();document.documentElement.style.overflow='';},{once:true});
      image.onload=()=>{
        if(closed)return;
        try{renderer=createShoreRenderer(scene,image);loaded=true;resize();start=performance.now()-(reduced||skipped?5200:0);document.querySelector<HTMLElement>('.shore-fallback')!.hidden=!!ctx;
          draw(performance.now());if(reduced||skipped)ready();if(!reduced)raf=requestAnimationFrame(frame);
          readyTimer=setTimeout(()=>{draw(performance.now());ready();},5100);
        }catch{scene!.hidden=true;dialog!.style.backgroundImage=`url("${image.src}")`;dialog!.style.backgroundSize='cover';loaded=true;start=performance.now()-5200;draw(performance.now());ready();}
      };
      image.onerror=()=>{if(!closed)ready();};image.src=dialog.dataset.photo!;
    }catch{release();dialog.remove();document.documentElement.style.overflow='';}
  }else{delete document.documentElement.dataset.shore;dialog.remove();}
}
