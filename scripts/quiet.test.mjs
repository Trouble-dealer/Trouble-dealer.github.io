import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {JSDOM} from 'jsdom';
const passphrase='synthetic-test-key-not-the-real-one';
const source=stripTypeScriptTypes(await readFile(new URL('../src/scripts/quiet-door.ts',import.meta.url),'utf8'));
const salt=new Uint8Array(16),iv=new Uint8Array(12);
const material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey']);
const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
const data=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},key,gzipSync(Buffer.from('<h1>Synthetic private fixture</h1>')));
const b64=value=>Buffer.from(value).toString('base64');
const payload={version:1,iterations:310000,salt:b64(salt),iv:b64(iv),data:b64(data)};
function setup(){
  const dom=new JSDOM('<button data-quiet-entry hidden></button><dialog data-quiet-key data-bundle="/bundle"><form><input type="password"><button></button></form></dialog><dialog data-quiet-scene></dialog>',{url:'https://example.test/',runScripts:'outside-only'});
  const w=dom.window;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  Object.defineProperty(w,'crypto',{value:webcrypto});
  Object.assign(w,{TextEncoder,Blob,Response,DecompressionStream,fetch:async()=>({ok:true,json:async()=>payload})});
  w.eval(source);
  const d=w.document;
  return {dom,w,d,entry:d.querySelector('button'),input:d.querySelector('input'),keyDialog:d.querySelector('[data-quiet-key]'),scene:d.querySelector('[data-quiet-scene]'),form:d.querySelector('form')};
}
async function submit(fixture,password){fixture.input.value=password;fixture.form.dispatchEvent(new fixture.w.Event('submit',{cancelable:true}));await new Promise(resolve=>setTimeout(resolve,600));}
test('错误输入安静失败，不生成 iframe，不持久化密码',async()=>{
  const f=setup();try{f.entry.click();await submit(f,'incorrect');assert.equal(f.keyDialog.open,true);assert.equal(f.scene.open,false);assert.equal(f.d.querySelector('iframe'),null);assert.equal(f.input.value,'');assert.equal(f.keyDialog.textContent,'');assert.equal(f.w.localStorage.length,0);assert.equal(f.w.sessionStorage.length,0);}finally{f.dom.window.close();}
});
test('正确解密后可返回；再次进入只出现空输入框，页面销毁',async()=>{
  const f=setup();try{f.entry.click();await submit(f,passphrase);const frame=f.d.querySelector('iframe');assert.ok(frame);assert.equal(f.scene.open,true);assert.equal(frame.getAttribute('sandbox'),'allow-scripts');assert.ok(frame.srcdoc.includes('Synthetic private fixture'));f.w.dispatchEvent(new f.w.MessageEvent('message',{source:frame.contentWindow,data:{type:'quiet-moment:return'}}));assert.equal(f.d.querySelector('iframe'),null);assert.equal(f.scene.open,false);f.entry.click();assert.equal(f.keyDialog.open,true);assert.equal(f.input.value,'');assert.equal(f.d.querySelector('iframe'),null);assert.equal(f.w.localStorage.length,0);}finally{f.dom.window.close();}
});
test('在解密期间取消，不会在后台重新打开隐藏页',async()=>{
  const f=setup();try{f.entry.click();f.input.value=passphrase;f.form.dispatchEvent(new f.w.Event('submit',{cancelable:true}));f.keyDialog.dispatchEvent(new f.w.Event('cancel'));f.keyDialog.close();await new Promise(resolve=>setTimeout(resolve,600));assert.equal(f.scene.open,false);assert.equal(f.d.querySelector('iframe'),null);}finally{f.dom.window.close();}
});
