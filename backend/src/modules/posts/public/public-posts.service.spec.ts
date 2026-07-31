import { Op } from 'sequelize';
import { PublicPostsService } from './public-posts.service';

describe('PublicPostsService locale filtering', () => {
  it('keeps published posts available when the selected locale is not translated yet', async () => {
    const postModel = {
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    };
    const postTranslationModel = {
      findAll: jest.fn(),
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

    const postQuery = postModel.findAndCountAll.mock.calls[0][0];
    expect(postQuery.where.id).toBeUndefined();
    expect(postQuery.where.status).toEqual({ [Op.in]: ['approved', 'published'] });
    expect(postTranslationModel.findAll).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });
});
