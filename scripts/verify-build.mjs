import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { siteConfig } from '../site.config.mjs';

const root = path.resolve('dist');
const prefix = siteConfig.base.replace(/\/$/, '');
const origin = new URL(siteConfig.url).origin;
const errors = [];
async function walk(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const children = await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(folder, entry.name)) : [path.join(folder, entry.name)]));
  return children.flat();
}
const files = await walk(root);
const htmlFiles = files.filter(file => file.endsWith('.html'));
const htmlCache = new Map(await Promise.all(htmlFiles.map(async file => [file, await readFile(file, 'utf8')])));
const unescape = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
let checked = 0;
for (const [file, html] of htmlCache) {
  if (!/<h1(?:\s|>)/.test(html)) errors.push(`${path.relative(root, file)}: 缺少 h1`);
  if (html.includes('未发布的草稿示例')) errors.push(`${file}: 草稿泄露到 HTML`);
  for (const match of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const href = unescape(match[1]);
    if (!href || /^(?:mailto:|tel:|data:|https?:\/\/|\/\/)/i.test(href)) continue;
    if (href === '#') { errors.push(`${file}: 空链接`); continue; }
    checked++;
    const relativeFile = path.relative(root, file).split(path.sep).join('/');
    const location = relativeFile.endsWith('index.html') ? relativeFile.slice(0, -10) : relativeFile;
    const targetUrl = new URL(href, `${origin}${prefix}/${location}`);
    let pathname;
    try { pathname = decodeURIComponent(targetUrl.pathname); } catch { errors.push(`${file}: 无效 URL ${href}`); continue; }
    if (prefix && !pathname.startsWith(`${prefix}/`)) { errors.push(`${file}: 未携带子路径 ${href}`); continue; }
    const localPath = prefix ? pathname.slice(prefix.length) : pathname;
    let target = path.resolve(root, `.${localPath}`);
    if (target !== root && !target.startsWith(root + path.sep)) { errors.push(`${file}: 越界路径 ${href}`); continue; }
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
      await stat(target);
      if (targetUrl.hash && target.endsWith('.html')) {
        const body = htmlCache.get(target) ?? await readFile(target, 'utf8');
        const anchor = decodeURIComponent(targetUrl.hash.slice(1));
        const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map(m => unescape(m[1]));
        if (!ids.includes(anchor)) errors.push(`${file}: 不存在的锚点 ${href}`);
      }
    } catch { errors.push(`${path.relative(root, file)}: 链接或资源不存在 ${href}`); }
  }
}
const index = JSON.parse(await readFile(path.join(root, 'search-index.json'), 'utf8'));
if (index.some(entry => entry.title.includes('未发布的草稿示例'))) errors.push('草稿泄露到搜索索引');
for (const entry of index) {
  const local = decodeURIComponent(entry.url).slice(prefix.length);
  try { await stat(path.resolve(root, `.${local}`, 'index.html')); } catch { errors.push(`搜索结果指向不存在的文章：${entry.url}`); }
}
for (const required of ['rss.xml', 'sitemap.xml', 'robots.txt', '404.html', '.nojekyll']) {
  try { await stat(path.join(root, required)); } catch { errors.push(`缺少 ${required}`); }
}
const rss = await readFile(path.join(root, 'rss.xml'), 'utf8');
if ((rss.match(/<item>/g) || []).length !== index.length) errors.push('RSS 条目数与公开文章数不一致');
if (rss.includes('未发布的草稿示例')) errors.push('草稿泄露到 RSS');
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
if (sitemap.includes('draft-example')) errors.push('草稿泄露到站点地图');
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const targetUrl = new URL(unescape(match[1]));
  if (targetUrl.origin !== origin || (prefix && !targetUrl.pathname.startsWith(`${prefix}/`))) errors.push(`站点地图域名或前缀不符：${match[1]}`);
  const local = decodeURIComponent(targetUrl.pathname).slice(prefix.length);
  try { await stat(path.resolve(root, `.${local}`, 'index.html')); } catch { errors.push(`站点地图路径不存在：${match[1]}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
// 内容上线后，在 Supabase 执行此幂等脚本，即可开放新增文章的评论。
const postIds = index.map(entry => decodeURIComponent(entry.url).split('/posts/')[1].replace(/\/$/, ''));
if (postIds.length) await writeFile('supabase/seed-posts.sql', `-- 由构建根据公开文章生成；在 Supabase SQL Editor 运行，不会重开手动关闭的评论。\ninsert into public.blog_posts (id) values\n${postIds.map(id => `  ('${id.replaceAll("'", "''")}')`).join(',\n')}\non conflict (id) do nothing;\n`);
console.log(`构建验证通过：${htmlFiles.length} 个 HTML 页面，${checked} 条站内链接/资源，${index.length} 篇公开文章；搜索、RSS、站点地图与草稿过滤一致。`);
