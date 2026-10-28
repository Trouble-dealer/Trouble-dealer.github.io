import { Marked, type Tokens } from 'marked';
import createDOMPurify, { type WindowLike } from 'dompurify';
import { renderToString } from 'katex';

/** 禁止任意 HTML、远程图片和嵌入内容；保留写作常用的 Markdown。 */
export function createMarkdownRenderer(scope: WindowLike) {
  const document = scope.document;
  if (!document) throw new Error('Markdown rendering requires a document');
  const purifier = createDOMPurify(scope);
  return (source: string): string => {
    const formulas: {text:string;display:boolean}[]=[];
    const nonce='m'+Math.random().toString(36).slice(2);
    const placeholder=(token:Tokens.Generic)=>{
      if(formulas.length>=32||token.text.length>2000)return token.raw.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
      const id=formulas.push({text:token.text,display:token.display})-1;
      const slot='<span data-math-slot="'+nonce+'-'+id+'"></span>';
      return token.display?'<p>'+slot+'</p>\n':slot;
    };
    // Tokenize before Markdown consumes TeX backslashes or underscores.
    // Code fences and inline code remain literal through Marked's normal tokenization.
    const parser=new Marked({gfm:true,breaks:true,async:false});
    parser.use({extensions:[
      {name:'mathBlock',level:'block',
        start:src=>src.search(/(?:^|\n)[ \t]{0,3}(?:\$\$|\\\[)/),
        tokenizer(src){
          const m=/^[ \t]{0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/.exec(src)||/^[ \t]{0,3}\\\[([\s\S]+?)\\\][ \t]*(?:\n|$)/.exec(src);
          if(m)return {type:'mathBlock',raw:m[0],text:m[1].trim(),display:true};
        },renderer:placeholder},
      {name:'mathInline',level:'inline',
        start:src=>src.search(/\$|\\\(|\\\[/),
        tokenizer(src){
          const block=/^\$\$([\s\S]+?)\$\$/.exec(src)||/^\\\[([\s\S]+?)\\\]/.exec(src);
          if(block)return {type:'mathInline',raw:block[0],text:block[1].trim(),display:true};
          const m=/^\$((?:\\.|[^\\$\n])+?)\$(?!\$)/.exec(src)||/^\\\(([\s\S]+?)\\\)/.exec(src);
          if(m&&m[1].trim()===m[1])return {type:'mathInline',raw:m[0],text:m[1],display:false};
        },renderer:placeholder},
    ]});
    const html = parser.parse(source.slice(0, 8000), { async: false });
    const clean = purifier.sanitize(html, {
      ALLOWED_TAGS: ['p','br','strong','em','del','blockquote','ul','ol','li','pre','code','a','h1','h2','h3','h4','h5','h6','hr','table','thead','tbody','tr','th','td','span'],
      ALLOWED_ATTR: ['href','title','start','data-math-slot'],
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
    template.content.querySelectorAll<HTMLElement>('span[data-math-slot]').forEach(slot=>{
      const key=slot.getAttribute('data-math-slot')||'';
      slot.removeAttribute('data-math-slot');
      if(!key.startsWith(nonce+'-'))return;
      const formula=formulas[Number(key.slice(nonce.length+1))];if(!formula)return;
      slot.className=formula.display?'math-slot math-block':'math-slot';
      try{
        // Only KaTeX output enters this second sanitizer. Raw user HTML never does.
        const math=renderToString(formula.text,{displayMode:formula.display,throwOnError:true,trust:false,strict:'ignore',maxSize:8,maxExpand:400,macros:{},output:'htmlAndMathml'});
        slot.innerHTML=purifier.sanitize(math,{USE_PROFILES:{html:true,mathMl:true,svg:true},ADD_TAGS:['annotation','semantics'],ADD_ATTR:['encoding'],FORBID_TAGS:['a','img','script','iframe','object','embed','form','input','style'],FORBID_ATTR:['href','src','xlink:href','id'],ALLOW_DATA_ATTR:false});
      }catch{
        const code=document.createElement('code');code.className='math-error';code.textContent=formula.text;code.title='公式语法暂不支持，已保留原文';slot.append(code);
      }
    });
    return template.innerHTML;
  };
}
