export const TRANSLATION_STATUSES = ['not_started', 'queued', 'processing', 'completed', 'failed'] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUSES)[number];

export const TRANSLATION_ATTEMPT_STATUSES = ['success', 'failed', 'rate_limited', 'timeout'] as const;
export type TranslationAttemptStatus = (typeof TRANSLATION_ATTEMPT_STATUSES)[number];

export const DEFAULT_TRANSLATION_PROVIDER_ORDER = ['mock'] as const;

export const DEFAULT_TRANSLATION_WORKER_INTERVAL_MS = 5000;
export const DEFAULT_TRANSLATION_JOB_STALE_MS = 5 * 60 * 1000;
export const DEFAULT_TRANSLATION_PROVIDER_TIMEOUT_MS = 15_000;
