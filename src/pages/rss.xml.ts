import rss from '@astrojs/rss';
import { siteConfig } from '../../site.config.mjs';
import { absolute, getPosts } from '../lib/blog';
export async function GET() {
  return rss({ title: siteConfig.title, description: siteConfig.description, site: absolute(''),
    items: (await getPosts()).map(post => ({ title: post.data.title, pubDate: post.data.published, description: post.data.description, link: absolute(`posts/${post.id}/`), categories: [post.data.category, ...post.data.tags] })),
    customData: '<language>zh-cn</language>', trailingSlash: true,
  });
}
