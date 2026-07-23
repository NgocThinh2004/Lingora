'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable('post_translations');
    if (columns.summary) {
      await queryInterface.removeColumn('post_translations', 'summary');
    }
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('post_translations');
    if (!columns.summary) {
      await queryInterface.addColumn('post_translations', 'summary', {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },
};
