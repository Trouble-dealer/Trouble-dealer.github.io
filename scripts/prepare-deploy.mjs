import { appendFile, writeFile } from 'node:fs/promises';
import { siteConfig } from '../site.config.mjs';

if (!process.env.GITHUB_ENV || !process.env.GITHUB_REPOSITORY) {
  throw new Error('此脚本供 GitHub Actions 使用。本地预览请运行 npm run dev。');
}
const [owner, repository] = process.env.GITHUB_REPOSITORY.split('/');
const isDefault = siteConfig.url === 'https://example.com';
const site = new URL(isDefault ? `https://${owner}.github.io` : siteConfig.url);
const base = isDefault ? (repository.toLowerCase() === `${owner}.github.io`.toLowerCase() ? '/' : `/${repository}/`) : siteConfig.base;
if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash || site.port || site.username || site.password) {
  throw new Error('site.config.mjs 的 url 必须是 HTTPS 网站根地址，如 https://blog.your-domain.com。路径前缀请单独写在 base 中。');
}
if (!base.startsWith('/') || !base.endsWith('/') || /[\r\n?#]/.test(base)) throw new Error('base 必须以 / 开头和结尾。');
if (!site.hostname.endsWith('.github.io') && base !== '/') throw new Error('独立域名请将 base 设为 /。');
await appendFile(process.env.GITHUB_ENV, `BLOG_SITE_URL=${site.origin}\nBLOG_BASE_PATH=${base}\n`);
if (!site.hostname.endsWith('.github.io')) await writeFile('public/CNAME', `${site.hostname}\n`);
console.log(`发布地址：${site.origin}${base}\n${isDefault ? '未配置独立域名，已自动使用仓库的 github.io 地址。' : '已使用配置文件中的站点地址。'}`);
