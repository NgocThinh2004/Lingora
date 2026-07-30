import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { fn, Op, Transaction, UniqueConstraintError } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Language } from '../../languages/models/language.model';
import { PostTranslation } from '../../posts/models/post-translation.model';
import { Post } from '../../posts/models/post.model';
import { User } from '../../users/models/user.model';
import {
  AdminCategoriesQueryDto,
  CategoryTranslationInputDto,
  CreateAdminCategoryDto,
  UpdateAdminCategoryDto,
} from './dto/admin-categories.dto';
import { CategoryTranslation } from '../models/category-translation.model';
import { Category } from '../models/category.model';

interface CategoryView {
  id: number;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  postCount: number;
  translations: Array<{
    id: string;
    languageId: number;
    languageCode: string;
    languageName: string;
    languageNativeName: string;
    flagCode: string | null;
    name: string;
    slug: string;
  }>;
}

@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation)
    private readonly translationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation) private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {}

  async findAll(query: AdminCategoriesQueryDto) {
    const categories = await this.buildCategoryViews();
    const search = query.search.trim().toLocaleLowerCase();

    const filtered = categories.filter(category => {
      const matchesSearch = !search || [
        category.slug,
        ...category.translations.flatMap(item => [item.name, item.slug]),
      ].some(value => value.toLocaleLowerCase().includes(search));
      const matchesStatus = query.status === 'all'
        || (query.status === 'active') === category.isActive;
      const matchesPosts = query.postFilter === 'all'
        || (query.postFilter === 'with-posts' ? category.postCount > 0 : category.postCount === 0);
      return matchesSearch && matchesStatus && matchesPosts;
    });

    filtered.sort((left, right) => {
      if (query.sort === 'oldest') {
        return left.createdAt.getTime() - right.createdAt.getTime();
      }
      if (query.sort === 'name') {
        return this.displayName(left).localeCompare(this.displayName(right));
      }
      if (query.sort === 'posts') {
        return right.postCount - left.postCount || this.displayName(left).localeCompare(this.displayName(right));
      }
      return right.createdAt.getTime() - left.createdAt.getTime();
    });

    const start = (query.page - 1) * query.limit;
    return {
      data: filtered.slice(start, start + query.limit),
      meta: {
        pagination: {
          total: filtered.length,
          page: query.page,
          limit: query.limit,
          totalPages: Math.ceil(filtered.length / query.limit),
        },
      },
    };
  }

  async findOne(categoryId: number) {
    const categories = await this.buildCategoryViews([categoryId]);
    if (!categories[0]) {
      throw new NotFoundException('Category not found');
    }
    return categories[0];
  }

  async findPosts(categoryId: number, languageCode?: string) {
    const category = await this.categoryModel.findByPk(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const languages = await this.languageModel.findAll();
    const selectedLanguage = languageCode
      ? languages.find(language => language.code === languageCode)
      : languages.find(language => language.is_default);
    if (!selectedLanguage) {
      return { data: [], meta: { total: 0, shown: 0 } };
    }

    const translations = (await this.postTranslationModel.findAll({
      where: {
        language_id: selectedLanguage.id,
        title: { [Op.ne]: null },
      },
    })).filter(item => Boolean(item.title?.trim()));
    if (!translations.length) {
      return { data: [], meta: { total: 0, shown: 0 } };
    }

    const translatedPostIds = translations.map(item => item.post_id);
    const where = {
      category_id: categoryId,
      deleted_at: null,
      id: { [Op.in]: translatedPostIds },
    };
    const [posts, total] = await Promise.all([
      this.postModel.findAll({
        where,
        order: [['published_at', 'DESC'], ['updated_at', 'DESC']],
        limit: 10,
      }),
      this.postModel.count({ where }),
    ]);
    if (!posts.length) {
      return { data: [], meta: { total: 0, shown: 0 } };
    }

    const authorIds = [...new Set(posts.map(post => post.author_id))];
    const authors = await this.userModel.findAll({ where: { id: { [Op.in]: authorIds } } });
    const translationMap = new Map(translations.map(item => [item.post_id, item]));
    const authorMap = new Map(authors.map(author => [author.id, author]));

    return {
      data: posts.map(post => {
        const translation = translationMap.get(post.id);
        const author = authorMap.get(post.author_id);
        return {
          id: post.id,
          title: translation!.title!,
          slug: translation?.slug ?? null,
          authorName: author?.display_name || author?.username || 'Unknown author',
          status: post.status,
          publishedAt: post.published_at ?? post.updated_at,
        };
      }),
      meta: { total, shown: posts.length },
    };
  }

  async create(dto: CreateAdminCategoryDto) {
    try {
      const categoryId = await this.sequelize.transaction(async transaction => {
        const activeLanguages = await this.languageModel.findAll({
          where: { is_active: true },
          order: [['is_default', 'DESC'], ['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        this.assertCreateLanguages(dto.translations, activeLanguages);

        const defaultLanguage = activeLanguages.find(language => language.is_default) ?? activeLanguages[0];
        const defaultTranslation = dto.translations.find(item => item.languageId === defaultLanguage.id)!;
        const categorySlug = this.slugify(dto.slug || defaultTranslation.slug || defaultTranslation.name);
        await this.assertCategorySlugAvailable(categorySlug, undefined, transaction);

        const now = new Date();
        const category = await this.categoryModel.create({
          slug: categorySlug,
          status: dto.isActive === false ? 'inactive' : 'active',
          created_at: now,
          updated_at: now,
        }, { transaction });

        await this.translationModel.bulkCreate(
          dto.translations.map(item => ({
            category_id: category.id,
            language_id: item.languageId,
            name: item.name.trim(),
            slug: this.slugify(item.slug || item.name),
          })),
          { transaction, individualHooks: true },
        );
        return category.id;
      });
      return this.findOne(categoryId);
    } catch (error) {
      this.rethrowConstraint(error);
    }
  }

  async update(categoryId: number, dto: UpdateAdminCategoryDto) {
    if (dto.slug === undefined && dto.isActive === undefined && dto.translations === undefined) {
      throw new BadRequestException('Provide at least one category field to update');
    }

    try {
      await this.sequelize.transaction(async transaction => {
        const category = await this.categoryModel.findByPk(categoryId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }

        const translations = dto.translations ?? [];
        if (translations.length) {
          const languageIds = translations.map(item => item.languageId);
          const configuredLanguages = await this.languageModel.findAll({
            where: { id: { [Op.in]: languageIds } },
            transaction,
          });
          if (configuredLanguages.length !== new Set(languageIds).size) {
            throw new BadRequestException('One or more category languages do not exist');
          }

          const existingTranslations = await this.translationModel.findAll({
            where: { category_id: categoryId },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
          for (const item of translations) {
            const existing = existingTranslations.find(row => row.language_id === item.languageId);
            const values = {
              name: item.name.trim(),
              slug: this.slugify(item.slug || item.name),
            };
            if (existing) {
              await existing.update(values, { transaction });
            } else {
              await this.translationModel.create({
                category_id: categoryId,
                language_id: item.languageId,
                ...values,
              }, { transaction });
            }
          }
        }

        let categorySlug = dto.slug ? this.slugify(dto.slug) : category.slug;
        if (!dto.slug && translations.length) {
          const defaultLanguage = await this.languageModel.findOne({
            where: { is_default: true },
            transaction,
          });
          const defaultTranslation = defaultLanguage
            ? translations.find(item => item.languageId === defaultLanguage.id)
            : undefined;
          if (defaultTranslation) {
            categorySlug = this.slugify(defaultTranslation.slug || defaultTranslation.name);
          }
        }
        await this.assertCategorySlugAvailable(categorySlug, categoryId, transaction);
        await category.update({
          slug: categorySlug,
          status: dto.isActive === undefined
            ? category.status
            : (dto.isActive ? 'active' : 'inactive'),
          updated_at: new Date(),
        }, { transaction });
      });
      return this.findOne(categoryId);
    } catch (error) {
      this.rethrowConstraint(error);
    }
  }

  async remove(categoryId: number): Promise<void> {
    await this.sequelize.transaction(async transaction => {
      const category = await this.categoryModel.findByPk(categoryId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      await category.destroy({ transaction });
    });
  }

  private async buildCategoryViews(categoryIds?: number[]): Promise<CategoryView[]> {
    const categoryWhere = categoryIds?.length ? { id: { [Op.in]: categoryIds } } : undefined;
    const categories = await this.categoryModel.findAll({ where: categoryWhere });
    if (!categories.length) {
      return [];
    }

    const ids = categories.map(category => category.id);
    const [translations, languages, rawPostCounts] = await Promise.all([
      this.translationModel.findAll({ where: { category_id: { [Op.in]: ids } } }),
      this.languageModel.findAll(),
      this.postModel.findAll({
        attributes: ['category_id', [fn('COUNT', '*'), 'count']],
        where: { category_id: { [Op.in]: ids }, deleted_at: null },
        group: ['category_id'],
        raw: true,
      }) as unknown as Promise<Array<{ category_id: number; count: string | number }>>,
    ]);

    const languageMap = new Map(languages.map(language => [language.id, language]));
    const countMap = new Map(rawPostCounts.map(row => [Number(row.category_id), Number(row.count)]));
    return categories.map(category => ({
      id: category.id,
      slug: category.slug,
      isActive: category.status === 'active',
      createdAt: category.created_at,
      updatedAt: category.updated_at,
      postCount: countMap.get(category.id) ?? 0,
      translations: translations
        .filter(item => item.category_id === category.id)
        .map(item => {
          const language = languageMap.get(item.language_id);
          return {
            id: item.id,
            languageId: item.language_id,
            languageCode: language?.code ?? '',
            languageName: language?.name ?? '',
            languageNativeName: language?.native_name ?? '',
            flagCode: language?.flag_code ?? null,
            name: item.name,
            slug: item.slug,
          };
        })
        .sort((left, right) => left.languageCode.localeCompare(right.languageCode)),
    }));
  }

  private assertCreateLanguages(
    translations: CategoryTranslationInputDto[],
    activeLanguages: Language[],
  ): void {
    if (!activeLanguages.length) {
      throw new BadRequestException('Configure at least one active language first');
    }
    const submitted = new Set(translations.map(item => item.languageId));
    if (activeLanguages.some(language => !submitted.has(language.id)) || submitted.size !== activeLanguages.length) {
      throw new BadRequestException('Provide one translation for every active language');
    }
  }

  private async assertCategorySlugAvailable(
    slug: string,
    ignoredCategoryId: number | undefined,
    transaction: Transaction,
  ): Promise<void> {
    const existing = await this.categoryModel.findOne({
      where: {
        slug,
        ...(ignoredCategoryId ? { id: { [Op.ne]: ignoredCategoryId } } : {}),
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      throw new ConflictException('Category slug already exists');
    }
  }

  private displayName(category: CategoryView): string {
    return category.translations[0]?.name ?? category.slug;
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

  private rethrowConstraint(error: unknown): never {
    if (error instanceof UniqueConstraintError) {
      throw new ConflictException('Category slug or language translation already exists');
    }
    throw error;
  }
}
