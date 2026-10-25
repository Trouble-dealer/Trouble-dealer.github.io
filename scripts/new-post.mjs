import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const [slug, title = '未命名文章'] = process.argv.slice(2);
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('用法：npm run new -- english-slug "文章标题"\nslug 仅支持小写英文、数字和短横线。');
  process.exit(1);
}
const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
const part = name => parts.find(p => p.type === name)?.value;
const date = `${part('year')}-${part('month')}-${part('day')}`;
const folder = resolve('src/content/posts');
await mkdir(folder, { recursive: true });
const file = resolve(folder, `${slug}.md`);
const content = `---\ntitle: ${JSON.stringify(title)}\ndescription: '在这里写一段简洁的文章简介。'\npublished: ${date}\ncategory: '生活随笔'\ntags: ['记录']\ndraft: true\npinned: false\ncolor: sage\ncover: ''\n---\n\n在这里开始写作。\n\n## 第一个话题\n\n写下你的正文。\n`;
try {
  await writeFile(file, content, { flag: 'wx' });
  console.log(`已创建草稿：${file}\n写完后将 draft: true 改为 draft: false，再构建发布。`);
} catch (error) {
  if (error.code === 'EEXIST') console.error('同名文章已存在，未覆盖。请选择其他 slug。');
  else console.error(error.message);
  process.exitCode = 1;
}
