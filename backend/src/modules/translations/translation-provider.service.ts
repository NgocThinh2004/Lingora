import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_TRANSLATION_PROVIDER_TIMEOUT_MS,
  TranslationAttemptStatus,
} from './translations.constants';

export type TranslationProviderRequest = {
  title: string;
  content: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
};

export type TranslationProviderResult =
  | { ok: true; title: string; content: string }
  | {
      ok: false;
      status: Exclude<TranslationAttemptStatus, 'success'>;
      errorMessage: string;
    };

@Injectable()
export class TranslationProviderService {
  constructor(private readonly configService: ConfigService) {}

  async translate(provider: string, request: TranslationProviderRequest): Promise<TranslationProviderResult> {
    try {
      switch (provider.trim().toLowerCase()) {
        case 'mock-fail':
          return this.failure('failed', 'Mock provider forced failure');
        case 'mock-rate-limit':
          return this.failure('rate_limited', 'Mock provider forced rate limit');
        case 'mock-timeout':
          return this.failure('timeout', 'Mock provider forced timeout');
        case 'deepl':
          return await this.translateWithDeepL(request);
        case 'google':
          return await this.translateWithGoogle(request);
        case 'libretranslate':
        case 'libre':
          return await this.translateWithLibreTranslate(request);
        case 'mock':
        default:
          return {
            ok: true,
            title: `[${request.targetLanguageCode}] ${request.title}`,
            content:
              `<p><strong>Mock ${request.sourceLanguageCode} to ${request.targetLanguageCode}</strong></p>` +
              request.content,
          };
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return this.failure('timeout', 'Translation provider request timed out');
      }

      return this.failure('failed', this.safeErrorMessage(error));
    }
  }

  private async translateWithDeepL(request: TranslationProviderRequest): Promise<TranslationProviderResult> {
    const apiKey = this.configService.get<string>('DEEPL_API_KEY')?.trim();
    if (!apiKey) {
      return this.failure('failed', 'DeepL API key is not configured');
    }

    const response = await this.fetchWithTimeout(
      this.configService.get<string>('DEEPL_API_URL')?.trim() || 'https://api-free.deepl.com/v2/translate',
      {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [request.title, request.content],
          source_lang: request.sourceLanguageCode.toUpperCase(),
          target_lang: request.targetLanguageCode.toUpperCase(),
          tag_handling: 'html',
        }),
      },
    );

    if (!response.ok) {
      return this.httpFailure(response.status, 'DeepL request failed');
    }

    const payload = (await response.json()) as {
      translations?: Array<{ text?: string }>;
    };
    const title = payload.translations?.[0]?.text;
    const content = payload.translations?.[1]?.text;
    if (!title || content === undefined) {
      return this.failure('failed', 'DeepL returned an invalid response');
    }

    return { ok: true, title, content };
  }

  private async translateWithGoogle(
    request: TranslationProviderRequest,
  ): Promise<TranslationProviderResult> {
    const translateText = async (text: string): Promise<string | TranslationProviderResult> => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
        request.sourceLanguageCode,
      )}&tl=${encodeURIComponent(request.targetLanguageCode)}&dt=t&q=${encodeURIComponent(text)}`;

      const response = await this.fetchWithTimeout(url, { method: 'GET' });
      if (!response.ok) {
        return this.httpFailure(response.status, 'Google Translate request failed');
      }

      const payload = (await response.json()) as Array<Array<Array<string>>>;
      if (!Array.isArray(payload?.[0])) {
        return this.failure('failed', 'Google Translate returned an invalid response');
      }

      return payload[0].map((item) => item[0]).join('');
    };

    const title = await translateText(request.title);
    if (typeof title !== 'string') return title;

    const content = await translateText(request.content);
    if (typeof content !== 'string') return content;

    return { ok: true, title, content };
  }

  private async translateWithLibreTranslate(
    request: TranslationProviderRequest,
  ): Promise<TranslationProviderResult> {
    const apiUrl = this.configService.get<string>('LIBRETRANSLATE_URL')?.trim();
    if (!apiUrl) {
      return this.failure('failed', 'LibreTranslate URL is not configured');
    }

    const translateText = async (text: string): Promise<TranslationProviderResult | string> => {
      const apiKey = this.configService.get<string>('LIBRETRANSLATE_API_KEY')?.trim();
      const response = await this.fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: request.sourceLanguageCode,
          target: request.targetLanguageCode,
          format: 'html',
          ...(apiKey ? { api_key: apiKey } : {}),
        }),
      });

      if (!response.ok) {
        return this.httpFailure(response.status, 'LibreTranslate request failed');
      }

      const payload = (await response.json()) as { translatedText?: string };
      return typeof payload.translatedText === 'string'
        ? payload.translatedText
        : this.failure('failed', 'LibreTranslate returned an invalid response');
    };

    const title = await translateText(request.title);
    if (typeof title !== 'string') {
      return title;
    }
    const content = await translateText(request.content);
    if (typeof content !== 'string') {
      return content;
    }

    return { ok: true, title, content };
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const configuredTimeout = Number(this.configService.get<string>('TRANSLATION_PROVIDER_TIMEOUT_MS'));
    const timeoutMs =
      Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? configuredTimeout
        : DEFAULT_TRANSLATION_PROVIDER_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private httpFailure(statusCode: number, message: string): TranslationProviderResult {
    return this.failure(statusCode === 429 ? 'rate_limited' : 'failed', `${message} (${statusCode})`);
  }

  private failure(
    status: Exclude<TranslationAttemptStatus, 'success'>,
    errorMessage: string,
  ): TranslationProviderResult {
    return { ok: false, status, errorMessage: this.safeErrorMessage(errorMessage) };
  }

  private safeErrorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error || 'Translation provider failed');
    const secrets = [
      this.configService.get<string>('DEEPL_API_KEY'),
      this.configService.get<string>('LIBRETRANSLATE_API_KEY'),
      this.configService.get<string>('TRANSLATION_API_KEY'),
    ].filter((value): value is string => Boolean(value));

    return secrets
      .reduce((message, secret) => message.split(secret).join('[REDACTED]'), raw)
      .slice(0, 2000);
  }
}
