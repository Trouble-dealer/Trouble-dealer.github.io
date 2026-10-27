import {ARRIVAL_SESSION_KEY,waveProgress} from '../lib/arrival';
const dialog=document.querySelector<HTMLDialogElement>('#shore-arrival');
const canvas=document.querySelector<HTMLCanvasElement>('#shore-canvas');
const enter=document.querySelector<HTMLButtonElement>('#shore-enter');
const skip=document.querySelector<HTMLButtonElement>('#shore-skip');
if(dialog&&canvas&&enter&&skip){
  let already=false;try{already=sessionStorage.getItem(ARRIVAL_SESSION_KEY)==='yes';}catch{}
  const force=new URL(location.href).searchParams.get('intro')==='replay';
  if(!already||force){
    const ctx=canvas.getContext('2d');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width=0,height=0,raf=0,closed=false,finished=false,start=performance.now(),last=0;
    let readyTimer:ReturnType<typeof setTimeout>;
    let grain:CanvasPattern|null=null;
    const seed=(value:number)=>{const n=Math.sin(value*127.1+311.7)*43758.5453;return n-Math.floor(n);};
    const texture=document.createElement('canvas');texture.width=256;texture.height=256;
    const tc=texture.getContext('2d');
    if(tc){const pixels=tc.createImageData(256,256);for(let i=0;i<pixels.data.length;i+=4){const noise=seed(i)*255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=noise;pixels.data[i+3]=28;}tc.putImageData(pixels,0,0);grain=ctx?.createPattern(texture,'repeat')||null;}
    function resize(){width=innerWidth;height=innerHeight;const d=Math.min(devicePixelRatio||1,1.6);canvas!.width=Math.round(width*d);canvas!.height=Math.round(height*d);ctx?.setTransform(d,0,0,d,0,0);}
    const edge=(x:number,y:number,t:number)=>y+(x/width-.5)*height*.1+Math.sin(x/width*9+t*.8)*height*.018+Math.sin(x/width*23-t*.6)*height*.006+Math.sin(x*.045+t)*2;
    function coast(y:number,t:number){ctx!.beginPath();ctx!.moveTo(-2,-2);ctx!.lineTo(width+2,-2);for(let x=width+3;x>=-5;x-=8)ctx!.lineTo(x,edge(x,y,t));ctx!.closePath();}
    function shoreLine(y:number,t:number){ctx!.beginPath();for(let x=-5;x<=width+8;x+=8){const cy=edge(x,y,t);if(x===-5)ctx!.moveTo(x,cy);else ctx!.lineTo(x,cy);}}
    function sandWriting(alpha:number){
      ctx!.save();ctx!.globalAlpha=alpha;
      const size=Math.min(104,width*.17,height*.15),x=width*.5,y=height*(height<600?.60:width<600?.655:.68);
      ctx!.font=`italic ${size}px "Segoe Script", "Apple Chancery", Georgia, serif`;ctx!.textAlign='center';
      ctx!.shadowColor='#f2ecda65';ctx!.shadowOffsetY=1.5;ctx!.shadowBlur=1.5;ctx!.fillStyle='#485450';ctx!.fillText('Any one',x,y);
      ctx!.shadowBlur=0;ctx!.shadowOffsetY=0;ctx!.font=`italic ${Math.max(21,size*.28)}px "Segoe Script", Georgia, serif`;ctx!.textAlign='right';ctx!.fillStyle='#56615a';ctx!.fillText('Elio',x+size*1.45,y+size*.53);
      ctx!.strokeStyle='#66706555';ctx!.lineWidth=.7;ctx!.beginPath();ctx!.moveTo(x+size*.5,y+size*.66);ctx!.quadraticCurveTo(x+size,y+size*.77,x+size*1.55,y+size*.62);ctx!.stroke();ctx!.restore();
    }
    function draw(t:number){
      if(!ctx)return;
      const seconds=Math.max(0,(t-start)/1000),progress=waveProgress(seconds),y=height*progress.shore;
      const sand=ctx.createLinearGradient(0,height*.35,width*.3,height);sand.addColorStop(0,'#8b9992');sand.addColorStop(.45,'#b3b5a4');sand.addColorStop(1,'#c5c0aa');ctx.fillStyle=sand;ctx.fillRect(0,0,width,height);
      // The highest wash leaves a cool, darker band of wet sand as the water recedes.
      const wet=ctx.createLinearGradient(0,height*.3,0,height*.93);wet.addColorStop(0,'#395d675c');wet.addColorStop(.8,'#5272741e');wet.addColorStop(1,'#52727400');ctx.fillStyle=wet;coast(height*.86,1.9);ctx.fill();
      if(grain){ctx.fillStyle=grain;ctx.globalAlpha=.65;ctx.fillRect(0,0,width,height);ctx.globalAlpha=1;}
      sandWriting(progress.writing);
      // Broad sheets of shallow water, then the darker body of the sea.
      coast(y+25,seconds);ctx.fillStyle='#76949745';ctx.fill();
      coast(y+10,seconds);ctx.fillStyle='#6d898c77';ctx.fill();
      coast(y,seconds);const sea=ctx.createLinearGradient(0,0,width*.2,height*.85);sea.addColorStop(0,'#243d49');sea.addColorStop(.45,'#46636d');sea.addColorStop(1,'#829c9e');ctx.fillStyle=sea;ctx.fill();
      ctx.save();coast(y,seconds);ctx.clip();
      for(let row=0;row<46;row++){
        const ry=height*(row/46)*.91;
        ctx.beginPath();for(let x=-10;x<width+12;x+=13){const py=ry+Math.sin(x*.015+row*1.7+seconds*.5)*4+Math.sin(x*.037-seconds*.7+row)*1.9;if(x===-10)ctx.moveTo(x,py);else ctx.lineTo(x,py);}
        ctx.strokeStyle=row%3===0?'#bdcdca16':'#102e3820';ctx.lineWidth=row%4===0?2:.6;ctx.stroke();
      }
      if(grain){ctx.globalAlpha=.28;ctx.fillStyle=grain;ctx.fillRect(0,0,width,height);ctx.globalAlpha=1;}
      // Distant cloud shadows drift across the grey water.
      const cloud=ctx.createRadialGradient(width*.24,height*.1,0,width*.24,height*.1,width*.7);cloud.addColorStop(0,'#c3ceca20');cloud.addColorStop(1,'#c3ceca00');ctx.fillStyle=cloud;ctx.fillRect(0,0,width,height);ctx.restore();
      // Broken lace rather than a flat line along the face of the wave.
      shoreLine(y-3,seconds);ctx.strokeStyle='#e0e6dd3b';ctx.lineWidth=18;ctx.stroke();
      shoreLine(y+2,seconds);ctx.strokeStyle='#edf0e575';ctx.lineWidth=3;ctx.stroke();
      for(let i=0;i<Math.min(650,width*.7);i++){
        const x=seed(i+3)*width,spread=seed(i+170)*22-17;
        const cy=edge(x,y,seconds)+spread+Math.sin(seconds*1.1+i)*2;
        const alpha=.14+seed(i+700)*.35;ctx.fillStyle=`rgba(233,239,226,${alpha})`;ctx.beginPath();ctx.ellipse(x,cy,.5+seed(i+900)*3,.4+seed(i+500)*1.4,seed(i)*2,0,Math.PI*2);ctx.fill();
      }
      // Wind-blown rain is subtle; it never covers the sand lettering heavily.
      if(!reduced){ctx.lineWidth=.65;for(let i=0;i<65;i++){const x=(seed(i+1500)*width-seconds*28)%width,ry=(seed(i+1800)*height+seconds*170)%(height*.93);ctx.strokeStyle=ry>height*.55?'#ecf0e91c':'#ecf0e92a';ctx.beginPath();ctx.moveTo(x,ry);ctx.lineTo(x-3,ry+8+seed(i+2000)*7);ctx.stroke();}}
      if(progress.ready)ready();
    }
    function frame(t:number){if(closed)return;if(t-last>(finished?100:40)){draw(t);last=t;}raf=requestAnimationFrame(frame);}
    function ready(){if(finished)return;finished=true;dialog!.classList.add('is-ready');enter!.disabled=false;skip!.hidden=true;document.querySelector('#shore-status')!.textContent='浪退后，沙滩上浮现 Any one，落款 Elio。现在可以进入主页。';}
    function fastForward(){start=performance.now()-5200;draw(performance.now());ready();}
    function release(){cancelAnimationFrame(raf);clearTimeout(readyTimer);removeEventListener('resize',resize);delete document.documentElement.dataset.shore;}
    function leave(){if(closed)return;closed=true;try{sessionStorage.setItem(ARRIVAL_SESSION_KEY,'yes');}catch{}release();dialog!.classList.add('is-leaving');const params=new URL(location.href);if(params.searchParams.get('intro')==='replay'){params.searchParams.delete('intro');history.replaceState(null,'',params.pathname+params.search+params.hash);}setTimeout(()=>{dialog!.close();dialog!.remove();},reduced?0:800);}
    try{
      resize();dialog.showModal();dialog.focus({preventScroll:true});delete document.documentElement.dataset.shore;
      document.documentElement.style.overflow='hidden';
      enter.addEventListener('click',()=>{document.documentElement.style.overflow='';leave();});
      skip.addEventListener('click',fastForward);
      dialog.addEventListener('cancel',event=>{event.preventDefault();fastForward();});
      addEventListener('resize',resize);
      addEventListener('pagehide',()=>{closed=true;release();dialog!.close();dialog!.remove();document.documentElement.style.overflow='';},{once:true});
      if(!ctx)document.querySelector<HTMLElement>('.shore-fallback')!.hidden=false;
      if(reduced||!ctx){fastForward();}else{raf=requestAnimationFrame(frame);readyTimer=setTimeout(()=>{draw(performance.now());ready();},5100);}
    }catch{release();dialog.remove();document.documentElement.style.overflow='';}
  }else{delete document.documentElement.dataset.shore;dialog.remove();}
}
