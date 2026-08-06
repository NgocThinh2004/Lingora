'use strict';

const SYSTEM_SLUGS = {
  en: 'uncategorized',
  vi: 'chua-phan-loai',
  es: 'sin-categoria',
  ja: '未分類',
  zh: '未分类',
};

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [rows] = await queryInterface.sequelize.query(
        `SELECT ct.id, l.code
         FROM category_translations ct
         INNER JOIN categories c ON c.id = ct.category_id
         INNER JOIN languages l ON l.id = ct.language_id
         WHERE c.is_system = 1`,
        { transaction },
      );
      for (const row of rows) {
        const slug = SYSTEM_SLUGS[row.code] || 'uncategorized';
        await queryInterface.sequelize.query(
          'UPDATE category_translations SET slug = :slug WHERE id = :id',
          { replacements: { id: row.id, slug }, transaction },
        );
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE category_translations ct
       INNER JOIN categories c ON c.id = ct.category_id
       SET ct.slug = 'uncategorized'
       WHERE c.is_system = 1`,
    );
  },
};
