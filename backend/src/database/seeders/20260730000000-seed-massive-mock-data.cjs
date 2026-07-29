'use strict';

const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

const viSentences = [
  "Công nghệ AI đang phát triển với tốc độ chóng mặt, thay đổi cách chúng ta làm việc.",
  "Hôm nay thời tiết rất đẹp, tôi đã có một buổi sáng làm việc vô cùng hiệu quả.",
  "Tôi nghĩ tính năng này rất hữu ích, hy vọng nhóm phát triển sẽ ra mắt thêm nhiều cải tiến mới.",
  "Thiết kế giao diện hiện tại rất đẹp mắt và dễ sử dụng, tôi rất thích phong cách này.",
  "Bài viết này thật sự mang lại nhiều kiến thức bổ ích. Cảm ơn tác giả đã chia sẻ!",
  "Khám phá ngôn ngữ mới luôn là một hành trình thú vị nhưng cũng đầy thử thách.",
  "Chúng ta cần cân nhắc kỹ lưỡng về bảo mật thông tin trong thời đại số hóa hiện nay.",
];

const enSentences = [
  "AI technology is advancing at a breathtaking pace, changing how we work.",
  "The weather is beautiful today, I had a very productive morning.",
  "I think this feature is very useful, hoping the dev team will release more improvements.",
  "The current UI design is stunning and user-friendly, I really love this style.",
  "This article is truly informative. Thanks to the author for sharing!",
  "Exploring new languages is always an exciting yet challenging journey.",
  "We need to carefully consider data privacy in this digital era.",
];

const zhSentences = [
  "人工智能技术正在以惊人的速度发展，改变了我们的工作方式。",
  "今天天气真好，我度过了一个非常高效的早晨。",
  "我认为这个功能非常有用，希望开发团队能推出更多改进。",
  "目前的界面设计非常漂亮且易于使用，我真的很喜欢这种风格。",
  "这篇文章确实提供了很多有用的知识。感谢作者的分享！",
  "探索新语言始终是一段令人兴奋但也充满挑战的旅程。",
  "在这个数字时代，我们需要仔细考虑数据隐私问题。",
];

function getRandomText(lang, sentencesCount) {
  let source;
  if (lang === 'vi') source = viSentences;
  else if (lang === 'zh') source = zhSentences;
  else source = enSentences;

  const result = [];
  for (let i = 0; i < sentencesCount; i++) {
    result.push(faker.helpers.arrayElement(source));
  }
  return result.join(' ');
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping mock data seeding in production.');
      return;
    }

    const { QueryTypes } = Sequelize;
    const now = new Date();
    // Default password for all fake users: 123456
    const passwordHash = await bcrypt.hash('123456', 10);

    const NUM_USERS = 100;
    const NUM_POSTS = 500;
    const NUM_COMMENTS = 2000;
    const NUM_LIKES = 5000;

    console.log(`Starting massive data seed...`);
    
    // Clear old tables for fresh seed
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await queryInterface.sequelize.query('TRUNCATE TABLE post_likes');
    await queryInterface.sequelize.query('TRUNCATE TABLE comment_translations');
    await queryInterface.sequelize.query('TRUNCATE TABLE comments');
    await queryInterface.sequelize.query('TRUNCATE TABLE post_translations');
    await queryInterface.sequelize.query('TRUNCATE TABLE posts');
    // Only delete fake users (keep admin)
    await queryInterface.sequelize.query('DELETE FROM users WHERE id > 10');
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`Generating ${NUM_USERS} users...`);
    
    // 1. Fetch dependencies (roles, languages, categories)
    const [memberRoles] = await queryInterface.sequelize.query(`SELECT id FROM roles WHERE name = 'member'`, { type: QueryTypes.SELECT });
    const memberRoleId = memberRoles ? memberRoles.id : 2;

    const languages = await queryInterface.sequelize.query(`SELECT id, code FROM languages`, { type: QueryTypes.SELECT });
    const viLangId = languages.find(l => l.code === 'vi')?.id || 1;
    const enLangId = languages.find(l => l.code === 'en')?.id || 2;
    const zhLangId = languages.find(l => l.code === 'zh')?.id || 3;

    const categories = await queryInterface.sequelize.query(`SELECT id FROM categories`, { type: QueryTypes.SELECT });
    const categoryIds = categories.map(c => c.id);

    if (categoryIds.length === 0) {
      console.error('No categories found. Run base seeders first.');
      return;
    }

    // 2. Insert Users
    const users = [];
    for (let i = 0; i < NUM_USERS; i++) {
      users.push({
        email: faker.internet.email().toLowerCase(),
        password: passwordHash,
        username: faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '') + i,
        display_name: faker.person.fullName(),
        role_id: memberRoleId,
        bio: faker.person.bio(),
        avatar: faker.image.avatar(),
        created_at: faker.date.past({ years: 1 }),
        updated_at: now,
      });
    }
    
    await queryInterface.bulkInsert('users', users, { ignoreDuplicates: true });
    
    const insertedUsers = await queryInterface.sequelize.query(
      `SELECT id FROM users ORDER BY id DESC LIMIT ${NUM_USERS}`, 
      { type: QueryTypes.SELECT }
    );
    const userIds = insertedUsers.map(u => u.id);

    // 3. Insert Posts
    console.log(`Generating ${NUM_POSTS} posts...`);
    const posts = [];
    const languageChoices = [viLangId, enLangId, zhLangId];
    
    for (let i = 0; i < NUM_POSTS; i++) {
      posts.push({
        author_id: faker.helpers.arrayElement(userIds),
        category_id: faker.helpers.arrayElement(categoryIds),
        status: 'published',
        view_count: faker.number.int({ min: 10, max: 50000 }),
        like_count: 0,
        comment_count: 0,
        original_language_id: faker.helpers.arrayElement(languageChoices),
        created_at: faker.date.past({ years: 1 }),
        updated_at: now,
        published_at: faker.date.recent({ days: 30 }),
      });
    }

    await queryInterface.bulkInsert('posts', posts);

    const insertedPosts = await queryInterface.sequelize.query(
      `SELECT id, original_language_id FROM posts ORDER BY id DESC LIMIT ${NUM_POSTS}`,
      { type: QueryTypes.SELECT }
    );

    // 4. Insert Post Translations (Content)
    console.log(`Generating post translations...`);
    const postTranslations = [];
    for (const post of insertedPosts) {
      const imgUrl = faker.image.urlPicsumPhotos({ width: 1280, height: 720 });
      // IMAGE AT TOP, THEN CONTENT!
      const contentEn = `<figure><img src="${imgUrl}" alt="Cover Image"></figure><p>${getRandomText('en', 3)}</p><p>${getRandomText('en', 2)}</p>`;
      const contentVi = `<figure><img src="${imgUrl}" alt="Cover Image"></figure><p>${getRandomText('vi', 3)}</p><p>${getRandomText('vi', 2)}</p>`;
      const contentZh = `<figure><img src="${imgUrl}" alt="Cover Image"></figure><p>${getRandomText('zh', 3)}</p><p>${getRandomText('zh', 2)}</p>`;

      postTranslations.push({
        post_id: post.id,
        language_id: enLangId,
        title: getRandomText('en', 1),
        content: contentEn,
        translation_status: 'completed',
        created_at: now,
        updated_at: now,
      });
      postTranslations.push({
        post_id: post.id,
        language_id: viLangId,
        title: getRandomText('vi', 1),
        content: contentVi,
        translation_status: 'completed',
        created_at: now,
        updated_at: now,
      });
      postTranslations.push({
        post_id: post.id,
        language_id: zhLangId,
        title: getRandomText('zh', 1),
        content: contentZh,
        translation_status: 'completed',
        created_at: now,
        updated_at: now,
      });
    }
    
    const chunkSize = 1000;
    for (let i = 0; i < postTranslations.length; i += chunkSize) {
      await queryInterface.bulkInsert('post_translations', postTranslations.slice(i, i + chunkSize));
    }

    // 5. Insert Comments
    console.log(`Generating ${NUM_COMMENTS} comments...`);
    const comments = [];
    for (let i = 0; i < NUM_COMMENTS; i++) {
      const postId = faker.helpers.arrayElement(insertedPosts).id;
      // Assign realistic languages for comments to trigger real UI testing
      const langChoiceCode = faker.helpers.arrayElement(['en', 'vi', 'zh']);
      const langChoiceId = langChoiceCode === 'vi' ? viLangId : (langChoiceCode === 'zh' ? zhLangId : enLangId);
      
      comments.push({
        post_id: postId,
        user_id: faker.helpers.arrayElement(userIds),
        content: getRandomText(langChoiceCode, 1),
        original_language_id: langChoiceId,
        status: 'approved',
        created_at: faker.date.recent({ days: 10 }),
        updated_at: now,
      });
    }
    
    await queryInterface.bulkInsert('comments', comments);
    
    await queryInterface.sequelize.query(`
      UPDATE posts p 
      SET comment_count = (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.status = 'approved')
    `);

    // 6. Insert Likes
    console.log(`Generating ${NUM_LIKES} likes...`);
    const likeSet = new Set();
    const likes = [];
    while (likes.length < NUM_LIKES) {
      const userId = faker.helpers.arrayElement(userIds);
      const postId = faker.helpers.arrayElement(insertedPosts).id;
      const key = `${userId}-${postId}`;
      if (!likeSet.has(key)) {
        likeSet.add(key);
        likes.push({
          user_id: userId,
          post_id: postId,
          created_at: faker.date.recent({ days: 30 })
        });
      }
    }
    
    for (let i = 0; i < likes.length; i += chunkSize) {
      await queryInterface.bulkInsert('post_likes', likes.slice(i, i + chunkSize), { ignoreDuplicates: true });
    }

    await queryInterface.sequelize.query(`
      UPDATE posts p 
      SET like_count = (SELECT COUNT(*) FROM post_likes l WHERE l.post_id = p.id)
    `);

    console.log('Massive data seed completed successfully!');
  },

  async down(queryInterface, Sequelize) {
    // Handled manually in UP script by truncating
  }
};
