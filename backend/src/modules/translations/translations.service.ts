import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { Language, Post, PostTranslation } from '../../database/models';
import { PreviewTranslationDto } from './dto/preview-translation.dto';
import { QueueTranslationDto } from './dto/queue-translation.dto';
import {
  DEFAULT_TRANSLATION_JOB_STALE_MS,
  DEFAULT_TRANSLATION_PROVIDER_ORDER,
  DEFAULT_TRANSLATION_WORKER_INTERVAL_MS,
  TranslationAttemptStatus,
  TranslationStatus,
} from './translations.constants';
import {
  TranslationProviderRequest,
  TranslationProviderService,
} from './translation-provider.service';

export type TranslationMatrixItem = {
  id: string;
  postId: string;
  languageId: number;
  title: string | null;
  slug: string | null;
  content: string | null;
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
  | { processed: false; message: string }
  | {
      processed: true;
      translation: TranslationMatrixItem;
      attempts: TranslationAttemptResponse[];
    };

@Injectable()
export class TranslationsService implements OnModuleInit, OnModuleDestroy {
  private workerTimer: NodeJS.Timeout | null = null;
  private workerBusy = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly sequelize: Sequelize,
    private readonly providerService: TranslationProviderService,
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation) private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.recoverStaleJobs();
    if (!this.workerEnabled()) {
      return;
    }

    const intervalMs = this.positiveConfigNumber(
      'TRANSLATION_WORKER_INTERVAL_MS',
      DEFAULT_TRANSLATION_WORKER_INTERVAL_MS,
    );
    this.workerTimer = setInterval(() => void this.runWorkerCycle(), intervalMs);
    this.workerTimer.unref();
    void this.runWorkerCycle();
  }

  onModuleDestroy(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }

  getProviderOrder(): string[] {
    const configured =
      this.configService.get<string>('TRANSLATION_PROVIDER_ORDER') ||
      this.configService.get<string>('TRANSLATION_PROVIDER');
    const providers = configured
      ?.split(',')
      .map(provider => provider.trim())
      .filter(Boolean);

    return providers?.length ? [...new Set(providers)] : [...DEFAULT_TRANSLATION_PROVIDER_ORDER];
  }

  buildStatusMetrics(
    translations: Array<{ translation_status: TranslationStatus }>,
  ): Record<TranslationStatus, number> {
    return translations.reduce(
      (metrics, translation) => {
        metrics[translation.translation_status] += 1;
        return metrics;
      },
      { not_started: 0, queued: 0, processing: 0, completed: 0, failed: 0 },
    );
  }

  async getPostMatrix(
    postId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<TranslationMatrixItem[]> {
    await this.assertPostAccess(postId, userId, isAdmin);
    const translations = await this.postTranslationModel.findAll({
      where: { post_id: postId },
      order: [['language_id', 'ASC']],
    });
    return translations.map(translation => this.toMatrixItem(translation));
  }

  async getTranslationPreview(
    postId: string,
    languageId: number,
    userId: string,
    isAdmin: boolean,
  ): Promise<TranslationMatrixItem> {
    await this.assertPostAccess(postId, userId, isAdmin);
    const translation = await this.postTranslationModel.findOne({
      where: { post_id: postId, language_id: languageId },
    });
    if (!translation) {
      throw new NotFoundException('Translation target not found');
    }
    return this.toMatrixItem(translation);
  }

  async preview(dto: PreviewTranslationDto): Promise<{
    title: string;
    content: string;
    provider: string;
  }> {
    if (dto.sourceLanguageId === dto.targetLanguageId) {
      return { title: dto.title, content: dto.content, provider: 'source' };
    }

    const request = await this.buildProviderRequest(
      dto.title,
      dto.content,
      dto.sourceLanguageId,
      dto.targetLanguageId,
    );
    for (const provider of this.getProviderOrder()) {
      const result = await this.providerService.translate(provider, request);
      if (result.ok) {
        return { title: result.title, content: result.content, provider };
      }
    }
    throw new BadRequestException('All translation providers failed');
  }

  async queueTranslations(
    dto: QueueTranslationDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<TranslationMatrixItem[]> {
    const post = await this.assertPostAccess(dto.postId, userId, isAdmin);
    const languageIds = [...new Set(dto.targetLanguageIds)].filter(
      languageId => languageId !== post.original_language_id,
    );
    const now = new Date();

    await this.sequelize.transaction(async transaction => {
      for (const languageId of languageIds) {
        const [target] = await this.postTranslationModel.findOrCreate({
          where: { post_id: post.id, language_id: languageId },
          defaults: {
            post_id: post.id,
            language_id: languageId,
            title: null,
            slug: null,
            content: null,
            translation_status: 'queued',
            translation_provider: null,
            created_at: now,
            updated_at: now,
          },
          transaction,
        });
        if (target.translation_status !== 'completed' && target.translation_status !== 'processing') {
          await target.update(
            { translation_status: 'queued', translation_provider: null, updated_at: now },
            { transaction },
          );
        }
      }
    });

    return this.getPostMatrix(post.id, userId, isAdmin);
  }

  async getMetrics(): Promise<Record<TranslationStatus, number>> {
    const translations = await this.postTranslationModel.findAll({
      attributes: ['translation_status'],
    });
    return this.buildStatusMetrics(translations);
  }

  async getAttempts(
    postTranslationId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<TranslationAttemptResponse[]> {
    const translation = await this.findPostTranslationOrThrow(postTranslationId);
    await this.assertPostAccess(translation.post_id, userId, isAdmin);
    return [];
  }

  async retryTranslation(
    postTranslationId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<TranslationMatrixItem> {
    return this.sequelize.transaction(async transaction => {
      const translation = await this.findPostTranslationOrThrow(postTranslationId, transaction, true);
      await this.assertPostAccess(translation.post_id, userId, isAdmin, transaction);
      if (translation.translation_status !== 'failed') {
        throw new BadRequestException('Only failed translations can be retried');
      }
      await translation.update(
        { translation_status: 'queued', translation_provider: null, updated_at: new Date() },
        { transaction },
      );
      return this.toMatrixItem(translation);
    });
  }

  async recoverStaleJobs(): Promise<number> {
    const staleMs = this.positiveConfigNumber(
      'TRANSLATION_JOB_STALE_MS',
      DEFAULT_TRANSLATION_JOB_STALE_MS,
    );
    const [count] = await this.postTranslationModel.update(
      { translation_status: 'queued', translation_provider: null, updated_at: new Date() },
      {
        where: {
          translation_status: 'processing',
          updated_at: { [Op.lt]: new Date(Date.now() - staleMs) },
        },
      },
    );
    return count;
  }

  async processNextQueuedTranslation(): Promise<WorkerRunResult> {
    const targetId = await this.claimNextQueuedTranslation();
    if (!targetId) {
      return { processed: false, message: 'No queued translation jobs' };
    }

    const target = await this.findPostTranslationOrThrow(targetId);
    const post = await this.findPostOrThrow(target.post_id);
    const source = await this.postTranslationModel.findOne({
      where: { post_id: post.id, language_id: post.original_language_id },
    });
    const attempts: TranslationAttemptResponse[] = [];

    if (!source?.title || !source.content) {
      await target.update({ translation_status: 'failed', updated_at: new Date() });
      return { processed: true, translation: this.toMatrixItem(target), attempts };
    }

    const request = await this.buildProviderRequest(
      source.title,
      source.content,
      source.language_id,
      target.language_id,
    );

    for (const provider of this.getProviderOrder()) {
      const result = await this.providerService.translate(provider, request);

      if (result.ok) {
        const slug = await this.generateUniqueSlug(result.title, target.language_id, target.id);
        await target.update({
          title: result.title,
          slug,
          content: result.content,
          translation_status: 'completed',
          translation_provider: provider,
          updated_at: new Date(),
        });
        return { processed: true, translation: this.toMatrixItem(target), attempts };
      }
    }

    await target.update({ translation_status: 'failed', updated_at: new Date() });
    return { processed: true, translation: this.toMatrixItem(target), attempts };
  }

  private async claimNextQueuedTranslation(): Promise<string | null> {
    return this.sequelize.transaction(async transaction => {
      const target = await this.postTranslationModel.findOne({
        where: { translation_status: 'queued' },
        order: [['updated_at', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
        skipLocked: true,
      });
      if (!target) {
        return null;
      }
      await target.update(
        { translation_status: 'processing', updated_at: new Date() },
        { transaction },
      );
      return target.id;
    });
  }

  private async runWorkerCycle(): Promise<void> {
    if (this.workerBusy) {
      return;
    }
    this.workerBusy = true;
    try {
      while ((await this.processNextQueuedTranslation()).processed) {
        // Drain persisted jobs before waiting for the next interval.
      }
    } finally {
      this.workerBusy = false;
    }
  }

  private async buildProviderRequest(
    title: string,
    content: string,
    sourceLanguageId: number,
    targetLanguageId: number,
  ): Promise<TranslationProviderRequest> {
    const [sourceLanguage, targetLanguage] = await Promise.all([
      this.languageModel.findByPk(sourceLanguageId),
      this.languageModel.findByPk(targetLanguageId),
    ]);
    if (!sourceLanguage || !targetLanguage) {
      throw new BadRequestException('Source or target language is not active');
    }
    return {
      title,
      content,
      sourceLanguageCode: sourceLanguage.code,
      targetLanguageCode: targetLanguage.code,
    };
  }

  private async assertPostAccess(
    postId: string,
    userId: string,
    isAdmin: boolean,
    transaction?: Transaction,
  ): Promise<Post> {
    const post = await this.findPostOrThrow(postId, transaction);
    if (!isAdmin && String(post.author_id) !== String(userId)) {
      throw new ForbiddenException('You cannot access translations for this post');
    }
    return post;
  }

  private async findPostOrThrow(postId: string, transaction?: Transaction): Promise<Post> {
    const post = await this.postModel.findOne({
      where: { id: postId },
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

  private async generateUniqueSlug(
    title: string,
    languageId: number,
    excludeTranslationId: string,
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
      .replace(/\u0111/g, 'd')
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
      content: translation.content,
      status: translation.translation_status,
      provider: translation.translation_provider,
      updatedAt: translation.updated_at,
    };
  }

  private workerEnabled(): boolean {
    return this.configService.get<string>('TRANSLATION_WORKER_ENABLED')?.toLowerCase() !== 'false';
  }

  private positiveConfigNumber(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
