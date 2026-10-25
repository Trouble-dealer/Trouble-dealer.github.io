import test from 'node:test';
import assert from 'node:assert/strict';
import { excerpt, searchEntries, tokenize } from '../src/lib/search.ts';
const entries = [
  { title: 'GitHub Pages 发布', description: '部署博客', category: '技术', tags: ['Astro'], body: '配置 DNS 和独立域名。', date: '2026.10.25', url: '/posts/a/' },
  { title: '阅读笔记', description: '整理信息', category: '随笔', tags: ['阅读'], body: '今天读了 GitHub Pages 教程，还讨论了静态构建。', date: '2026.10.24', url: '/posts/b/' },
];
test('中文正文可检索，草稿不依赖浏览器端过滤', () => assert.equal(searchEntries(entries, '独立域名')[0]?.url, '/posts/a/'));
test('标题匹配优先于正文，英文忽略大小写', () => assert.deepEqual(searchEntries(entries, 'github PAGES').map(e => e.url), ['/posts/a/', '/posts/b/']));
test('多个关键词必须全部出现，允许跨标题、标签和正文匹配', () => { assert.equal(searchEntries(entries, 'Astro DNS').length, 1); assert.equal(searchEntries(entries, '阅读 DNS').length, 0); });
test('空白查询不返回全部内容，重复词与全角输入被规范化', () => { assert.deepEqual(searchEntries(entries, '   '), []); assert.deepEqual(tokenize(' ＡＳＴＲＯ astro '), ['astro']); });
test('不存在的内容、HTML 字符串和正则特殊字符不会误匹配或执行', () => { assert.deepEqual(searchEntries(entries, '<script>alert(1)</script>'), []); assert.deepEqual(searchEntries(entries, '[.*'), []); });
test('正文摘要从命中词附近截取', () => { const text = `${'前'.repeat(100)}独立域名${'后'.repeat(200)}`; assert.ok(excerpt(text, '独立域名', 100).includes('独立域名')); assert.ok(excerpt(text, '独立域名', 100).startsWith('…')); });
