import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { literal, Op } from 'sequelize';
import { Category } from '../models/category.model';
import { CategoryTranslation } from '../models/category-translation.model';
import { Language } from '../../languages/models/language.model';
import { removeAccents } from '../../../utils/string.util';

@Injectable()
export class PublicCategoriesService {
  constructor(
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation)
    private readonly translationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
  ) {}

  async findActive(q?: string, lang?: string, limit?: number) {
    const normalizedQuery = q?.trim() ?? '';
    const normalizedLanguage = lang?.trim().toLowerCase() ?? '';
    return this.loadActive(normalizedQuery, normalizedLanguage, limit);
  }

  private async loadActive(q?: string, lang?: string, limit?: number) {
    let categoryIdsFilter: number[] | undefined;
    const languages = await this.languageModel.findAll({ where: { is_active: true } });
    const requestedLanguage = lang
      ? languages.find(language => language.code.toLowerCase() === lang.toLowerCase())
        ?? languages.find(language => language.is_default)
        ?? languages[0]
      : undefined;

    if (q && q.trim()) {
      const keyword = `%${removeAccents(q.trim())}%`;
      const translationWhere: any = {
        unaccented_name: { [Op.like]: keyword }
      };
      if (requestedLanguage) {
        translationWhere.language_id = requestedLanguage.id;
      }
      
      const matchedTranslations = await this.translationModel.findAll({
        where: translationWhere,
        attributes: ['category_id']
      });
      categoryIdsFilter = matchedTranslations.map(t => Number(t.category_id));
      
      if (categoryIdsFilter.length === 0) return [];
    }

    if (requestedLanguage && !categoryIdsFilter) {
      const translatedCategories = await this.translationModel.findAll({
        where: { language_id: requestedLanguage.id },
        attributes: ['category_id'],
      });
      categoryIdsFilter = translatedCategories.map(translation => Number(translation.category_id));
      if (!categoryIdsFilter.length) return [];
    }

    const postCountSubquery = `(SELECT COUNT(*) FROM posts WHERE category_id = Category.id AND status IN ('published', 'approved') AND deleted_at IS NULL)`;
    
    const where: any = { status: 'active' };
    if (categoryIdsFilter) {
      where.id = { [Op.in]: categoryIdsFilter.length ? categoryIdsFilter : [0] };
    }
    
    const categories = await this.categoryModel.findAll({
      where,
      attributes: {
        include: [
          [literal(postCountSubquery), 'postCount']
        ]
      },
      order: [
        [literal(postCountSubquery), 'DESC']
      ],
      limit
    });

    if (!categories.length) return [];

    const categoryIds = categories.map((c) => c.id);
    const allowedLanguageIds = requestedLanguage
      ? [Number(requestedLanguage.id)]
      : languages.map(language => Number(language.id));
    const translations = await this.translationModel.findAll({
      where: {
        category_id: categoryIds,
        language_id: { [Op.in]: allowedLanguageIds.length ? allowedLanguageIds : [0] },
      },
    });

    const languageMap = new Map(languages.map((l) => [Number(l.id), l.code]));

    return categories
      .map((category) => ({
        id: category.id,
        slug: category.slug,
        postCount: Number(category.get('postCount')) || 0,
        isActive: true,
        translations: translations
          .filter((t) => Number(t.category_id) === Number(category.id) && languageMap.has(Number(t.language_id)))
          .map((t) => ({
            id: Number(t.id),
            languageCode: languageMap.get(Number(t.language_id))!,
            name: t.name,
            slug: t.slug,
          })),
      }))
      .filter(category => !requestedLanguage || category.translations.length > 0);
  }

  async findBySlug(slug: string, lang?: string) {
    const normalizedLanguage = lang?.trim().toLowerCase() ?? '';
    return this.loadBySlug(slug, normalizedLanguage);
  }

  private async loadBySlug(slug: string, lang?: string) {
    const postCountSubquery = `(SELECT COUNT(*) FROM posts WHERE category_id = Category.id AND status IN ('published', 'approved') AND deleted_at IS NULL)`;
    const category = await this.categoryModel.findOne({
      where: { slug, status: 'active' },
      attributes: {
        include: [[literal(postCountSubquery), 'postCount']]
      }
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const languages = await this.languageModel.findAll({ where: { is_active: true } });
    const requestedLanguage = lang
      ? languages.find(language => language.code.toLowerCase() === lang)
        ?? languages.find(language => language.is_default)
        ?? languages[0]
      : undefined;
    const allowedLanguageIds = requestedLanguage
      ? [Number(requestedLanguage.id)]
      : languages.map(language => Number(language.id));
    const translations = await this.translationModel.findAll({
      where: {
        category_id: category.id,
        language_id: { [Op.in]: allowedLanguageIds.length ? allowedLanguageIds : [0] },
      },
    });
    const languageMap = new Map(languages.map((l) => [Number(l.id), l.code]));

    return {
      id: category.id,
      slug: category.slug,
      postCount: Number(category.get('postCount')) || 0,
      isActive: true,
      translations: translations.filter(t => languageMap.has(Number(t.language_id))).map((t) => ({
        id: Number(t.id),
        languageCode: languageMap.get(Number(t.language_id))!,
        name: t.name,
        slug: t.slug,
      })),
    };
  }
}
