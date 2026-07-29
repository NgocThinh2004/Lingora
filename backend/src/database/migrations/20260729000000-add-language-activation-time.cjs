'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('languages', 'activated_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      'UPDATE languages SET activated_at = CURRENT_TIMESTAMP WHERE is_active = 1',
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('languages', 'activated_at');
  },
};
