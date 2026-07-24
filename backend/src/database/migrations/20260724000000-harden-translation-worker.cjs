'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('translation_attempts');
    if (!indexes.some(index => index.name === 'uq_translation_attempt_order')) {
      await queryInterface.addIndex(
        'translation_attempts',
        ['post_translation_id', 'attempt_order'],
        {
          unique: true,
          name: 'uq_translation_attempt_order',
        },
      );
    }

    const targetIndexes = await queryInterface.showIndex('post_translations');
    if (!targetIndexes.some(index => index.name === 'idx_translation_worker_queue')) {
      await queryInterface.addIndex(
        'post_translations',
        ['translation_status', 'updated_at'],
        { name: 'idx_translation_worker_queue' },
      );
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('translation_attempts');
    if (indexes.some(index => index.name === 'uq_translation_attempt_order')) {
      await queryInterface.removeIndex('translation_attempts', 'uq_translation_attempt_order');
    }

    const targetIndexes = await queryInterface.showIndex('post_translations');
    if (targetIndexes.some(index => index.name === 'idx_translation_worker_queue')) {
      await queryInterface.removeIndex('post_translations', 'idx_translation_worker_queue');
    }
  },
};
