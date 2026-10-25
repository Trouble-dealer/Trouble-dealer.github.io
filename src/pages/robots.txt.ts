import type { APIRoute } from 'astro';
import { absolute } from '../lib/blog';
export const GET: APIRoute = () => new Response(`User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml')}\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
