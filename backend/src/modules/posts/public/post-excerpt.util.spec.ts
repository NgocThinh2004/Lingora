import { extractPostExcerpt } from './post-excerpt.util';

describe('extractPostExcerpt', () => {
  it('preserves paragraphs and explicit line breaks', () => {
    const html = [
      '<p>Em yêu anh là cầu đơn</p>',
      '<p>Anh không yêu em là còn đau</p>',
      '<div>Cầu đơn thì ngắn<br>Còn đau thì dài</div>',
    ].join('');

    expect(extractPostExcerpt(html)).toBe([
      'Em yêu anh là cầu đơn',
      'Anh không yêu em là còn đau',
      'Cầu đơn thì ngắn',
      'Còn đau thì dài',
    ].join('\n'));
  });

  it('excludes media captions from the public preview', () => {
    const html = [
      '<p>Nội dung chính của bài viết</p>',
      '<figure class="editor-media-wrapper">',
      '<video src="https://media.example.com/video.mp4"></video>',
      '<figcaption class="editor-media-caption">Tim em-HNGLE X Bảo Anh</figcaption>',
      '</figure>',
    ].join('');

    expect(extractPostExcerpt(html)).toBe('Nội dung chính của bài viết');
  });

  it('decodes entities and truncates the resulting text', () => {
    expect(extractPostExcerpt('<p>Một&nbsp;hai &amp; ba</p>', 10)).toBe('Một hai &...');
  });
});
