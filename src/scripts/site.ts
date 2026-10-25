type Preferences = { theme: 'light' | 'dark' | 'system'; accent: 'sage' | 'blue' | 'rose'; font: number };
const defaults: Preferences = { theme: 'system', accent: 'sage', font: 17 };
let prefs: Preferences = { ...defaults };
try {
  const saved = JSON.parse(localStorage.getItem('qiguang-prefs') || '{}');
  if (['light', 'dark', 'system'].includes(saved.theme)) prefs.theme = saved.theme;
  if (['sage', 'blue', 'rose'].includes(saved.accent)) prefs.accent = saved.accent;
  if (Number.isFinite(saved.font) && saved.font >= 15 && saved.font <= 20) prefs.font = saved.font;
} catch { /* Privacy mode: preferences still work in memory. */ }
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
function applyPreferences() {
  const theme = prefs.theme === 'system' ? (systemTheme.matches ? 'dark' : 'light') : prefs.theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = prefs.accent;
  document.documentElement.style.setProperty('--reading-size', `${prefs.font}px`);
  document.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach(el => el.checked = el.value === prefs.theme);
  document.querySelectorAll<HTMLInputElement>('input[name="accent"]').forEach(el => el.checked = el.value === prefs.accent);
  const slider = document.querySelector<HTMLInputElement>('#reading-font');
  if (slider) slider.value = String(prefs.font);
  const output = document.querySelector('#font-output');
  if (output) output.textContent = `${prefs.font}px`;
  themeToggle?.setAttribute('aria-label', theme === 'dark' ? '切换为浅色' : '切换为深色');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171d1b' : '#f4f6f4');
}
function savePreferences() {
  try { localStorage.setItem('qiguang-prefs', JSON.stringify(prefs)); } catch { /* Storage may be disabled. */ }
  applyPreferences();
}
applyPreferences();
systemTheme.addEventListener('change', applyPreferences);
if (themeToggle) {
  themeToggle.hidden = false;
  themeToggle.addEventListener('click', () => {
    prefs.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    savePreferences();
  });
}
const settings = document.querySelector<HTMLDialogElement>('#settings-dialog');
const settingsOpen = document.querySelector<HTMLButtonElement>('#settings-open');
if (settings && settingsOpen) {
  settingsOpen.hidden = false;
  settingsOpen.addEventListener('click', () => settings.showModal());
  document.querySelector('#settings-close')?.addEventListener('click', () => settings.close());
  settings.addEventListener('click', e => { if (e.target === settings) { const r = settings.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) settings.close(); } });
  settings.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach(el => el.addEventListener('change', () => { prefs.theme = el.value as Preferences['theme']; savePreferences(); }));
  settings.querySelectorAll<HTMLInputElement>('input[name="accent"]').forEach(el => el.addEventListener('change', () => { prefs.accent = el.value as Preferences['accent']; savePreferences(); }));
  settings.querySelector<HTMLInputElement>('#reading-font')?.addEventListener('input', e => { prefs.font = Number((e.target as HTMLInputElement).value); savePreferences(); });
  settings.querySelector('#reset-settings')?.addEventListener('click', () => { prefs = { ...defaults }; savePreferences(); });
}
const menuButton = document.querySelector<HTMLButtonElement>('#menu-toggle');
if (menuButton) {
  menuButton.hidden = false;
  document.documentElement.classList.add('has-js');
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    document.querySelector('#mobile-nav')?.classList.toggle('is-open', open);
  });
}
document.addEventListener('keydown', e => {
  const target = e.target as HTMLElement;
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !target.closest('input, textarea, select, [contenteditable="true"]') && !settings?.open) {
    e.preventDefault();
    const searchInput = document.querySelector<HTMLInputElement>('#search-input');
    if (searchInput) searchInput.focus();
    else { const link = document.querySelector<HTMLAnchorElement>('.search-shortcut'); if (link) location.href = link.href; }
  }
});
const topButton = document.querySelector<HTMLButtonElement>('#back-to-top');
function updateScroll() { if (topButton) topButton.hidden = scrollY < 450; }
updateScroll();
addEventListener('scroll', updateScroll, { passive: true });
topButton?.addEventListener('click', () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  const el = document.querySelector<HTMLElement>('#toast');
  if (!el) return;
  clearTimeout(toastTimer); el.textContent = message; el.hidden = false;
  toastTimer = setTimeout(() => el.hidden = true, 3000);
}
async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}
document.querySelector<HTMLButtonElement>('#copy-link')?.addEventListener('click', async () => {
  const copied = await copyText(location.href.split('#')[0]);
  toast(copied ? '文章链接已复制' : '复制未成功，请复制浏览器地址栏中的链接');
});
document.querySelector<HTMLButtonElement>('#copy-link')?.removeAttribute('hidden');
document.querySelectorAll<HTMLElement>('.prose pre').forEach(pre => {
  const code = pre.querySelector('code');
  if (!code) return;
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'code-copy'; button.textContent = '复制'; button.setAttribute('aria-label', '复制此段代码');
  button.addEventListener('click', async () => { toast(await copyText(code.textContent || '') ? '代码已复制' : '复制未成功，请选中代码后复制'); });
  pre.append(button);
});
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.toc-card a')];
if ('IntersectionObserver' in window && tocLinks.length) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      tocLinks.forEach(link => { if (decodeURIComponent(link.hash.slice(1)) === entry.target.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    }
  }, { rootMargin: '-80px 0px -65% 0px' });
  tocLinks.forEach(link => { const heading = document.getElementById(decodeURIComponent(link.hash.slice(1))); if (heading) observer.observe(heading); });
}
