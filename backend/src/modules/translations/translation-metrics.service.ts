import { Injectable } from '@nestjs/common';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

export type LanguageTranslationCoverage = {
  translatedPosts: number;
  totalPosts: number;
  percent: number;
};

type LanguageCoverageRow = {
  languageId: number | string;
  translatedPosts: number | string;
  totalPosts: number | string;
};

@Injectable()
export class TranslationMetricsService {
  constructor(private readonly sequelize: Sequelize) {}

  async getLanguageCoverage(
    languageIds: readonly number[],
  ): Promise<Map<number, LanguageTranslationCoverage>> {
    if (!languageIds.length) {
      return new Map();
    }

    const rows = await this.sequelize.query<LanguageCoverageRow>(
      `SELECT
         pt.language_id AS languageId,
         COUNT(DISTINCT pt.post_id) AS totalPosts,
         COUNT(DISTINCT CASE
           WHEN pt.translation_status = 'completed' THEN pt.post_id
         END) AS translatedPosts
       FROM post_translations pt
       INNER JOIN posts p ON p.id = pt.post_id
       WHERE pt.language_id IN (:languageIds)
         AND p.original_language_id <> pt.language_id
         AND p.status IN ('approved', 'published')
         AND p.deleted_at IS NULL
       GROUP BY pt.language_id`,
      {
        replacements: { languageIds: [...languageIds] },
        type: QueryTypes.SELECT,
      },
    );

    return new Map(rows.map(row => {
      const languageId = Number(row.languageId);
      const totalPosts = Number(row.totalPosts);
      const translatedPosts = Math.min(Number(row.translatedPosts), totalPosts);
      return [languageId, {
        translatedPosts,
        totalPosts,
        percent: totalPosts ? Math.round((translatedPosts / totalPosts) * 100) : 0,
      }];
    }));
  }
}
