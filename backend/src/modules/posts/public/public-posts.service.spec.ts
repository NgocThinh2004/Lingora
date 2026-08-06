import { Op } from 'sequelize';
import { PublicPostsService } from './public-posts.service';

describe('PublicPostsService locale filtering', () => {
  it('excludes posts that have no completed translation in the selected active language', async () => {
    const postModel = {
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    };
    const postTranslationModel = {
      findAll: jest.fn().mockResolvedValue([]),
    };
    const languageModel = {
      findAll: jest.fn().mockResolvedValue([
        { id: 1, code: 'en', is_active: true },
        { id: 4, code: 'ja', is_active: true },
      ]),
    };
    const categoryModel = {
      findAll: jest.fn().mockResolvedValue([{ id: 1 }]),
    };
    const service = new PublicPostsService(
      postModel as never,
      postTranslationModel as never,
      {} as never,
      categoryModel as never,
      {} as never,
      languageModel as never,
      {} as never,
      { get: jest.fn(), set: jest.fn() } as never,
    );

    const result = await service.listFeed({ lang: 'ja', page: 1, limit: 10 });

    const postQuery = postModel.findAndCountAll.mock.calls[0][0];
    expect(postQuery.where.id).toEqual({ [Op.in]: [0] });
    expect(postQuery.where.status).toEqual({ [Op.in]: ['approved', 'published'] });
    expect(postQuery.where.category_id).toEqual({ [Op.in]: [1] });
    expect(postTranslationModel.findAll).toHaveBeenCalledWith({
      where: {
        language_id: { [Op.in]: [4] },
        translation_status: 'completed',
      },
      attributes: ['post_id'],
    });
    expect(result.items).toEqual([]);
  });

  it('does not return posts for an inactive category to an outside viewer', async () => {
    const postModel = { findAndCountAll: jest.fn() };
    const categoryModel = {
      findOne: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
    };
    const service = new PublicPostsService(
      postModel as never,
      { findAll: jest.fn() } as never,
      {} as never,
      categoryModel as never,
      {} as never,
      { findAll: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      { get: jest.fn(), set: jest.fn() } as never,
    );

    const result = await service.listFeed({ category: 'hidden-category', page: 1, limit: 10 });

    expect(categoryModel.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'active' }),
    }));
    expect(postModel.findAndCountAll).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });

  it('allows an author to see hidden-category posts on their own profile', async () => {
    const postModel = {
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    };
    const categoryModel = { findAll: jest.fn() };
    const service = new PublicPostsService(
      postModel as never,
      { findAll: jest.fn() } as never,
      {} as never,
      categoryModel as never,
      {} as never,
      { findAll: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      { get: jest.fn(), set: jest.fn() } as never,
    );

    await service.listFeed({ authorId: 7, page: 1, limit: 10 }, undefined, 7);

    expect(categoryModel.findAll).not.toHaveBeenCalled();
    expect(postModel.findAndCountAll.mock.calls[0][0].where).toEqual(expect.objectContaining({
      author_id: 7,
    }));
    expect(postModel.findAndCountAll.mock.calls[0][0].where.category_id).toBeUndefined();
  });
});
