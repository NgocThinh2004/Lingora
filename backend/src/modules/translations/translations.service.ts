import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Language, Post, PostTranslation, TranslationAttempt } from '../../database/models';
import {
  DEFAULT_TRANSLATION_PROVIDER_ORDER,
  TranslationAttemptStatus,
  TranslationStatus,
} from './translations.constants';

type TranslationMetricSource = {
  translation_status: TranslationStatus;
};

type TranslationMatrixItem = {
  id: string;
  postId: string;
  languageId: number;
  title: string | null;
  slug: string | null;
  status: TranslationStatus;
  provider: string | null;
  updatedAt: Date;
};

type TranslationAttemptResponse = {
  id: string;
  postTranslationId: string;
  provider: string;
  attemptOrder: number;
  status: TranslationAttemptStatus;
  errorMessage: string | null;
  charCount: number | null;
  startedAt: Date;
  finishedAt: Date | null;
};

type WorkerRunResult =
  | {
      processed: false;
      message: string;
    }
  | {
      processed: true;
      translation: TranslationMatrixItem;
      attempts: TranslationAttemptResponse[];
    };

type ProviderResult =
  | {
      ok: true;
      title: string;
      summary: string | null;
      content: string;
    }
  | {
      ok: false;
      status: Exclude<TranslationAttemptStatus, 'success'>;
      errorMessage: string;
    };

@Injectable()
export class TranslationsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sequelize: Sequelize,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation) private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(TranslationAttempt) private readonly translationAttemptModel: typeof TranslationAttempt,
    @InjectModel(Language) private readonly languageModel: typeof Language,
  ) {}

  getProviderOrder(): string[] {
    const configuredProviders = this.configService.get<string>('TRANSLATION_PROVIDER_ORDER');
    const providers = configuredProviders
      ?.split(',')
      .map((provider) => provider.trim())
      .filter(Boolean);

    return providers?.length ? providers : [...DEFAULT_TRANSLATION_PROVIDER_ORDER];
  }

  getNextAttemptOrder(existingAttemptCount: number): number {
    return existingAttemptCount + 1;
  }

  buildStatusMetrics(translations: TranslationMetricSource[]): Record<TranslationStatus, number> {
    return translations.reduce(
      (metrics, translation) => {
        metrics[translation.translation_status] += 1;
        return metrics;
      },
      {
        not_started: 0,
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      } satisfies Record<TranslationStatus, number>,
    );
  }

  async getPostMatrix(postId: string): Promise<TranslationMatrixItem[]> {
    const post = await this.findPostOrThrow(postId);
    const translations = await this.postTranslationModel.findAll({
      where: { post_id: post.id },
      order: [['language_id', 'ASC']],
    });

    return translations.map((translation) => this.toMatrixItem(translation));
  }

  async getMetrics(): Promise<Record<TranslationStatus, number>> {
    const translations = await this.postTranslationModel.findAll({
      attributes: ['translation_status'],
    });

    return this.buildStatusMetrics(translations);
  }

  async getAttempts(postTranslationId: string): Promise<TranslationAttemptResponse[]> {
    await this.findPostTranslationOrThrow(postTranslationId);
    const attempts = await this.translationAttemptModel.findAll({
      where: { post_translation_id: postTranslationId },
      order: [['attempt_order', 'ASC']],
    });

    return attempts.map((attempt) => this.toAttemptResponse(attempt));
  }

  async retryTranslation(postTranslationId: string): Promise<TranslationMatrixItem> {
    return this.sequelize.transaction(async (transaction) => {
      const translation = await this.findPostTranslationOrThrow(postTranslationId, transaction, true);
      if (translation.translation_status !== 'failed') {
        throw new BadRequestException('Only failed translations can be retried');
      }

      await translation.update(
        {
          translation_status: 'queued',
          translation_provider: null,
          updated_at: new Date(),
        },
        { transaction },
      );

      return this.toMatrixItem(translation);
    });
  }

  async processNextQueuedTranslation(): Promise<WorkerRunResult> {
    return this.sequelize.transaction(async (transaction) => {
      const target = await this.postTranslationModel.findOne({
        where: { translation_status: 'queued' },
        order: [['updated_at', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!target) {
        return {
          processed: false,
          message: 'No queued translation jobs',
        };
      }

      await target.update(
        {
          translation_status: 'processing',
          updated_at: new Date(),
        },
        { transaction },
      );

      const post = await this.findPostOrThrow(target.post_id, transaction);
      const source = await this.postTranslationModel.findOne({
        where: {
          post_id: post.id,
          language_id: post.original_language_id,
        },
        transaction,
      });

      if (!source?.title || !source.content) {
        await target.update(
          {
            translation_status: 'failed',
            updated_at: new Date(),
          },
          { transaction },
        );
        throw new BadRequestException('Source translation must have title and content before worker processing');
      }

      const targetLanguage = await this.languageModel.findByPk(target.language_id, { transaction });
      const sourceLanguage = await this.languageModel.findByPk(source.language_id, { transaction });
      const attempts: TranslationAttemptResponse[] = [];
      const existingAttemptCount = await this.translationAttemptModel.count({
        where: { post_translation_id: target.id },
        transaction,
      });
      let attemptOrder = this.getNextAttemptOrder(existingAttemptCount);

      for (const provider of this.getProviderOrder()) {
        const startedAt = new Date();
        const result = this.callProvider(provider, {
          source,
          sourceLanguageCode: sourceLanguage?.code ?? String(source.language_id),
          targetLanguageCode: targetLanguage?.code ?? String(target.language_id),
        });
        const finishedAt = new Date();
        const attempt = await this.translationAttemptModel.create(
          {
            post_translation_id: target.id,
            provider,
            attempt_order: attemptOrder,
            status: result.ok ? 'success' : result.status,
            error_message: result.ok ? null : result.errorMessage,
            char_count: this.countTranslationCharacters(source),
            started_at: startedAt,
            finished_at: finishedAt,
          },
          { transaction },
        );
        attempts.push(this.toAttemptResponse(attempt));
        attemptOrder += 1;

        if (result.ok) {
          await target.update(
            {
              title: result.title,
              slug: await this.generateUniqueSlug(result.title, target.language_id, target.id, transaction),
              summary: result.summary,
              content: result.content,
              translation_status: 'completed',
              translation_provider: provider,
              updated_at: new Date(),
            },
            { transaction },
          );

          return {
            processed: true,
            translation: this.toMatrixItem(target),
            attempts,
          };
        }
      }

      await target.update(
        {
          translation_status: 'failed',
          updated_at: new Date(),
        },
        { transaction },
      );

      return {
        processed: true,
        translation: this.toMatrixItem(target),
        attempts,
      };
    });
  }

  private callProvider(
    provider: string,
    context: {
      source: PostTranslation;
      sourceLanguageCode: string;
      targetLanguageCode: string;
    },
  ): ProviderResult {
    if (provider === 'mock-fail') {
      return {
        ok: false,
        status: 'failed',
        errorMessage: 'Mock provider forced failure',
      };
    }

    if (provider === 'mock-rate-limit') {
      return {
        ok: false,
        status: 'rate_limited',
        errorMessage: 'Mock provider forced rate limit',
      };
    }

    if (provider === 'mock-timeout') {
      return {
        ok: false,
        status: 'timeout',
        errorMessage: 'Mock provider forced timeout',
      };
    }

    return {
      ok: true,
      title: `[${context.targetLanguageCode}] ${context.source.title ?? ''}`,
      summary: context.source.summary ? `[${context.targetLanguageCode}] ${context.source.summary}` : null,
      content: `<p><strong>Mock ${context.sourceLanguageCode} to ${context.targetLanguageCode}</strong></p>${context.source.content ?? ''}`,
    };
  }

  private async findPostOrThrow(postId: string, transaction?: Transaction): Promise<Post> {
    const post = await this.postModel.findOne({
      where: {
        id: postId,
        deleted_at: null,
      },
      transaction,
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  private async findPostTranslationOrThrow(
    postTranslationId: string,
    transaction?: Transaction,
    lock = false,
  ): Promise<PostTranslation> {
    const translation = await this.postTranslationModel.findOne({
      where: { id: postTranslationId },
      transaction,
      lock: lock && transaction ? transaction.LOCK.UPDATE : undefined,
    });

    if (!translation) {
      throw new NotFoundException('Post translation not found');
    }

    return translation;
  }

  private countTranslationCharacters(source: PostTranslation): number {
    return [source.title, source.summary, source.content]
      .filter(Boolean)
      .join('')
      .length;
  }

  private async generateUniqueSlug(
    title: string,
    languageId: number,
    excludeTranslationId: string,
    transaction: Transaction,
  ): Promise<string> {
    const baseSlug = this.slugify(title).slice(0, 180) || 'translation';

    for (let index = 0; index < 100; index += 1) {
      const candidate = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
      const existing = await this.postTranslationModel.findOne({
        where: {
          slug: candidate,
          language_id: languageId,
          id: { [Op.ne]: excludeTranslationId },
        },
        transaction,
      });

      if (!existing) {
        return candidate;
      }
    }

    return `${baseSlug}-${Date.now()}`;
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private toMatrixItem(translation: PostTranslation): TranslationMatrixItem {
    return {
      id: translation.id,
      postId: translation.post_id,
      languageId: translation.language_id,
      title: translation.title,
      slug: translation.slug,
      status: translation.translation_status,
      provider: translation.translation_provider,
      updatedAt: translation.updated_at,
    };
  }

  private toAttemptResponse(attempt: TranslationAttempt): TranslationAttemptResponse {
    return {
      id: attempt.id,
      postTranslationId: attempt.post_translation_id,
      provider: attempt.provider,
      attemptOrder: attempt.attempt_order,
      status: attempt.status,
      errorMessage: attempt.error_message,
      charCount: attempt.char_count,
      startedAt: attempt.started_at,
      finishedAt: attempt.finished_at,
    };
  }
}
