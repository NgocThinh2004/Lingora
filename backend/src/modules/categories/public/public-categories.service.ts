import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Category } from '../models/category.model';
import { CategoryTranslation } from '../models/category-translation.model';
import { Language } from '../../languages/models/language.model';
import { literal } from 'sequelize';

@Injectable()
export class PublicCategoriesService {
  constructor(
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation)
    private readonly translationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
  ) {}

  async findActive() {
    const postCountSubquery = `(SELECT COUNT(*) FROM posts WHERE category_id = Category.id AND status IN ('published', 'approved') AND deleted_at IS NULL)`;
    
    const categories = await this.categoryModel.findAll({
      where: { status: 'active' },
      attributes: {
        include: [
          [literal(postCountSubquery), 'postCount']
        ]
      },
      order: [
        [literal(postCountSubquery), 'DESC']
      ]
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
