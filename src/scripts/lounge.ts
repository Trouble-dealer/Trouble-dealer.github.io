import type { User, RealtimeChannel } from '@supabase/supabase-js';
import { backend, backendError } from '../lib/backend';
import { markdown, attachMarkdownEditor } from './markdown-editor';

type Message = { id: string; user_id: string; author_name: string; body: string; reply_to: string | null; created_at: string; client_nonce: string };
const sandbox = document.querySelector<HTMLFormElement>('#markdown-playground');
if (sandbox) { attachMarkdownEditor(sandbox); sandbox.addEventListener('submit', e => e.preventDefault()); }
const app = document.querySelector<HTMLElement>('#lounge-app');
if (app?.dataset.enabled === 'true' && backend) {
  const client = backend;
  const list = app.querySelector<HTMLElement>('#lounge-messages')!;
  const status = app.querySelector<HTMLElement>('#lounge-status')!;
  const connection = app.querySelector<HTMLElement>('#lounge-connection')!;
  const form = app.querySelector<HTMLFormElement>('#lounge-form')!;
  const bodyInput = form.querySelector<HTMLTextAreaElement>('textarea')!;
  const refresh = app.querySelector<HTMLButtonElement>('#lounge-refresh')!;
  const latest = app.querySelector<HTMLButtonElement>('#lounge-latest')!;
  const older = app.querySelector<HTMLButtonElement>('#lounge-older')!;
  const replyBox = app.querySelector<HTMLElement>('#lounge-reply')!;
  let user: User | null = null;
  let messages: Message[] = [];
  let reply: Message | null = null;
  let before: { time: string; id: string } | null = null;
  let sending = false;
  let loading = false;
  let followUp = false;
  let channel: RealtimeChannel | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let nonce = crypto.randomUUID();
  let attemptedPayload = '';
  let pageVersion = 0;
  const pageSize = 30;
  attachMarkdownEditor(form);
  function notice(text: string, error = false) { status.textContent = text; status.classList.toggle('is-error', error); }
  function updateEditor() { form.hidden = !user; app!.querySelector<HTMLElement>('#lounge-login')!.hidden = !!user; }
  function setReply(message: Message | null) {
    reply = message; replyBox.hidden = !message;
    replyBox.querySelector('span')!.textContent = message ? `回复 ${message.author_name}：${message.body.slice(0, 60)}` : '';
    if (message) bodyInput.focus();
  }
  function render() {
    list.replaceChildren();
    if (!messages.length) { const empty = document.createElement('p'); empty.className = 'lounge-empty'; empty.textContent = '这里还很安静。来留下第一句问候吧。'; list.append(empty); }
    for (const message of [...messages].reverse()) {
      const article = document.createElement('article'); article.className = `lounge-message${message.user_id === user?.id ? ' is-own' : ''}`; article.id = `message-${message.id}`;
      const header = document.createElement('div'); header.className = 'lounge-message-heading';
      const initial = document.createElement('span'); initial.className = 'author-initial'; initial.textContent = Array.from(message.author_name)[0] || '?'; initial.setAttribute('aria-hidden', 'true');
      const author = document.createElement('strong'); author.textContent = message.author_name;
      const time = document.createElement('time'); time.dateTime = message.created_at; time.textContent = new Intl.DateTimeFormat('zh-CN', { month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Shanghai' }).format(new Date(message.created_at));
      header.append(initial, author, time); article.append(header);
      if (message.reply_to) { const quoted = messages.find(other => other.id === message.reply_to); const quote = document.createElement('div'); quote.className = 'message-reply-quote'; quote.textContent = quoted ? `↳ ${quoted.author_name}：${quoted.body.slice(0, 100)}` : '↳ 回复较早的消息（可能不在本页或已删除）'; article.append(quote); }
      const body = document.createElement('div'); body.className = 'message-markdown'; body.innerHTML = markdown(message.body); article.append(body);
      if (user) {
        const actions = document.createElement('div'); actions.className = 'message-tools';
        const replyButton = document.createElement('button'); replyButton.type = 'button'; replyButton.textContent = '回复'; replyButton.addEventListener('click', () => { if (!sending) setReply(message); }); actions.append(replyButton);
        if (message.user_id === user.id) {
          const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '删除';
          remove.addEventListener('click', () => {
            remove.hidden = true;
            const confirm = document.createElement('div'); confirm.className = 'comment-confirm';
            const text = document.createElement('span'); text.textContent = '确认删除这条消息？';
            const yes = document.createElement('button'); yes.type = 'button'; yes.textContent = '确认删除'; yes.className = 'button secondary';
            const no = document.createElement('button'); no.type = 'button'; no.textContent = '取消'; no.className = 'button secondary';
            no.addEventListener('click', () => { confirm.remove(); remove.hidden = false; });
            yes.addEventListener('click', () => {
              yes.disabled = true; no.disabled = true;
              void Promise.resolve(client.from('lounge_messages').delete().eq('id',message.id).select('id')).then(async ({ data, error }) => {
                if (error || !data?.length) { notice(error ? backendError(error, 'lounge') : '消息未删除，请刷新后重试。',true); confirm.remove(); remove.hidden = false; return; }
                if (reply?.id === message.id) setReply(null); await load(false); notice('消息已删除。');
              }).catch(() => { notice('删除未完成，请检查网络。',true); confirm.remove(); remove.hidden=false; });
            });
            confirm.append(text,yes,no); article.append(confirm);
          }); actions.append(remove);
        }
        article.append(actions);
      }
      list.append(article);
    }
  }
  async function load(quiet = true) {
    if (document.hidden && quiet) return;
    if (loading) { followUp = true; return; }
    loading = true;
    const version = pageVersion;
    refresh.disabled = true; older.disabled = true; latest.disabled = true;
    if (!quiet) notice('正在读取消息…');
    try {
      let query = client.from('lounge_messages').select('id,user_id,author_name,body,reply_to,created_at,client_nonce').order('created_at',{ascending:false}).order('id',{ascending:false}).limit(pageSize+1);
      if (before) query = query.or(`created_at.lt.${before.time},and(created_at.eq.${before.time},id.lt.${before.id})`);
      const { data,error } = await query;
      if (version !== pageVersion) { followUp=true; return; }
      if (error) { notice(backendError(error, 'lounge'),true); return; }
      const rows = (data || []) as Message[];
      const unchanged = JSON.stringify(messages) === JSON.stringify(rows.slice(0,pageSize));
      messages = rows.slice(0,pageSize); older.hidden = rows.length<=pageSize; latest.hidden = !before;
      if (!unchanged || !list.childElementCount) render();
      notice(messages.length ? `本页 ${messages.length} 条消息 · ${before ? '正在翻阅历史，点击「回到最新」继续聊天' : '按时间从早到晚显示，实时接收新消息'}` : '还没有留言，欢迎来打个招呼。');
    } catch { notice('消息加载失败，已保留当前内容。请检查网络后刷新。',true); }
    finally { loading=false; refresh.disabled=false; older.disabled=false; latest.disabled=false; if(followUp) { followUp=false; void load(); } }
  }
  function schedule() { clearTimeout(timer); timer=setTimeout(() => void load(),180); }
  function subscribe() {
    channel = client.channel('juye-public-lounge').on('postgres_changes',{event:'*',schema:'public',table:'lounge_messages'}, () => {
      if (before) { notice('聊天区有更新；当前正在查看历史，点「回到最新」继续交流。'); return; } schedule();
    }).subscribe(state => {
      if (state === 'SUBSCRIBED') { connection.dataset.state='live'; connection.textContent='实时连接已建立'; schedule(); }
      else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') { connection.dataset.state='error'; connection.textContent='实时连接中断 · 每20秒补查'; }
    });
  }
  refresh.hidden=false; refresh.addEventListener('click',() => void load(false));
  latest.addEventListener('click',() => { before=null; pageVersion++; void load(false); });
  older.addEventListener('click',() => { const oldest=messages.at(-1); if(!oldest)return; before={time:oldest.created_at,id:oldest.id};pageVersion++;void load(false); });
  app.querySelector('#lounge-cancel-reply')!.addEventListener('click',() => setReply(null));
  bodyInput.addEventListener('input',() => app!.querySelector('#lounge-length')!.textContent=String(bodyInput.value.length));
  bodyInput.addEventListener('keydown',event => { if((event.ctrlKey||event.metaKey)&&event.key==='Enter'&&!event.isComposing) {event.preventDefault();form.requestSubmit();} });
  form.addEventListener('submit',event => {
    event.preventDefault();if(sending||!user)return;
    const text=bodyInput.value.trim();if(!text||text.length>4000){notice('消息需要1～4000字。',true);return;}
    const payload = JSON.stringify({ body:text, reply_to:reply?.id || null });
    if (attemptedPayload && attemptedPayload !== payload) nonce=crypto.randomUUID();
    attemptedPayload=payload;
    sending=true;const submit=form.querySelector<HTMLButtonElement>('button[type=submit]')!;submit.disabled=true;bodyInput.disabled=true;
    const editorButtons = [...form.querySelectorAll<HTMLButtonElement>('button')]; editorButtons.forEach(button => button.disabled=true);
    const actor=user.id;
    void (async () => {
      try {
        const {error}=await client.from('lounge_messages').insert({body:text,reply_to:reply?.id || null,client_nonce:nonce});
        if(error&&error.code!=='23505'){notice(backendError(error, 'lounge'),true);return;}
        if(error) { const {data,error:lookup}=await client.from('lounge_messages').select('id').eq('client_nonce',nonce).eq('user_id',actor).maybeSingle();if(lookup||!data){notice('发送状态未确认，正文已保留，请刷新后检查。',true);return;} }
        form.reset();bodyInput.dispatchEvent(new Event('input'));nonce=crypto.randomUUID();attemptedPayload='';setReply(null);before=null;pageVersion++;await load(false);notice('消息已保存并公开。');
      } catch {notice('发送未完成，内容已保留；重试不会重复发送同一条消息。',true);}
      finally {sending=false;submit.disabled=false;bodyInput.disabled=false;editorButtons.forEach(button=>button.disabled=false);}
    })();
  });
  const {data:listener}=client.auth.onAuthStateChange((_event,session) => {user=session?.user || null;queueMicrotask(() => {updateEditor();render();});});
  void client.auth.getUser().then(({data}) => {user=data.user;updateEditor();render();}).catch(updateEditor);
  void load(false);subscribe();
  const polling=setInterval(() => {if(!document.hidden)void load();},20000);
  addEventListener('visibilitychange',() => {if(!document.hidden)void load();});
  addEventListener('pagehide',() => {clearInterval(polling);clearTimeout(timer);listener.subscription.unsubscribe();if(channel)void client.removeChannel(channel);});
  addEventListener('pageshow',event => {if(event.persisted)location.reload();});
}
