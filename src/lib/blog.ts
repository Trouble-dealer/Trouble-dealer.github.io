import { getCollection, type CollectionEntry } from 'astro:content';
import { siteConfig } from '../../site.config.mjs';

export type Post = CollectionEntry<'posts'>;
export function url(path = ''): string {
  return `${siteConfig.base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
export function absolute(path = ''): string {
  return new URL(url(path), siteConfig.url).href;
}
export async function getPosts(): Promise<Post[]> {
  return (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf() || a.id.localeCompare(b.id));
}
export function homePosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned));
}
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: siteConfig.timezone }).format(date).replaceAll('/', '.');
}
export function yearOf(date: Date): string {
  return new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: siteConfig.timezone }).format(date);
}
export function readingMinutes(post: Post): number {
  return Math.max(1, Math.ceil((post.body?.replace(/\s/g, '').length ?? 0) / 400));
}
export function taxonomy(posts: Post[], type: 'category' | 'tags'): [string, number][] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const values = type === 'category' ? [post.data.category] : [...new Set(post.data.tags)];
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'));
}
export const categoryUrl = (name: string) => url(`categories/${encodeURIComponent(name)}/`);
export const tagUrl = (name: string) => url(`tags/${encodeURIComponent(name)}/`);
export const postUrl = (post: Post) => url(`posts/${post.id}/`);
