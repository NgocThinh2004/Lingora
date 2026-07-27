'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'accent_color', {
      type: Sequelize.STRING(7),
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'background_color', {
      type: Sequelize.STRING(7),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'background_color');
    await queryInterface.removeColumn('users', 'accent_color');
  },
};
