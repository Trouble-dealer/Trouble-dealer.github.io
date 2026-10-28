# 参考与致谢

本项目是独立编写的 Astro 静态博客，不是 Firefly / Firefly-hyde 的完整复制品，也不包含这些主题的所有扩展功能。

- [CuteLeaf / Firefly](https://github.com/CuteLeaf/Firefly)，MIT 协议。参考其清新配色、圆角卡片、双侧栏、分类标签及阅读偏好设计。其 README 要求参考设计或代码时注明来源；本站页脚和本文件均保留了署名。
- [Hyde Blog](https://seasir.top/) 及其页面公开标注的 [Firefly-hyde](https://github.com/Seasir-Hyde/Firefly-hyde)。参考其博客信息组织方式。没有复制该站文章、头像、照片、字体或私有接口。
- [React Bits](https://reactbits.dev/)：参考 Spotlight Card、Magnet、Fade Content 的交互思路，以原生 CSS 和浏览器动画 API 独立实现本站卡片柔光、图标反馈与滚动入场；没有引入 React Bits 源码或 React 运行时。
- [Astro](https://astro.build/)、[@astrojs/rss](https://docs.astro.build/en/guides/rss/)、[Shiki](https://shiki.style/) 等 npm 依赖按各自许可证使用，具体版本以 `package-lock.json` 为准。
- 留言与评论使用 [Marked](https://github.com/markedjs/marked)（MIT）解析 Markdown，使用 [DOMPurify](https://github.com/cure53/DOMPurify)（Apache-2.0 或 MPL-2.0 双许可证）进行 HTML 安全过滤；本地测试使用 jsdom 和 PGlite。完整许可证保留在对应 npm 包内。

本站仅使用系统字体；未从参考站搬运图片、音乐、个人资料或阅读统计。所有封面默认使用纯色。
