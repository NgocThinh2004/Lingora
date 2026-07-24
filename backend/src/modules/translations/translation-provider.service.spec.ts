import { ConfigService } from '@nestjs/config';
import { TranslationProviderService } from './translation-provider.service';

describe('TranslationProviderService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('never returns an API key in a provider error', async () => {
    const secret = 'private-translation-key';
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'DEEPL_API_KEY') return secret;
        if (key === 'DEEPL_API_URL') return 'https://translation.invalid';
        return undefined;
      }),
    } as unknown as ConfigService;
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error(`request failed for ${secret}`));
    const service = new TranslationProviderService(config);

    const result = await service.translate('deepl', {
      title: 'Title',
      content: '<p>Body</p>',
      sourceLanguageCode: 'en',
      targetLanguageCode: 'vi',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).toContain('[REDACTED]');
      expect(result.errorMessage).not.toContain(secret);
    }
  });
});
