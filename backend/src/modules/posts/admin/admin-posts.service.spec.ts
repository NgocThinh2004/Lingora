import { BadRequestException } from '@nestjs/common';
import { AdminPostsService } from './admin-posts.service';

describe('AdminPostsService', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let sequelize: any;
  let postModel: any;
  let translationModel: any;
  let userModel: any;
  let categoryModel: any;
  let categoryTranslationModel: any;
  let languageModel: any;
  let service: AdminPostsService;

  beforeEach(() => {
    sequelize = { transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)) };
    postModel = { findAll: jest.fn(), findOne: jest.fn() };
    translationModel = { findAll: jest.fn(), update: jest.fn() };
    userModel = { findAll: jest.fn() };
    categoryModel = { findAll: jest.fn() };
    categoryTranslationModel = { findAll: jest.fn() };
    languageModel = { findAll: jest.fn() };
    service = new AdminPostsService(
      sequelize,
      postModel,
      translationModel,
      userModel,
      categoryModel,
      categoryTranslationModel,
      languageModel,
    );
  });

  it('always returns the original-language content while localizing category metadata', async () => {
    const submittedAt = new Date('2026-07-22T08:00:00.000Z');
    postModel.findAll.mockResolvedValue([{
      id: '12', author_id: '3', category_id: 4, original_language_id: 1,
      status: 'pending_review', review_note: null, created_at: submittedAt,
    }]);
    translationModel.findAll.mockResolvedValue([
      { id: '121', post_id: '12', language_id: 1, title: 'Original English title', content: '<p>English body</p>', translation_status: 'completed' },
      { id: '122', post_id: '12', language_id: 2, title: 'Tiêu đề tiếng Việt', content: '<p>Nội dung</p>', translation_status: 'completed' },
    ]);
    userModel.findAll.mockResolvedValue([{ id: '3', display_name: 'An', username: 'an', avatar: null }]);
    categoryModel.findAll.mockResolvedValue([{ id: 4, slug: 'technology' }]);
    categoryTranslationModel.findAll.mockResolvedValue([
      { category_id: 4, language_id: 1, name: 'Technology' },
      { category_id: 4, language_id: 2, name: 'Công nghệ' },
    ]);
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'en', name: 'English', native_name: 'English', flag_code: 'gb', is_default: true },
      { id: 2, code: 'vi', name: 'Vietnamese', native_name: 'Tiếng Việt', flag_code: 'vn', is_default: false },
    ]);

    const result = await service.findOne('12', 'vi');

    expect(result).toMatchObject({
      title: 'Original English title',
      content: '<p>English body</p>',
      category: { id: 4, name: 'Công nghệ' },
      originalLanguage: { code: 'en' },
    });
  });

  it('publishes an approved post and queues every unfinished target translation', async () => {
    const update = jest.fn();
    postModel.findOne.mockResolvedValue({
      id: '12',
      original_language_id: 1,
      published_at: null,
      update,
    });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: '12' } as any);

    await service.review('12', { decision: 'approve' }, 'en');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'published',
      review_note: null,
      published_at: expect.any(Date),
    }), { transaction });
    expect(translationModel.update).toHaveBeenCalledWith(
      expect.objectContaining({ translation_status: 'queued' }),
      expect.objectContaining({ transaction }),
    );
  });

  it('requires a note before rejecting a post', async () => {
    await expect(service.review('12', { decision: 'reject', note: '   ' }, 'en'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('rejects a post and resets its target translations', async () => {
    const update = jest.fn();
    postModel.findOne.mockResolvedValue({ id: '12', original_language_id: 1, update });
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: '12' } as any);

    await service.review('12', { decision: 'reject', note: 'Needs stronger sources' }, 'en');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected', review_note: 'Needs stronger sources' }), { transaction });
    expect(translationModel.update).toHaveBeenCalledWith(
      expect.objectContaining({ translation_status: 'not_started' }),
      expect.objectContaining({ transaction }),
    );
  });

  it('ranks only public posts with a completed translation in the selected language', async () => {
    postModel.findAll.mockResolvedValue([
      { id: '1', category_id: null, status: 'published', view_count: 900 },
      { id: '2', category_id: null, status: 'published', view_count: 700 },
      { id: '3', category_id: null, status: 'published', view_count: 500 },
    ]);
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'en', is_default: true, is_active: true },
      { id: 2, code: 'vi', is_default: false, is_active: true },
    ]);
    translationModel.findAll.mockResolvedValue([
      { post_id: '1', language_id: 1, title: 'Highest English', content: 'Body', translation_status: 'completed' },
      { post_id: '2', language_id: 2, title: 'BÃ i tiáº¿ng Viá»‡t', content: 'Ná»™i dung', translation_status: 'completed' },
      { post_id: '3', language_id: 2, title: 'ChÆ°a xong', content: 'Ná»™i dung', translation_status: 'processing' },
    ]);
    categoryModel.findAll.mockResolvedValue([]);
    categoryTranslationModel.findAll.mockResolvedValue([]);

    const result = await service.getDashboardMetrics('vi');

    expect(result.topArticles).toEqual([
      { id: '2', title: 'BÃ i tiáº¿ng Viá»‡t', viewCount: 700 },
    ]);
  });
});
