import sanitizeHtml from 'sanitize-html';

const SAFE_EDITOR_COLOR = /^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;

const COLOR_STYLE_TAGS = ['span'];

export function sanitizePostContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img',
      'audio',
      'video',
      'source',
      'track',
      'figure',
      'figcaption',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'div',
      'span',
      's',
      'strike',
    ],
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'data'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      audio: ['http', 'https'],
      video: ['http', 'https'],
    },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      audio: ['src', 'controls', 'preload', 'title'],
      video: ['src', 'controls', 'playsinline', 'preload', 'poster', 'title', 'width', 'height'],
      source: ['src', 'type'],
      track: ['default', 'kind', 'label', 'src', 'srclang'],
      div: ['class', 'data-align', 'data-media-asset-id', 'data-media-object-key'],
      figcaption: ['class'],
      span: ['class', 'style'],
      code: ['class'],
      pre: ['class'],
    },
    allowedClasses: {
      div: [
        'editor-code-block',
        'editor-code-toolbar',
        'editor-code-language-menu',
        'editor-media-wrapper',
        'editor-media-container',
        'align-left',
        'align-center',
        'align-right',
      ],
      figcaption: ['editor-media-caption'],
      pre: ['editor-code-body'],
      span: ['editor-inline-code-font', 'code-line', 'line-number', 'line-content'],
    },
    allowedStyles: Object.fromEntries(
      COLOR_STYLE_TAGS.map((tag) => [
        tag,
        {
          color: [SAFE_EDITOR_COLOR],
          'background-color': [SAFE_EDITOR_COLOR],
        },
      ]),
    ),
    exclusiveFilter: (frame) => {
      const classes = frame.attribs.class?.split(/\s+/) ?? [];
      return classes.some((className) =>
        [
          'editor-code-toolbar',
          'editor-code-delete',
          'editor-code-language-menu',
          'editor-media-delete',
        ].includes(className),
      );
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
      strike: sanitizeHtml.simpleTransform('s', {}, true),
      font: (_tagName, attributes) => {
        const color = attributes.color?.trim() ?? '';
        const attribs: Record<string, string> = {};
        if (SAFE_EDITOR_COLOR.test(color)) {
          attribs['style'] = `color: ${color}`;
        }
        return {
          tagName: 'span',
          attribs,
        };
      },
    },
  });
}
