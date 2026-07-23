'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('comment_translations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT.UNSIGNED,
      },
      comment_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'comments',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      language_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'languages',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      translation_status: {
        type: Sequelize.ENUM('not_started', 'queued', 'processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'not_started'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      }
    });

    await queryInterface.addIndex('comment_translations', ['comment_id', 'language_id'], {
      unique: true,
      name: 'comment_translations_comment_id_language_id_unique'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('comment_translations');
  }
};
