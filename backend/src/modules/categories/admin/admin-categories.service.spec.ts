import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import { AdminCategoriesService } from './admin-categories.service';

describe('AdminCategoriesService', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let sequelize: any;
  let categoryModel: any;
  let translationModel: any;
  let languageModel: any;
  let postModel: any;
  let postTranslationModel: any;
  let userModel: any;
  let categoriesCache: any;
  let categoryAutoTranslation: any;
  let service: AdminCategoriesService;

  beforeEach(() => {
    sequelize = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    };
    categoryModel = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    translationModel = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      bulkCreate: jest.fn(),
      create: jest.fn(),
    };
    languageModel = {
      findAll: jest.fn(),
      findOne: jest.fn(),
    };
    postModel = { findAll: jest.fn(), count: jest.fn(), update: jest.fn() };
    postTranslationModel = { findAll: jest.fn() };
    userModel = { findAll: jest.fn() };
    categoriesCache = { invalidate: jest.fn().mockResolvedValue(undefined) };
    categoryAutoTranslation = { translateFromSource: jest.fn() };
    service = new AdminCategoriesService(
      sequelize,
      categoryModel,
      translationModel,
      languageModel,
      postModel,
      postTranslationModel,
      userModel,
      categoriesCache,
      categoryAutoTranslation,
    );
  });

  it('filters categories by status and post count before paginating', async () => {
    categoryModel.findAll.mockResolvedValue([
      { id: 1, slug: 'backend', status: 'active', created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01') },
      { id: 2, slug: 'design', status: 'inactive', created_at: new Date('2026-02-01'), updated_at: new Date('2026-02-01') },
    ]);
    translationModel.findAll.mockResolvedValue([
      { id: '11', category_id: 1, language_id: 1, name: 'Backend', slug: 'backend' },
      { id: '12', category_id: 2, language_id: 1, name: 'Design', slug: 'design' },
    ]);
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'en', name: 'English', native_name: 'English', flag_code: 'gb' },
    ]);
    postModel.findAll.mockResolvedValue([{ category_id: 1, count: '3' }]);

    const result = await service.findAll({
      search: '', status: 'active', postFilter: 'with-posts', sort: 'newest', page: 1, limit: 8,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ slug: 'backend', postCount: 3, isActive: true });
    expect(result.meta.pagination.total).toBe(1);
  });

  it('creates the category and every active-language translation in one transaction', async () => {
    const languages = [
      { id: 1, code: 'en', is_default: true },
      { id: 2, code: 'vi', is_default: false },
    ];
    languageModel.findAll.mockResolvedValue(languages);
    categoryAutoTranslation.translateFromSource.mockResolvedValue([
      { languageId: 1, name: 'Technology', slug: 'technology' },
      { languageId: 2, name: 'Công nghệ', slug: 'cong-nghe' },
    ]);
    categoryModel.findOne.mockResolvedValue(null);
    categoryModel.create.mockResolvedValue({ id: 7 });
    categoryModel.findAll.mockResolvedValue([
      { id: 7, slug: 'technology', status: 'active', created_at: new Date(), updated_at: new Date() },
    ]);
    translationModel.findAll.mockResolvedValue([
      { id: '71', category_id: 7, language_id: 1, name: 'Technology', slug: 'technology' },
      { id: '72', category_id: 7, language_id: 2, name: 'Công nghệ', slug: 'cong-nghe' },
    ]);
    postModel.findAll.mockResolvedValue([]);

    const result = await service.create({
      isActive: true,
      translations: [{ languageId: 1, name: 'Technology' }],
    });

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(translationModel.bulkCreate).toHaveBeenCalledWith([
      { category_id: 7, language_id: 1, name: 'Technology', slug: 'technology' },
      { category_id: 7, language_id: 2, name: 'Công nghệ', slug: 'cong-nghe' },
    ], { transaction, individualHooks: true });
    expect(result.id).toBe(7);
    expect(categoriesCache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('requires at least one active system language on create', async () => {
    languageModel.findAll.mockResolvedValue([]);

    await expect(service.create({
      isActive: true,
      translations: [{ languageId: 1, name: 'Technology' }],
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(categoryModel.create).not.toHaveBeenCalled();
  });

  it('moves posts to the system category before deleting a category', async () => {
    const destroy = jest.fn();
    categoryModel.findByPk.mockResolvedValue({ destroy, is_system: false });
    categoryModel.findOne.mockResolvedValue({ id: 1, is_system: true });

    await service.remove(4);

    expect(destroy).toHaveBeenCalledWith({ transaction });
    expect(postModel.update).toHaveBeenCalledWith(
      { category_id: 1 },
      { where: { category_id: 4 }, transaction },
    );
    expect(categoriesCache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('returns the latest posts in a category using the requested language', async () => {
    const publishedAt = new Date('2026-07-22T08:00:00.000Z');
    categoryModel.findByPk.mockResolvedValue({ id: 7 });
    postModel.findAll.mockResolvedValue([{ id: '21', author_id: '3', status: 'published', published_at: publishedAt, updated_at: publishedAt }]);
    postModel.count.mockResolvedValue(1);
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'en', is_default: true },
      { id: 2, code: 'vi', is_default: false },
    ]);
    postTranslationModel.findAll.mockResolvedValue([
      { post_id: '21', language_id: 2, title: 'Công nghệ', slug: 'cong-nghe' },
    ]);
    userModel.findAll.mockResolvedValue([{ id: '3', display_name: 'An', username: 'an' }]);

    const result = await service.findPosts(7, 'vi');

    expect(result.data[0]).toMatchObject({ title: 'Công nghệ', authorName: 'An' });
    expect(result.meta).toEqual({ total: 1, shown: 1 });
    expect(postTranslationModel.findAll).toHaveBeenCalledWith({
      where: {
        language_id: 2,
        title: { [Op.ne]: null },
      },
    });
  });

  it('omits posts that do not have a title in the requested language', async () => {
    categoryModel.findByPk.mockResolvedValue({ id: 7 });
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'vi', is_default: false },
      { id: 2, code: 'en', is_default: true },
    ]);
    postTranslationModel.findAll.mockResolvedValue([]);

    const result = await service.findPosts(7, 'en');

    expect(result).toEqual({ data: [], meta: { total: 0, shown: 0 } });
    expect(postModel.findAll).not.toHaveBeenCalled();
    expect(postModel.count).not.toHaveBeenCalled();
  });

  it('returns not found when deleting an unknown category', async () => {
    categoryModel.findByPk.mockResolvedValue(null);
    await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not delete the system uncategorized category', async () => {
    categoryModel.findByPk.mockResolvedValue({ id: 1, is_system: true });

    await expect(service.remove(1)).rejects.toBeInstanceOf(BadRequestException);
    expect(postModel.update).not.toHaveBeenCalled();
  });

  it('does not hide the system uncategorized category', async () => {
    categoryModel.findByPk.mockResolvedValue({ id: 1, is_system: true });

    await expect(service.update(1, { isActive: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(categoriesCache.invalidate).not.toHaveBeenCalled();
  });

  it('does not call automatic translation when the submitted source is unchanged', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const category = {
      id: 7,
      slug: 'technology',
      status: 'active',
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
      update,
    };
    const sourceTranslation = {
      id: '71',
      category_id: 7,
      language_id: 1,
      name: 'Technology',
      slug: 'technology',
    };
    translationModel.findOne.mockResolvedValue(sourceTranslation);
    categoryModel.findByPk.mockResolvedValue(category);
    categoryModel.findAll.mockResolvedValue([category]);
    translationModel.findAll.mockResolvedValue([sourceTranslation]);
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'en', name: 'English', native_name: 'English', flag_code: 'gb' },
    ]);
    postModel.findAll.mockResolvedValue([]);

    await service.update(7, {
      isActive: true,
      translations: [{ languageId: 1, name: 'Technology', slug: 'technology' }],
    });

    expect(categoryAutoTranslation.translateFromSource).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();
    expect(categoriesCache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('updates only the source slug without translating category names again', async () => {
    const updateCategory = jest.fn().mockResolvedValue(undefined);
    const updateTranslation = jest.fn().mockResolvedValue(undefined);
    const category = {
      id: 7,
      slug: 'technology',
      status: 'active',
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
      update: updateCategory,
    };
    const sourceTranslation = {
      id: '71',
      category_id: 7,
      language_id: 1,
      name: 'Technology',
      slug: 'technology',
      update: updateTranslation,
    };
    translationModel.findOne.mockResolvedValue(sourceTranslation);
    categoryModel.findByPk.mockResolvedValue(category);
    categoryModel.findAll.mockResolvedValue([category]);
    translationModel.findAll.mockResolvedValue([sourceTranslation]);
    languageModel.findOne.mockResolvedValue({ id: 1, is_default: true, is_active: true });
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'en', name: 'English', native_name: 'English', flag_code: 'gb' },
    ]);
    postModel.findAll.mockResolvedValue([]);

    await service.update(7, {
      translations: [{ languageId: 1, name: 'Technology', slug: 'tech' }],
    });

    expect(categoryAutoTranslation.translateFromSource).not.toHaveBeenCalled();
    expect(updateTranslation).toHaveBeenCalledWith(
      { name: 'Technology', slug: 'tech' },
      { transaction },
    );
    expect(updateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'tech' }),
      { transaction },
    );
  });
});
