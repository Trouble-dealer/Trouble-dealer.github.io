import type { User } from '@supabase/supabase-js';
import { backend, backendError } from '../lib/backend';
const app = document.querySelector<HTMLElement>('#account-app');
if (app && backend) {
  const client = backend;
  const status = app.querySelector<HTMLElement>('#account-status')!;
  const guest = app.querySelector<HTMLElement>('#account-guest')!;
  const member = app.querySelector<HTMLElement>('#account-member')!;
  let user: User | null = null;
  let busy = false;
  const callback = new URL(app.dataset.callback!, location.origin).href;
  const requested = new URLSearchParams(location.search).get('next');
  const returnLink = app.querySelector<HTMLAnchorElement>('#account-return')!;
  if (requested) {
    try { const target = new URL(requested, location.origin); if (target.origin === location.origin && !/\/(?:account|auth)\//.test(target.pathname)) returnLink.href = target.pathname + target.search + target.hash; } catch { /* Keep safe default. */ }
  }
  function message(text: string, error = false) { status.textContent = text; status.classList.toggle('is-error', error); }
  function mode(name: string) {
    for (const choice of ['login', 'signup', 'reset']) {
      app!.querySelector<HTMLElement>(`#${choice}-form`)!.hidden = choice !== name;
      const button = app!.querySelector<HTMLButtonElement>(`[data-mode="${choice}"]`)!;
      button.classList.toggle('secondary', choice !== name); button.setAttribute('aria-pressed', String(choice === name));
    }
  }
  function render() {
    guest.hidden = !!user; member.hidden = !user;
    if (user) {
      app!.querySelector('#member-name')!.textContent = user.user_metadata.nickname || '读者';
      app!.querySelector('#member-email')!.textContent = user.email || '';
      app!.querySelector<HTMLInputElement>('#nickname-form input')!.value = user.user_metadata.nickname || '';
    }
  }
  async function submit(form: HTMLFormElement, work: (values: FormData) => Promise<void>) {
    if (busy) return;
    busy = true;
    const buttons = [...app!.querySelectorAll<HTMLButtonElement>('button')];
    buttons.forEach(button => button.disabled = true);
    message('正在处理，请稍候…');
    try { await work(new FormData(form)); }
    catch (error) { message(backendError(error instanceof Error ? error : { message: 'unknown' }), true); }
    finally { busy = false; buttons.forEach(button => button.disabled = false); }
  }
  const value = (data: FormData, name: string) => String(data.get(name) || '');
  function passwords(data: FormData): string | null {
    const password = value(data, 'password');
    if (password.length < 12 || password.length > 128) { message('密码需要 12～128 位。', true); return null; }
    if (password !== value(data, 'confirm')) { message('两次密码不一致。', true); return null; }
    return password;
  }
  function bind(id: string, work: (values: FormData, form: HTMLFormElement) => Promise<void>) {
    const form = app!.querySelector<HTMLFormElement>(`#${id}`)!;
    form.addEventListener('submit', event => { event.preventDefault(); void submit(form, data => work(data, form)); });
  }
  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => { mode(button.dataset.mode!); message(''); }));
  mode('login');
  bind('login-form', async (data, form) => {
    const result = await client.auth.signInWithPassword({ email: value(data, 'email').trim(), password: value(data, 'password') });
    if (result.error) { message(backendError(result.error), true); return; }
    user = result.data.user; render(); form.reset(); message('登录成功，可以返回文章参与讨论。');
  });
  bind('signup-form', async (data, form) => {
    const password = passwords(data); if (!password) return;
    const nickname = value(data, 'nickname').trim();
    if (nickname.length < 2 || nickname.length > 40) { message('昵称需要 2～40 字。', true); return; }
    const result = await client.auth.signUp({ email: value(data, 'email').trim(), password, options: { data: { nickname }, emailRedirectTo: callback } });
    if (result.error) { message(backendError(result.error), true); return; }
    form.reset();
    if (result.data.session) { user = result.data.user; render(); message('账户已创建并登录。'); }
    else message('请求已受理。若邮箱符合注册条件，验证邮件会发送到你的邮箱；已注册用户请直接登录或重设密码。');
  });
  bind('reset-form', async data => {
    const recovery = new URL(callback); recovery.searchParams.set('flow', 'recovery');
    const { error } = await client.auth.resetPasswordForEmail(value(data, 'email').trim(), { redirectTo: recovery.href });
    message(error ? backendError(error) : '请求已受理。如果该邮箱对应账户，稍后会收到重设密码邮件。', !!error);
  });
  bind('resend-form', async data => {
    const { error } = await client.auth.resend({ type: 'signup', email: value(data, 'email').trim(), options: { emailRedirectTo: callback } });
    message(error ? backendError(error) : '请求已受理。若该邮箱需要验证，稍后会收到邮件。', !!error);
  });
  bind('nickname-form', async data => {
    const nickname = value(data, 'nickname').trim();
    if (nickname.length < 2 || nickname.length > 40) { message('昵称需要 2～40 字。', true); return; }
    const result = await client.auth.updateUser({ data: { nickname } });
    if (result.error) { message(backendError(result.error), true); return; }
    user = result.data.user; render(); message('昵称已保存。');
  });
  bind('password-form', async (data, form) => {
    const password = passwords(data); if (!password) return;
    const { error } = await client.auth.updateUser({ password });
    if (error) { message(backendError(error), true); return; }
    form.reset(); message('新密码已保存。');
  });
  app.querySelector('#signout')!.addEventListener('click', () => {
    if (busy) return;
    const form = app!.querySelector<HTMLFormElement>('#login-form')!;
    void submit(form, async () => { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) { message(backendError(error), true); return; } user = null; render(); message('已退出当前浏览器的登录。'); });
  });
  client.auth.onAuthStateChange((_event, session) => { user = session?.user ?? null; queueMicrotask(render); });
  void client.auth.getUser().then(({ data, error }) => {
    user = data.user; render();
    if (error && error.name !== 'AuthSessionMissingError') message(backendError(error), true);
    else message(user ? '已登录。你可以修改昵称、设置密码或返回文章。' : '请选择登录或注册。');
  }).catch(() => { render(); message('暂时无法连接账户服务，请检查网络后刷新。', true); });
}
