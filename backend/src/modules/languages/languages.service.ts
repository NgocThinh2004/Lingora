import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  AdminLanguagesQueryDto,
  CreateAdminLanguageDto,
  UpdateAdminLanguageDto,
} from './admin/dto/admin-languages.dto';
import { Language } from './models/language.model';
import {
  LanguageTranslationCoverage,
  TranslationMetricsService,
} from '../translations/translation-metrics.service';
import { CategoryAutoTranslationService } from '../categories/category-auto-translation.service';

@Injectable()
export class LanguagesService {
  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    private readonly translationMetricsService: TranslationMetricsService,
    private readonly categoryAutoTranslation: CategoryAutoTranslationService,
  ) {}

  async findActive() {
    const languages = await this.languageModel.findAll({
      where: { is_active: true },
      order: [['is_default', 'DESC'], ['code', 'ASC']],
    });

    return languages.map(language => this.toPublicLanguage(language));
  }

  async findAll(query: AdminLanguagesQueryDto) {
    const { rows, count } = await this.languageModel.findAndCountAll({
      order: [['is_default', 'DESC'], ['code', 'ASC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });
    const coverageByLanguage = await this.translationMetricsService.getLanguageCoverage(
      rows.map(language => language.id),
    );

    return {
      data: rows.map(language => this.toAdminLanguage(
        language,
        coverageByLanguage.get(language.id),
      )),
      meta: {
        total: count,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(count / query.limit),
      },
    };
  }

  async findOne(languageId: number) {
    const language = await this.languageModel.findByPk(languageId);
    if (!language) {
      throw new NotFoundException('Language not found');
    }
    const coverageByLanguage = await this.translationMetricsService.getLanguageCoverage([language.id]);
    return this.toAdminLanguage(language, coverageByLanguage.get(language.id));
  }

  async create(dto: CreateAdminLanguageDto) {
    try {
      const shouldActivate = dto.isActive !== false || dto.isDefault === true;
      const language = await this.sequelize.transaction(async transaction => {
        const duplicate = await this.languageModel.findOne({
          where: { code: dto.code },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (duplicate) {
          throw new ConflictException('Language code already exists');
        }

        const configuredLanguages = await this.languageModel.findAll({
          order: [['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const isDefault = dto.isDefault === true || configuredLanguages.length === 0;

        if (isDefault) {
          await this.languageModel.update(
            { is_default: false },
            { where: { is_default: true }, transaction },
          );
        }

        const isActive = shouldActivate || isDefault;
        const now = new Date();

        const language = await this.languageModel.create(
          {
            code: dto.code,
            name: dto.name,
            native_name: dto.nativeName,
            flag_code: dto.flagCode ?? null,
            is_default: isDefault,
            is_active: isActive,
            activated_at: isActive ? now : null,
          },
          { transaction },
        );
        await this.categoryAutoTranslation.createMissingTranslationsForLanguage(language, transaction);
        return language;
      });
      return this.toAdminLanguage(language);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException('Language code already exists');
      }
      throw error;
    }
  }

  async update(languageId: number, dto: UpdateAdminLanguageDto) {
    if (
      dto.name === undefined
      && dto.nativeName === undefined
      && dto.flagCode === undefined
      && dto.isDefault === undefined
      && dto.isActive === undefined
    ) {
      throw new BadRequestException('Provide at least one language field to update');
    }

    const current = await this.languageModel.findByPk(languageId);
    if (!current) {
      throw new NotFoundException('Language not found');
    }
    const language = await this.sequelize.transaction(async transaction => {
      const configuredLanguages = await this.languageModel.findAll({
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const language = configuredLanguages.find(item => item.id === languageId);
      if (!language) {
        throw new NotFoundException('Language not found');
      }

      if (language.is_default && dto.isDefault === false) {
        throw new BadRequestException('Choose another default language instead of unsetting the current default');
      }
      if (language.is_default && dto.isActive === false) {
        throw new BadRequestException('The default language cannot be disabled');
      }

      const makeDefault = dto.isDefault === true;
      if (makeDefault) {
        await this.languageModel.update(
          { is_default: false },
          { where: { is_default: true }, transaction },
        );
      }

      const wasActive = language.is_active;
      await language.update(
        {
          name: dto.name ?? language.name,
          native_name: dto.nativeName ?? language.native_name,
          flag_code: dto.flagCode ?? language.flag_code,
          is_default: makeDefault ? true : language.is_default,
          is_active: makeDefault ? true : (dto.isActive ?? language.is_active),
          activated_at: (makeDefault || dto.isActive === true) && !language.activated_at
            ? new Date()
            : language.activated_at,
        },
        { transaction },
      );
      if (!wasActive && language.is_active) {
        await this.categoryAutoTranslation.createMissingTranslationsForLanguage(language, transaction);
      }

      return language;
    });
    return this.toAdminLanguage(language);
  }

  private toAdminLanguage(
    language: Language,
    coverage?: LanguageTranslationCoverage,
  ) {
    return {
      id: language.id,
      code: language.code,
      name: language.name,
      nativeName: language.native_name,
      flagCode: language.flag_code,
      isDefault: language.is_default,
      isActive: language.is_active,
      activatedAt: language.activated_at,
      translationCoverage: {
        translatedPosts: coverage?.translatedPosts ?? 0,
        totalPosts: coverage?.totalPosts ?? 0,
        percent: coverage?.percent ?? 0,
        available: true,
      },
    };
  }

  private toPublicLanguage(language: Language) {
    return {
      code: language.code,
      name: language.name,
      nativeName: language.native_name,
      flagCode: language.flag_code,
      isDefault: language.is_default,
    };
  }
}
