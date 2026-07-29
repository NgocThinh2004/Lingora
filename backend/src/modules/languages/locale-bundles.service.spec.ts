import { LocaleBundlesService } from './locale-bundles.service';

describe('LocaleBundlesService', () => {
  it('uses the configured canonical locale even when another language is default', async () => {
    const configService = {
      get: jest.fn((key: string) => key === 'LOCALE_SOURCE_CODE' ? 'en' : undefined),
    };
    const providerService = {
      translateWithFallback: jest.fn().mockResolvedValue({
        ok: true,
        provider: 'test',
        texts: ['안녕하세요'],
      }),
    };
    const languageModel = {
      findOne: jest.fn().mockResolvedValue({ id: 1, code: 'en' }),
    };
    const categoryModel = { findAll: jest.fn().mockResolvedValue([]) };
    const service = new LocaleBundlesService(
      configService as never,
      {} as never,
      providerService as never,
      languageModel as never,
      categoryModel as never,
      {} as never,
    );
    jest.spyOn(service as any, 'readBundle').mockImplementation(async (...args: unknown[]) =>
      args[0] === 'en' ? { greeting: 'Hello' } : null,
    );
    jest.spyOn(service as any, 'writeStorageBundle').mockResolvedValue(undefined);

    await service.provisionLanguage({ id: 4, code: 'ko' } as never);

    expect(languageModel.findOne).toHaveBeenCalledWith({ where: { code: 'en' } });
    expect(providerService.translateWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      texts: ['Hello'],
      sourceLanguageCode: 'en',
      targetLanguageCode: 'ko',
    }));
  });
});
