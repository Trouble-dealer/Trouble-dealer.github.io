const keyDialog=document.querySelector<HTMLDialogElement>('[data-quiet-key]');
const sceneDialog=document.querySelector<HTMLDialogElement>('[data-quiet-scene]');
if(keyDialog && sceneDialog){
  const form=keyDialog.querySelector('form')!;
  const input=keyDialog.querySelector('input')!;
  let frame:HTMLIFrameElement|null=null;
  let busy=false;
  let generation=0;
  let oldOverflow='';
  let entry:HTMLElement|null=null;
  const bytes=(value:string)=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
  function reset(){
    generation++;
    input.value='';
    frame?.remove();frame=null;
    if(sceneDialog!.open)sceneDialog!.close();
    if(keyDialog!.open)keyDialog!.close();
    document.documentElement.style.overflow=oldOverflow;
    entry?.focus({preventScroll:true});
  }
  document.querySelectorAll<HTMLButtonElement>('[data-quiet-entry]').forEach(button=>{
    button.hidden=false;
    button.addEventListener('click',()=>{
      if(keyDialog.open || sceneDialog.open)return;
      entry=button;input.value='';keyDialog.showModal();input.focus();
    });
  });
  keyDialog.addEventListener('click',event=>{
    if(event.target!==keyDialog)return;
    const r=keyDialog.getBoundingClientRect();
    if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){generation++;keyDialog.close();}
  });
  keyDialog.addEventListener('cancel',()=>{generation++;input.value='';});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||!input.value)return;
    busy=true;
    const attempt=++generation;
    let password=input.value;input.value='';
    try{
      const response=await fetch(keyDialog.dataset.bundle!,{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw new Error('Unavailable');
      const payload=await response.json();
      if(payload.version!==1||payload.iterations!==310000)throw new Error('Invalid');
      const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
      password='';
      const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(payload.salt),iterations:payload.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
      const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(payload.iv)},key,bytes(payload.data));
      const expanded=new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'));
      const html=await new Response(expanded).text();
      if(attempt!==generation||!keyDialog.open)return;
      frame=document.createElement('iframe');
      frame.title='片刻';frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';
      frame.srcdoc=html;
      sceneDialog.append(frame);
      oldOverflow=document.documentElement.style.overflow;
      document.documentElement.style.overflow='hidden';
      keyDialog.close();sceneDialog.showModal();
      frame.focus();
    }catch{
      // Deliberately no hint, error message or persistent unlock state.
      if(attempt===generation&&keyDialog.open)input.focus();
    }finally{password='';busy=false;}
  });
  addEventListener('message',event=>{if(frame&&event.source===frame.contentWindow&&event.data?.type==='quiet-moment:return')reset();});
  sceneDialog.addEventListener('cancel',event=>{event.preventDefault();reset();});
  addEventListener('pagehide',reset);
  addEventListener('pageshow',event=>{if(event.persisted)reset();});
}
