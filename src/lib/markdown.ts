import { marked } from 'marked';
import createDOMPurify, { type WindowLike } from 'dompurify';

/** 禁止任意 HTML、远程图片和嵌入内容；保留写作常用的 Markdown。 */
export function createMarkdownRenderer(scope: WindowLike) {
  const document = scope.document;
  if (!document) throw new Error('Markdown rendering requires a document');
  const purifier = createDOMPurify(scope);
  return (source: string): string => {
    const html = marked.parse(source.slice(0, 8000), { async: false, gfm: true, breaks: true });
    const clean = purifier.sanitize(html, {
      ALLOWED_TAGS: ['p','br','strong','em','del','blockquote','ul','ol','li','pre','code','a','h1','h2','h3','h4','h5','h6','hr','table','thead','tbody','tr','th','td'],
      ALLOWED_ATTR: ['href','title','start'],
      ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
      FORBID_TAGS: ['style','script','iframe','form','input','img','svg','math'],
    });
    const template = document.createElement('template'); template.innerHTML = clean;
    template.content.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href') || '';
      const valid = /^(?:https?:\/\/|mailto:|#|\/(?!\/)|\.\.?\/)/i.test(href);
      if (!valid) { link.removeAttribute('href'); return; }
      link.setAttribute('rel', 'noopener noreferrer nofollow ugc');
      link.setAttribute('target', '_blank');
    });
    // 避免用户输入 h1 干扰页面层级，留言中统一呈现为小标题。
    template.content.querySelectorAll('h1,h2').forEach(heading => {
      const replacement = document.createElement('h3'); replacement.append(...heading.childNodes); heading.replaceWith(replacement);
    });
    return template.innerHTML;
  };
}
