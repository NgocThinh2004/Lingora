'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable('posts');
    if (columns.video_url) {
      await queryInterface.removeColumn('posts', 'video_url');
    }
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('posts');
    if (!columns.video_url) {
      await queryInterface.addColumn('posts', 'video_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }
  },
};
