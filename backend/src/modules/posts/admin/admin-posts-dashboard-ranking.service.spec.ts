import { AdminPostsService } from './admin-posts.service';

describe('AdminPostsService dashboard ranking', () => {
  it('excludes mock translations and backfills with the next eligible article', async () => {
    const postModel = {
      findAll: jest.fn().mockResolvedValue([
        { id: '1', category_id: null, status: 'published', view_count: 900 },
        { id: '2', category_id: null, status: 'published', view_count: 700 },
        { id: '3', category_id: null, status: 'published', view_count: 500 },
      ]),
    };
    const translationModel = {
      findAll: jest.fn().mockResolvedValue([
        {
          post_id: '1', language_id: 4, title: '[es] Mock article', content: 'Mock content',
          translation_status: 'completed', translation_provider: 'mock',
        },
        {
          post_id: '2', language_id: 4, title: 'Real Spanish article', content: 'Translated content',
          translation_status: 'completed', translation_provider: 'deepl',
        },
        {
          post_id: '3', language_id: 4, title: 'Human Spanish article', content: 'Human content',
          translation_status: 'completed', translation_provider: null,
        },
      ]),
    };
    const emptyModel = { findAll: jest.fn().mockResolvedValue([]) };
    const languageModel = {
      findAll: jest.fn().mockResolvedValue([
        { id: 1, code: 'vi', is_default: true, is_active: true },
        { id: 4, code: 'es', is_default: false, is_active: true },
      ]),
    };
    const service = new AdminPostsService(
      {} as never,
      postModel as never,
      translationModel as never,
      emptyModel as never,
      emptyModel as never,
      emptyModel as never,
      languageModel as never,
    );

    const result = await service.getDashboardMetrics('es');

    expect(result.topArticles).toEqual([
      { id: '2', title: 'Real Spanish article', viewCount: 700 },
      { id: '3', title: 'Human Spanish article', viewCount: 500 },
    ]);
  });
});
