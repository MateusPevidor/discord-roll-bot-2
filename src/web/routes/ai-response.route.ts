import { RequestHandler, Response } from 'express';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { AiResponseService } from '../../services/ai-responses';

const markdownTags = [
  'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul'
];

function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, { async: false, gfm: true });
  if (typeof html !== 'string') throw new Error('Unexpected asynchronous Markdown rendering');
  return sanitizeHtml(html, {
    allowedTags: markdownTags,
    allowedAttributes: {
      a: ['href', 'title'],
      code: ['class'],
      pre: ['class'],
      th: ['align'],
      td: ['align']
    },
    allowedClasses: { code: ['language-*'], pre: ['language-*'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard'
  });
}

const securityHeaders = (res: Response) => {
  res.set({
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Robots-Tag': 'noindex, nofollow, noarchive'
  });
};

export function createAiResponseHandler(service = new AiResponseService()): RequestHandler {
  return async (req, res) => {
    securityHeaders(res);
    try {
      const answer = await service.find(req.params.token || '');
      if (!answer) return res.status(404).type('text/plain').send('Answer not found.');
      const content = renderMarkdown(answer.detailedAnswer);
      return res.status(200).type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#0b1020">
  <title>Complete AI answer</title>
  <style>
    :root{color-scheme:dark;--bg:#0b1020;--surface:#121a2b;--surface-raised:#182338;--border:#26344d;--text:#edf2ff;--muted:#9aa9c1;--accent:#8ab4ff}
    *{box-sizing:border-box}
    body{min-height:100vh;margin:0;padding:clamp(1.25rem,5vw,4rem) 1rem;background:radial-gradient(ellipse at 50% -15%,#20345b 0,transparent 55%),var(--bg);color:var(--text);font:16px/1.7 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
    .shell{width:min(100%,820px);margin:0 auto}
    header{display:flex;align-items:center;gap:.85rem;margin:0 0 1.5rem;color:var(--muted);font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
    .mark{display:grid;width:2.4rem;height:2.4rem;place-items:center;border:1px solid #38517b;border-radius:.8rem;background:linear-gradient(145deg,#253c64,#17243b);color:var(--accent);font-size:1rem;letter-spacing:0}
    article{overflow:hidden;border:1px solid var(--border);border-radius:1.25rem;background:linear-gradient(180deg,rgba(24,35,56,.98),rgba(18,26,43,.98));box-shadow:0 24px 80px rgba(0,0,0,.38)}
    .heading{padding:clamp(1.5rem,5vw,2.5rem) clamp(1.25rem,5vw,2.5rem) 1.25rem}
    h1{margin:0;color:var(--text);font-size:clamp(1.65rem,4vw,2.25rem);line-height:1.2;letter-spacing:-.035em}
    .subtitle{margin:.7rem 0 0;color:var(--muted);font-size:.95rem}
    main{padding:1.5rem clamp(1.25rem,5vw,2.5rem) 2.25rem;border-top:1px solid var(--border);overflow-wrap:anywhere;color:#e1e9f8;font-size:1.02rem}
    .markdown-body>*:first-child{margin-top:0}
    .markdown-body>*:last-child{margin-bottom:0}
    .markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4{margin:1.8em 0 .65em;color:var(--text);line-height:1.3;letter-spacing:-.02em}
    .markdown-body h1{font-size:1.75rem}.markdown-body h2{font-size:1.4rem}.markdown-body h3{font-size:1.15rem}
    .markdown-body p,.markdown-body ul,.markdown-body ol{margin:0 0 1.1em}
    .markdown-body ul,.markdown-body ol{padding-left:1.5rem}
    .markdown-body li+li{margin-top:.35em}
    .markdown-body a{color:var(--accent);text-decoration:underline;text-underline-offset:3px}
    .markdown-body blockquote{margin:1.25rem 0;padding:.1rem 1rem;border-left:3px solid #5a7fb8;color:#b9c7dc;background:rgba(138,180,255,.045)}
    .markdown-body hr{height:1px;margin:1.75rem 0;border:0;background:var(--border)}
    .markdown-body :not(pre)>code{padding:.15em .4em;border:1px solid #33425b;border-radius:.4rem;background:#0d1524;color:#d8e6ff;font: .88em/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}
    .markdown-body pre{max-width:100%;margin:1.25rem 0;overflow:auto;border:1px solid #2b3951;border-radius:.75rem;background:#080d17;box-shadow:inset 0 1px rgba(255,255,255,.025)}
    .markdown-body pre code{display:block;padding:1rem 1.15rem;color:#d7e2f2;font: .88rem/1.65 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;tab-size:2}
    .markdown-body table{display:block;width:100%;overflow:auto;border-collapse:collapse;margin:1.25rem 0;font-size:.92rem}
    .markdown-body th,.markdown-body td{padding:.65rem .8rem;border:1px solid var(--border);text-align:left}
    .markdown-body th{background:var(--surface-raised);color:var(--text)}
    .markdown-body tr:nth-child(even) td{background:rgba(255,255,255,.018)}
    footer{margin-top:1.25rem;padding:1rem 1.15rem;border:1px solid rgba(138,180,255,.16);border-radius:.85rem;background:rgba(138,180,255,.055);color:var(--muted);font-size:.82rem;line-height:1.55}
    footer strong{display:block;margin-bottom:.25rem;color:#c6d8f7;font-size:.8rem}
    @media(max-width:520px){body{padding-top:1.5rem}.heading{padding-bottom:1rem}main{font-size:.98rem}}
  </style>
</head>
<body>
  <div class="shell">
    <header><span class="mark" aria-hidden="true">AI</span><span>Generated response</span></header>
    <article>
      <div class="heading"><h1>Complete answer</h1><p class="subtitle">The detailed response to your question.</p></div>
      <main class="markdown-body">${content}</main>
    </article>
    <footer><strong>About this link</strong>This answer may reflect channel content. Anyone with this bearer link can read it until it expires. Server membership changes do not revoke the link.</footer>
  </div>
</body>
</html>`);
    } catch {
      return res.status(500).type('text/plain').send('Something went wrong.');
    }
  };
}

export const AiResponse = createAiResponseHandler();
