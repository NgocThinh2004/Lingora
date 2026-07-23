'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. comments table
    await queryInterface.createTable('comments', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      parent_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'comments', key: 'id' },
        onDelete: 'CASCADE',
      },
      reply_to_comment_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'comments', key: 'id' },
        onDelete: 'SET NULL',
      },
      reply_to_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      reply_to_username: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'hidden'),
        allowNull: false,
        defaultValue: 'approved',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('comments', ['post_id', 'parent_id']);
    await queryInterface.addIndex('comments', ['reply_to_comment_id']);

    // 2. comment_likes table
    await queryInterface.createTable('comment_likes', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      comment_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'comments', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('comment_likes', ['comment_id', 'user_id'], { unique: true });
    await queryInterface.addIndex('comment_likes', ['comment_id']);
    await queryInterface.addIndex('comment_likes', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comment_likes');
    await queryInterface.dropTable('comments');
  },
};
