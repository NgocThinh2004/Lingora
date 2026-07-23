'use strict';

const createdAt = (Sequelize) => ({
  type: Sequelize.DATE,
  allowNull: false,
  defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
});

const updatedAt = (Sequelize) => ({
  type: Sequelize.DATE,
  allowNull: false,
  defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(50), allowNull: false, unique: true },
    });

    await queryInterface.createTable('languages', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      code: { type: Sequelize.STRING(10), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      native_name: { type: Sequelize.STRING(100), allowNull: false },
      flag_code: { type: Sequelize.STRING(5), allowNull: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    });

    await queryInterface.createTable('users', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      username: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      display_name: { type: Sequelize.STRING(150), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false, comment: 'Chỉ lưu mật khẩu đã hash' },
      avatar: { type: Sequelize.STRING(255), allowNull: true },
      bio: { type: Sequelize.TEXT, allowNull: true },
      role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'banned'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: createdAt(Sequelize),
      updated_at: updatedAt(Sequelize),
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('users', ['role_id']);
    await queryInterface.addIndex('users', ['status']);

    await queryInterface.createTable('categories', {
      id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
      slug: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
      created_at: createdAt(Sequelize),
      updated_at: updatedAt(Sequelize),
    });

    await queryInterface.createTable('category_translations', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'languages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(150), allowNull: false },
    });
    await queryInterface.addIndex('category_translations', ['category_id', 'language_id'], {
      unique: true,
      name: 'uq_category_translations_category_language',
    });

    await queryInterface.createTable('posts', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      author_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      original_language_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'languages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      view_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('draft', 'pending_review', 'approved', 'rejected', 'published', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      review_note: { type: Sequelize.TEXT, allowNull: true },
      published_at: { type: Sequelize.DATE, allowNull: true },
      created_at: createdAt(Sequelize),
      updated_at: updatedAt(Sequelize),
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('posts', ['author_id']);
    await queryInterface.addIndex('posts', ['category_id']);
    await queryInterface.addIndex('posts', ['status']);
    await queryInterface.addIndex('posts', ['published_at']);

    await queryInterface.createTable('post_translations', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      language_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'languages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING(255), allowNull: true },
      slug: { type: Sequelize.STRING(200), allowNull: true },
      content: { type: Sequelize.TEXT('long'), allowNull: true, comment: 'HTML và ảnh nhúng bên trong bài viết' },
      translation_status: {
        type: Sequelize.ENUM('not_started', 'queued', 'processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'not_started',
      },
      translation_provider: { type: Sequelize.STRING(50), allowNull: true },
      created_at: createdAt(Sequelize),
      updated_at: updatedAt(Sequelize),
    });
    await queryInterface.addIndex('post_translations', ['post_id', 'language_id'], {
      unique: true,
      name: 'uq_post_translations_post_language',
    });
    await queryInterface.addIndex('post_translations', ['slug', 'language_id'], {
      unique: true,
      name: 'uq_post_translations_slug_language',
    });

    await queryInterface.createTable('translation_attempts', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      post_translation_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'post_translations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      provider: { type: Sequelize.STRING(50), allowNull: false },
      attempt_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      status: {
        type: Sequelize.ENUM('success', 'failed', 'rate_limited', 'timeout'),
        allowNull: false,
      },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      char_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: false },
      finished_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('translation_attempts', ['post_translation_id']);
    await queryInterface.addIndex('translation_attempts', ['provider']);
    await queryInterface.addIndex('translation_attempts', ['status']);

    await queryInterface.createTable('comments', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      parent_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'comments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reply_to_comment_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'comments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reply_to_user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reply_to_username: { type: Sequelize.STRING(150), allowNull: true },
      content: { type: Sequelize.TEXT, allowNull: false },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'hidden'),
        allowNull: false,
        defaultValue: 'approved',
      },
      created_at: createdAt(Sequelize),
      updated_at: updatedAt(Sequelize),
    });
    await queryInterface.addIndex('comments', ['post_id', 'parent_id']);
    await queryInterface.addIndex('comments', ['reply_to_comment_id']);

    await queryInterface.createTable('post_likes', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      post_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: createdAt(Sequelize),
    });
    await queryInterface.addIndex('post_likes', ['post_id', 'user_id'], {
      unique: true,
      name: 'uq_post_likes_post_user',
    });

    await queryInterface.createTable('comment_likes', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      comment_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'comments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: createdAt(Sequelize),
    });
    await queryInterface.addIndex('comment_likes', ['comment_id', 'user_id'], {
      unique: true,
      name: 'uq_comment_likes_comment_user',
    });

    await queryInterface.createTable('subscriptions', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      subscriber_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      author_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      last_viewed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: createdAt(Sequelize),
    });
    await queryInterface.addIndex('subscriptions', ['subscriber_id', 'author_id'], {
      unique: true,
      name: 'uq_subscriptions_subscriber_author',
    });
    await queryInterface.addIndex('subscriptions', ['author_id']);
    // MySQL 8 limit: CHECK constraint conflicts with ON DELETE CASCADE
    // await queryInterface.addConstraint('subscriptions', {
    //   fields: ['subscriber_id', 'author_id'],
    //   type: 'check',
    //   where: { subscriber_id: { [Sequelize.Op.ne]: Sequelize.col('author_id') } },
    //   name: 'chk_subscriptions_no_self_follow',
    // });

    await queryInterface.createTable('password_reset_tokens', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token: { type: Sequelize.STRING(255), allowNull: false, unique: true, comment: 'Chỉ lưu token đã hash' },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: createdAt(Sequelize),
    });
    await queryInterface.addIndex('password_reset_tokens', ['user_id']);

    await queryInterface.createTable('refresh_tokens', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      device_info: { type: Sequelize.STRING(255), allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      last_used_at: { type: Sequelize.DATE, allowNull: true },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: createdAt(Sequelize),
    });
    await queryInterface.addIndex('refresh_tokens', ['user_id']);
    await queryInterface.addIndex('refresh_tokens', ['expires_at']);
    await queryInterface.addIndex('refresh_tokens', ['user_id', 'revoked_at']);
  },

  async down(queryInterface) {
    const tables = [
      'refresh_tokens',
      'password_reset_tokens',
      'subscriptions',
      'comment_likes',
      'post_likes',
      'comments',
      'translation_attempts',
      'post_translations',
      'posts',
      'category_translations',
      'categories',
      'users',
      'languages',
      'roles',
    ];

    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
