import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Sequelize } from 'sequelize-typescript';
import { Category } from '../categories/models/category.model';
import { CategoryTranslation } from '../categories/models/category-translation.model';
import { TranslationProviderService } from '../translations/translation-provider.service';
import { Language } from './models/language.model';

export type UiLocaleBundle = Record<string, string>;

@Injectable()
export class LocaleBundlesService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sequelize: Sequelize,
    private readonly providerService: TranslationProviderService,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation) private readonly categoryTranslationModel: typeof CategoryTranslation,
  ) {}

  async getActiveBundle(code: string): Promise<UiLocaleBundle> {
    const normalizedCode = this.normalizeCode(code);
    const language = await this.languageModel.findOne({
      where: { code: normalizedCode, is_active: true },
    });
    if (!language) {
      throw new NotFoundException('Active locale not found');
    }
    const bundle = await this.ensureCompleteBundle(normalizedCode);
    if (!bundle) {
      throw new NotFoundException('Locale bundle not found');
    }
    return bundle;
  }

  async provisionLanguage(language: Language): Promise<void> {
    const targetCode = this.normalizeCode(language.code);
    const sourceCode = this.translationSourceCode();
    const sourceLanguage = await this.languageModel.findOne({ where: { code: sourceCode } });
    await this.ensureCompleteBundle(targetCode);

    await this.provisionCategoryTranslations(
      language,
      sourceLanguage,
      sourceCode,
    );
  }

  async removeGeneratedBundle(code: string): Promise<void> {
    const path = this.storageBundlePath(this.normalizeCode(code));
    await unlink(path).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    });
  }

  private async ensureCompleteBundle(targetCode: string): Promise<UiLocaleBundle | null> {
    const sourceCode = this.translationSourceCode();
    const sourceBundle = await this.readBundle(sourceCode);
    if (!sourceBundle) {
      throw new BadRequestException(`Canonical UI locale bundle is missing: ${sourceCode}`);
    }
    if (targetCode === sourceCode) {
      return sourceBundle;
    }

    const sourceControlledTarget = await this.readSourceBundle(targetCode);
    const targetBundle = sourceControlledTarget
      ?? await this.readJson(this.storageBundlePath(targetCode))
      ?? {};
    if (sourceControlledTarget) {
      // Source-controlled locales are authoritative. Remove any obsolete
      // generated copy so persistent storage contains dynamic locales only.
      await this.removeGeneratedBundle(targetCode);
    }
    const missingSourceEntries = Object.entries(sourceBundle)
      .filter(([key]) => typeof targetBundle[key] !== 'string' || !targetBundle[key].trim());
    if (!missingSourceEntries.length) {
      return targetBundle;
    }

    const translatedMissing = await this.translateBundle(
      Object.fromEntries(missingSourceEntries),
      sourceCode,
      targetCode,
    );
    const completedBundle = { ...targetBundle, ...translatedMissing };
    if (!sourceControlledTarget) {
      await this.writeStorageBundle(targetCode, completedBundle);
    }
    return completedBundle;
  }

  private async translateBundle(
    source: UiLocaleBundle,
    sourceCode: string,
    targetCode: string,
  ): Promise<UiLocaleBundle> {
    const entries = Object.entries(source);
    const translated: UiLocaleBundle = {};
    const configuredBatchSize = Number(this.configService.get<string>('LOCALE_TRANSLATION_BATCH_SIZE'));
    const batchSize = Number.isFinite(configuredBatchSize) && configuredBatchSize > 0
      ? Math.min(configuredBatchSize, 100)
      : 50;

    for (let index = 0; index < entries.length; index += batchSize) {
      const batch = entries.slice(index, index + batchSize);
      const protectedTexts = batch.map(([, value]) => this.protectPlaceholders(value));
      const result = await this.providerService.translateWithFallback({
        texts: protectedTexts.map(item => item.text),
        sourceLanguageCode: sourceCode,
        targetLanguageCode: targetCode,
        format: 'text',
      });
      if (!result.ok) {
        throw new BadRequestException(`Unable to translate UI locale to ${targetCode}`);
      }
      result.texts.forEach((value, offset) => {
        const [key] = batch[offset];
        translated[key] = this.restorePlaceholders(value, protectedTexts[offset].tokens);
      });
    }
    return translated;
  }

  private async provisionCategoryTranslations(
    targetLanguage: Language,
    sourceLanguage: Language | null,
    sourceCode: string,
  ): Promise<void> {
    const categories = await this.categoryModel.findAll();
    if (!categories.length) {
      return;
    }
    if (!sourceLanguage) {
      throw new BadRequestException(
        `Canonical category language is not configured: ${sourceCode}`,
      );
    }
    const categoryIds = categories.map(category => category.id);
    const translations = await this.categoryTranslationModel.findAll({
      where: { category_id: categoryIds },
    });
    const missing = categories.filter(category => !translations.some(item =>
      item.category_id === category.id && item.language_id === targetLanguage.id,
    ));
    if (!missing.length) {
      return;
    }

    const sourceNames = missing.map(category => {
      const source = translations.find(item =>
        item.category_id === category.id && item.language_id === sourceLanguage.id,
      );
      if (!source?.name.trim()) {
        throw new BadRequestException(
          `Category ${category.id} is missing its canonical ${sourceCode} translation`,
        );
      }
      return source.name;
    });
    const result = sourceCode === targetLanguage.code
      ? { ok: true as const, texts: sourceNames, provider: 'source' }
      : await this.providerService.translateWithFallback({
          texts: sourceNames,
          sourceLanguageCode: sourceCode,
          targetLanguageCode: targetLanguage.code,
          format: 'text',
        });
    if (!result.ok) {
      throw new BadRequestException(`Unable to translate categories to ${targetLanguage.code}`);
    }

    await this.sequelize.transaction(async transaction => {
      await this.categoryTranslationModel.bulkCreate(
        missing.map((category, index) => ({
          category_id: category.id,
          language_id: targetLanguage.id,
          name: result.texts[index].trim() || sourceNames[index],
          slug: this.slugify(result.texts[index]) || `${category.slug}-${targetLanguage.code}`,
        })),
        { transaction },
      );
    });
  }

  private protectPlaceholders(value: string): { text: string; tokens: string[] } {
    const tokens: string[] = [];
    const text = value.replace(/(\{\{[^{}]+\}\}|\{[a-zA-Z0-9_.-]+\}|\$\{[^{}]+\}|%[a-zA-Z])/g, token => {
      const index = tokens.push(token) - 1;
      return `__LINGORA_TOKEN_${index}__`;
    });
    return { text, tokens };
  }

  private restorePlaceholders(value: string, tokens: string[]): string {
    let restored = value;
    tokens.forEach((token, index) => {
      const marker = `__LINGORA_TOKEN_${index}__`;
      if (!restored.includes(marker)) {
        throw new BadRequestException('Translation provider changed a UI placeholder');
      }
      restored = restored.split(marker).join(token);
    });
    return restored;
  }

  private async readBundle(code: string): Promise<UiLocaleBundle | null> {
    const [sourceBundle, generatedBundle] = await Promise.all([
      this.readSourceBundle(code),
      this.readJson(this.storageBundlePath(code)),
    ]);
    // A locale committed to resources is authoritative and never needs a
    // generated copy in persistent storage. Storage is only for dynamic locales.
    return sourceBundle ?? generatedBundle;
  }

  private async readSourceBundle(code: string): Promise<UiLocaleBundle | null> {
    return this.readJson(join(this.sourceDirectory(), `${code}.json`));
  }

  private async readJson(path: string): Promise<UiLocaleBundle | null> {
    try {
      const parsed = JSON.parse(await readFile(path, 'utf8')) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new BadRequestException(`Invalid locale bundle: ${path}`);
      }
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.some(([key, value]) => !key.trim() || typeof value !== 'string')) {
        throw new BadRequestException(`Invalid locale entries: ${path}`);
      }
      return Object.fromEntries(entries) as UiLocaleBundle;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private async writeStorageBundle(code: string, bundle: UiLocaleBundle): Promise<void> {
    const directory = this.storageDirectory();
    await mkdir(directory, { recursive: true });
    const target = this.storageBundlePath(code);
    const temporary = join(directory, `.${code}.${randomUUID()}.tmp`);
    await writeFile(temporary, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
    try {
      await rename(temporary, target);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  private sourceDirectory(): string {
    return join(process.cwd(), this.configService.get<string>('LOCALE_SOURCE_DIR') || 'resources/locales');
  }

  private storageDirectory(): string {
    return join(process.cwd(), this.configService.get<string>('LOCALE_STORAGE_DIR') || 'storage/locales');
  }

  private translationSourceCode(): string {
    return this.normalizeCode(
      this.configService.get<string>('LOCALE_SOURCE_CODE') || 'en',
    );
  }

  private storageBundlePath(code: string): string {
    return join(this.storageDirectory(), `${code}.json`);
  }

  private normalizeCode(code: string): string {
    const normalized = code.trim().toLowerCase();
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,6})?$/.test(normalized)) {
      throw new BadRequestException('Invalid locale code');
    }
    return normalized;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]+/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 150);
  }
}
