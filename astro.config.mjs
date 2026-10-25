import { defineConfig } from 'astro/config';
import { siteConfig } from './site.config.mjs';

const siteUrl = new URL(siteConfig.url);
if (siteUrl.protocol !== 'https:' || siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash || siteUrl.username || siteUrl.password) {
  throw new Error('url 请填写 HTTPS 网站根地址；子路径请单独填写 base。');
}
if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(siteConfig.base)) throw new Error('base 请使用 / 或 /仓库名/ 形式的路径。');
if (!Number.isInteger(siteConfig.postsPerPage) || siteConfig.postsPerPage < 1 || siteConfig.postsPerPage > 24) {
  throw new Error('postsPerPage 需要是 1 到 24 的整数。');
}

export default defineConfig({
  site: siteConfig.url,
  base: siteConfig.base,
  output: 'static',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});
