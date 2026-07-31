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

  it('falls back from an unconfigured paid provider to google-free', async () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'TRANSLATION_PROVIDER_ORDER') return 'deepl,google-free';
        return undefined;
      }),
    } as unknown as ConfigService;
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [[['Xin chào']]],
    } as unknown as Response);
    const service = new TranslationProviderService(config);

    const result = await service.translateWithFallback({
      texts: ['Hello'],
      sourceLanguageCode: 'en',
      targetLanguageCode: 'vi',
      format: 'text',
    });

    expect(result).toEqual({ ok: true, texts: ['Xin chào'], provider: 'google-free' });
  });

  it('splits long text into provider-safe chunks and rejoins the translation', async () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_FREE_MAX_TEXT_LENGTH') return '3000';
        if (key === 'TRANSLATION_CHUNK_SIZE') return '2500';
        return undefined;
      }),
    } as unknown as ConfigService;
    const requestedTexts: string[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input));
      const text = url.searchParams.get('q') ?? '';
      requestedTexts.push(text);
      return {
        ok: true,
        json: async () => [[[text.toUpperCase()]]],
      } as unknown as Response;
    });
    const service = new TranslationProviderService(config);
    const longText = 'This is a long sentence. '.repeat(220);

    const result = await service.translateTexts('google-free', {
      texts: [longText],
      sourceLanguageCode: 'en',
      targetLanguageCode: 'vi',
      format: 'text',
    });

    expect(result).toEqual({ ok: true, texts: [longText.toUpperCase()] });
    expect(requestedTexts.length).toBeGreaterThan(1);
    expect(requestedTexts.every(text => text.length <= 2500)).toBe(true);
  });

  it('translates long HTML text without changing markup, media, or code blocks', async () => {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_FREE_MAX_TEXT_LENGTH') return '3000';
        if (key === 'TRANSLATION_CHUNK_SIZE') return '2500';
        return undefined;
      }),
    } as unknown as ConfigService;
    const requestedTexts: string[] = [];
    jest.spyOn(global, 'fetch').mockImplementation(async input => {
      const url = new URL(String(input));
      const text = url.searchParams.get('q') ?? '';
      requestedTexts.push(text);
      return {
        ok: true,
        json: async () => [[[text.replaceAll('Hello', 'Xin chao')]]],
      } as unknown as Response;
    });
    const service = new TranslationProviderService(config);
    const content = [
      '<p class="lead">',
      'Hello world. '.repeat(260),
      '</p>',
      '<img src="https://cdn.example.com/image.jpg" alt="Hello image">',
      '<video controls src="https://cdn.example.com/video.mp4"></video>',
      '<audio controls src="https://cdn.example.com/audio.mp3"></audio>',
      '<pre><code>const greeting = "Hello";</code></pre>',
    ].join('');

    const result = await service.translate('google-free', {
      title: 'Hello title',
      content,
      sourceLanguageCode: 'en',
      targetLanguageCode: 'vi',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.title).toBe('Xin chao title');
      expect(result.content).toContain('<p class="lead">Xin chao world.');
      expect(result.content).toContain('<img src="https://cdn.example.com/image.jpg" alt="Hello image">');
      expect(result.content).toContain('<video controls src="https://cdn.example.com/video.mp4"></video>');
      expect(result.content).toContain('<audio controls src="https://cdn.example.com/audio.mp3"></audio>');
      expect(result.content).toContain('<pre><code>const greeting = "Hello";</code></pre>');
    }
    expect(requestedTexts.length).toBeGreaterThan(2);
    expect(requestedTexts.every(text => text.length <= 2500)).toBe(true);
    expect(requestedTexts.some(text => text.includes('const greeting'))).toBe(false);
  });
});
