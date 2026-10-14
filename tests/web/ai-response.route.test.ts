import { createAiResponseHandler } from '../../src/web/routes/ai-response.route';

function response() {
  const state = { status: 0, type: '', body: '', headers: {} as Record<string, string> };
  const res: Record<string, jest.Mock> = {
    set: jest.fn((headers) => { state.headers = headers; return res; }),
    status: jest.fn((status) => { state.status = status; return res; }),
    type: jest.fn((type) => { state.type = type; return res; }),
    send: jest.fn((body) => { state.body = body; return res; })
  };
  return { res, state };
}

describe('AI response route', () => {
  test('renders Markdown, sanitizes unsafe HTML and applies private security headers', async () => {
    const service = { find: jest.fn().mockResolvedValue({ detailedAnswer: '# Heading\n\n**Bold** and [unsafe](javascript:alert(1))\n\n```typescript\nconst answer: string = "safe";\n```\n\n<script>alert(1)</script>' }) };
    const { res, state } = response();
    await createAiResponseHandler(service as never)({ params: { token: 'x' } } as never, res as never, jest.fn());
    expect(state.status).toBe(200);
    expect(state.body).not.toContain('<script>');
    expect(state.body).toContain('<h1>Heading</h1>');
    expect(state.body).toContain('<strong>Bold</strong>');
    expect(state.body).toContain('<pre><code class="language-typescript">');
    expect(state.body).toContain('const answer: string = "safe";');
    expect(state.body).not.toContain('href="javascript:');
    expect(state.body).toContain('color-scheme:dark');
    expect(state.body).toContain('Complete answer');
    expect(state.body).toContain('class="shell"');
    expect(state.body).toContain('class="markdown-body"');
    expect(state.headers['Cache-Control']).toBe('no-store');
    expect(state.headers['Content-Security-Policy']).toContain("default-src 'none'");
  });

  test('uses the same generic response for unavailable links', async () => {
    const { res, state } = response();
    await createAiResponseHandler({ find: jest.fn().mockResolvedValue(null) } as never)({ params: { token: 'bad' } } as never, res as never, jest.fn());
    expect(state).toMatchObject({ status: 404, body: 'Answer not found.' });
  });
});
