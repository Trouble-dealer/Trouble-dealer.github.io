import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {JSDOM} from 'jsdom';
import {waveProgress} from '../src/lib/arrival.ts';
test('海浪先上岸后退回，五秒后显字完成并开放进入',()=>{
  assert.equal(waveProgress(0).writing,0);assert.equal(waveProgress(0).ready,false);
  assert.ok(waveProgress(2.25).shore>waveProgress(0).shore);
  assert.ok(waveProgress(4).shore<waveProgress(2.25).shore);
  assert.equal(waveProgress(4.9).ready,false);assert.equal(waveProgress(5).ready,true);assert.equal(waveProgress(5).writing,1);
  assert.equal(waveProgress(100).shore,waveProgress(5).shore);
});
const source=stripTypeScriptTypes(await readFile(new URL('../src/scripts/site.ts',import.meta.url),'utf8'));
function page(skin){
  const dom=new JSDOM('<meta name="theme-color"><button id="theme-toggle"></button><button id="settings-open"></button><span data-theme-label></span><dialog id="settings-dialog"><input name="skin" type="radio" value="klein"><input name="skin" type="radio" value="ultramarine"><input name="accent" value="rose"><input name="accent" value="blue"><small id="accent-help"></small></dialog>',{url:'https://example.test/',runScripts:'outside-only'});
  dom.window.matchMedia=()=>({matches:false,addEventListener(){}});
  dom.window.localStorage.setItem('qiguang-prefs',JSON.stringify({skin,theme:'light',accent:'rose',font:18,fireworks:false}));dom.window.eval(source);return dom;
}
test('新增两种主题可恢复设置、显示正确名称，固定配对色不会被点缀色覆盖',()=>{
  for(const [skin,label,color] of [['klein','克莱因蓝 · 琉璃黄','#012ea7'],['ultramarine','群青 · 橘黄','#2e56a3']]){
    const dom=page(skin);try{const d=dom.window.document;assert.equal(d.documentElement.dataset.skin,skin);assert.ok(d.querySelector('[data-theme-label]').textContent.includes(label));assert.equal(d.querySelector('meta').content,color);assert.equal(d.querySelector('input[name=accent]').disabled,true);assert.equal(d.documentElement.style.getPropertyValue('--reading-size'),'18px');}finally{dom.window.close();}
  }
});
test('选择群青后切换深色会保存主题，并继续使用群青配对',()=>{
  const dom=page('klein');try{const d=dom.window.document;const choice=d.querySelector('input[value=ultramarine]');choice.checked=true;choice.dispatchEvent(new dom.window.Event('change'));d.querySelector('#theme-toggle').click();const saved=JSON.parse(dom.window.localStorage.getItem('qiguang-prefs'));assert.equal(saved.skin,'ultramarine');assert.equal(saved.theme,'dark');assert.equal(d.documentElement.dataset.skin,'ultramarine');assert.ok(d.querySelector('[data-theme-label]').textContent.includes('深色'));}finally{dom.window.close();}
});
