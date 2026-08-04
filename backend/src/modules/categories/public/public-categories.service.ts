import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { literal, Op } from 'sequelize';
import { Category } from '../models/category.model';
import { CategoryTranslation } from '../models/category-translation.model';
import { Language } from '../../languages/models/language.model';
import { removeAccents } from '../../../utils/string.util';
import { CategoriesCacheService } from '../categories-cache.service';

@Injectable()
export class PublicCategoriesService {
  constructor(
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation)
    private readonly translationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    private readonly categoriesCache: CategoriesCacheService,
  ) {}

  async findActive(q?: string, lang?: string, limit?: number) {
    const normalizedQuery = q?.trim() ?? '';
    const normalizedLanguage = lang?.trim().toLowerCase() ?? '';
    const normalizedLimit = limit ?? 0;
    const key = `list:${JSON.stringify([normalizedQuery, normalizedLanguage, normalizedLimit])}`;
    return this.categoriesCache.getOrLoad(
      key,
      () => this.loadActive(normalizedQuery, normalizedLanguage, limit),
    );
  }

  private async loadActive(q?: string, lang?: string, limit?: number) {
    let categoryIdsFilter: number[] | undefined;

    if (q && q.trim()) {
      const keyword = `%${removeAccents(q.trim())}%`;
      const langModel = lang ? await this.languageModel.findOne({ where: { code: lang } }) : null;
      
      const translationWhere: any = {
        unaccented_name: { [Op.like]: keyword }
      };
      if (langModel) {
        translationWhere.language_id = langModel.id;
      }
      
      const matchedTranslations = await this.translationModel.findAll({
        where: translationWhere,
        attributes: ['category_id']
      });
      categoryIdsFilter = matchedTranslations.map(t => Number(t.category_id));
      
      if (categoryIdsFilter.length === 0) return [];
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
    const [translations, languages] = await Promise.all([
      this.translationModel.findAll({ where: { category_id: categoryIds } }),
      this.languageModel.findAll({ where: { is_active: true } }),
    ]);

    const languageMap = new Map(languages.map((l) => [l.id, l.code]));

    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      postCount: Number(category.get('postCount')) || 0,
      isActive: true,
      translations: translations
        .filter((t) => t.category_id === category.id)
        .map((t) => ({
          id: Number(t.id),
          languageCode: languageMap.get(t.language_id) || 'en',
          name: t.name,
          slug: t.slug,
        })),
    }));
  }

  async findBySlug(slug: string) {
    return this.categoriesCache.getOrLoad(
      `slug:${encodeURIComponent(slug)}`,
      () => this.loadBySlug(slug),
    );
  }

  private async loadBySlug(slug: string) {
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

    const [translations, languages] = await Promise.all([
      this.translationModel.findAll({ where: { category_id: category.id } }),
      this.languageModel.findAll({ where: { is_active: true } }),
    ]);
    const languageMap = new Map(languages.map((l) => [l.id, l.code]));

    return {
      id: category.id,
      slug: category.slug,
      postCount: Number(category.get('postCount')) || 0,
      isActive: true,
      translations: translations.map((t) => ({
        id: Number(t.id),
        languageCode: languageMap.get(t.language_id) || 'en',
        name: t.name,
        slug: t.slug,
      })),
    };
  }
}
