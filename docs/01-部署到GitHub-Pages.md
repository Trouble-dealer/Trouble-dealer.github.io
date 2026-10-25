# 从零发布到 GitHub Pages

本教程先发布到 GitHub 的免费地址。确认上线成功后，再绑定域名。你不需要重新申请 Pages 账号。

> Elio 当前配置：用户名 Trouble-dealer，仓库名 Trouble-dealer.github.io，正式域名 jy.遮阳帽.space。代码已填写正式域名；若先只测试 github.io，可临时把 site.config.mjs 的 url 改成 https://Trouble-dealer.github.io。当前三篇文章，每个分类一篇，没有第 2 页。具体步骤优先参考根目录《休息后先看.md》。

## 第一步：确认 GitHub 用户名

登录 [GitHub](https://github.com/)，点右上角头像 → **Your profile**。

浏览器地址若为 `https://github.com/alice`，那么用户名是 `alice`，不是个人资料里的显示名称。

推荐仓库名称为 `alice.github.io`，这样默认网站地址为 `https://alice.github.io/`。把示例中的 `alice` 换成你自己的用户名。

如果已有这个仓库，先不要覆盖；把链接发给我，确认是否已有需要保留的网站。每个账号的用户主页仓库名称是固定的。

## 第二步：创建仓库

1. 点右上角 **+ → New repository**。
2. Repository name 填 `你的用户名.github.io`。
3. 选择 **Public**。这是使用 GitHub Free 托管这个博客的直接方式，源码也将公开。
4. 如果用下面的 Git 命令上传，不勾选自动生成 README / .gitignore / License，创建空仓库即可。
5. 点 **Create repository**。

不要在创建时填入 Token、密码或 DNS 登录凭证。

## 第三步：选择一种上传方式

### 方式 A：Git 命令上传，推荐

本次开发电脑已有 Git。换电脑时可从 [Git 官网](https://git-scm.com/downloads) 安装。

在 `D:\grade3\web` 文件夹空白处打开终端，依次运行，先把网址替换为你创建的真实仓库：

```powershell
cd D:\grade3\web
git init
git branch -M main
git add .
git commit -m "Create personal blog"
git remote add origin https://github.com/你的用户名/你的用户名.github.io.git
git push -u origin main
```

初次提交如果 Git 提示缺少作者信息，可以只对这个项目设置：

```powershell
git config user.name "你的昵称"
git config user.email "GitHub提供的noreply邮箱"
git add .
git commit -m "Create personal blog"
git push -u origin main
```

`noreply` 邮箱可在 GitHub **Settings → Emails** 中查看。它不是密码。作者邮箱会记录在提交历史中，按自己的公开意愿填写。

推送时可能弹出 GitHub 浏览器登录。由你自己完成。GitHub 已不支持用账号密码直接作为 HTTPS Git 密码；优先使用 Git Credential Manager 弹出的浏览器登录，不需要把令牌发给我。

如果提示 `remote origin already exists`，先运行 `git remote -v` 核对是否已指向正确仓库；不要盲目重复添加或强制推送。如果仓库已有内容并出现冲突，将提示信息发给我再处理。

### 方式 B：使用 GitHub 网页上传

适合暂时不想使用终端的人。GitHub 网页对文件数量和单文件大小有限制，**不要拖入整个含依赖的 web 文件夹**。

1. 打开空仓库页面中的 **uploading an existing file**，或 **Add file → Upload files**。
2. 上传项目源码，文件应直接处于仓库根目录，不要额外套一层 `web/`。
3. 必须包含 `.github/workflows/deploy.yml`、`package.json`、`package-lock.json`、`astro.config.mjs`、`site.config.mjs`、`tsconfig.json`、`src/`、`public/`、`scripts/` 和 `.gitignore`。文档也建议一起上传。
4. **不要上传** `node_modules/`、`dist/`、`.astro/`、`.git/`、`.qa/`。这些目录有的很大、有的是自动产物。
5. 浏览器若不上传点开头文件，可点 **Add file → Create new file**，输入 `.github/workflows/deploy.yml`，复制本地同名文件的全部内容并提交。`.gitignore` 也可这样创建。
6. 提交到 `main` 分支。上传完成后检查仓库根目录中直接可见 `package.json`，并能打开 `.github/workflows/deploy.yml`。

不要把项目压缩成 zip 后直接上传，GitHub 不会自动解压它作为博客源码。若上传文件太多，建议改用方式 A，`.gitignore` 会自动排除依赖和构建产物。

## 第四步：启用 Pages

在刚创建的**仓库**里操作，不是在账号设置里：

1. **Settings → Pages**。
2. 找到 **Build and deployment**。
3. 将 **Source** 设置为 **GitHub Actions**。

这里不要选 `Deploy from a branch`，本项目需要先由 Astro 构建。

如果 Pages 页面不可用，检查仓库是否公开、账号是否完成 GitHub 要求的基础验证，以及你是否有该仓库的管理权限。

## 第五步：运行一次发布

1. 点仓库顶部 **Actions**。
2. 左边选择 **Deploy blog to GitHub Pages**。
3. 点 **Run workflow → main → Run workflow**。
4. 打开本次运行，等待 `build` 和 `deploy` 都变成绿色。
5. 在 deploy 结果或 **Settings → Pages** 中打开网站地址。

首次上传时，workflow 可能早于你启用 Pages 而失败；设置完后手动运行一次即可。

首次运行需要下载依赖和构建，耗时随 GitHub 排队和网络变化。Actions 全绿前，不要仅凭网页暂时 404 判断代码失败。

## 第六步：验证网站

打开默认地址后，检查：

- 首页有 3 篇公开文章，不出现多余分页。
- 分类「技术笔记」有 1 篇文章，其他两类也各有 1 篇。
- 搜索 `DNS`，能找到发布教程；搜索不存在的词有空结果提示。
- 打开文章，目录跳转和代码复制正常。
- `rss.xml` 可以打开，显示 XML 是正常现象。
- 手机宽度下可打开导航菜单。

更详细的验收表见 `04-功能验收和常见问题.md`。

## 以后怎样更新

修改本地内容后：

```powershell
npm run build
git add .
git commit -m "Update blog"
git push
```

推送到 `main` 后自动发布。也可以在 GitHub 网页中直接编辑单篇 Markdown 并提交；只是无法先本地预览。

不要把 `dist/` 手动提交到 main，也不需要自己创建 gh-pages 分支。Actions 会上传真正需要发布的构建产物。

## 如果仓库不叫 用户名.github.io

比如仓库叫 `blog`，未配置域名时，发布脚本会自动生成 `https://用户名.github.io/blog/` 对应的路径。文章、样式、搜索索引和订阅地址都会带上 `/blog/`。

自定义域名启用后用网站根目录，因此在配置里填写真实域名并把 `base` 保持为 `/`。详见下一份教程。

## 官方资料

- [GitHub Pages 入门](https://docs.github.com/en/pages/getting-started-with-github-pages)
- [配置发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [自定义 Actions 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
