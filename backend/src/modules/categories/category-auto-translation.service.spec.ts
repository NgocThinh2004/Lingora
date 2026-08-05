import { CategoryAutoTranslationService } from './category-auto-translation.service';

describe('CategoryAutoTranslationService', () => {
  const categoryModel = { findAll: jest.fn() };
  const translationModel = { findAll: jest.fn(), bulkCreate: jest.fn() };
  const languageModel = { findAll: jest.fn() };
  const provider = { translateWithFallback: jest.fn() };
  let service: CategoryAutoTranslationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoryAutoTranslationService(
      categoryModel as never,
      translationModel as never,
      languageModel as never,
      provider as never,
    );
  });

  it('keeps the selected language and automatically translates every other active language', async () => {
    provider.translateWithFallback.mockResolvedValue({
      ok: true,
      texts: ['Công nghệ'],
      provider: 'mock',
    });

    const result = await service.translateFromSource(
      { languageId: 1, name: 'Technology' },
      [
        { id: 1, code: 'en' },
        { id: 2, code: 'vi' },
      ] as never,
    );

    expect(result).toEqual([
      { languageId: 1, name: 'Technology', slug: 'technology' },
      { languageId: 2, name: 'Công nghệ', slug: 'cong-nghe' },
    ]);
    expect(provider.translateWithFallback).toHaveBeenCalledWith({
      texts: ['Technology'],
      sourceLanguageCode: 'en',
      targetLanguageCode: 'vi',
      format: 'text',
    });
  });

  it('creates translations for all existing categories when a language is activated', async () => {
    const transaction = {} as never;
    categoryModel.findAll.mockResolvedValue([{ id: 7, slug: 'technology' }]);
    languageModel.findAll.mockResolvedValue([
      { id: 1, code: 'en', is_default: true },
      { id: 2, code: 'vi', is_default: false },
    ]);
    translationModel.findAll
      .mockResolvedValueOnce([{ category_id: 7, language_id: 1, name: 'Technology' }])
      .mockResolvedValueOnce([]);
    provider.translateWithFallback.mockResolvedValue({
      ok: true,
      texts: ['Công nghệ'],
      provider: 'mock',
    });

    await service.createMissingTranslationsForLanguage(
      { id: 2, code: 'vi' } as never,
      transaction,
    );

    expect(translationModel.bulkCreate).toHaveBeenCalledWith([{
      category_id: 7,
      language_id: 2,
      name: 'Công nghệ',
      slug: 'cong-nghe',
    }], { transaction, individualHooks: true });
  });
});
