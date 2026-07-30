import { Op } from 'sequelize';
import { PublicPostsService } from './public-posts.service';

describe('PublicPostsService locale filtering', () => {
  it('excludes published posts that do not have a completed translation in the selected locale', async () => {
    const postModel = {
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    };
    const postTranslationModel = {
      findAll: jest.fn().mockResolvedValue([
        { post_id: '2', title: '日本語の記事', content: '<p>本文</p>' },
      ]),
    };
    const languageModel = {
      findAll: jest.fn().mockResolvedValue([
        { id: 1, code: 'en', is_active: true },
        { id: 4, code: 'ja', is_active: true },
      ]),
    };
    const service = new PublicPostsService(
      postModel as never,
      postTranslationModel as never,
      {} as never,
      {} as never,
      {} as never,
      languageModel as never,
      {} as never,
      { get: jest.fn(), set: jest.fn() } as never,
    );

    const result = await service.listFeed({ lang: 'ja', page: 1, limit: 10 });

    expect(postModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { [Op.in]: [2] },
      }),
    }));
    expect(result.items).toEqual([]);
  });
});
