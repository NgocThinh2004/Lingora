'use strict';

const SYSTEM_SLUG = 'uncategorized';
const SYSTEM_NAMES = {
  en: 'Uncategorized',
  vi: 'Chưa phân loại',
  es: 'Sin categoría',
  ja: '未分類',
  zh: '未分类',
};
const SYSTEM_SLUGS = {
  en: 'uncategorized',
  vi: 'chua-phan-loai',
  es: 'sin-categoria',
  ja: '未分類',
  zh: '未分类',
};
const removeAccents = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('categories', 'is_system', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'status',
    });

    const transaction = await queryInterface.sequelize.transaction();
    try {
      const now = new Date();
      let [categories] = await queryInterface.sequelize.query(
        'SELECT id FROM categories WHERE slug = :slug LIMIT 1',
        { replacements: { slug: SYSTEM_SLUG }, transaction },
      );
      if (!categories.length) {
        await queryInterface.bulkInsert('categories', [{
          slug: SYSTEM_SLUG,
          status: 'active',
          is_system: true,
          created_at: now,
          updated_at: now,
        }], { transaction });
        [categories] = await queryInterface.sequelize.query(
          'SELECT id FROM categories WHERE slug = :slug LIMIT 1',
          { replacements: { slug: SYSTEM_SLUG }, transaction },
        );
      } else {
        await queryInterface.sequelize.query(
          'UPDATE categories SET status = \'active\', is_system = 1, updated_at = :now WHERE id = :id',
          { replacements: { id: categories[0].id, now }, transaction },
        );
      }
      const categoryId = categories[0].id;
      const [languages] = await queryInterface.sequelize.query(
        'SELECT id, code FROM languages',
        { transaction },
      );

      if (languages.length) {
        const [existingTranslations] = await queryInterface.sequelize.query(
          'SELECT language_id FROM category_translations WHERE category_id = :categoryId',
          { replacements: { categoryId }, transaction },
        );
        const existingLanguageIds = new Set(existingTranslations.map(item => Number(item.language_id)));
        const missingLanguages = languages.filter(language => !existingLanguageIds.has(Number(language.id)));
        if (missingLanguages.length) {
          await queryInterface.bulkInsert('category_translations', missingLanguages.map(language => ({
            category_id: categoryId,
            language_id: language.id,
            name: SYSTEM_NAMES[language.code] || SYSTEM_NAMES.en,
            slug: SYSTEM_SLUGS[language.code] || SYSTEM_SLUG,
            unaccented_name: removeAccents(SYSTEM_NAMES[language.code] || SYSTEM_NAMES.en),
          })), { transaction });
        }
      }

      await queryInterface.sequelize.query(
        'UPDATE posts SET category_id = :categoryId WHERE category_id IS NULL',
        { replacements: { categoryId }, transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [categories] = await queryInterface.sequelize.query(
        'SELECT id FROM categories WHERE slug = :slug AND is_system = 1 LIMIT 1',
        { replacements: { slug: SYSTEM_SLUG }, transaction },
      );
      if (categories.length) {
        await queryInterface.sequelize.query(
          'UPDATE posts SET category_id = NULL WHERE category_id = :categoryId',
          { replacements: { categoryId: categories[0].id }, transaction },
        );
        await queryInterface.bulkDelete('categories', { id: categories[0].id }, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    await queryInterface.removeColumn('categories', 'is_system');
  },
};
