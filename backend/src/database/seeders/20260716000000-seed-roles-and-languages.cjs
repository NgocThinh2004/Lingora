'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('roles', [
      { name: 'admin' },
      { name: 'member' },
    ]);

    await queryInterface.bulkInsert('languages', [
      { code: 'vi', name: 'Tiếng Việt', native_name: 'Tiếng Việt', flag_code: 'vn', is_default: true, is_active: true },
      { code: 'en', name: 'English', native_name: 'English', flag_code: 'us', is_default: false, is_active: true },
      { code: 'zh', name: '中文', native_name: '中文', flag_code: 'cn', is_default: false, is_active: true },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('languages', { code: ['vi', 'en', 'zh'] });
    await queryInterface.bulkDelete('roles', { name: ['admin', 'member'] });
  },
};
