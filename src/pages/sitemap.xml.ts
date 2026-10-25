import type { APIRoute } from 'astro';
import { absolute, getPosts, taxonomy } from '../lib/blog';
import { siteConfig } from '../../site.config.mjs';
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const fixed = ['', 'archive/', 'categories/', 'tags/', 'about/', 'friends/', 'privacy/'];
  const pages = [
    ...fixed.map(path => ({ path, updated: undefined as Date | undefined })),
    ...Array.from({ length: Math.max(0, Math.ceil(posts.length / siteConfig.postsPerPage) - 1) }, (_, i) => ({ path: `page/${i + 2}/`, updated: undefined })),
    ...taxonomy(posts, 'category').map(([name]) => ({ path: `categories/${encodeURIComponent(name)}/`, updated: undefined })),
    ...taxonomy(posts, 'tags').map(([name]) => ({ path: `tags/${encodeURIComponent(name)}/`, updated: undefined })),
    ...posts.map(post => ({ path: `posts/${post.id}/`, updated: post.data.updated ?? post.data.published })),
  ];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>${escape(absolute(page.path))}</loc>${page.updated ? `<lastmod>${page.updated.toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
