# 具野 · Elio

软件工程、嵌入式与具身智能方向的个人博客。正式地址：[jy.遮阳帽.space](https://jy.xn--wut303ivvd.space)，GitHub 为 [Trouble-dealer](https://github.com/Trouble-dealer)。

2026-10-26 更新：银色 / 黑白 / 原野外观、点击星火、纪念计时、留言聊天区、Markdown 与站点观测。Elio 已核对本地效果并授权发布，聊天与统计的线上迁移已应用，两个独立客户端的实时新增和删除已验证。见 [启用与发布验证记录](./docs/09-聊天统计启用与发布验证.md)。

![银色纸刊主题预览](./docs/images/polish-home-silver.png)

## 本地预览

使用 Node.js 24 LTS，Windows 双击 `本地预览.cmd`，或执行：

```powershell
npm ci
npm run dev
```

打开 Local 地址，不要直接双击 HTML。启动脚本为 ASCII / CRLF，避免 CMD 中文编码问题。

## 功能与真实服务

Astro 生成文章、分类、标签、归档、搜索、RSS、站点地图、阅读偏好、移动导航和 404。保留三篇示例，每类一篇；超过四篇后自动显示分页。

阅读偏好提供银雾、黑白、原野三种外观，浅色 / 深色 / 跟随系统、强调色、字号和点击星火开关。首页和「观测」页的计时从 2025-03-26 00:00（北京时间）开始；建站天数另从 2026-10-25 计算。

Supabase 提供账号与评论：邮箱注册验证、登录退出、找回密码、修改密码与昵称，已验证用户的新评论立即公开，作者可删除自己的内容。文章评论和留言支持经过安全过滤的 Markdown，含粗体、列表、引用、代码、表格和链接。

新留言区使用真实数据库与 Realtime，支持回复、历史翻页、删除自己的消息、限流和超时重试去重。新访问统计按自愿参与浏览器的随机标识累计，不等同于精确人数，本地预览不上报。

`community.config.mjs` 的 `emailReady`、`loungeReady`、`statisticsReady` 现均为 `true`。聊天与统计使用真实 Supabase 服务，测试消息已清理，统计测试已回滚，不保留虚构的访问数据。留言页另有仅在本地运行的 Markdown 试写区。

## 主要文件

| 位置 | 用途 |
| --- | --- |
| `site.config.mjs` | 个人资料、域名、图片、公开联系方式与两个计时起点 |
| `community.config.mjs` | 项目公开 URL / publishable key，及功能开放开关 |
| `.env.example` | 本地覆盖示例；复制为 `.env.local`，不提交 |
| `src/content/posts/` | 三篇 Markdown 示例 |
| `src/pages/account.astro` | 读者账户页 |
| `src/pages/auth/callback.astro` | PKCE 邮箱验证 / 找回密码回调 |
| `src/scripts/account.ts` / `comments.ts` | 真实 Supabase 请求和状态处理 |
| `src/pages/lounge.astro` / `observatory.astro` | 留言聊天与站点观测页 |
| `src/lib/markdown.ts` | Markdown 解析与安全过滤 |
| `src/styles/upgrade.css` | 本次外观与新模块布局 |
| `src/styles/editorial.css` | 银色纸刊 / 石墨黑的材质、排版与响应式细节 |
| `supabase/migrations/` | 数据库迁移与 RLS；20261026052233 新迁移已应用到线上 |
| `supabase/seed-posts.sql` | 公开文章登记脚本，每次构建更新 |
| `scripts/community.test.mjs` / `upgrade.test.mjs` | PGlite 中的 PostgreSQL 权限及新增功能测试 |
| `.github/workflows/deploy.yml` | main 推送后自动测试、构建与发布 |

浏览器公开 key 可以随网页提供，权限由数据库 RLS 限制。绝不能把 service_role、sb_secret、SMTP 授权码或数据库密码写入前端。

## 命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 开发预览 |
| `npm run check` | Astro / TypeScript 检查 |
| `npm test` | 27 项搜索、计时、Markdown、采集边界与 PostgreSQL 权限测试 |
| `npm run build` | 检查、构建和站内链接验证；更新文章登记 SQL |
| `npm run preview` | 预览最近的构建 |
| `npm run new -- my-note "标题"` | 新建草稿，不覆盖已有文章 |

## 上线

域名、HTTPS、发信、邮箱验证、公开评论和密码重置已由 Elio 验收。此次新迁移已完成，无需重跑。发布采用 main 分支推送后由 GitHub Actions 自动测试、构建和部署的流程；当前验证情况见 [发布记录](./docs/09-聊天统计启用与发布验证.md)。

日常使用参考 [写文章和换图片](./docs/03-写文章和换图片.md)。新增文章需将最新 seed-posts.sql 应用到后端才开放评论。早期手册保留为历史参考，其中待配置、手动审核及纯文本等旧描述，以最新代码及本说明为准。

页面由 GitHub Pages 托管，动态身份、评论、聊天与统计由 Supabase 提供，无需自己运行服务器。各平台的免费额度与服务限制以其当前政策为准。

见 [本次更新验证](./docs/07-Elio个性化与后端验证.md)。初版 05 文档保留为历史记录，其中六篇文章等状态已经更新。

设计参考 [Firefly](https://github.com/CuteLeaf/Firefly) 与 [Hyde Blog](https://seasir.top/)，见 [致谢](./THIRD_PARTY_NOTICES.md)。本站不是完整移植。源码 MIT；文章与用户图片由各自作者决定授权。
