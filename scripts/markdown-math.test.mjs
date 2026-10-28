import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createMarkdownRenderer} from '../src/lib/markdown.ts';
const dom=new JSDOM(''),render=createMarkdownRenderer(dom.window);
const fragment=source=>JSDOM.fragment(render(source));
test('反馈中的连乘积公式正常渲染，下标与反斜杠不被 Markdown 改写',()=>{
  const d=fragment('$$\nElio = \\prod_{i=1}^{250} i\n$$');
  assert.equal(d.querySelectorAll('.katex').length,1);assert.ok(d.querySelector('.katex-display'));
  assert.equal(d.querySelector('annotation').textContent,'Elio = \\prod_{i=1}^{250} i');
  assert.equal(d.querySelectorAll('.math-error,[data-math-slot]').length,0);
});
test('行内、括号、矩阵公式与 Markdown 列表及表格兼容',()=>{
  const d=fragment('行内 $a_i^2 + b_i^2 = c_i^2$，以及 \\(E=mc^2\\)。\n\n\\[\n\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}\n\\]\n\n- **公式** $x_1$\n\n| 项 | 值 |\n|---|---|\n| A | $\\frac{1}{2}$ |');
  assert.equal(d.querySelectorAll('.katex').length,5);assert.ok(d.querySelector('table'));assert.ok(d.querySelector('strong'));assert.ok(d.querySelector('math'));assert.equal(d.querySelectorAll('.math-error').length,0);
});
test('代码、转义美元与日常价格不会误渲染',()=>{
  const tick=String.fromCharCode(96);
  const d=fragment(tick+'$x_i$'+tick+'\n\n'+tick.repeat(3)+'tex\n$$x_i$$\n'+tick.repeat(3)+'\n\n价格 $5 and $10，转义 \\$20。');
  assert.equal(d.querySelectorAll('.katex').length,0);assert.ok(d.querySelector('pre code').textContent.includes('$$x_i$$'));assert.ok(d.textContent.includes('$5 and $10'));
});
test('公式不能注入 HTML、远程图片、危险链接或用户样式',()=>{
  const d=fragment('$\\href{javascript:alert(1)}{点我}$\n\n$\\includegraphics{https://evil.test/pixel}$\n\n$\\htmlStyle{background:url(https://evil.test/track)}{x}$\n\n<img src=x onerror=alert(1)><svg onload=alert(1)></svg><span data-math-slot=\"fake-0\" style=\"position:fixed\">text</span>');
  assert.equal(d.querySelectorAll('a[href],img,script,iframe,object,embed,form,input,style,[data-math-slot]').length,0);
  for(const el of d.querySelectorAll('*'))for(const attr of el.attributes){assert.ok(!attr.name.startsWith('on'));assert.ok(!/url\s*\(|position\s*:|javascript:/i.test(attr.value));}
});
test('错误公式保留原文，宏递归与跨公式宏有界限',()=>{
  const bad=fragment('$\\frac{1}{$');assert.equal(bad.querySelectorAll('.math-error').length,1);assert.ok(bad.textContent.includes('\\frac'));
  const loop=fragment('$\\def\\a{\\a}\\a$');assert.equal(loop.querySelectorAll('.math-error').length,1);
  const isolated=fragment('$\\gdef\\elio{Z}\\elio$ 与 $\\elio$');assert.equal(isolated.querySelectorAll('.math-error').length,1);
  assert.equal(fragment(Array(40).fill('$x$').join(' ')).querySelectorAll('.katex').length,32);
});
