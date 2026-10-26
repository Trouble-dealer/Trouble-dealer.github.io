/**
 * Elio 的博客配置。正式地址：jy.遮阳帽.space。
 * 中文域名写为 ASCII / Punycode，避免 DNS、证书和邮件跳转的兼容问题。
 */
const config = {
  title: '具野 · Elio',
  subtitle: '让代码走进真实世界',
  description: 'Elio 的个人博客，记录软件工程、嵌入式与具身智能方向的学习实践，也收藏阅读与日常。',
  author: 'Elio',
  bio: '软件工程 · 嵌入式 · 具身智能\n在代码与真实世界之间，探索感知、决策与行动。',
  introduction: '我是 Elio，学习与探索软件工程、嵌入式和具身智能方向。我关注软件如何连接硬件，让系统在真实环境中感知、决策与行动；也在这里记录学习过程、实践中的问题，以及阅读和生活带来的新想法。',
  url: 'https://jy.xn--wut303ivvd.space',
  displayDomain: 'jy.遮阳帽.space',
  base: '/',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  // 用户指定的纪念计时起点；建站上线日另行统计。
  journeyStartedAt: '2025-03-26T00:00:00+08:00',
  launchedAt: '2026-10-25T00:00:00+08:00',
  hero: {
    eyebrow: 'SOFTWARE · EMBEDDED SYSTEMS · EMBODIED AI',
    title: '让代码，走进真实世界。',
    description: '从软件到硬件，从感知到行动。记录探索，也认真生活。',
    image: '',
    background: '#dce9e3',
  },
  avatar: '', // 例如 '/images/avatar.webp'；留空显示纯色头像
  github: 'https://github.com/Trouble-dealer',
  email: 'elio.ashling@gmail.com',
  postsPerPage: 4,
  friends: [
    { name: 'Firefly', url: 'https://github.com/CuteLeaf/Firefly', description: '清新美观的 Astro 博客主题，也是本站的设计参考。', color: '#dce9e3' },
    { name: 'Hyde Blog', url: 'https://seasir.top/', description: '基于 Firefly 的二创博客，本站的另一处灵感来源。', color: '#e9e3d9' },
    { name: 'Astro', url: 'https://astro.build/', description: '本站使用的静态网站框架。', color: '#e3e0ed' },
  ],
};

// GitHub Actions 在构建时自动推导 github.io 地址；自定义域名优先在上面填写。
export const siteConfig = {
  ...config,
  url: process.env.BLOG_SITE_URL || config.url,
  base: process.env.BLOG_BASE_PATH || config.base,
};
