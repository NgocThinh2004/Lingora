import { ConfigService } from '@nestjs/config';
import { TranslationsService } from './translations.service';
import { TranslationProviderService } from './translation-provider.service';

function modelRecord<T extends object>(values: T): T & { update: jest.Mock } {
  const record = { ...values } as Record<string, unknown>;
  record.update = jest.fn(async (next: Partial<T>): Promise<Record<string, unknown>> => {
      Object.assign(record, next);
      return record;
    });
  return record as T & { update: jest.Mock };
}

describe('TranslationsService worker', () => {
  const source = modelRecord({
    id: '10',
    post_id: '1',
    language_id: 1,
    title: 'Source title',
    content: '<p>Source content</p>',
    translation_status: 'completed',
  });

  function buildService(providerResults: Array<Record<string, unknown>>) {
    const target = modelRecord({
      id: '11',
      post_id: '1',
      language_id: 2,
      title: null,
      slug: null,
      content: null,
      translation_status: 'queued',
      translation_provider: null,
      updated_at: new Date(),
    });
    let queued = true;
    let transactionTail = Promise.resolve();
    const sequelize = {
      transaction: jest.fn((callback: (transaction: any) => Promise<unknown>) => {
        const run = transactionTail.then(() =>
          callback({ LOCK: { UPDATE: 'UPDATE' } }),
        );
        transactionTail = run.then(() => undefined, () => undefined);
        return run;
      }),
    };
    const postModel = {
      findOne: jest.fn(async () => ({
        id: '1',
        author_id: '7',
        original_language_id: 1,
      })),
    };
    const postTranslationModel = {
      findOne: jest.fn(async (options: any) => {
        if (options.where.translation_status === 'queued') {
          if (!queued || target.translation_status !== 'queued') return null;
          queued = false;
          return target;
        }
        if (options.where.id === target.id) return target;
        if (options.where.post_id === '1' && options.where.language_id === 1) return source;
        if (options.where.slug) return null;
        return null;
      }),
      update: jest.fn(async () => [1]),
    };
    const languageModel = {
      findByPk: jest.fn(async (id: number) => ({ id, code: id === 1 ? 'en' : 'vi' })),
    };
    const providerService = {
      translate: jest.fn(async () => providerResults.shift()),
    };
    const config = {
      get: jest.fn((key: string) =>
        key === 'TRANSLATION_PROVIDER_ORDER' ? 'first,second,third' : undefined,
      ),
    };

    const service = new TranslationsService(
      config as unknown as ConfigService,
      sequelize as any,
      providerService as unknown as TranslationProviderService,
      postModel as any,
      postTranslationModel as any,
      languageModel as any,
    );
    return {
      service,
      target,
      providerService,
      postTranslationModel,
    };
  }

  it('falls back in configured order and stops after the first success', async () => {
    const context = buildService([
      { ok: false, status: 'rate_limited', errorMessage: 'limited' },
      { ok: true, title: 'Translated', content: '<p>Translated</p>' },
      { ok: true, title: 'Must not run', content: 'Must not run' },
    ]);

    const result = await context.service.processNextQueuedTranslation();

    expect(result.processed).toBe(true);
    expect(context.providerService.translate).toHaveBeenCalledTimes(2);
    expect(context.providerService.translate.mock.calls.map((call: unknown[]) => call[0]))
      .toEqual(['first', 'second']);
    expect(context.target.translation_status).toBe('completed');
    expect(context.target.translation_provider).toBe('second');
  });

  it('does not let two workers process the same queued target', async () => {
    const context = buildService([
      { ok: true, title: 'Translated', content: '<p>Translated</p>' },
    ]);

    const [first, second] = await Promise.all([
      context.service.processNextQueuedTranslation(),
      context.service.processNextQueuedTranslation(),
    ]);

    expect([first.processed, second.processed].sort()).toEqual([false, true]);
    expect(context.providerService.translate).toHaveBeenCalledTimes(1);
  });

  it('requeues stale processing jobs so a restart does not lose them', async () => {
    const context = buildService([]);
    const recovered = await context.service.recoverStaleJobs();

    expect(recovered).toBe(1);
    expect(context.postTranslationModel.update).toHaveBeenCalledWith(
      expect.objectContaining({ translation_status: 'queued' }),
      expect.objectContaining({
        where: expect.objectContaining({ translation_status: 'processing' }),
      }),
    );
  });
});
