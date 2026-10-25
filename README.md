> 当前进度（2026-10-25）：域名与 HTTPS、Gmail 发信、邮箱验证、登录、评论公开及新密码登录已由 Elio 验收。community.config.mjs 已设 emailReady: true，等待将本地最新代码提交推送到 GitHub 发布。新评论自动公开，无需逐条审核。下文早期的关闭开关及待配置说明保留为操作参考，不代表当前状态。

> 2026-10-25 更新：已按 Elio 要求改为邮箱已验证用户的新评论立即公开，无需逐条审核。旧文中的手动审核测试可跳过；仍可在 Supabase 后台将违规评论设为 rejected 隐藏。当前下一步是测试找回密码，成功后开放线上账户入口。

# 具野 · Elio

软件工程、嵌入式与具身智能方向的个人博客。正式地址计划使用 **jy.遮阳帽.space**（`jy.xn--wut303ivvd.space`），GitHub 为 [Trouble-dealer](https://github.com/Trouble-dealer)。

**当前操作清单：[休息后先看.md](./休息后先看.md)。**

![预览](./docs/images/elio-preview.png)

## 本地预览

使用 Node.js 24 LTS，Windows 双击 `本地预览.cmd`，或执行：

```powershell
npm ci
npm run dev
```

打开 Local 地址，不要直接双击 HTML。启动脚本为 ASCII / CRLF，避免 CMD 中文编码问题。

## 功能与真实服务

Astro 生成文章、分类、标签、归档、搜索、RSS、站点地图、阅读偏好、移动导航和 404。保留三篇示例，每类一篇；超过四篇后自动显示分页。

Supabase 提供账号与评论：邮箱注册验证、登录退出、找回密码、修改密码与昵称，登录后评论、先审后公开、作者删除自己的内容。数据库控制权限与频率，评论按纯文本渲染。

**账户代码与数据库已完成；发信和跳转配置待完成。** 当前 `community.config.mjs` 中 `emailReady: false`，账户和提交入口不开放，文章下可读取公开评论。这里没有前端模拟登录。

## 主要文件

| 位置 | 用途 |
| --- | --- |
| `site.config.mjs` | 个人资料、域名、图片与公开联系方式 |
| `community.config.mjs` | 已创建项目的公开 URL / publishable key，及邮件验收后的开放开关 |
| `.env.example` | 本地覆盖示例；复制为 `.env.local`，不提交 |
| `src/content/posts/` | 三篇 Markdown 示例 |
| `src/pages/account.astro` | 读者账户页 |
| `src/pages/auth/callback.astro` | PKCE 邮箱验证 / 找回密码回调 |
| `src/scripts/account.ts` / `comments.ts` | 真实 Supabase 请求和状态处理 |
| `supabase/migrations/` | 已应用到后端的数据库迁移和 RLS 策略 |
| `supabase/seed-posts.sql` | 公开文章登记脚本，每次构建更新 |
| `scripts/community.test.mjs` | PGlite 中的真实 PostgreSQL 权限测试 |
| `.github/workflows/deploy.yml` | main 推送后自动测试、构建与发布 |

浏览器公开 key 可以随网页提供，权限由数据库 RLS 限制。绝不能把 service_role、sb_secret、SMTP 授权码或数据库密码写入前端。

## 命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 开发预览 |
| `npm run check` | Astro / TypeScript 检查 |
| `npm test` | 15 项搜索与 PostgreSQL 权限测试 |
| `npm run build` | 检查、构建和站内链接验证；更新文章登记 SQL |
| `npm run preview` | 预览最近的构建 |
| `npm run new -- my-note "标题"` | 新建草稿，不覆盖已有文章 |

## 上线

1. 创建 `Trouble-dealer.github.io` 公开仓库，按 [发布教程](./docs/01-部署到GitHub-Pages.md) 上传，Pages 选择 GitHub Actions。
2. 阿里云添加 jy CNAME → Trouble-dealer.github.io；GitHub Custom domain 填 jy.xn--wut303ivvd.space，开启 HTTPS。
3. 按 [注册评论启用步骤](./docs/06-Elio的注册评论启用步骤.md) 配 Gmail SMTP、回调并验收，再开放账户。
4. 日常使用参考 [写文章和换图片](./docs/03-写文章和换图片.md)。新增文章需将最新 seed-posts.sql 应用到后端才开放评论。

文章由 GitHub Pages 托管，动态身份和评论由 Supabase 托管，无需自己运行服务器。各平台的免费额度与服务限制以其当前政策为准。

见 [本次更新验证](./docs/07-Elio个性化与后端验证.md)。初版 05 文档保留为历史记录，其中六篇文章等状态已经更新。

设计参考 [Firefly](https://github.com/CuteLeaf/Firefly) 与 [Hyde Blog](https://seasir.top/)，见 [致谢](./THIRD_PARTY_NOTICES.md)。本站不是完整移植。源码 MIT；文章与用户图片由各自作者决定授权。
