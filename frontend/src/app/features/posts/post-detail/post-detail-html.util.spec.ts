import { preparePostDetailHtml } from './post-detail-html.util';

describe('preparePostDetailHtml', () => {
  it('removes editor controls from a code block', () => {
    const html = `
      <div class="editor-code-block">
        <div class="editor-code-toolbar">Auto-detect</div>
        <pre class="editor-code-body"><code>const value = 1;</code></pre>
      </div>
    `;

    const result = preparePostDetailHtml(html);

    expect(result).not.toContain('editor-code-toolbar');
    expect(result).not.toContain('Auto-detect');
  });

  it('creates line numbers for stored code', () => {
    const result = preparePostDetailHtml(
      '<pre class="editor-code-body"><code>first line\nsecond line</code></pre>',
    );
    const container = document.createElement('div');
    container.innerHTML = result;

    const lineNumbers = Array.from(container.querySelectorAll('.line-number')).map(
      (element) => element.textContent,
    );
    const lineContents = Array.from(container.querySelectorAll('.line-content')).map(
      (element) => element.textContent,
    );

    expect(lineNumbers).toEqual(['1', '2']);
    expect(lineContents).toEqual(['first line', 'second line']);
  });

  it('removes flattened editor controls from previously stored posts', () => {
    const html = `
      <p>Paragraph before the code block</p>
      <div>Auto-detect</div>
      <div>Auto-detectPlain TextJavaScriptTypeScriptJSXTSXPythonCSSHTMLJSONBash</div>
      <pre class="editor-code-body"><code>#printf</code></pre>
    `;

    const result = preparePostDetailHtml(html);

    expect(result).toContain('Paragraph before the code block');
    expect(result).not.toContain('Auto-detect');
    expect(result).not.toContain('Plain Text');
    expect(result).toContain('#printf');
  });

  it('preserves editor div and br line breaks before numbering', () => {
    const result = preparePostDetailHtml(
      '<pre class="editor-code-body"><code><div>#</div><div>#</div><div>#</div><div>#</div><div>123<br>next</div></code></pre>',
    );
    const container = document.createElement('div');
    container.innerHTML = result;

    const lineNumbers = Array.from(container.querySelectorAll('.line-number')).map(
      (element) => element.textContent,
    );
    const lineContents = Array.from(container.querySelectorAll('.line-content')).map(
      (element) => element.textContent,
    );

    expect(lineNumbers).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(lineContents).toEqual(['#', '#', '#', '#', '123', 'next']);
  });

  it('preserves legacy code stored outside an empty code child', () => {
    const result = preparePostDetailHtml(
      '<div class="editor-code-block"><pre class="editor-code-body">1<br>1<br>2<br>3<code></code></pre></div>',
    );
    const container = document.createElement('div');
    container.innerHTML = result;

    const lineNumbers = Array.from(container.querySelectorAll('.line-number')).map(
      (element) => element.textContent,
    );
    const lineContents = Array.from(container.querySelectorAll('.line-content')).map(
      (element) => element.textContent,
    );

    expect(lineNumbers).toEqual(['1', '2', '3', '4']);
    expect(lineContents).toEqual(['1', '1', '2', '3']);
  });
});
