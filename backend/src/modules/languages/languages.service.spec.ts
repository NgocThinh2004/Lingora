import { BadRequestException, ConflictException } from '@nestjs/common';
import { LanguagesService } from './languages.service';

describe('LanguagesService', () => {
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  let sequelize: { transaction: jest.Mock };
  let languageModel: {
    findAndCountAll: jest.Mock;
    findByPk: jest.Mock;
    findOne: jest.Mock;
    findAll: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let translationMetricsService: { getLanguageCoverage: jest.Mock };
  let service: LanguagesService;

  const makeLanguage = (overrides: Record<string, unknown> = {}) => {
    const language: Record<string, any> = {
      id: 2,
      code: 'vi',
      name: 'Vietnamese',
      native_name: 'Tiếng Việt',
      flag_code: 'vn',
      is_default: false,
      is_active: true,
      activated_at: null,
      ...overrides,
    };
    language.update = jest.fn(async (values: Record<string, unknown>) => {
      Object.assign(language, values);
      return language;
    });
    language.destroy = jest.fn().mockResolvedValue(undefined);
    return language;
  };

  beforeEach(() => {
    sequelize = {
      transaction: jest.fn(async callback => callback(transaction)),
    };
    languageModel = {
      findAndCountAll: jest.fn(),
      findByPk: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue([0]),
    };
    translationMetricsService = {
      getLanguageCoverage: jest.fn().mockResolvedValue(new Map()),
    };
    service = new LanguagesService(
      sequelize as never,
      languageModel as never,
      translationMetricsService as never,
    );
  });

  it('returns only active languages for public selectors with the default first', async () => {
    languageModel.findAll.mockResolvedValue([
      makeLanguage({ id: 1, code: 'vi', is_default: true }),
      makeLanguage({ id: 2, code: 'en', name: 'English', native_name: 'English', flag_code: 'gb' }),
    ]);

    const result = await service.findActive();

    expect(languageModel.findAll).toHaveBeenCalledWith({
      where: { is_active: true },
      order: [['is_default', 'DESC'], ['code', 'ASC']],
    });
    expect(result).toEqual([
      expect.objectContaining({ code: 'vi', isDefault: true }),
      expect.objectContaining({ code: 'en', nativeName: 'English', isDefault: false }),
    ]);
    expect(result[0]).not.toHaveProperty('translationCoverage');
  });

  it('returns a paginated language directory with translation coverage', async () => {
    const language = makeLanguage();
    languageModel.findAndCountAll.mockResolvedValue({ rows: [language], count: 1 });
    translationMetricsService.getLanguageCoverage.mockResolvedValue(new Map([
      [language.id, { translatedPosts: 3, totalPosts: 4, percent: 75 }],
    ]));

    const result = await service.findAll({ page: 1, limit: 8 });

    expect(languageModel.findAndCountAll).toHaveBeenCalledWith({
      order: [['is_default', 'DESC'], ['code', 'ASC']],
      limit: 8,
      offset: 0,
    });
    expect(result.meta.pagination).toEqual({
      total: 1,
      page: 1,
      limit: 8,
      totalPages: 1,
    });
    expect(translationMetricsService.getLanguageCoverage).toHaveBeenCalledWith([language.id]);
    expect(result.data[0]).toEqual(expect.objectContaining({
      code: 'vi',
      nativeName: 'Tiếng Việt',
      translationCoverage: {
        translatedPosts: 3,
        totalPosts: 4,
        percent: 75,
        available: true,
      },
    }));
  });

  it('returns an available zero coverage when a language has no translation targets', async () => {
    const language = makeLanguage();
    languageModel.findAndCountAll.mockResolvedValue({ rows: [language], count: 1 });

    const result = await service.findAll({ page: 1, limit: 8 });

    expect(result.data[0].translationCoverage).toEqual({
      translatedPosts: 0,
      totalPosts: 0,
      percent: 0,
      available: true,
    });
  });

  it('rejects a duplicate language code', async () => {
    languageModel.findOne.mockResolvedValue(makeLanguage());

    await expect(service.create({
      code: 'vi',
      name: 'Vietnamese',
      nativeName: 'Tiếng Việt',
    })).rejects.toBeInstanceOf(ConflictException);

    expect(languageModel.create).not.toHaveBeenCalled();
  });

  it('makes the first configured language active and default', async () => {
    const created = makeLanguage({ id: 1, code: 'en', is_default: true });
    languageModel.findOne.mockResolvedValue(null);
    languageModel.findAll.mockResolvedValue([]);
    languageModel.create.mockResolvedValue(created);

    const result = await service.create({
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flagCode: 'gb',
      isActive: false,
    });

    expect(languageModel.update).toHaveBeenCalledWith(
      { is_default: false },
      { where: { is_default: true }, transaction },
    );
    expect(languageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        is_default: true,
        is_active: true,
        activated_at: expect.any(Date),
      }),
      { transaction },
    );
    expect(result.isDefault).toBe(true);
    expect(result.isActive).toBe(true);
  });

  it('does not allow the default language to be disabled', async () => {
    const defaultLanguage = makeLanguage({ id: 1, code: 'en', is_default: true });
    languageModel.findByPk.mockResolvedValue(defaultLanguage);
    languageModel.findAll.mockResolvedValue([defaultLanguage]);

    await expect(service.update(1, { isActive: false }))
      .rejects.toBeInstanceOf(BadRequestException);

    expect(defaultLanguage.update).not.toHaveBeenCalled();
  });

  it('switches the default language atomically and keeps it active', async () => {
    const currentDefault = makeLanguage({ id: 1, code: 'en', is_default: true });
    const target = makeLanguage({ id: 2, code: 'vi', is_default: false, is_active: false });
    languageModel.findByPk.mockResolvedValue(target);
    languageModel.findAll.mockResolvedValue([currentDefault, target]);

    const result = await service.update(2, { isDefault: true, isActive: false });

    expect(languageModel.update).toHaveBeenCalledWith(
      { is_default: false },
      { where: { is_default: true }, transaction },
    );
    expect(target.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_default: true, is_active: true }),
      { transaction },
    );
    expect(result.isDefault).toBe(true);
    expect(result.isActive).toBe(true);
  });
});
