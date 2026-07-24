'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('translation_attempts');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('translation_attempts', {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      post_translation_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'post_translations', key: 'id' },
        onDelete: 'CASCADE',
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      attempt_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('success', 'failed', 'rate_limited', 'timeout'),
        allowNull: false,
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      char_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },
};
