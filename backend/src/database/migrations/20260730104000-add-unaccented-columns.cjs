'use strict';
require('ts-node').register();
const { removeAccents } = require('../../utils/string.util.ts');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add Columns Idempotently
    const catDesc = await queryInterface.describeTable('category_translations');
    if (!catDesc.unaccented_name) {
      await queryInterface.addColumn('category_translations', 'unaccented_name', { type: Sequelize.STRING(150), allowNull: true });
      await queryInterface.addIndex('category_translations', ['unaccented_name']);
    }

    const postDesc = await queryInterface.describeTable('post_translations');
    if (!postDesc.unaccented_title) {
      await queryInterface.addColumn('post_translations', 'unaccented_title', { type: Sequelize.STRING(255), allowNull: true });
      await queryInterface.addIndex('post_translations', ['unaccented_title']);
    }

    const userDesc = await queryInterface.describeTable('users');
    if (!userDesc.unaccented_display_name) {
      await queryInterface.addColumn('users', 'unaccented_display_name', { type: Sequelize.STRING(150), allowNull: true });
      await queryInterface.addIndex('users', ['unaccented_display_name']);
    }

    // 2. Migrate Data (Idempotent: runs UPDATE repeatedly without failing)
    // Categories
    const [categories] = await queryInterface.sequelize.query('SELECT id, name FROM category_translations WHERE name IS NOT NULL');
    for (const cat of categories) {
      if (cat.name) {
        const unaccented = removeAccents(cat.name);
        await queryInterface.sequelize.query('UPDATE category_translations SET unaccented_name = :unaccented WHERE id = :id', {
          replacements: { unaccented, id: cat.id }
        });
      }
    }

    // Posts
    const [posts] = await queryInterface.sequelize.query('SELECT id, title FROM post_translations WHERE title IS NOT NULL');
    for (const post of posts) {
      if (post.title) {
        const unaccented = removeAccents(post.title);
        await queryInterface.sequelize.query('UPDATE post_translations SET unaccented_title = :unaccented WHERE id = :id', {
          replacements: { unaccented, id: post.id }
        });
      }
    }

    // Users
    const [users] = await queryInterface.sequelize.query('SELECT id, display_name FROM users WHERE display_name IS NOT NULL');
    for (const user of users) {
      if (user.display_name) {
        const unaccented = removeAccents(user.display_name);
        await queryInterface.sequelize.query('UPDATE users SET unaccented_display_name = :unaccented WHERE id = :id', {
          replacements: { unaccented, id: user.id }
        });
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('category_translations', 'unaccented_name');
    await queryInterface.removeColumn('post_translations', 'unaccented_title');
    await queryInterface.removeColumn('users', 'unaccented_display_name');
  }
};
