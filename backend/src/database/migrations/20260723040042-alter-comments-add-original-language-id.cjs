'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('comments', 'original_language_id', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true, // Allow null temporarily to not break existing rows
      references: {
        model: 'languages',
        key: 'id'
      },
      onDelete: 'CASCADE'
    });

    // Option: If we have existing comments, we might want to set a default (e.g. English = 1 or 2)
    // Here we'll just allow null for backward compatibility with the mock data already seeded.
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('comments', 'original_language_id');
  }
};
