import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Language } from '../languages/models/language.model';
import { TranslationProviderService } from '../translations/translation-provider.service';
import { CategoryTranslationInputDto } from './admin/dto/admin-categories.dto';
import { CategoryTranslation } from './models/category-translation.model';
import { Category } from './models/category.model';

export type GeneratedCategoryTranslation = {
  languageId: number;
  name: string;
  slug: string;
};

@Injectable()
export class CategoryAutoTranslationService {
  constructor(
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation)
    private readonly translationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    private readonly translationProvider: TranslationProviderService,
  ) {}

  async translateFromSource(
    source: CategoryTranslationInputDto,
    activeLanguages: Language[],
  ): Promise<GeneratedCategoryTranslation[]> {
    const sourceLanguage = activeLanguages.find(language => language.id === source.languageId);
    if (!sourceLanguage) {
      throw new BadRequestException('The selected source language is not active');
    }

    const generated: GeneratedCategoryTranslation[] = [{
      languageId: sourceLanguage.id,
      name: source.name.trim(),
      slug: this.slugify(source.slug || source.name),
    }];
    for (const targetLanguage of activeLanguages) {
      if (targetLanguage.id === sourceLanguage.id) continue;
      const translatedName = await this.translateName(
        source.name.trim(),
        sourceLanguage.code,
        targetLanguage.code,
      );
      generated.push({
        languageId: targetLanguage.id,
        name: translatedName,
        slug: this.slugify(translatedName),
      });
    }
    return generated;
  }

  async createMissingTranslationsForLanguage(
    targetLanguage: Language,
    transaction: Transaction,
  ): Promise<void> {
    const categories = await this.categoryModel.findAll({ transaction });
    if (!categories.length) return;

    const categoryIds = categories.map(category => category.id);
    const [languages, translations, existingTargets] = await Promise.all([
      this.languageModel.findAll({ transaction }),
      this.translationModel.findAll({ where: { category_id: categoryIds }, transaction }),
      this.translationModel.findAll({
        where: { category_id: categoryIds, language_id: targetLanguage.id },
        transaction,
      }),
    ]);
    const existingCategoryIds = new Set(existingTargets.map(item => item.category_id));
    const missingCategories = categories.filter(category => !existingCategoryIds.has(category.id));
    if (!missingCategories.length) return;

    const defaultLanguage = languages.find(language => language.is_default && language.id !== targetLanguage.id)
      ?? languages.find(language => language.id !== targetLanguage.id);
    const languageById = new Map(languages.map(language => [language.id, language]));
    const candidates = missingCategories.map(category => {
      const categoryTranslations = translations.filter(item => item.category_id === category.id);
      const source = categoryTranslations.find(item => item.language_id === defaultLanguage?.id)
        ?? categoryTranslations[0];
      const sourceLanguage = source ? languageById.get(source.language_id) : defaultLanguage;
      return {
        categoryId: category.id,
        sourceCode: sourceLanguage?.code || 'en',
        sourceName: source?.name || category.slug,
      };
    });
    const grouped = new Map<string, typeof candidates>();
    for (const candidate of candidates) {
      const group = grouped.get(candidate.sourceCode) ?? [];
      group.push(candidate);
      grouped.set(candidate.sourceCode, group);
    }

    const rows: Array<{ category_id: number; language_id: number; name: string; slug: string }> = [];
    for (const [sourceCode, group] of grouped) {
      const translatedNames = sourceCode === targetLanguage.code
        ? group.map(item => item.sourceName)
        : await this.translateNames(
            group.map(item => item.sourceName),
            sourceCode,
            targetLanguage.code,
          );
      group.forEach((candidate, index) => {
        const translatedName = translatedNames[index];
        rows.push({
          category_id: candidate.categoryId,
          language_id: targetLanguage.id,
          name: translatedName,
          slug: this.slugify(translatedName),
        });
      });
    }

    await this.translationModel.bulkCreate(rows, { transaction, individualHooks: true });
  }

  private async translateName(name: string, sourceCode: string, targetCode: string): Promise<string> {
    return (await this.translateNames([name], sourceCode, targetCode))[0];
  }

  private async translateNames(names: string[], sourceCode: string, targetCode: string): Promise<string[]> {
    const result = await this.translationProvider.translateWithFallback({
      texts: names,
      sourceLanguageCode: sourceCode,
      targetLanguageCode: targetCode,
      format: 'text',
    });
    if (
      !result.ok
      || result.texts.length !== names.length
      || result.texts.some(name => !name?.trim())
    ) {
      throw new BadGatewayException(`Unable to translate category into ${targetCode}`);
    }
    return result.texts.map(name => name.trim().slice(0, 150));
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLocaleLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]+/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) {
      throw new BadRequestException('Category slug cannot be empty');
    }
    return slug.slice(0, 150).replace(/-$/g, '');
  }
}
