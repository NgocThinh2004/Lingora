import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

const CATEGORY_CACHE_VERSION_KEY = 'categories:version';
const CATEGORY_CACHE_TTL_MS = 300_000;
const CATEGORY_VERSION_TTL_MS = 86_400_000;
const REDIS_TIMEOUT_MS = 100;
const REDIS_RETRY_DELAY_MS = 30_000;

@Injectable()
export class CategoriesCacheService {
  private localVersion = Date.now();
  private redisUnavailableUntil = 0;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async getOrLoad<T>(segment: string, loader: () => Promise<T>): Promise<T> {
    const version = await this.getCurrentVersion();
    const key = `categories:${version}:${segment}`;
    const cached = await this.tryCacheOperation(() => this.cacheManager.get<T>(key));

    if (cached.ok && cached.value !== undefined && cached.value !== null) {
      return cached.value;
    }

    const value = await loader();
    await this.tryCacheOperation(() => this.cacheManager.set(key, value, CATEGORY_CACHE_TTL_MS));
    return value;
  }

  async invalidate(): Promise<void> {
    this.localVersion = Math.max(Date.now(), this.localVersion + 1);
    await this.tryCacheOperation(() => this.cacheManager.set(
      CATEGORY_CACHE_VERSION_KEY,
      String(this.localVersion),
      CATEGORY_VERSION_TTL_MS,
    ));
  }

  private async getCurrentVersion(): Promise<number> {
    const result = await this.tryCacheOperation(
      () => this.cacheManager.get<string | number>(CATEGORY_CACHE_VERSION_KEY),
    );

    if (result.ok && result.value !== undefined && result.value !== null) {
      const remoteVersion = Number(result.value);
      if (Number.isFinite(remoteVersion)) {
        if (remoteVersion > this.localVersion) {
          this.localVersion = remoteVersion;
        } else if (remoteVersion < this.localVersion) {
          await this.tryCacheOperation(() => this.cacheManager.set(
            CATEGORY_CACHE_VERSION_KEY,
            String(this.localVersion),
            CATEGORY_VERSION_TTL_MS,
          ));
        }
        return this.localVersion;
      }
    }

    if (result.ok) {
      await this.tryCacheOperation(() => this.cacheManager.set(
        CATEGORY_CACHE_VERSION_KEY,
        String(this.localVersion),
        CATEGORY_VERSION_TTL_MS,
      ));
    }
    return this.localVersion;
  }

  private async tryCacheOperation<T>(operation: () => Promise<T>): Promise<
    { ok: true; value: T } | { ok: false }
  > {
    if (Date.now() < this.redisUnavailableUntil) {
      return { ok: false };
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Cache operation timed out')), REDIS_TIMEOUT_MS);
        }),
      ]);
      return { ok: true, value };
    } catch {
      this.redisUnavailableUntil = Date.now() + REDIS_RETRY_DELAY_MS;
      return { ok: false };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
