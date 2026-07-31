import { QueryTypes } from 'sequelize';
import { TranslationMetricsService } from './translation-metrics.service';

describe('TranslationMetricsService', () => {
  it('calculates completed target coverage returned by the aggregate query', async () => {
    const sequelize = {
      query: jest.fn().mockResolvedValue([
        { languageId: '2', translatedPosts: '3', totalPosts: '4' },
        { languageId: 3, translatedPosts: 0, totalPosts: 2 },
      ]),
    };
    const service = new TranslationMetricsService(sequelize as never);

    const result = await service.getLanguageCoverage([2, 3]);

    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("p.status IN ('approved', 'published')"),
      {
        replacements: { languageIds: [2, 3] },
        type: QueryTypes.SELECT,
      },
    );
    expect(result.get(2)).toEqual({
      translatedPosts: 3,
      totalPosts: 4,
      percent: 75,
    });
    expect(result.get(3)).toEqual({
      translatedPosts: 0,
      totalPosts: 2,
      percent: 0,
    });
  });

  it('does not query the database when there are no languages', async () => {
    const sequelize = { query: jest.fn() };
    const service = new TranslationMetricsService(sequelize as never);

    await expect(service.getLanguageCoverage([])).resolves.toEqual(new Map());
    expect(sequelize.query).not.toHaveBeenCalled();
  });
});
