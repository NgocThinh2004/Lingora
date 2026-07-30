import { LocaleBundlesService } from './locale-bundles.service';

describe('LocaleBundlesService', () => {
  it('prefers a source-controlled bundle over a stale generated copy', async () => {
    const service = new LocaleBundlesService(
      { get: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    jest.spyOn(service as any, 'readSourceBundle').mockResolvedValue({
      welcome_back: 'Chào mừng trở lại',
      settings: 'Cài đặt',
    });
    jest.spyOn(service as any, 'readJson').mockResolvedValue({
      settings: 'Thiết lập',
    });

    await expect((service as any).readBundle('vi')).resolves.toEqual({
      welcome_back: 'Chào mừng trở lại',
      settings: 'Cài đặt',
    });
  });

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

  it('preserves generated translations and translates only missing UI keys', async () => {
    const configService = {
      get: jest.fn((key: string) => key === 'LOCALE_SOURCE_CODE' ? 'en' : undefined),
    };
    const providerService = {
      translateWithFallback: jest.fn().mockResolvedValue({
        ok: true,
        provider: 'test',
        texts: ['Cài đặt'],
      }),
    };
    const languageModel = {
      findOne: jest.fn().mockResolvedValue({ id: 4, code: 'ko', is_active: true }),
    };
    const service = new LocaleBundlesService(
      configService as never,
      {} as never,
      providerService as never,
      languageModel as never,
      { findAll: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
    );
    jest.spyOn(service as any, 'readBundle').mockImplementation(async (...args: unknown[]) =>
      args[0] === 'en'
        ? { home: 'Home', settings: 'Settings' }
        : { home: 'Trang chủ' },
    );
    jest.spyOn(service as any, 'readSourceBundle').mockResolvedValue(null);
    jest.spyOn(service as any, 'readJson').mockResolvedValue({ home: 'Trang chủ' });
    const writeBundle = jest.spyOn(service as any, 'writeStorageBundle').mockResolvedValue(undefined);

    const bundle = await service.getActiveBundle('ko');

    expect(providerService.translateWithFallback).toHaveBeenCalledWith(expect.objectContaining({
      texts: ['Settings'],
      sourceLanguageCode: 'en',
      targetLanguageCode: 'ko',
    }));
    expect(bundle).toEqual({ home: 'Trang chủ', settings: 'Cài đặt' });
    expect(writeBundle).toHaveBeenCalledWith('ko', bundle);
  });

  it('does not create a storage copy for a source-controlled locale', async () => {
    const providerService = {
      translateWithFallback: jest.fn().mockResolvedValue({
        ok: true,
        provider: 'test',
        texts: ['Cài đặt'],
      }),
    };
    const service = new LocaleBundlesService(
      { get: jest.fn((key: string) => key === 'LOCALE_SOURCE_CODE' ? 'en' : undefined) } as never,
      {} as never,
      providerService as never,
      { findOne: jest.fn().mockResolvedValue({ id: 2, code: 'vi', is_active: true }) } as never,
      { findAll: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
    );
    jest.spyOn(service as any, 'readBundle').mockResolvedValue({ home: 'Home', settings: 'Settings' });
    jest.spyOn(service as any, 'readSourceBundle').mockResolvedValue({ home: 'Trang chủ' });
    const removeBundle = jest.spyOn(service, 'removeGeneratedBundle').mockResolvedValue(undefined);
    const writeBundle = jest.spyOn(service as any, 'writeStorageBundle').mockResolvedValue(undefined);

    await expect(service.getActiveBundle('vi')).resolves.toEqual({
      home: 'Trang chủ',
      settings: 'Cài đặt',
    });
    expect(removeBundle).toHaveBeenCalledWith('vi');
    expect(writeBundle).not.toHaveBeenCalled();
  });
});
