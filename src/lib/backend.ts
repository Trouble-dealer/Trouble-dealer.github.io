import { createClient } from '@supabase/supabase-js';
import { validatePublicBackend } from './backend-config';
import { communityConfig } from '../../community.config.mjs';
export const backendConfig = validatePublicBackend(
  import.meta.env.PUBLIC_SUPABASE_URL || communityConfig.url,
  import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || communityConfig.publishableKey,
);
export const authEnabled = backendConfig.configured && (import.meta.env.PUBLIC_AUTH_EMAIL_READY === 'true' || communityConfig.emailReady);
export const backend = backendConfig.configured ? createClient(backendConfig.url, backendConfig.key, {
  auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
}) : null;

export function backendError(error: { message: string; code?: string; status?: number }): string {
  const code = error.code ?? '';
  if (code === 'invalid_credentials') return '邮箱或密码不正确，请检查后重试。';
  if (code === 'email_not_confirmed') return '请先打开注册验证邮件，完成邮箱验证后再登录。';
  if (code === 'user_already_exists') return '这个邮箱可能已经注册，请登录或重设密码。';
  if (code === 'weak_password') return '密码强度不足，请使用至少 12 位的不同字符组合。';
  if (code === 'over_email_send_rate_limit' || error.status === 429) return '操作过于频繁，请稍后重试。';
  if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found') return '链接已过期或不是在发起请求的浏览器中打开，请重新发送邮件。';
  if (error.message.includes('comment_rate_limit')) return '评论间隔至少 30 秒，每小时最多提交 10 条。请稍后重试。';
  if (error.message.includes('verified_email_required')) return '请先验证邮箱，再提交评论。';
  if (error.message.includes('comment_name_required')) return '请在账户页设置 2～40 字的公开昵称。';
  if (code === '23503') return '这篇文章的评论尚未开放，请稍后再试。';
  if (code === '23514') return '请检查评论长度，正文需要 3～2000 字。';
  if (code === '42501') return '没有执行这项操作的权限，请确认登录状态。';
  if (code === '42P01' || code === 'PGRST205') return '评论服务尚未完成初始化，请联系博主。';
  return '请求未完成，请检查网络后重试；持续失败时可联系博主。';
}
