import { createMarkdownRenderer } from '../lib/markdown';
import 'katex/dist/katex.min.css';
import '../styles/community-math.css';
export const markdown = createMarkdownRenderer(window);
export function attachMarkdownEditor(form: HTMLFormElement) {
  const input = form.querySelector<HTMLTextAreaElement>('textarea')!;
  const preview = form.querySelector<HTMLElement>('[data-preview]');
  const previewButton = form.querySelector<HTMLButtonElement>('[data-preview-toggle]');
  function update() { if (preview && !preview.hidden) preview.innerHTML = markdown(input.value) || '<p class="muted">还没有内容，先写一点吧。</p>'; }
  previewButton?.addEventListener('click', () => {
    if (!preview) return;
    preview.hidden = !preview.hidden;
    previewButton.setAttribute('aria-pressed', String(!preview.hidden));
    previewButton.textContent = preview.hidden ? '预览 Markdown' : '收起预览'; update();
  });
  input.addEventListener('input', update);
  form.addEventListener('reset', () => queueMicrotask(update));
  form.querySelectorAll<HTMLButtonElement>('[data-insert]').forEach(button => button.addEventListener('click', () => {
    const type = button.dataset.insert;
    const selected = input.value.slice(input.selectionStart, input.selectionEnd);
    const sample = selected || '文字';
    const snippets: Record<string, string> = { bold: `**${sample}**`, italic: `*${sample}*`, quote: `\n> ${sample}\n`, code: `\n\`\`\`\n${selected || '代码'}\n\`\`\`\n`, link: `[${sample}](https://example.com)` };
    snippets.math = '\n$$\n'+(selected||'E = mc^2')+'\n$$\n';
    const insertion = snippets[type || '']; if (!insertion) return;
    if (input.value.length - selected.length + insertion.length > input.maxLength) return;
    input.setRangeText(insertion, input.selectionStart, input.selectionEnd, 'select'); input.focus(); input.dispatchEvent(new Event('input', { bubbles: true }));
  }));
}
