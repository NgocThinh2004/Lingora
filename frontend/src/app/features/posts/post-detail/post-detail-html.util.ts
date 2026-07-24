export function preparePostDetailHtml(html: string): string {
  if (!html || typeof document === 'undefined') {
    return html;
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  container
    .querySelectorAll(
      '.editor-code-toolbar, .editor-code-delete, .editor-code-language-menu, .editor-media-delete',
    )
    .forEach((element) => element.remove());

  container.querySelectorAll<HTMLElement>('.editor-code-body').forEach((codeBody) => {
    removeLegacyCodeControls(codeBody);
    codeBody.removeAttribute('contenteditable');
    codeBody.removeAttribute('spellcheck');

    if (codeBody.querySelector('.code-line')) {
      return;
    }

    const source = extractCodeSource(codeBody).replace(/\r\n?/g, '\n');
    const normalizedSource = source.endsWith('\n') ? source.slice(0, -1) : source;
    const lines = normalizedSource.split('\n');
    const codeElement = document.createElement('code');

    lines.forEach((line, index) => {
      const lineElement = document.createElement('span');
      const lineNumber = document.createElement('span');
      const lineContent = document.createElement('span');

      lineElement.className = 'code-line';
      lineNumber.className = 'line-number';
      lineNumber.setAttribute('aria-hidden', 'true');
      lineNumber.textContent = String(index + 1);
      lineContent.className = 'line-content';
      lineContent.textContent = line;

      lineElement.append(lineNumber, lineContent);
      codeElement.append(lineElement);
    });

    codeBody.replaceChildren(codeElement);
  });

  return container.innerHTML;
}

const LEGACY_CODE_CONTROL_TEXTS = new Set([
  'Auto-detect',
  'Auto-detectPlainTextJavaScriptTypeScriptJSXTSXPythonCSSHTMLJSONBash',
  'Auto-detectAuto-detectPlainTextJavaScriptTypeScriptJSXTSXPythonCSSHTMLJSONBash',
]);

function removeLegacyCodeControls(codeBody: HTMLElement): void {
  let sibling = codeBody.previousSibling;

  while (sibling) {
    const previousSibling = sibling.previousSibling;
    const normalizedText = normalizeLegacyControlText(sibling.textContent ?? '');

    if (!normalizedText) {
      sibling.remove();
      sibling = previousSibling;
      continue;
    }

    if (!LEGACY_CODE_CONTROL_TEXTS.has(normalizedText)) {
      break;
    }

    sibling.remove();
    sibling = previousSibling;
  }
}

function normalizeLegacyControlText(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[▼⌄⌫]/g, '');
}

function extractCodeSource(codeBody: HTMLElement): string {
  const codeElement = codeBody.querySelector(':scope > code');
  if (!codeElement) {
    return serializeCodeNodes(codeBody);
  }

  const contentOutsideCode = codeBody.cloneNode(true) as HTMLElement;
  contentOutsideCode.querySelectorAll(':scope > code').forEach((node) => node.remove());
  const outsideSource = serializeCodeNodes(contentOutsideCode);

  // Legacy drafts can contain the code directly in <pre> and an empty <code>
  // child. In that case the content in <pre> is the source that must be shown.
  if (outsideSource.trim().length > 0) {
    return serializeCodeNodes(codeBody);
  }

  return serializeCodeNodes(codeElement);
}

function serializeCodeNodes(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map(serializeCodeNodes).join('');
  }

  if (node.tagName === 'BR') {
    return '\n';
  }

  const content = Array.from(node.childNodes).map(serializeCodeNodes).join('');
  if (node.tagName === 'DIV' || node.tagName === 'P') {
    return content.endsWith('\n') ? content : `${content}\n`;
  }

  return content;
}
