import { TranslationStatus } from './post.model';

export interface TranslationMatrixEntry {
  id: number;
  postId: number;
  languageId: number;
  title: string | null;
  slug: string | null;
  status: TranslationStatus;
  provider: string | null;
  updatedAt: string;
}

export interface TranslationAttempt {
  id: number;
  postTranslationId: number;
  provider: string;
  attemptOrder: number;
  status: 'success' | 'failed' | 'rate_limited' | 'timeout';
  errorMessage: string | null;
  charCount: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export type WorkerRunResult =
  | {
      processed: false;
      message: string;
    }
  | {
      processed: true;
      translation: TranslationMatrixEntry;
      attempts: TranslationAttempt[];
    };
