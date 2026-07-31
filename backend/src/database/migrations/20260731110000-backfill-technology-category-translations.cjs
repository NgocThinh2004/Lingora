'use strict';

const TECHNOLOGY_TRANSLATIONS = {
  en: { name: 'Technology', slug: 'technology' },
  vi: { name: 'Công nghệ', slug: 'cong-nghe' },
  es: { name: 'Tecnología', slug: 'tecnologia' },
  fr: { name: 'Technologie', slug: 'technologie' },
  ko: { name: '기술', slug: 'gisul' },
  zh: { name: '科技', slug: 'ke-ji' },
  ja: { name: 'テクノロジー', slug: 'technology-ja' },
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      const categories = await queryInterface.sequelize.query(
        `SELECT id
         FROM categories
         WHERE LOWER(TRIM(slug)) = 'technology'`,
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      if (!categories.length) return;

      const languages = await queryInterface.sequelize.query(
        `SELECT id, LOWER(TRIM(code)) AS code
         FROM languages`,
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const languageByCode = new Map(
        languages.map(language => [language.code, Number(language.id)]),
      );

      for (const category of categories) {
        const existingRows = await queryInterface.sequelize.query(
          `SELECT language_id
           FROM category_translations
           WHERE category_id = :categoryId`,
          {
            replacements: { categoryId: category.id },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          },
        );
        const existingLanguageIds = new Set(
          existingRows.map(row => Number(row.language_id)),
        );
        const rows = Object.entries(TECHNOLOGY_TRANSLATIONS)
          .map(([code, translation]) => ({
            languageId: languageByCode.get(code),
            translation,
          }))
          .filter(item => item.languageId && !existingLanguageIds.has(item.languageId))
          .map(item => ({
            category_id: category.id,
            language_id: item.languageId,
            name: item.translation.name,
            slug: item.translation.slug,
          }));

        if (rows.length) {
          await queryInterface.bulkInsert('category_translations', rows, {
            transaction,
          });
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async transaction => {
      const categories = await queryInterface.sequelize.query(
        `SELECT id
         FROM categories
         WHERE LOWER(TRIM(slug)) = 'technology'`,
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const languages = await queryInterface.sequelize.query(
        `SELECT id, LOWER(TRIM(code)) AS code
         FROM languages`,
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );
      const languageByCode = new Map(
        languages.map(language => [language.code, Number(language.id)]),
      );

      for (const category of categories) {
        for (const [code, translation] of Object.entries(TECHNOLOGY_TRANSLATIONS)) {
          const languageId = languageByCode.get(code);
          if (!languageId) continue;
          await queryInterface.bulkDelete(
            'category_translations',
            {
              category_id: category.id,
              language_id: languageId,
              name: translation.name,
              slug: translation.slug,
            },
            { transaction },
          );
        }
      }
    });
  },
};
