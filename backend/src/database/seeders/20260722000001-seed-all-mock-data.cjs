
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const passwordHash = '$2b$10$e8K7E6U3Z.4zQ9H0H9wQ1e8K7E6U3Z.4zQ9H0H9wQ1e8K7E6U3Z.';

    // 1. ROLES
    await queryInterface.bulkInsert(
      'roles',
      [

        { id: 1, name: 'admin' },
        { id: 2, name: 'member' },
      ],
      { ignoreDuplicates: true }
    );

    const adminRoleId = (await queryInterface.rawSelect('roles', { where: { name: 'admin' } }, ['id'])) || 1;
    const memberRoleId = (await queryInterface.rawSelect('roles', { where: { name: 'member' } }, ['id'])) || 2;

    // 2. LANGUAGES
    await queryInterface.bulkInsert(
      'languages',

      [
        { id: 1, code: 'vi', name: 'Tiếng Việt', native_name: 'Tiếng Việt', flag_code: 'vn', is_default: true, is_active: true },
        { id: 2, code: 'en', name: 'English', native_name: 'English', flag_code: 'us', is_default: false, is_active: true },
        { id: 3, code: 'zh', name: '中文', native_name: '中文', flag_code: 'cn', is_default: false, is_active: true },
      ],
      { ignoreDuplicates: true }
    );

    const viLangId = (await queryInterface.rawSelect('languages', { where: { code: 'vi' } }, ['id'])) || 1;
    const enLangId = (await queryInterface.rawSelect('languages', { where: { code: 'en' } }, ['id'])) || 2;
    const zhLangId = (await queryInterface.rawSelect('languages', { where: { code: 'zh' } }, ['id'])) || 3;


    // 3. USERS (Full 10 Authors from Prototype)
    await queryInterface.bulkInsert(
      'users',
      [
        {
          id: 1,
          username: 'admin',
          display_name: 'Quản trị viên',
          email: 'admin@lingora.app',
          password: passwordHash,
          avatar: null,
          bio: 'System Administrator of Lingora Platform.',

          role_id: adminRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 101,
          username: 'elena_rostova',
          display_name: 'Elena Rostova',
          email: 'elena@lingora.app',
          password: passwordHash,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80',

          bio: 'AI Engineering Researcher & Tech Writer.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 102,
          username: 'hoquoctuan',
          display_name: 'Hồ Quốc Tuấn',
          email: 'tuan.ho@lingora.app',
          password: passwordHash,

          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80',
          bio: 'Lead UI/UX Designer & Economics Author.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 103,
          username: 'liming',
          display_name: '李明 (Li Ming)',
          email: 'li.ming@lingora.app',

          password: passwordHash,
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80&h=80',
          bio: 'Backend Architect focusing on distributed systems.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 104,
          username: 'sarah_connor',
          display_name: 'Sarah Connor',

          email: 'sarah@lingora.app',
          password: passwordHash,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=80&h=80',
          bio: 'AI Safety & Cybersecurity Analyst.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 105,
          username: 'alex_rivera',

          display_name: 'Alex Rivera',
          email: 'alex@lingora.app',
          password: passwordHash,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80',
          bio: 'Cloud Infrastructure & High-Performance Systems Architect.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {
          id: 106,

          username: 'maya_lin',
          display_name: 'Maya Lin',
          email: 'maya@lingora.app',
          password: passwordHash,
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=80&h=80',
          bio: 'UI/UX Researcher & Design Psychologist.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,
        },
        {

          id: 107,
          username: 'kenji_sato',
          display_name: 'Kenji Sato',
          email: 'kenji@lingora.app',
          password: passwordHash,
          avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=80&h=80',
          bio: 'Distributed Systems & High-Traffic API Specialist.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,
        },

        {
          id: 108,
          username: 'vu_thu_ha',
          display_name: 'Vũ Thu Hà',
          email: 'ha.vu@lingora.app',
          password: passwordHash,
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=80&h=80',
          bio: 'Accessible Design Specialist & Product Strategist.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,
          updated_at: now,

        },
        {
          id: 109,
          username: 'thai_duong',
          display_name: 'Thái Dương',
          email: 'duong.thai@lingora.app',
          password: passwordHash,
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=80&h=80',
          bio: 'Tech Lead & Engineering Philosophy Writer.',
          role_id: memberRoleId,
          status: 'active',
          created_at: now,

          updated_at: now,
        },
      ],
      { ignoreDuplicates: true }
    );

    // 4. CATEGORIES & TRANSLATIONS (Full 9 Categories)
    await queryInterface.bulkInsert(
      'categories',
      [
        { id: 1, slug: 'artificial-intelligence', status: 'active', created_at: now, updated_at: now },
        { id: 2, slug: 'backend-engineering', status: 'active', created_at: now, updated_at: now },

        { id: 3, slug: 'design', status: 'active', created_at: now, updated_at: now },
        { id: 4, slug: 'frontend-development', status: 'active', created_at: now, updated_at: now },
        { id: 5, slug: 'mobile-development', status: 'active', created_at: now, updated_at: now },
        { id: 6, slug: 'data-science', status: 'active', created_at: now, updated_at: now },
        { id: 7, slug: 'cybersecurity', status: 'active', created_at: now, updated_at: now },
        { id: 8, slug: 'economics-markets', status: 'active', created_at: now, updated_at: now },
        { id: 9, slug: 'life-philosophy', status: 'active', created_at: now, updated_at: now },
      ],
      { ignoreDuplicates: true }
    );

    await queryInterface.bulkInsert(

      'category_translations',
      [
        { category_id: 1, language_id: viLangId, name: 'Trí tuệ nhân tạo', slug: 'tri-tue-nhan-tao' },
        { category_id: 1, language_id: enLangId, name: 'Artificial Intelligence', slug: 'artificial-intelligence' },
        { category_id: 1, language_id: zhLangId, name: '人工智能', slug: 'ren-gong-zhi-neng' },

        { category_id: 2, language_id: viLangId, name: 'Kỹ thuật Backend', slug: 'ky-thuat-backend' },
        { category_id: 2, language_id: enLangId, name: 'Backend Engineering', slug: 'backend-engineering' },
        { category_id: 2, language_id: zhLangId, name: '后端工程', slug: 'hou-duan-gong-cheng' },

        { category_id: 3, language_id: viLangId, name: 'Thiết kế', slug: 'thiet-ke' },
        { category_id: 3, language_id: enLangId, name: 'Design', slug: 'design' },

        { category_id: 3, language_id: zhLangId, name: '设计', slug: 'she-ji' },

        { category_id: 4, language_id: viLangId, name: 'Phát triển Frontend', slug: 'phat-trien-frontend' },
        { category_id: 4, language_id: enLangId, name: 'Frontend Development', slug: 'frontend-development' },
        { category_id: 4, language_id: zhLangId, name: '前端开发', slug: 'qian-duan-kai-fa' },

        { category_id: 5, language_id: viLangId, name: 'Phát triển Di động', slug: 'phat-trien-di-dong' },
        { category_id: 5, language_id: enLangId, name: 'Mobile Development', slug: 'mobile-development' },
        { category_id: 5, language_id: zhLangId, name: '移动开发', slug: 'yi-dong-kai-fa' },

        { category_id: 6, language_id: viLangId, name: 'Khoa học Dữ liệu', slug: 'khoa-hoc-du-lieu' },
        { category_id: 6, language_id: enLangId, name: 'Data Science', slug: 'data-science' },

        { category_id: 6, language_id: zhLangId, name: '数据科学', slug: 'shu-ju-ke-xue' },

        { category_id: 7, language_id: viLangId, name: 'An ninh Mạng', slug: 'an-ninh-mang' },
        { category_id: 7, language_id: enLangId, name: 'Cybersecurity', slug: 'cybersecurity' },
        { category_id: 7, language_id: zhLangId, name: '网络安全', slug: 'wang-luo-an-quan' },

        { category_id: 8, language_id: viLangId, name: 'Kinh tế & Thị trường', slug: 'kinh-te-thi-truong' },
        { category_id: 8, language_id: enLangId, name: 'Economics & Markets', slug: 'economics-markets' },
        { category_id: 8, language_id: zhLangId, name: '经济与市场', slug: 'jing-ji-yu-shi-chang' },

        { category_id: 9, language_id: viLangId, name: 'Cuộc sống & Triết lý', slug: 'cuoc-song-triet-ly' },
        { category_id: 9, language_id: enLangId, name: 'Life & Philosophy', slug: 'life-philosophy' },

        { category_id: 9, language_id: zhLangId, name: '生活与哲学', slug: 'sheng-huo-yu-zhe-xue' },
      ],
      { ignoreDuplicates: true }
    );

    // 5. POSTS (Full 18 Posts; rich media is embedded in translation content)
    const postsData = [
      { id: 1, author_id: 101, category_id: 1, view_count: 1420, image_url: null },
      { id: 2, author_id: 103, category_id: 2, view_count: 987, image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 3, author_id: 102, category_id: 3, view_count: 456, image_url: null },
      { id: 4, author_id: 104, category_id: 1, view_count: 1500, image_url: null },
      { id: 5, author_id: 105, category_id: 2, view_count: 800, image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=720&h=360' },

      { id: 6, author_id: 106, category_id: 3, view_count: 620, image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 7, author_id: 107, category_id: 2, view_count: 1120, image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 8, author_id: 108, category_id: 3, view_count: 890, image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 9, author_id: 101, category_id: 1, view_count: 1850, image_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 10, author_id: 102, category_id: 3, view_count: 740, image_url: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 11, author_id: 101, category_id: 4, view_count: 1240, image_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 12, author_id: 102, category_id: 5, view_count: 980, image_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 13, author_id: 103, category_id: 6, view_count: 1560, image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 14, author_id: 104, category_id: 7, view_count: 890, image_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 15, author_id: 105, category_id: 2, view_count: 2100, image_url: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 16, author_id: 108, category_id: 3, view_count: 1120, image_url: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=720&h=360' },
      { id: 17, author_id: 102, category_id: 8, view_count: 3200, image_url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=720&h=360' },

      { id: 18, author_id: 109, category_id: 9, view_count: 1450, image_url: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=720&h=360' },
    ];

    for (const p of postsData) {
      await queryInterface.bulkInsert(
        'posts',
        [
          {
            id: p.id,
            author_id: p.author_id,
            category_id: p.category_id,
            original_language_id: enLangId,

            view_count: p.view_count,
            image_url: p.image_url,
            status: 'published',
            published_at: now,
            created_at: now,
            updated_at: now,
          },
        ],
        { ignoreDuplicates: true }
      );
      await queryInterface.bulkUpdate(

        'posts',
        { image_url: p.image_url },
        { id: p.id }
      );
    }

    // 6. POST TRANSLATIONS
    const translationsData = [
      // Post 1
      { post_id: 1, language_id: enLangId, title: 'The Future of AI Agentic Coding in 2026', slug: 'the-future-of-ai-agentic-coding-in-2026', content: 'We are witnessing a monumental paradigm shift where AI agents can autonomously plan, reason, and execute complex full-stack engineering tasks. From real-time DOM manipulation to database synchronization, modern coding assistants act as true pair programmers.\n\nIn traditional software development, developers spent substantial time on boilerplate code, debugging syntax errors, and configuring environments. With advanced agentic frameworks, the AI not only writes code but also understands project architecture, adheres to established design patterns, and executes automated verification plans.\n\nAs we move further into 2026, the collaboration between human creativity and AI execution will redefine what is possible in software engineering.' },
      { post_id: 1, language_id: viLangId, title: 'Tương lai của Lập trình Tự động hóa với AI năm 2026', slug: 'tuong-lai-cua-lap-trinh-tu-dong-hoa-voi-ai-nam-2026', content: 'Chúng ta đang chứng kiến một sự chuyển dịch mô hình lớn khi các tác nhân AI có thể tự chủ lập kế hoạch, suy luận và thực thi các nhiệm vụ kỹ thuật toàn diện. Từ thao tác DOM theo thời gian thực đến đồng bộ hóa cơ sở dữ liệu, trợ lý AI hiện đại đóng vai trò như người đồng hành thực thụ.\n\nTrong phát triển phần mềm truyền thống, lập trình viên dành nhiều thời gian cho các đoạn mã lặp lại, sửa lỗi cú pháp và cấu hình môi trường. Với các khung tự động hóa tiên tiến, AI không chỉ viết mã mà còn hiểu kiến trúc dự án, tuân thủ các mẫu thiết kế và thực thi các kế hoạch xác minh tự động.\n\nKhi tiến sâu vào năm 2026, sự kết hợp giữa sáng tạo của con người và khả năng thực thi của AI sẽ định nghĩa lại giới hạn trong kỹ thuật phần mềm.' },
      { post_id: 1, language_id: zhLangId, title: '2026年AI代理编程的未来', slug: '2026-nian-ai-dai-li-bian-cheng-de-wei-lai', content: '我们正在见证一场巨大的范式转变，AI代理可以自主计划、推理并执行复杂的全栈工程任务。从实时DOM操作到数据库同步，现代编码助手充当真正的结对程序员。' },


      // Post 2
      { post_id: 2, language_id: enLangId, title: 'Deep Dive into Modern Web Rendering Architectures', slug: 'deep-dive-into-modern-web-rendering-architectures', content: 'In an era where Single Page Applications and Server-Side Rendering go hand-in-hand, frontend engineers must choose the right architectural pattern to balance initial load speed with SEO.' },
      { post_id: 2, language_id: viLangId, title: 'Hiểu sâu về Kiến trúc Render Web Hiện đại và Tối ưu hiệu năng', slug: 'hieu-sau-ve-kien-truc-render-web-hien-dai', content: 'Trong kỷ nguyên ứng dụng trang đơn (SPA) và Server-Side Rendering song hành, kỹ sư frontend cần lựa chọn kiến trúc phù hợp nhất để cân bằng giữa tốc độ tải trang và tối ưu hóa SEO.' },
      { post_id: 2, language_id: zhLangId, title: '深入理解现代Web渲染架构与性能优化', slug: 'shen-ru-li-jie-xian-dai-web-xuan-ran-jia-gou', content: '在单页应用与服务器端渲染齐头并进的今天，前端工程师需要针对不同业务场景选择最合理的架构设计，确保首屏加载速度与搜索引擎优化（SEO）的最佳平衡。' },

      // Post 3
      { post_id: 3, language_id: enLangId, title: '10 Essential Principles for Modern Glassmorphism UI', slug: '10-essential-principles-for-modern-glassmorphism-ui', content: 'Designing interfaces that feel responsive and alive encourages interaction. Achieve this with subtle hover effects, vibrant harmonious color palettes, and clean modern typography.' },
      { post_id: 3, language_id: viLangId, title: '10 Nguyên tắc cốt lõi cho Giao diện Glassmorphism hiện đại', slug: '10-nguyen-tac-cot-loi-cho-giao-dien-glassmorphism-hien-dai', content: 'Thiết kế giao diện mang lại cảm giác sống động và phản hồi tốt sẽ thúc đẩy sự tương tác. Hãy đạt được điều này với hiệu ứng hover tinh tế, bảng màu hài hòa sống động và nghệ thuật chữ hiện đại.' },

      // Post 4
      { post_id: 4, language_id: enLangId, title: 'Next-Gen LLM Reasoning & Tool Use in 2026', slug: 'next-gen-llm-reasoning-and-tool-use-in-2026', content: 'Modern language models are moving beyond simple pattern matching. By integrating external tools, code interpreters, and multi-agent loops, they can tackle complex engineering workflows autonomously.' },

      { post_id: 4, language_id: viLangId, title: 'Khả năng Suy luận & Sử dụng Công cụ của LLM Thế hệ mới năm 2026', slug: 'kha-nang-suy-luan-and-su-dung-cong-cu-cua-llm-2026', content: 'Các mô hình ngôn ngữ hiện đại đang vượt qua giới hạn nhận diện mẫu đơn thuần. Bằng cách tích hợp công cụ bên ngoài, trình thông dịch mã và vòng lặp đa tác nhân, chúng có thể tự động giải quyết các quy trình kỹ thuật phức tạp.' },
      { post_id: 4, language_id: zhLangId, title: '2026年下一代大语言模型推理与工具使用', slug: '2026-nian-xia-yi-dai-da-yu-yan-mo-xing-tui-li', content: '现代语言模型正在超越简单的模式匹配。通过集成外部工具、代码解释器和多代理循环，它们能够自主处理复杂的工程工作流。' },

      // Post 5
      { post_id: 5, language_id: enLangId, title: 'Building High-Throughput Microservices with Rust & gRPC', slug: 'building-high-throughput-microservices-with-rust-grpc', content: 'As backend scalability requirements grow, transitioning performance-critical services to Rust and gRPC has proven to drastically reduce memory footprint while eliminating garbage collection pauses.' },
      { post_id: 5, language_id: viLangId, title: 'Xây dựng Microservices Hiệu năng cao với Rust & gRPC', slug: 'xay-dung-microservices-hieu-nang-cao-voi-rust-grpc', content: 'Khi yêu cầu về khả năng mở rộng tăng lên, việc chuyển đổi các dịch vụ quan trọng về hiệu năng sang Rust và gRPC đã chứng minh giảm đáng kể lượng bộ nhớ sử dụng.' },
      { post_id: 5, language_id: zhLangId, title: '使用Rust和gRPC构建高吞吐量微服务', slug: 'shi-yong-rust-he-grpc-gou-jian-gao-tun-tu-liang-wei-fu-wu', content: '随着后端可扩展性需求的增长，将关键性能服务过渡到Rust和gRPC极大地减少了内存占用，同时消除了垃圾回收停顿。' },

      // Post 6
      { post_id: 6, language_id: enLangId, title: 'The Psychology of Color in Modern Web Applications', slug: 'the-psychology-of-color-in-modern-web-applications', content: 'Color is not just an aesthetic choice; it is a fundamental communication tool that guides user interaction, establishes brand trust, and influences cognitive load in complex user interfaces.' },
      { post_id: 6, language_id: viLangId, title: 'Tâm lý học Màu sắc trong các Ứng dụng Web Hiện đại', slug: 'tam-ly-hoc-mau-sac-trong-cac-ung-dung-web-hien-dai', content: 'Màu sắc không chỉ là lựa chọn thẩm mỹ; nó là công cụ giao tiếp cốt lõi dẫn dắt tương tác người dùng, xây dựng lòng tin thương hiệu và ảnh hưởng đến tải nhận thức trong các giao diện phức tạp.' },
      { post_id: 6, language_id: zhLangId, title: '现代Web应用程序中的色彩心理学', slug: 'xian-dai-web-ying-yong-cheng-xu-zhong-de-se-cai-xin-li-xue', content: '色彩不仅是美学选择，更是指导用户交互、建立品牌信任并在复杂用户界面中影响认知负荷的核心沟通工具。' },


      // Post 7
      { post_id: 7, language_id: enLangId, title: 'Distributed Caching Strategies for High-Traffic APIs', slug: 'distributed-caching-strategies-for-high-traffic-apis', content: 'When scaling web applications to millions of daily active users, database bottlenecks become the primary limiting factor. Implementing multi-tiered distributed caching using Redis and Memcached can alleviate up to 95% of read load.' },
      { post_id: 7, language_id: viLangId, title: 'Chiến lược Caching Phân tán cho API Lưu lượng cao', slug: 'chien-luoc-caching-phan-tan-cho-api-luu-luong-cao', content: 'Khi mở rộng quy mô ứng dụng web lên hàng triệu người dùng hoạt động mỗi ngày, nghẽn cổ chai cơ sở dữ liệu trở thành yếu tố cản trở chính. Triển khai bộ nhớ đệm phân tán nhiều tầng bằng Redis và Memcached có thể giảm tới 95% tải đọc.' },
      { post_id: 7, language_id: zhLangId, title: '高流量API的分布式缓存策略', slug: 'gao-liu-liang-api-de-fen-bu-shi-huan-cun-ce-lve', content: '将Web应用程序扩展到数百万日活跃用户时，数据库瓶颈成为主要的限制因素。使用Redis和Memcached实施多层分布式缓存可以减轻高达95%的读负载。' },

      // Post 8
      { post_id: 8, language_id: enLangId, title: 'Designing Accessible & Inclusive Dark Mode Interfaces', slug: 'designing-accessible-and-inclusive-dark-mode-interfaces', content: 'Dark mode is more than just inverting colors; it requires careful calibration of contrast ratios, elevation shadows, and typographic hierarchy to prevent eye strain and astigmatism halation.' },
      { post_id: 8, language_id: viLangId, title: 'Thiết kế Giao diện Dark Mode Dễ tiếp cận & Toàn diện', slug: 'thiet-ke-giao-dien-dark-mode-de-tiep-can-and-toan-dien', content: 'Dark mode không chỉ đơn thuần là đảo ngược màu sắc; nó đòi hỏi sự tinh chỉnh cẩn thận về tỷ lệ tương phản, độ bóng của các lớp không gian và cấu trúc chữ để ngăn ngừa mỏi mắt.' },
      { post_id: 8, language_id: zhLangId, title: '设计无障碍与包容性的深色模式界面', slug: 'she-ji-wu-zhang-ai-yu-bao-rong-xing-de-shen-se-mo-shi-jie-mian', content: '深色模式不仅仅是反转颜色；它需要仔细校准对比度、层级阴影和排版层级，以防止视疲劳和散光晕影。' },

      // Post 9

      { post_id: 9, language_id: enLangId, title: 'Optimizing LLM Inference: Quantization & Speculative Decoding', slug: 'optimizing-llm-inference-quantization-and-speculative-decoding', content: 'Running large language models in production efficiently demands cutting-edge optimization techniques. Quantizing models from FP16 down to INT4 or FP8 significantly reduces memory bandwidth requirements.' },
      { post_id: 9, language_id: viLangId, title: 'Tối ưu hóa LLM Inference: Lượng tử hóa & Speculative Decoding', slug: 'toi-uu-hoa-llm-inference-luong-tu-hoa-and-speculative-decoding', content: 'Vận hành hiệu quả các mô hình ngôn ngữ lớn trong môi trường thực tế đòi hỏi các kỹ thuật tối ưu tiên tiến nhất. Lượng tử hóa mô hình từ FP16 xuống INT4 hoặc FP8 giúp giảm đáng kể yêu cầu băng thông bộ nhớ.' },
      { post_id: 9, language_id: zhLangId, title: '优化大语言模型推理：量化与推测解码', slug: 'you-hua-da-yu-yan-mo-xing-tui-li-liang-hua-yu-tui-ce-jie-ma', content: '在生产环境中高效运行大语言模型需要最先进的优化技术。将模型从FP16量化到INT4或FP8大大降低了内存带宽需求。' },

      // Post 10
      { post_id: 10, language_id: enLangId, title: 'Micro-Animations: Bringing Interactive Web Layouts to Life', slug: 'micro-animations-bringing-interactive-web-layouts-to-life', content: 'Subtle micro-animations provide crucial feedback to user interactions, making interfaces feel tactile and responsive. From button press animations to smooth drawer transitions, motion design bridges the gap.' },
      { post_id: 10, language_id: viLangId, title: 'Micro-Animations: Thổi hồn vào các Giao diện Web Tương tác', slug: 'micro-animations-thoi-hon-vao-cac-giao-dien-web-tuong-tac', content: 'Các vi chuyển động (micro-animations) tinh tế mang lại phản hồi quan trọng cho các tương tác của người dùng, giúp giao diện mang lại cảm giác chân thực và nhạy bén.' },
      { post_id: 10, language_id: zhLangId, title: '微动画：赋予交互式Web布局生命力', slug: 'wei-dong-hua-fu-yu-jiao-hu-shi-web-bu-ju-sheng-ming-li', content: '微妙的微动画为用户交互提供关键反馈，使界面具有触感和响应能力。从按钮按下动画到平滑的抽屉过渡，运动设计弥合了静态屏幕与流畅软件之间的差距。' },

      // Post 11
      { post_id: 11, language_id: enLangId, title: 'React 19 vs Vue 3: The Framework Wars Continue', slug: 'react-19-vs-vue-3-the-framework-wars-continue', content: 'With React 19 introducing the new compiler and use() hook, and Vue 3 perfecting the Composition API with Vapor Mode, the frontend landscape is evolving faster than ever.' },
      { post_id: 11, language_id: viLangId, title: 'React 19 vs Vue 3: Cuộc chiến Framework Tiếp diễn', slug: 'react-19-vs-vue-3-cuoc-chien-framework-tiep-dien', content: 'Với việc React 19 giới thiệu trình biên dịch mới và hook use(), cùng với Vue 3 hoàn thiện Composition API qua Vapor Mode, bối cảnh frontend đang phát triển nhanh hơn bao giờ hết.' },

      { post_id: 11, language_id: zhLangId, title: 'React 19 vs Vue 3：框架之争继续', slug: 'react-19-vs-vue-3-kuang-jia-zhi-zheng-ji-xu', content: '随着React 19引入新的编译器和use()钩子，以及Vue 3通过Vapor模式完善Composition API，前端领域的发展比以往任何时候都快。' },

      // Post 12
      { post_id: 12, language_id: enLangId, title: 'Flutter Impeller: Redefining Cross-Platform Rendering', slug: 'flutter-impeller-redefining-cross-platform-rendering', content: 'Skia has served Flutter well, but Impeller brings a new era of jank-free rendering by precompiling shaders. Learn how this architectural shift fundamentally solves iOS stutter.' },
      { post_id: 12, language_id: viLangId, title: 'Flutter Impeller: Định nghĩa lại Rendering Đa nền tảng', slug: 'flutter-impeller-dinh-nghia-lai-rendering-da-nen-tang', content: 'Skia đã phục vụ tốt cho Flutter, nhưng Impeller mang đến một kỷ nguyên mới của việc hiển thị mượt mà bằng cách biên dịch trước các shaders.' },
      { post_id: 12, language_id: zhLangId, title: 'Flutter Impeller：重新定义跨平台渲染', slug: 'flutter-impeller-chong-xin-ding-yi-kua-ping-tai-xuan-ran', content: 'Skia为Flutter提供了很好的服务， prejudiceImpeller通过预编译着色器开启了无卡顿渲染的新纪元。' },

      // Post 13
      { post_id: 13, language_id: enLangId, title: 'Migrating from Pandas to Polars for Big Data Processing', slug: 'migrating-from-pandas-to-polars-for-big-data-processing', content: 'Pandas has been the standard for data manipulation in Python, but it struggles with large datasets due to its single-threaded nature. Polars, written in Rust, processes data up to 50x faster.' },
      { post_id: 13, language_id: viLangId, title: 'Chuyển đổi từ Pandas sang Polars để Xử lý Dữ liệu Lớn', slug: 'chuyen-doi-tu-pandas-sang-polars-de-xu-ly-du-lieu-lon', content: 'Pandas từng là tiêu chuẩn để thao tác dữ liệu trong Python, nhưng nó gặp khó khăn với các tập dữ liệu lớn do bản chất luồng đơn. Polars, được viết bằng Rust, xử lý dữ liệu nhanh hơn tới 50 lần.' },
      { post_id: 13, language_id: zhLangId, title: '从Pandas迁移到Polars以进行大数据处理', slug: 'cong-pandas-qian-yi-dao-polars-yi-jin-xing-da-shu-ju-chu-li', content: 'Pandas一直是Python中数据操作的标准，但由于其单线程特性，在处理大型数据集时显得吃力。用Rust编写的Polars将数据处理速度提高了多达50倍。' },


      // Post 14
      { post_id: 14, language_id: enLangId, title: 'Zero Trust Architecture: Never Trust, Always Verify', slug: 'zero-trust-architecture-never-trust-always-verify', content: 'Traditional network security models based on perimeter defense are obsolete in the era of remote work and cloud infrastructure. Zero Trust mandates strict identity verification for every resource request.' },
      { post_id: 14, language_id: viLangId, title: 'Kiến trúc Zero Trust: Không bao giờ tin tưởng, Luôn luôn xác minh', slug: 'kien-truc-zero-trust-khong-bao-gio-tin-tuong-luon-luon-xac-minh', content: 'Các mô hình bảo mật mạng truyền thống dựa trên phòng thủ vành đai đã lỗi thời trong kỷ nguyên làm việc từ xa và cơ sở hạ tầng đám mây. Zero Trust bắt buộc xác minh danh tính nghiêm ngặt.' },
      { post_id: 14, language_id: zhLangId, title: '零信任架构：永不信任，始终验证', slug: 'ling-xin-ren-jia-gou-yong-bu-xin-ren-shi-zhong-yan-zheng', content: '在远程工作和云基础设施时代，基于边界防御的传统网络安全模型已经过时。零信任要求对试图访问资源的每个人和设备进行严格的身份验证。' },

      // Post 15
      { post_id: 15, language_id: enLangId, title: 'Kubernetes Anti-Patterns: Why Your Cluster is Failing', slug: 'kubernetes-anti-patterns-why-your-cluster-is-failing', content: 'Adopting Kubernetes does not automatically make your application scalable or resilient. We explore common anti-patterns such as omitting resource limits and hardcoding container configs.' },
      { post_id: 15, language_id: viLangId, title: 'Các Anti-Pattern trong Kubernetes: Tại sao Cluster của bạn thất bại', slug: 'cac-anti-pattern-trong-kubernetes-tai-sao-cluster-cua-ban-that-bai', content: 'Việc áp dụng Kubernetes không tự động làm cho ứng dụng của bạn có khả năng mở rộng hay phục hồi. Chúng tôi khám phá các anti-pattern phổ biến như bỏ qua giới hạn tài nguyên và hardcode cấu hình.' },
      { post_id: 15, language_id: zhLangId, title: 'Kubernetes反模式：为什么你的集群会失败', slug: 'kubernetes-fan-mo-shi-wei-shi-me-ni-de-ji-qun-hui-shi-bai', content: '采用Kubernetes并不会自动使您的应用程序具有可扩展性或弹性。我们探讨了常见的反模式，例如省略资源限制和在容器内硬编码配置。' },

      // Post 16
      { post_id: 16, language_id: enLangId, title: 'The Return to Minimalism in Enterprise Software', slug: 'the-return-to-minimalism-in-enterprise-software', content: 'After years of feature bloat and complex dashboards, enterprise users are experiencing cognitive overload. We analyze the shift back towards minimalist interfaces that prioritize focus.' },

      { post_id: 16, language_id: viLangId, title: 'Sự Trở lại của Chủ nghĩa Tối giản trong Phần mềm Doanh nghiệp', slug: 'su-tro-lai-cua-chu-nghia-toi-gian-trong-phan-mem-doanh-nghiep', content: 'Sau nhiều năm nhồi nhét tính năng và bảng điều khiển phức tạp, người dùng doanh nghiệp đang trải qua sự quá tải nhận thức. Chúng tôi phân tích sự chuyển dịch quay lại các giao diện tối giản.' },
      { post_id: 16, language_id: zhLangId, title: '企业软件中极简主义的回归', slug: 'qi-ye-ruan-jian-zhong-ji-jian-zhu-yi-de-hui-gui', content: '经过多年的功能膨胀和复杂的仪表板，企业用户正经历着认知超载。我们分析了回归极简主义界面的趋势，这些界面优先考虑留白和专注的用户工作流。' },

      // Post 17
      { post_id: 17, language_id: enLangId, title: 'Global Macro Outlook: Interest Rates & Financial Markets in 2026', slug: 'global-macro-outlook-interest-rates-and-financial-markets-in-2026', content: 'As central banks navigate post-inflation dynamics, monetary policy shifts are creating both challenges and opportunities across global equities and fixed income.' },
      { post_id: 17, language_id: viLangId, title: 'Triển vọng Vĩ mô Toàn cầu: Lãi suất & Thị trường Tài chính năm 2026', slug: 'trien-vong-vi-mo-toan-cau-lai-suat-and-thi-truong-tai-chinh-2026', content: 'Khi các ngân hàng trung ương điều hướng động thái hậu lạm phát, sự thay đổi chính sách tiền tệ đang tạo ra cả thách thức lẫn cơ hội trên thị trường cổ phiếu và trái phiếu toàn cầu.' },
      { post_id: 17, language_id: zhLangId, title: '全球宏观展望：2026年利率与金融市场', slug: 'quan-qiu-hong-guan-zhan-wang-2026-nian-li-lv-yu-jin-rong-shi-chang', content: '随着央行驾驭通胀后的动态，货币政策的转向在全球股票和固定收益市场中既创造了挑战也带来了机遇。' },

      // Post 18
      { post_id: 18, language_id: enLangId, title: 'The Art of Deep Work: Engineering Culture in an Asynchronous World', slug: 'the-art-of-deep-work-engineering-culture', content: 'True engineering breakthroughs require uninterrupted stretches of focus. In a remote work environment, preserving cognitive flow is the most valuable superpower.' },
      { post_id: 18, language_id: viLangId, title: 'Nghệ thuật Làm việc Sâu: Văn hóa Kỹ thuật trong Thế giới Bất đồng bộ', slug: 'nghe-thuat-lam-viec-sau-van-hoa-ky-thuat', content: 'Những đột phá kỹ thuật thực sự đòi hỏi những khoảng thời gian tập trung liên tục không bị gián đoạn. Trong môi trường làm việc từ xa, việc bảo vệ luồng nhận thức là siêu năng lực quý giá nhất.' },
      { post_id: 18, language_id: zhLangId, title: '深度工作的艺术：异步世界中的工程文化', slug: 'shen-du-gong-zuo-de-yi-shu-yi-bu-shi-jie-zhong-de-gong-cheng-wen-hua', content: '真正的技术突破需要深度且连续的专注时间。在由即时通讯和不断推送通知主导的远程工作环境中，保护认知流和建立异步写作文化是组织最有价值的超能力。' },

    ];

    const embeddedVideo = '<div class="editor-media-wrapper"><video controls playsinline src="https://res.cloudinary.com/ddizrhk7g/video/upload/v1784192503/Top_5_m%C3%B3n_%C4%83n_nguy_hi%E1%BB%83m_nh%E1%BA%A5t_Vi%E1%BB%87t_Nam-_food_shorts_health_-_YouTube_lyyec7.mp4"></video></div>';
    translationsData
      .filter((translation) => translation.post_id === 1)
      .forEach((translation) => {
        translation.content = `${embeddedVideo}${translation.content}`;
      });

    await queryInterface.bulkInsert(
      'post_translations',
      translationsData.map((t) => ({
        post_id: t.post_id,
        language_id: t.language_id,
        title: t.title,
        slug: t.slug,
        content: t.content,
        translation_status: 'completed',

        created_at: now,
        updated_at: now,
      })),
      { ignoreDuplicates: true }
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('post_translations', null, {});
    await queryInterface.bulkDelete('posts', null, {});
    await queryInterface.bulkDelete('category_translations', null, {});
    await queryInterface.bulkDelete('categories', null, {});

    await queryInterface.bulkDelete('users', null, {});
  },
};
