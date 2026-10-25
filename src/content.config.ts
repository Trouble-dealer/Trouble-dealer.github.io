import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.string().trim().min(1).regex(/^[^/\\?#]+$/u, '分类请不要包含路径特殊字符').default('随笔'),
    tags: z.array(z.string().trim().min(1).regex(/^[^/\\?#]+$/u, '标签请不要包含路径特殊字符')).default([]),
    draft: z.boolean().default(false),
    pinned: z.boolean().default(false),
    cover: z.string().default(''),
    color: z.enum(['sage', 'sand', 'lavender', 'blue', 'rose']).default('sage'),
  }),
});
export const collections = { posts };
