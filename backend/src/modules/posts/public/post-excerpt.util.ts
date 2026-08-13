import { parseDocument } from 'htmlparser2';
import { type AnyNode, isTag, isText } from 'domhandler';

const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'li',
  'main',
  'p',
  'pre',
  'section',
]);

const EXCLUDED_TAGS = new Set([
  'figcaption',
  'noscript',
  'script',
  'style',
  'template',
]);

/**
 * Creates the plain-text preview used by public post cards.
 * Paragraph boundaries are preserved, while media captions and non-content
 * elements are excluded from the preview.
 */
export function extractPostExcerpt(html: string, maxLength = 200): string {
  if (!html?.trim() || maxLength <= 0) return '';

  const document = parseDocument(html, { decodeEntities: true });

  const readNode = (node: AnyNode): string => {
    if (isText(node)) {
      return node.data.replace(/\u00a0/g, ' ');
    }

    if (isTag(node)) {
      const tagName = node.name.toLowerCase();
      const classes = (node.attribs?.['class'] ?? '').split(/\s+/);
      if (EXCLUDED_TAGS.has(tagName) || classes.includes('editor-media-caption')) {
        return '';
      }
      if (tagName === 'br') return '\n';

      const content = node.children.map(readNode).join('');
      return BLOCK_TAGS.has(tagName) ? `\n${content}\n` : content;
    }

    if ('children' in node) {
      return node.children.map(readNode).join('');
    }

    return '';
  };

  const normalized = document.children
    .map(readNode)
    .join('')
    .replace(/\r/g, '')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();

  const characters = Array.from(normalized);
  if (characters.length <= maxLength) return normalized;
  return `${characters.slice(0, maxLength).join('').trimEnd()}...`;
}
