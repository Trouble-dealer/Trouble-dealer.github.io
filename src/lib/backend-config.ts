export function validatePublicBackend(rawUrl: string, rawKey: string) {
  const url = rawUrl.trim();
  const key = rawKey.trim();
  if (!url && !key) return { configured: false, url: '', key: '' };
  if (!url || !key) throw new Error('Supabase URL 与公开 key 必须同时填写，或同时留空。');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co') || parsed.pathname !== '/' || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('PUBLIC_SUPABASE_URL 必须是控制台提供的 https://项目ID.supabase.co 根地址。');
  }
  if (key.startsWith('sb_secret_')) throw new Error('禁止将 Supabase secret key 放入公开前端。');
  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')));
      if (payload.role !== 'anon') throw new Error('not anon');
    } catch { throw new Error('请使用 Supabase Publishable key 或旧版 anon key，不能使用 service_role。'); }
  }
  return { configured: true, url: parsed.origin, key };
}
