'use strict';

const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');

const topicSentences = {
  frontend: {
    en: ["React and Angular are great frameworks.", "CSS Grid makes layout so much easier.", "The new frontend ecosystem is incredibly fast.", "Optimizing web vitals is critical for SEO."],
    vi: ["React và Angular là những framework tuyệt vời.", "CSS Grid giúp việc bố cục dễ dàng hơn nhiều.", "Hệ sinh thái frontend mới cực kỳ nhanh.", "Tối ưu hóa web vitals rất quan trọng cho SEO."],
    zh: ["React 和 Angular 是很棒的框架。", "CSS Grid 让布局变得非常简单。", "新的前端生态系统非常快。", "优化网络核心指标对 SEO 至关重要。"]
  },
  backend: {
    en: ["Node.js scales perfectly for I/O tasks.", "Database indexing is crucial for performance.", "Microservices bring flexibility to the backend.", "Redis caching reduces latency."],
    vi: ["Node.js mở rộng rất tốt cho các tác vụ I/O.", "Đánh chỉ mục cơ sở dữ liệu là rất quan trọng để tăng hiệu suất.", "Microservices mang lại sự linh hoạt cho backend.", "Redis caching giúp giảm độ trễ."],
    zh: ["Node.js 非常适合 I/O 任务。", "数据库索引对性能至关重要。", "微服务为后端带来了灵活性。", "Redis 缓存减少了延迟。"]
  },
  cybersecurity: {
    en: ["Zero Trust architecture is the new standard.", "Always encrypt sensitive data at rest.", "Phishing attacks are getting more sophisticated.", "Security should be built into the CI/CD pipeline."],
    vi: ["Kiến trúc Zero Trust là tiêu chuẩn mới.", "Luôn mã hóa dữ liệu nhạy cảm khi lưu trữ.", "Các cuộc tấn công Phishing ngày càng tinh vi.", "Bảo mật nên được tích hợp vào CI/CD."],
    zh: ["零信任架构是新标准。", "始终对静态敏感数据进行加密。", "网络钓鱼攻击变得越来越复杂。", "安全性应内置于 CI/CD 管道中。"]
  },
  design: {
    en: ["UX research is the foundation of good design.", "Minimalism in UI helps reduce cognitive load.", "Color theory plays a huge role in user emotions.", "Prototyping in Figma saves hours of coding."],
    vi: ["Nghiên cứu UX là nền tảng của thiết kế tốt.", "Sự tối giản trong UI giúp giảm tải nhận thức.", "Lý thuyết màu sắc đóng vai trò lớn trong cảm xúc người dùng.", "Thiết kế mẫu bằng Figma tiết kiệm nhiều giờ lập trình."],
    zh: ["UX 研究是好设计的基础。", "UI 中的极简主义有助于减少认知负荷。", "色彩理论在用户情感中起着巨大作用。", "在 Figma 中进行原型设计节省了大量编码时间。"]
  },
  mobile: {
    en: ["Flutter provides a smooth cross-platform experience.", "Swift is incredibly fast for iOS development.", "Managing app state effectively is a big challenge.", "Mobile-first design is a must."],
    vi: ["Flutter mang lại trải nghiệm đa nền tảng mượt mà.", "Swift cực kỳ nhanh cho lập trình iOS.", "Quản lý state của app hiệu quả là một thách thức lớn.", "Thiết kế ưu tiên di động là bắt buộc."],
    zh: ["Flutter 提供了流畅的跨平台体验。", "Swift 用于 iOS 开发非常快。", "有效管理应用程序状态是一个巨大挑战。", "移动优先设计是必须的。"]
  },
  generic: {
    en: ["This is a fascinating perspective on the topic.", "Continuous learning is essential in our field.", "Technology is constantly evolving.", "I really appreciate this detailed breakdown."],
    vi: ["Đây là một góc nhìn rất thú vị về chủ đề này.", "Học tập không ngừng là điều thiết yếu trong lĩnh vực của chúng ta.", "Công nghệ không ngừng phát triển.", "Tôi rất trân trọng bài phân tích chi tiết này."],
    zh: ["这是关于该主题的一个非常有趣的视角。", "持续学习在我们的领域至关重要。", "技术在不断发展。", "我非常欣赏这个详细的分析。"]
  }
};

function getRandomText(lang, sentencesCount, slug = 'generic') {
  let topic = 'generic';
  if (slug.includes('frontend')) topic = 'frontend';
  else if (slug.includes('backend')) topic = 'backend';
  else if (slug.includes('cybersecurity')) topic = 'cybersecurity';
  else if (slug.includes('design')) topic = 'design';
  else if (slug.includes('mobile')) topic = 'mobile';

  const source = topicSentences[topic][lang] || topicSentences['generic'][lang];
  
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

    const categories = await queryInterface.sequelize.query(`SELECT id, slug FROM categories`, { type: QueryTypes.SELECT });
    const categoryIds = categories.map(c => c.id);
    const categorySlugMap = {};
    categories.forEach(c => { categorySlugMap[c.id] = c.slug; });

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
      `SELECT id, original_language_id, category_id FROM posts ORDER BY id DESC LIMIT ${NUM_POSTS}`,
      { type: QueryTypes.SELECT }
    );

function generateRichHtml(lang, slug) {
  const coverImg = faker.image.urlPicsumPhotos({ width: 1280, height: 720 });
  const midImg = faker.image.urlPicsumPhotos({ width: 800, height: 600 });
  
  const h2Text = getRandomText(lang, 1, slug);
  const h3Text = getRandomText(lang, 1, slug);
  const intro = getRandomText(lang, 3, slug);
  const quote = getRandomText(lang, 2, slug);
  const midP1 = getRandomText(lang, 1, slug);
  const midP2 = getRandomText(lang, 1, slug);
  const midP3 = getRandomText(lang, 1, slug);
  const end = getRandomText(lang, 3, slug);
  const linkText = lang === 'vi' ? 'Xem thêm tại đây' : (lang === 'zh' ? '在此处查看更多' : 'Read more here');

  return `
    <figure><img src="${coverImg}" alt="Cover Image"></figure>
    <p>${intro}</p>
    <h2>${h2Text}</h2>
    <blockquote>${quote}</blockquote>
    <p>
      <strong>${midP1}</strong> <em>${midP2}</em> <a href="#">${linkText}</a>. ${midP3}
    </p>
    <figure><img src="${midImg}" alt="Illustration"></figure>
    <h3>${h3Text}</h3>
    <ul>
      <li>${getRandomText(lang, 1, slug)}</li>
      <li>${getRandomText(lang, 1, slug)}</li>
      <li>${getRandomText(lang, 1, slug)}</li>
    </ul>
    <p>${end}</p>
  `;
}

    // 4. Insert Post Translations (Content)
    console.log(`Generating post translations...`);
    const postTranslations = [];
    for (const post of insertedPosts) {
      const slug = categorySlugMap[post.category_id] || 'generic';
      
      const contentEn = generateRichHtml('en', slug);
      const contentVi = generateRichHtml('vi', slug);
      const contentZh = generateRichHtml('zh', slug);

      postTranslations.push({
        post_id: post.id,
        language_id: enLangId,
        title: getRandomText('en', 1, slug),
        content: contentEn,
        translation_status: 'completed',
        created_at: now,
        updated_at: now,
      });
      postTranslations.push({
        post_id: post.id,
        language_id: viLangId,
        title: getRandomText('vi', 1, slug),
        content: contentVi,
        translation_status: 'completed',
        created_at: now,
        updated_at: now,
      });
      postTranslations.push({
        post_id: post.id,
        language_id: zhLangId,
        title: getRandomText('zh', 1, slug),
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
