import { sanitizePostContent } from './post-content-sanitizer';

describe('sanitizePostContent', () => {
  it('preserves the four supported inline editor formats', () => {
    const input = [
      '<s>struck</s>',
      '<span class="editor-inline-code-font">const value = 1;</span>',
      '<font color="#ff1212">red</font>',
      '<span style="background-color: rgb(255, 242, 0)">highlighted</span>',
    ].join('');

    const result = sanitizePostContent(input);

    expect(result).toContain('<s>struck</s>');
    expect(result).toContain('class="editor-inline-code-font"');
    expect(result).toContain('style="color:#ff1212"');
    expect(result).toContain('style="background-color:rgb(255, 242, 0)"');
  });

  it('normalizes legacy strike tags and removes unsafe presentation styles', () => {
    const result = sanitizePostContent(
      '<strike>legacy</strike><span style="color:expression(alert(1));position:fixed;background-image:url(javascript:alert(1))">unsafe</span>',
    );

    expect(result).toContain('<s>legacy</s>');
    expect(result).not.toContain('expression');
    expect(result).not.toContain('position');
    expect(result).not.toContain('background-image');
  });
});
