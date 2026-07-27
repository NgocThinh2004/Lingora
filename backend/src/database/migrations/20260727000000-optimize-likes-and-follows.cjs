'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Remove duplicate post_likes keeping the oldest or newest
    await queryInterface.sequelize.query(`
      DELETE t1 FROM post_likes t1
      INNER JOIN post_likes t2 
      WHERE t1.id > t2.id AND t1.post_id = t2.post_id AND t1.user_id = t2.user_id;
    `);

    // 2. Remove duplicate comment_likes
    await queryInterface.sequelize.query(`
      DELETE t1 FROM comment_likes t1
      INNER JOIN comment_likes t2 
      WHERE t1.id > t2.id AND t1.comment_id = t2.comment_id AND t1.user_id = t2.user_id;
    `);

    // 3. Remove duplicate subscriptions
    await queryInterface.sequelize.query(`
      DELETE t1 FROM subscriptions t1
      INNER JOIN subscriptions t2 
      WHERE t1.id > t2.id AND t1.subscriber_id = t2.subscriber_id AND t1.author_id = t2.author_id;
    `);

    // Helper to run safely
    const safeRun = async (fn) => {
      try { await fn(); } catch (e) { console.log('Ignored:', e.message); }
    };

    // 4. Add Unique Constraints
    await safeRun(() => queryInterface.addIndex('post_likes', ['post_id', 'user_id'], { unique: true, name: 'post_likes_post_id_user_id_unique' }));
    await safeRun(() => queryInterface.addIndex('comment_likes', ['comment_id', 'user_id'], { unique: true, name: 'comment_likes_comment_id_user_id_unique' }));
    await safeRun(() => queryInterface.addIndex('subscriptions', ['subscriber_id', 'author_id'], { unique: true, name: 'subscriptions_subscriber_id_author_id_unique' }));

    // 5. Add columns
    await safeRun(() => queryInterface.addColumn('posts', 'like_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }));

    await safeRun(() => queryInterface.addColumn('posts', 'comment_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }));

    await safeRun(() => queryInterface.addColumn('comments', 'like_count', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }));

    // 6. Backfill post like_count
    await queryInterface.sequelize.query(`
      UPDATE posts
      SET like_count = (
        SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = posts.id
      );
    `);

    // 7. Backfill post comment_count
    await queryInterface.sequelize.query(`
      UPDATE posts
      SET comment_count = (
        SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id
      );
    `);

    // 8. Backfill comment like_count
    await queryInterface.sequelize.query(`
      UPDATE comments
      SET like_count = (
        SELECT COUNT(*) FROM comment_likes WHERE comment_likes.comment_id = comments.id
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    const safeRun = async (fn) => {
      try { await fn(); } catch (e) { console.log('Ignored:', e.message); }
    };
    await safeRun(() => queryInterface.removeColumn('comments', 'like_count'));
    await safeRun(() => queryInterface.removeColumn('posts', 'comment_count'));
    await safeRun(() => queryInterface.removeColumn('posts', 'like_count'));
    await safeRun(() => queryInterface.removeIndex('subscriptions', 'subscriptions_subscriber_id_author_id_unique'));
    await safeRun(() => queryInterface.removeIndex('comment_likes', 'comment_likes_comment_id_user_id_unique'));
    await safeRun(() => queryInterface.removeIndex('post_likes', 'post_likes_post_id_user_id_unique'));
  }
};
