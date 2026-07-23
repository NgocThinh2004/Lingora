'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try { await queryInterface.removeColumn('posts', 'cover_image_url'); } catch (e) {}
    try { await queryInterface.removeColumn('posts', 'cover_video_url'); } catch (e) {}
    try { await queryInterface.addColumn('posts', 'image_url', { type: Sequelize.STRING(500), allowNull: true }); } catch (e) {}
    try { await queryInterface.addColumn('posts', 'video_url', { type: Sequelize.STRING(500), allowNull: true }); } catch (e) {}
  },

  async down(queryInterface) {
    try { await queryInterface.removeColumn('posts', 'image_url'); } catch (e) {}
    try { await queryInterface.removeColumn('posts', 'video_url'); } catch (e) {}
  },
};
