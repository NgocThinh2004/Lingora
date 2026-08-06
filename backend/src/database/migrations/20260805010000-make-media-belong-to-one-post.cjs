'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const [sharedAssets] = await queryInterface.sequelize.query(`
      SELECT media_asset_id
      FROM post_media
      GROUP BY media_asset_id
      HAVING COUNT(DISTINCT post_id) > 1
      LIMIT 1
    `);
    if (sharedAssets.length) {
      throw new Error('Cannot migrate: a media asset is attached to more than one post');
    }
    const [mixedPurposeAssets] = await queryInterface.sequelize.query(`
      SELECT pm.media_asset_id
      FROM post_media pm
      INNER JOIN users u ON u.avatar_media_id = pm.media_asset_id
      LIMIT 1
    `);
    if (mixedPurposeAssets.length) {
      throw new Error('Cannot migrate: a media asset is used as both avatar and post media');
    }

    await queryInterface.addColumn('media_assets', 'purpose', {
      type: Sequelize.ENUM('avatar', 'post'),
      allowNull: true,
    });
    await queryInterface.addColumn('media_assets', 'post_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'posts', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.sequelize.query(`
      UPDATE media_assets ma
      INNER JOIN post_media pm ON pm.media_asset_id = ma.id
      SET ma.purpose = 'post', ma.post_id = pm.post_id
    `);
    await queryInterface.sequelize.query(`
      UPDATE media_assets ma
      INNER JOIN users u ON u.avatar_media_id = ma.id
      SET ma.purpose = 'avatar', ma.post_id = NULL
    `);
    await queryInterface.sequelize.query(`
      UPDATE media_assets
      SET purpose = 'post'
      WHERE purpose IS NULL
    `);

    await queryInterface.changeColumn('media_assets', 'purpose', {
      type: Sequelize.ENUM('avatar', 'post'),
      allowNull: false,
    });
    await queryInterface.addIndex('media_assets', ['post_id'], {
      name: 'media_assets_post_idx',
    });
    await queryInterface.addIndex('media_assets', ['owner_id', 'purpose', 'status'], {
      name: 'media_assets_owner_purpose_status_idx',
    });
    await queryInterface.addIndex('users', ['avatar_media_id'], {
      name: 'users_avatar_media_unique',
      unique: true,
    });
    await queryInterface.dropTable('post_media');
  },

  async down(queryInterface, Sequelize) {
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
    await queryInterface.sequelize.query(`
      INSERT INTO post_media (post_id, media_asset_id, created_at)
      SELECT post_id, id, created_at
      FROM media_assets
      WHERE post_id IS NOT NULL
    `);
    await queryInterface.addIndex('post_media', ['media_asset_id'], {
      name: 'post_media_asset_idx',
    });

    const userIndexes = await queryInterface.showIndex('users');
    if (!userIndexes.some(index => index.name === 'users_avatar_media_fk_idx')) {
      await queryInterface.addIndex('users', ['avatar_media_id'], {
        name: 'users_avatar_media_fk_idx',
      });
    }
    await queryInterface.removeIndex('users', 'users_avatar_media_unique');
    await queryInterface.removeIndex('media_assets', 'media_assets_owner_purpose_status_idx');
    await queryInterface.removeIndex('media_assets', 'media_assets_post_idx');
    await queryInterface.removeColumn('media_assets', 'post_id');
    await queryInterface.removeColumn('media_assets', 'purpose');
  },
};
