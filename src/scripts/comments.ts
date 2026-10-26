import type { User } from '@supabase/supabase-js';
import { backend, backendError } from '../lib/backend';
import { markdown, attachMarkdownEditor } from './markdown-editor';
type Comment = { id: string; post_id: string; user_id: string; author_name: string; body: string; status: string; created_at: string };
const app = document.querySelector<HTMLElement>('#comments');
if (app && backend) {
  const client = backend;
  const status = app.querySelector<HTMLElement>('#comments-status')!;
  const list = app.querySelector<HTMLElement>('#comments-list')!;
  const more = app.querySelector<HTMLButtonElement>('#comments-more')!;
  const refresh = app.querySelector<HTMLButtonElement>('#comments-refresh')!;
  const form = app.querySelector<HTMLFormElement>('#comment-form');
  if (form) attachMarkdownEditor(form);
  let user: User | null = null;
  let loading = false;
  let submitting = false;
  let offset = 0;
  let items: Comment[] = [];
  let generation = 0;
  const size = 20;
  function message(text: string, error = false) { status.textContent = text; status.classList.toggle('is-error', error); }
  function updateEditor() {
    if (form) form.hidden = !user;
    const guest = app!.querySelector<HTMLElement>('#comment-guest');
    if (guest) guest.hidden = !!user;
  }
  function render() {
    list.replaceChildren();
    for (const item of items) {
      const article = document.createElement('article'); article.className = 'comment-item';
      const header = document.createElement('div'); header.className = 'comment-item-heading';
      const author = document.createElement('strong'); author.textContent = item.author_name;
      const time = document.createElement('time'); time.dateTime = item.created_at; time.textContent = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Shanghai' }).format(new Date(item.created_at));
      header.append(author, time);
      if (item.status !== 'approved') { const badge = document.createElement('span'); badge.className = 'comment-badge'; badge.textContent = item.status === 'pending' ? '待审核 · 仅自己可见' : '未通过 · 仅自己可见'; header.append(badge); }
      const body = document.createElement('div'); body.className = 'comment-body message-markdown'; body.innerHTML = markdown(item.body);
      article.append(header, body);
      if (user?.id === item.user_id && app!.dataset.auth === 'true') {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'comment-delete'; button.textContent = '删除我的评论';
        button.addEventListener('click', () => {
          button.hidden = true;
          const confirmation = document.createElement('div'); confirmation.className = 'comment-confirm';
          const text = document.createElement('span'); text.textContent = '确认删除这条评论？';
          const yes = document.createElement('button'); yes.type = 'button'; yes.textContent = '确认删除'; yes.className = 'button secondary';
          const no = document.createElement('button'); no.type = 'button'; no.textContent = '取消'; no.className = 'button secondary';
          no.addEventListener('click', () => { confirmation.remove(); button.hidden = false; });
          yes.addEventListener('click', () => { void remove(item, yes, no, confirmation, button); });
          confirmation.append(text, yes, no); article.append(confirmation);
        });
        article.append(button);
      }
      list.append(article);
    }
  }
  async function remove(item: Comment, yes: HTMLButtonElement, no: HTMLButtonElement, confirmation: HTMLElement, original: HTMLButtonElement) {
    yes.disabled = true; no.disabled = true;
    try {
      const { data, error } = await client.from('comments').delete().eq('id', item.id).select('id');
      if (error) { message(backendError(error), true); return; }
      if (!data?.length) { message('评论未删除，可能已经不存在或登录状态已变化。请刷新后重试。', true); return; }
      await load(true, '评论已删除。');
    } catch { message('删除未完成，请检查网络后重试。', true); }
    finally { confirmation.remove(); original.hidden = false; yes.disabled = false; no.disabled = false; }
  }
  async function load(reset: boolean, notice = '') {
    if (loading && !reset) return;
    const request = ++generation;
    loading = true; refresh.disabled = true; more.disabled = true;
    // 切换用户时立即清除此前用户的私有待审内容。
    if (reset) { items = []; offset = 0; render(); more.hidden = true; }
    message('正在加载评论…');
    try {
      const { data, error } = await client.from('comments').select('id,post_id,user_id,author_name,body,status,created_at').eq('post_id', app!.dataset.post!).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + size);
      if (request !== generation) return;
      if (error) { message(backendError(error), true); return; }
      const page = (data || []) as Comment[];
      const added = page.slice(0, size);
      items = [...items, ...added].filter((entry, i, all) => all.findIndex(other => other.id === entry.id) === i);
      offset += added.length; more.hidden = page.length <= size; render();
      message(notice || (items.length ? `已加载 ${items.length} 条评论，按最新时间排列。` : app!.dataset.auth === 'true' ? '还没有可显示的评论，欢迎留下第一条想法。' : '暂时没有已公开的评论。'));
    } catch { if (request === generation) message('评论暂时无法加载，请检查网络后点击刷新评论。', true); }
    finally { if (request === generation) { loading = false; refresh.disabled = false; more.disabled = false; } }
  }
  refresh.hidden = false;
  refresh.addEventListener('click', () => void load(true));
  more.addEventListener('click', () => void load(false));
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (submitting || !user) return;
    const body = String(new FormData(form).get('body') || '').trim();
    if (body.length < 3 || body.length > 2000) { message('评论正文需要 3～2000 字。', true); return; }
    submitting = true;
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!; submit.disabled = true;
    void (async () => {
      try {
        const { error } = await client.from('comments').insert({ post_id: app!.dataset.post!, body });
        if (error) { message(backendError(error), true); return; }
        form.reset(); await load(true, '评论已发布，所有访客现在都可以看到。');
      } catch { message('提交未完成。正文已保留，请检查网络后重试。', true); }
      finally { submitting = false; submit.disabled = false; }
    })();
  });
  client.auth.onAuthStateChange((_event, session) => { const previous = user?.id; user = session?.user ?? null; queueMicrotask(() => { updateEditor(); if (previous !== user?.id) void load(true); }); });
  void client.auth.getUser().then(({ data }) => { user = data.user; updateEditor(); void load(true); }).catch(() => { updateEditor(); void load(true); });
}
