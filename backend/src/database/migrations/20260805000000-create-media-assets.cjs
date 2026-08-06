'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('media_assets', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      owner_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      object_key: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true,
      },
      media_type: {
        type: Sequelize.ENUM('image', 'audio', 'video'),
        allowNull: false,
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      size_bytes: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
      },
      width: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      height: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      duration_seconds: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('temporary', 'attached', 'deleted'),
        allowNull: false,
        defaultValue: 'temporary',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.createTable('post_media', {
      post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: { model: 'posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      media_asset_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        references: { model: 'media_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addColumn('users', 'avatar_media_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'media_assets', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('media_assets', ['owner_id', 'status'], {
      name: 'media_assets_owner_status_idx',
    });
    await queryInterface.addIndex('post_media', ['media_asset_id'], {
      name: 'post_media_asset_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'avatar_media_id');
    await queryInterface.dropTable('post_media');
    await queryInterface.dropTable('media_assets');
  },
};
