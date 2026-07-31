import { getPostTranslation, Post } from './post.model';

describe('getPostTranslation', () => {
  const post = {
    originalLanguage: 'vi',
    translations: [
      {
        id: 1,
        languageCode: 'vi',
        title: 'Tiêu đề nguồn',
        contentHtml: '<p>Nội dung nguồn</p>',
        source: 'original',
      },
      {
        id: 2,
        languageCode: 'en',
        title: '',
        contentHtml: '',
        source: 'machine',
      },
    ],
  } as Post;

  it('falls back to the original language when the requested translation is empty', () => {
    expect(getPostTranslation(post, 'en')?.languageCode).toBe('vi');
    expect(getPostTranslation(post, 'en')?.title).toBe('Tiêu đề nguồn');
  });

  it('uses the requested language when translated content is available', () => {
    const translatedPost = {
      ...post,
      translations: post.translations.map(translation =>
        translation.languageCode === 'en'
          ? { ...translation, title: 'Translated title', contentHtml: '<p>Translated body</p>' }
          : translation,
      ),
    };

    expect(getPostTranslation(translatedPost, 'en')?.languageCode).toBe('en');
  });
});
