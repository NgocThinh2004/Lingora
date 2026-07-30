import { Injectable } from '@nestjs/common';
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
}
