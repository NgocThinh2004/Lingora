'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'password_reset_otp_hash', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Chỉ lưu OTP đã hash',
    });
    await queryInterface.addColumn('users', 'password_reset_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('users', 'password_reset_attempts', {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('users', 'password_reset_sent_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) =>
      typeof table === 'string' ? table : Object.values(table)[0],
    );
    if (tableNames.includes('password_reset_tokens')) {
      await queryInterface.dropTable('password_reset_tokens');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_tokens', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Chỉ lưu token đã hash',
      },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addIndex('password_reset_tokens', ['user_id']);

    await queryInterface.removeColumn('users', 'password_reset_sent_at');
    await queryInterface.removeColumn('users', 'password_reset_attempts');
    await queryInterface.removeColumn('users', 'password_reset_expires_at');
    await queryInterface.removeColumn('users', 'password_reset_otp_hash');
  },
};
