import type { APIRoute } from 'astro';
import { formatDate, getPosts, postUrl } from '../lib/blog';

export const GET: APIRoute = async () => {
  const entries = (await getPosts()).map(post => ({
    title: post.data.title, description: post.data.description,
    category: post.data.category, tags: post.data.tags,
    date: formatDate(post.data.published), url: postUrl(post),
    body: (post.body ?? '').replace(/<[^>]*>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`#>*_~|]/g, '').replace(/\s+/g, ' ').trim(),
  }));
  return new Response(JSON.stringify(entries), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
