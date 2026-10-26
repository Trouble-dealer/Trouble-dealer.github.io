import { communityConfig } from '../../community.config.mjs';
import { mayRecordVisit } from '../lib/statistics';
const consentKey = 'juye-statistics-consent';
const visitorKey = 'juye-visitor-id';
const toggle = document.querySelector<HTMLInputElement>('#statistics-consent');
const preferenceStatus = document.querySelector<HTMLElement>('#statistics-preference-status');
let consent = false;
try { consent = localStorage.getItem(consentKey) === 'true'; } catch { /* Don't count if storage is unavailable. */ }
if (toggle) toggle.checked = consent;
function preferenceMessage() { if (preferenceStatus) preferenceStatus.textContent = consent ? '此浏览器已允许统计。你可以随时取消。' : '此浏览器未参与访问统计，取消或保持未勾选均可正常阅读。'; }
preferenceMessage();
// 构建配置包含 process.env，只在 Astro 服务端读取；浏览器使用输出的公开域名。
const officialOrigin = document.documentElement.dataset.siteOrigin || '';
let visitor: string | null = null;
function getVisitor() {
  try { let id = localStorage.getItem(visitorKey); if (!id || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) { id = crypto.randomUUID(); localStorage.setItem(visitorKey, id); } return id; }
  catch { return null; }
}
async function record() {
  if (!mayRecordVisit(consent, communityConfig.statisticsReady, location.origin, officialOrigin, location.pathname)) return;
  visitor = getVisitor(); if (!visitor) return;
  const { backend } = await import('../lib/backend');
  if (!backend || !consent) return;
  // 不把 code、搜索词或其他 URL 参数发送到统计后端。
  try { await backend.rpc('record_site_visit', { visitor, page: location.pathname }); } catch { /* Reading is never blocked by analytics. */ }
}
const status = document.querySelector<HTMLElement>('#statistics-status');
const refresh = document.querySelector<HTMLButtonElement>('#statistics-refresh');
async function load() {
  if (!communityConfig.statisticsReady || !status) return;
  if (refresh) refresh.disabled = true;
  status.textContent = '正在读取访问数据…';
  try {
    const { backend } = await import('../lib/backend');
    if (!backend) throw new Error('unconfigured');
    const { data, error } = await backend.rpc('get_site_statistics');
    if (error || !data?.[0]) throw new Error('unavailable');
    const row = data[0] as { pageviews: number; browsers: number; started_at: string };
    for (const name of ['pageviews','browsers'] as const) document.querySelectorAll(`[data-stat="${name}"]`).forEach(el => el.textContent = new Intl.NumberFormat('zh-CN').format(Number(row[name])));
    document.querySelectorAll('[data-stat="started"]').forEach(el => el.textContent = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeZone: 'Asia/Shanghai' }).format(new Date(row.started_at)));
    status.textContent = `数据更新于 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
  } catch { status.textContent = '访问数据暂时无法读取，请稍后刷新。'; }
  finally { if (refresh) refresh.disabled = false; }
}
toggle?.addEventListener('change', () => {
  consent = toggle.checked;
  try { localStorage.setItem(consentKey, String(consent)); }
  catch { consent = false; toggle.checked = false; if (preferenceStatus) preferenceStatus.textContent = '浏览器未允许本地存储，无法开启统计。'; return; }
  preferenceMessage(); if (consent) void record().then(load);
});
if (communityConfig.statisticsReady) { if (refresh) { refresh.hidden = false; refresh.addEventListener('click', () => void load()); } void record().then(load); }
