import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_TRANSLATION_PROVIDER_ORDER,
  DEFAULT_TRANSLATION_PROVIDER_TIMEOUT_MS,
  TranslationAttemptStatus,
} from './translations.constants';

export type TranslationProviderRequest = {
  title: string;
  content: string;
  sourceLanguageCode: string;
  targetLanguageCode: string;
};

export type TranslationSegmentsRequest = {
  texts: string[];
  sourceLanguageCode: string;
  targetLanguageCode: string;
  format?: 'text' | 'html';
};

export type TranslationProviderResult =
  | { ok: true; title: string; content: string }
  | TranslationProviderFailure;

export type TranslationSegmentsResult =
  | { ok: true; texts: string[] }
  | TranslationProviderFailure;

export type TranslationFallbackResult =
  | { ok: true; texts: string[]; provider: string }
  | { ok: false; attempts: Array<{ provider: string; status: string; errorMessage: string }> };

type TranslationProviderFailure = {
  ok: false;
  status: Exclude<TranslationAttemptStatus, 'success'>;
  errorMessage: string;
};

@Injectable()
export class TranslationProviderService {
  constructor(private readonly configService: ConfigService) {}

  getProviderOrder(): string[] {
    const configured =
      this.configService.get<string>('TRANSLATION_PROVIDER_ORDER')
      || this.configService.get<string>('TRANSLATION_PROVIDER');
    const providers = configured
      ?.split(',')
      .map(provider => provider.trim().toLowerCase())
      .filter(Boolean);
    return providers?.length ? [...new Set(providers)] : [...DEFAULT_TRANSLATION_PROVIDER_ORDER];
  }

  async translateWithFallback(request: TranslationSegmentsRequest): Promise<TranslationFallbackResult> {
    const attempts: Array<{ provider: string; status: string; errorMessage: string }> = [];
    for (const provider of this.getProviderOrder()) {
      const result = await this.translateTexts(provider, request);
      if (result.ok) {
        return { ok: true, texts: result.texts, provider };
      }
      attempts.push({ provider, status: result.status, errorMessage: result.errorMessage });
    }
    return { ok: false, attempts };
  }

  async translate(provider: string, request: TranslationProviderRequest): Promise<TranslationProviderResult> {
    const result = await this.translateTexts(provider, {
      texts: [request.title, request.content],
      sourceLanguageCode: request.sourceLanguageCode,
      targetLanguageCode: request.targetLanguageCode,
      format: 'html',
    });
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      title: result.texts[0] ?? '',
      content: result.texts[1] ?? '',
    };
  }

  async translateTexts(provider: string, request: TranslationSegmentsRequest): Promise<TranslationSegmentsResult> {
    if (!request.texts.length || request.sourceLanguageCode === request.targetLanguageCode) {
      return { ok: true, texts: [...request.texts] };
    }

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
        case 'google-cloud':
          return await this.translateWithGoogleCloud(request);
        case 'azure':
          return await this.translateWithAzure(request);
        case 'google-free':
        case 'google-legacy':
        case 'google':
          return await this.translateWithGoogleFree(request);
        case 'libretranslate':
        case 'libre':
          return await this.translateWithLibreTranslate(request);
        case 'mock':
        default:
          return {
            ok: true,
            texts: request.texts.map(text => `[${request.targetLanguageCode}] ${text}`),
          };
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return this.failure('timeout', 'Translation provider request timed out');
      }
      return this.failure('failed', this.safeErrorMessage(error));
    }
  }

  private async translateWithDeepL(request: TranslationSegmentsRequest): Promise<TranslationSegmentsResult> {
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
          text: request.texts,
          source_lang: request.sourceLanguageCode.toUpperCase(),
          target_lang: request.targetLanguageCode.toUpperCase(),
          ...(request.format === 'html' ? { tag_handling: 'html' } : {}),
        }),
      },
    );
    if (!response.ok) {
      return this.httpFailure(response.status, 'DeepL request failed');
    }
    const payload = (await response.json()) as { translations?: Array<{ text?: string }> };
    const texts = payload.translations?.map(item => item.text);
    if (!texts || texts.length !== request.texts.length || texts.some(text => typeof text !== 'string')) {
      return this.failure('failed', 'DeepL returned an invalid response');
    }
    return { ok: true, texts: texts as string[] };
  }

  private async translateWithGoogleCloud(request: TranslationSegmentsRequest): Promise<TranslationSegmentsResult> {
    const apiKey = this.configService.get<string>('GOOGLE_CLOUD_TRANSLATION_API_KEY')?.trim();
    if (!apiKey) {
      return this.failure('failed', 'Google Cloud Translation API key is not configured');
    }
    const baseUrl = this.configService.get<string>('GOOGLE_CLOUD_TRANSLATION_URL')?.trim()
      || 'https://translation.googleapis.com/language/translate/v2';
    const separator = baseUrl.includes('?') ? '&' : '?';
    const response = await this.fetchWithTimeout(`${baseUrl}${separator}key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: request.texts,
        source: request.sourceLanguageCode,
        target: request.targetLanguageCode,
        format: request.format === 'html' ? 'html' : 'text',
      }),
    });
    if (!response.ok) {
      return this.httpFailure(response.status, 'Google Cloud Translation request failed');
    }
    const payload = (await response.json()) as { data?: { translations?: Array<{ translatedText?: string }> } };
    const texts = payload.data?.translations?.map(item => item.translatedText);
    if (!texts || texts.length !== request.texts.length || texts.some(text => typeof text !== 'string')) {
      return this.failure('failed', 'Google Cloud Translation returned an invalid response');
    }
    return { ok: true, texts: texts as string[] };
  }

  private async translateWithAzure(request: TranslationSegmentsRequest): Promise<TranslationSegmentsResult> {
    const apiKey = this.configService.get<string>('AZURE_TRANSLATOR_KEY')?.trim();
    const region = this.configService.get<string>('AZURE_TRANSLATOR_REGION')?.trim();
    if (!apiKey || !region) {
      return this.failure('failed', 'Azure Translator key or region is not configured');
    }
    const endpoint = (this.configService.get<string>('AZURE_TRANSLATOR_ENDPOINT')?.trim()
      || 'https://api.cognitive.microsofttranslator.com').replace(/\/+$/, '');
    const url = `${endpoint}/translate?api-version=3.0&from=${encodeURIComponent(request.sourceLanguageCode)}`
      + `&to=${encodeURIComponent(request.targetLanguageCode)}`
      + `&textType=${request.format === 'html' ? 'html' : 'plain'}`;
    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify(request.texts.map(Text => ({ Text }))),
    });
    if (!response.ok) {
      return this.httpFailure(response.status, 'Azure Translator request failed');
    }
    const payload = (await response.json()) as Array<{ translations?: Array<{ text?: string }> }>;
    const texts = payload.map(item => item.translations?.[0]?.text);
    if (texts.length !== request.texts.length || texts.some(text => typeof text !== 'string')) {
      return this.failure('failed', 'Azure Translator returned an invalid response');
    }
    return { ok: true, texts: texts as string[] };
  }

  private async translateWithGoogleFree(request: TranslationSegmentsRequest): Promise<TranslationSegmentsResult> {
    if (this.configService.get<string>('GOOGLE_FREE_ENABLED')?.trim().toLowerCase() === 'false') {
      return this.failure('failed', 'Google Free provider is disabled');
    }
    const configuredMax = Number(this.configService.get<string>('GOOGLE_FREE_MAX_TEXT_LENGTH'));
    const maxLength = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 3000;
    if (request.texts.some(text => text.length > maxLength)) {
      return this.failure('failed', `Google Free input exceeds the ${maxLength} character safety limit`);
    }

    const texts: string[] = [];
    for (const text of request.texts) {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
        request.sourceLanguageCode,
      )}&tl=${encodeURIComponent(request.targetLanguageCode)}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await this.fetchWithTimeout(url, { method: 'GET' });
      if (!response.ok) {
        return this.httpFailure(response.status, 'Google Free translation request failed');
      }
      const payload = (await response.json()) as Array<Array<Array<string>>>;
      if (!Array.isArray(payload?.[0])) {
        return this.failure('failed', 'Google Free translation returned an invalid response');
      }
      texts.push(payload[0].map(item => item[0]).join(''));
    }
    return { ok: true, texts };
  }

  private async translateWithLibreTranslate(request: TranslationSegmentsRequest): Promise<TranslationSegmentsResult> {
    const apiUrl = this.configService.get<string>('LIBRETRANSLATE_URL')?.trim();
    if (!apiUrl) {
      return this.failure('failed', 'LibreTranslate URL is not configured');
    }
    const apiKey = this.configService.get<string>('LIBRETRANSLATE_API_KEY')?.trim();
    const texts: string[] = [];
    for (const text of request.texts) {
      const response = await this.fetchWithTimeout(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: request.sourceLanguageCode,
          target: request.targetLanguageCode,
          format: request.format === 'html' ? 'html' : 'text',
          ...(apiKey ? { api_key: apiKey } : {}),
        }),
      });
      if (!response.ok) {
        return this.httpFailure(response.status, 'LibreTranslate request failed');
      }
      const payload = (await response.json()) as { translatedText?: string };
      if (typeof payload.translatedText !== 'string') {
        return this.failure('failed', 'LibreTranslate returned an invalid response');
      }
      texts.push(payload.translatedText);
    }
    return { ok: true, texts };
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const configuredTimeout = Number(this.configService.get<string>('TRANSLATION_PROVIDER_TIMEOUT_MS'));
    const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_TRANSLATION_PROVIDER_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private httpFailure(statusCode: number, message: string): TranslationProviderFailure {
    return this.failure(statusCode === 429 ? 'rate_limited' : 'failed', `${message} (${statusCode})`);
  }

  private failure(
    status: Exclude<TranslationAttemptStatus, 'success'>,
    errorMessage: string,
  ): TranslationProviderFailure {
    return { ok: false, status, errorMessage: this.safeErrorMessage(errorMessage) };
  }

  private safeErrorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error || 'Translation provider failed');
    const secrets = [
      this.configService.get<string>('DEEPL_API_KEY'),
      this.configService.get<string>('GOOGLE_CLOUD_TRANSLATION_API_KEY'),
      this.configService.get<string>('AZURE_TRANSLATOR_KEY'),
      this.configService.get<string>('LIBRETRANSLATE_API_KEY'),
      this.configService.get<string>('TRANSLATION_API_KEY'),
    ].filter((value): value is string => Boolean(value));
    return secrets
      .reduce((message, secret) => message.split(secret).join('[REDACTED]'), raw)
      .slice(0, 2000);
  }
}
