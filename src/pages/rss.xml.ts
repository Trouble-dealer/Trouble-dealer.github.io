import rss from '@astrojs/rss';
import { siteConfig } from '../../site.config.mjs';
import { absolute, getPosts } from '../lib/blog';
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
export async function GET() {
  const image = siteConfig.logo ? `<image><url>${xml(absolute(siteConfig.logo))}</url><title>${xml(siteConfig.title)}</title><link>${xml(absolute(''))}</link><width>88</width><height>88</height></image>` : '';
  return rss({ title: siteConfig.title, description: siteConfig.description, site: absolute(''),
    items: (await getPosts()).map(post => ({ title: post.data.title, pubDate: post.data.published, description: post.data.description, link: absolute(`posts/${post.id}/`), categories: [post.data.category, ...post.data.tags] })),
    customData: `<language>zh-cn</language>${image}`, trailingSlash: true,
  });
}
