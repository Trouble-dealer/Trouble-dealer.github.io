-- 由构建根据公开文章生成；在 Supabase SQL Editor 运行，不会重开手动关闭的评论。
insert into public.blog_posts (id) values
  ('welcome'),
  ('github-pages-guide'),
  ('rss-reading')
on conflict (id) do nothing;
