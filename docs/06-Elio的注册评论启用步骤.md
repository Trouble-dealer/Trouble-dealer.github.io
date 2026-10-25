> 当前进度（2026-10-25）：域名与 HTTPS、Gmail 发信、邮箱验证、登录、评论公开及新密码登录已由 Elio 验收。community.config.mjs 已设 emailReady: true，等待将本地最新代码提交推送到 GitHub 发布。新评论自动公开，无需逐条审核。下文早期的关闭开关及待配置说明保留为操作参考，不代表当前状态。

> 2026-10-25 更新：已按 Elio 要求改为邮箱已验证用户的新评论立即公开，无需逐条审核。旧文中的手动审核测试可跳过；仍可在 Supabase 后台将违规评论设为 rejected 隐藏。当前下一步是测试找回密码，成功后开放线上账户入口。

# Elio 的注册登录与评论：最后的启用步骤

## 当前状态，不必重建数据库

已通过连接的 Supabase 创建项目：

- 组织：Trouble-dealer's Org
- 项目：elio-jy-blog
- 区域：新加坡 ap-southeast-1
- 项目 ID：xeujkagjuqoooiwvnssz
- [打开项目控制台](https://supabase.com/dashboard/project/xeujkagjuqoooiwvnssz)

评论表、权限、频率限制和三篇文章登记都已实际应用。公开配置已填好，不必重新抄 key，也不需要升级付费计划来运行本次代码。

当前 emailReady 为 false，账户与提交入口暂不开放，直到真实邮件测试完成。文章和评论读取不受影响。

## 1. 设置 Auth 跳转地址

在 **Authentication → URL Configuration**，Site URL 填：

```text
https://jy.xn--wut303ivvd.space
```

Redirect URLs 分别添加并保存：

```text
https://jy.xn--wut303ivvd.space/auth/callback/
https://jy.xn--wut303ivvd.space/auth/callback/?flow=recovery
http://127.0.0.1:4321/auth/callback/
http://127.0.0.1:4321/auth/callback/?flow=recovery
```

若先使用默认 GitHub 地址测试，再添加：

```text
https://trouble-dealer.github.io/auth/callback/
https://trouble-dealer.github.io/auth/callback/?flow=recovery
```

正式域名回调需要该域名 HTTPS 已可用，本地回调需要预览服务正在运行。

保留邮件模板中的默认 `{{ .ConfirmationURL }}` 链接，本项目使用 PKCE。不要改成只访问首页的链接，或其他方案的 token_hash 模板。

## 2. 保留邮箱验证

在 **Authentication → Sign In / Providers → Email** 或对应配置中：启用 Email provider，允许注册，**Confirm email 保持开启**，密码最短长度建议 12。

不要为了绕过发信问题关掉验证，评论数据库同样检查邮箱已验证。

## 3. 为 Gmail 生成应用专用密码，由你本人操作

你选择使用 elio.ashling@gmail.com 发账户邮件。

1. 登录 [Google 账号安全设置](https://myaccount.google.com/security)，确认是这个 Gmail。
2. 如尚未开启，按 Google 指引设置两步验证。
3. 打开 [应用专用密码](https://myaccount.google.com/apppasswords)，按提示验证身份。
4. 为本用途起名，例如 Elio blog SMTP，生成密码。
5. 将它直接复制进下一步 Supabase SMTP Password 字段。

这不是 Google 日常登录密码。不要发给我，不要放进项目、GitHub 或截图。工作单位限制、高级保护或特定验证方式可能使应用专用密码不可用；遇到这种情况告诉我页面提示即可，不要关闭安全保护绕过。

[Google 官方应用专用密码说明](https://support.google.com/accounts/answer/185833)。

## 4. 在 Supabase 配置 Gmail SMTP

打开 **Authentication → Email → SMTP Settings / Custom SMTP**（不同界面可能位于 Configuration 下）。启用自定义 SMTP：

| 字段 | 值 |
| --- | --- |
| Sender email | elio.ashling@gmail.com |
| Sender name | 具野 · Elio |
| Host | smtp.gmail.com |
| Port | 587，使用 STARTTLS；若界面明确选 SSL，则按 Gmail 官方说明用 465 |
| Username | elio.ashling@gmail.com |
| Password | 你生成的应用专用密码 |
| Minimum interval | 保留默认，测试时不要频繁重发 |

保存。认证失败时检查邮箱、端口、TLS 模式和应用专用密码，避免复制显示时的分组空格。

Gmail 有发送额度和反滥用策略，适合个人博客初期尝试，不能保证大规模访客注册的送达。超出额度可能失败或延迟，届时再换事务邮件服务；本次不会自动购买或升级。

Supabase 默认服务只向项目团队授权邮箱发信，官方当前限制很低，不适合公众注册。自定义 SMTP 仍需遵守认证与发信限流。

官方：[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)、[Gmail SMTP 参数](https://support.google.com/mail/answer/7126229)。

## 5. 在本地用真实邮箱验收

关闭已有预览窗口。复制 `.env.example` 为 `.env.local`，URL 和 key 可留空以使用已填好的项目配置，只改：

```text
PUBLIC_AUTH_EMAIL_READY=true
```

重新双击本地预览.cmd，打开 `http://127.0.0.1:4321/account/`：

1. 用你自己的可收信邮箱注册读者账户。它与 Supabase 控制台账号分开，不自动获得博客管理权限。
2. 检查收件箱和垃圾邮件，在发起注册的**同一浏览器**打开验证链接；使用邮箱客户端时可复制链接到原浏览器。
3. 验证后应回到账户页，处于登录状态；退出再登录一次。
4. 测试忘记密码：收邮件、同一浏览器打开、设新密码、使用新密码登录。
5. 到文章下提交评论，应显示“待审核”，刷新仍能看到自己的内容。
6. 无痕窗口打开文章，此时该评论不可见。
7. 按下一节批准评论，无痕窗口刷新后应看到它。
8. 回原窗口删除自己的测试评论，刷新确认消失。

这些收信、输入密码、修改密码步骤由你本人完成。不需要把密码发给我。排错时可以提供错误文字，别贴含授权码或 token 的完整验证链接。

## 6. 博主如何审核

Supabase **Table Editor → public → comments**：

- pending：待审核。
- approved：公开显示。
- rejected：未通过，仅本人和管理端可见。

将具体评论行的 status 改成 approved 并保存即可批准。站点前端不存在博主提权入口；公开 key 无法执行审核。账号在 **Authentication → Users** 管理，核实用户删除账户请求后从该处删除，关联评论和频率记录会级联清理。

author_name 保留提交时的昵称快照；评论表不保存邮箱。

## 7. 正式开放并在线上再测

真实验收完成后，将 `community.config.mjs` 中 `emailReady` 改为 true。执行 `npm test`、`npm run build`，提交并等待 Pages 发布。

此后导航出现“账户”，文章下显示登录和评论提交入口。本地 env 文件不会上传；线上使用 community.config.mjs。也可用 GitHub Actions Variables 的 PUBLIC_AUTH_EMAIL_READY=true 覆盖，工作流已接入此变量。

正式域名上线后，再用正式域名重复验证邮件和找回密码测试。localhost、github.io、自定义域名的会话分别保存；切换域名需要重新登录。PKCE 发起后不要换浏览器或清空本地存储。

## 新文章与关闭评论

每次构建会更新 `supabase/seed-posts.sql`。新增文章上线后，在 Supabase SQL Editor 执行它，或让我通过已连接的 Supabase 应用。脚本幂等，不会重新开启已人工关闭的评论。

在 blog_posts 对应行将 comments_enabled 设为 false，可关闭该文章的新评论；已有审核通过的评论仍可读。删除文章后建议一并关闭其提交，不要贸然删库。
