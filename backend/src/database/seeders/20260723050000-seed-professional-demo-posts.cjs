'use strict';

const bcrypt = require('bcrypt');

const ARTICLE_SLUGS = [
  'xay-dung-san-pham-ai-da-ngon-ngu-co-trach-nhiem',
  'responsible-multilingual-ai-product-design',
  'fu-ze-ren-de-duo-yu-yan-ai-chan-pin',
];

function withEmbeddedMedia(content, article, languageCode) {
  const image = `<figure><img src="${article.inlineImage.url}" alt="${article.inlineImage.alt[languageCode]}" loading="lazy" width="1280" height="720"><figcaption>${article.inlineImage.caption[languageCode]}</figcaption></figure>`;
  const leadEnd = content.indexOf('</p>');
  let result = leadEnd >= 0
    ? `${content.slice(0, leadEnd + 4)}${image}${content.slice(leadEnd + 4)}`
    : `${image}${content}`;

  if (article.video) {
    const video = `<figure><video controls playsinline preload="metadata" poster="${article.video.poster}" title="${article.video.title[languageCode]}" width="1280" height="720"><source src="${article.video.url}" type="video/mp4"></video><figcaption>${article.video.caption[languageCode]}</figcaption></figure>`;
    result = `${result}${video}`;
  }

  return result;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { QueryTypes } = Sequelize;
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Professional demo data must not be seeded in production.');
      }

      const now = new Date();
      await queryInterface.bulkInsert(
        'roles',
        [{ name: 'member' }],
        { ignoreDuplicates: true, transaction },
      );

      const memberRoles = await queryInterface.sequelize.query(
        `SELECT id FROM roles WHERE name = 'member' LIMIT 1`,
        { type: QueryTypes.SELECT, transaction },
      );
      if (!memberRoles.length) {
        throw new Error('Cannot seed demo data: member role could not be prepared.');
      }

      await queryInterface.bulkInsert(
        'languages',
        [
          { code: 'vi', name: 'Tiếng Việt', native_name: 'Tiếng Việt', flag_code: 'vn', is_default: false, is_active: true },
          { code: 'en', name: 'English', native_name: 'English', flag_code: 'us', is_default: true, is_active: true },
          { code: 'zh', name: '中文', native_name: '中文', flag_code: 'cn', is_default: false, is_active: true },
          { code: 'es', name: 'Spanish', native_name: 'Español', flag_code: 'es', is_default: false, is_active: true },
        ],
        { ignoreDuplicates: true, transaction },
      );
      await queryInterface.sequelize.query(
        `UPDATE languages SET is_active = 1 WHERE code IN ('vi', 'en', 'zh', 'es')`,
        { transaction },
      );

      const languages = await queryInterface.sequelize.query(
        `SELECT id, code FROM languages WHERE is_active = 1`,
        { type: QueryTypes.SELECT, transaction },
      );
      const languageByCode = new Map(languages.map((language) => [language.code, language.id]));

      for (const code of ['vi', 'en', 'zh', 'es']) {
        if (!languageByCode.has(code)) {
          throw new Error(`Cannot seed demo posts: active language "${code}" was not found.`);
        }
      }

      let categories = await queryInterface.sequelize.query(
        `SELECT id FROM categories WHERE slug = 'technology' LIMIT 1`,
        { type: QueryTypes.SELECT, transaction },
      );
      if (!categories.length) {
        await queryInterface.bulkInsert(
          'categories',
          [{ slug: 'technology', status: 'active', created_at: now, updated_at: now }],
          { transaction },
        );
        categories = await queryInterface.sequelize.query(
          `SELECT id FROM categories WHERE slug = 'technology' LIMIT 1`,
          { type: QueryTypes.SELECT, transaction },
        );
      } else {
        await queryInterface.bulkUpdate(
          'categories',
          { status: 'active', updated_at: now },
          { id: categories[0].id },
          { transaction },
        );
      }

      const categoryNames = {
        vi: { name: 'Công nghệ', slug: 'cong-nghe' },
        en: { name: 'Technology', slug: 'technology' },
        zh: { name: '科技', slug: 'ke-ji' },
        es: { name: 'Tecnología', slug: 'tecnologia' },
      };
      await queryInterface.bulkInsert(
        'category_translations',
        Object.entries(categoryNames).map(([code, value]) => ({
          category_id: categories[0].id,
          language_id: languageByCode.get(code),
          name: value.name,
          slug: value.slug,
        })),
        { ignoreDuplicates: true, transaction },
      );

      const passwordHash = await bcrypt.hash(
        process.env.DEMO_USER_PASSWORD || 'LingoraDemo@2026',
        12,
      );
      await queryInterface.bulkInsert(
        'users',
        [
          {
            username: 'lingora_demo_author',
            display_name: 'Minh Anh',
            email: 'demo.author@lingora.local',
            password: passwordHash,
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=160&h=160',
            bio: 'Product writer exploring responsible technology and multilingual experiences.',
            role_id: memberRoles[0].id,
            status: 'active',
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
          {
            username: 'lingora_demo_reader',
            display_name: 'Daniel Chen',
            email: 'demo.reader@lingora.local',
            password: passwordHash,
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=160&h=160',
            bio: 'Software architect interested in secure and maintainable content platforms.',
            role_id: memberRoles[0].id,
            status: 'active',
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        ],
        { ignoreDuplicates: true, transaction },
      );
      await queryInterface.sequelize.query(
        `UPDATE users
         SET role_id = :roleId, status = 'active', deleted_at = NULL, updated_at = :updatedAt
         WHERE email IN ('demo.author@lingora.local', 'demo.reader@lingora.local')`,
        {
          replacements: { roleId: memberRoles[0].id, updatedAt: now },
          transaction,
        },
      );

      const users = await queryInterface.sequelize.query(
        `SELECT id, username, display_name, email
         FROM users
         WHERE email IN ('demo.author@lingora.local', 'demo.reader@lingora.local')
           AND status = 'active' AND deleted_at IS NULL`,
        { type: QueryTypes.SELECT, transaction },
      );
      const demoAuthor = users.find((user) => user.email === 'demo.author@lingora.local');
      const demoReader = users.find((user) => user.email === 'demo.reader@lingora.local');
      if (!demoAuthor || !demoReader) {
        throw new Error('Cannot seed demo data: demo users could not be prepared.');
      }

      const categoryId = categories[0].id;

      const articles = [
        {
          authorId: demoAuthor.id,
          originalCode: 'vi',
          inlineImage: {
            url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=85&w=1400',
            alt: {
              vi: 'Nhóm sản phẩm thảo luận quy trình phát triển AI đa ngôn ngữ',
              en: 'Product team discussing a multilingual AI workflow',
              zh: '产品团队讨论多语言 AI 工作流程',
              es: 'Equipo de producto analizando un flujo de IA multilingüe',
            },
            caption: {
              vi: 'Đội ngũ đa chức năng giúp bản dịch cân bằng giữa tốc độ, chất lượng và bối cảnh.',
              en: 'Cross-functional teams balance translation speed, quality, and cultural context.',
              zh: '跨职能团队在翻译速度、质量与文化语境之间取得平衡。',
              es: 'Los equipos multidisciplinares equilibran velocidad, calidad y contexto cultural.',
            },
          },
          viewCount: 1284,
          publishedAt: new Date(now.getTime() - 1000 * 60 * 60 * 30),
          translations: {
            vi: {
              title: 'Xây dựng sản phẩm AI đa ngôn ngữ có trách nhiệm',
              slug: 'xay-dung-san-pham-ai-da-ngon-ngu-co-trach-nhiem',
              content: `<p class="lead">Một sản phẩm AI đa ngôn ngữ tốt không chỉ dịch đúng câu chữ. Nó phải giữ được ý định, ngữ cảnh và mức độ tin cậy khi phục vụ người dùng ở những nền văn hóa khác nhau.</p><h2>Bắt đầu từ nhu cầu thật của người dùng</h2><p>Nhóm sản phẩm nên xác định rõ những hành trình nào cần bản địa hóa trước: khám phá nội dung, tìm kiếm, hỗ trợ khách hàng hay cộng tác. Việc ưu tiên theo tác động giúp đội ngũ tránh đầu tư dàn trải và tạo ra giá trị có thể đo lường ngay từ phiên bản đầu tiên.</p><h2>Thiết kế quy trình có con người kiểm soát</h2><p>Mô hình ngôn ngữ có thể tạo bản dịch nhanh, nhưng các nội dung quan trọng vẫn cần người biên tập duyệt. Một quy trình chuyên nghiệp nên lưu ngôn ngữ gốc, phiên bản bản dịch, trạng thái xử lý và lịch sử thay đổi để mọi quyết định đều có thể truy vết.</p><blockquote>Chất lượng không đến từ một mô hình duy nhất; nó đến từ hệ thống phản hồi liên tục giữa dữ liệu, con người và sản phẩm.</blockquote><h2>Đo lường đúng điều quan trọng</h2><ul><li>Theo dõi tỷ lệ người dùng đọc hết nội dung theo từng ngôn ngữ.</li><li>Đánh giá độ chính xác của thuật ngữ và giọng điệu.</li><li>Ghi nhận phản hồi của cộng đồng bản địa.</li><li>Kiểm tra định kỳ các rủi ro thiên lệch và an toàn.</li></ul><p>Khi ngôn ngữ được xem là một phần của kiến trúc sản phẩm thay vì bước xử lý cuối cùng, AI có thể giúp nội dung đi xa hơn mà vẫn giữ được bản sắc ban đầu.</p>`,
            },
            en: {
              title: 'Building Responsible Multilingual AI Products',
              slug: 'building-responsible-multilingual-ai-products',
              content: `<p class="lead">A strong multilingual AI product does more than translate words. It preserves intent, context, and trust while serving people across different cultures.</p><h2>Start with real user needs</h2><p>Product teams should identify which journeys need localization first: content discovery, search, customer support, or collaboration. Prioritizing by impact prevents scattered investment and creates measurable value from the first release.</p><h2>Keep people in control</h2><p>Language models can draft translations quickly, but important content still needs editorial review. A professional workflow stores the source language, translation versions, processing status, and change history so every decision remains traceable.</p><blockquote>Quality does not come from one model; it comes from a continuous feedback loop between data, people, and product.</blockquote><h2>Measure what matters</h2><ul><li>Track completion and engagement by language.</li><li>Review terminology accuracy and tone.</li><li>Collect feedback from native communities.</li><li>Audit safety and bias risks regularly.</li></ul><p>When language becomes part of product architecture instead of a final processing step, AI can help content travel farther without losing its original identity.</p>`,
            },
            zh: {
              title: '负责任地构建多语言 AI 产品',
              slug: 'fu-ze-ren-de-gou-jian-duo-yu-yan-ai-chan-pin',
              content: `<p class="lead">优秀的多语言 AI 产品不仅要翻译文字，还要在不同文化环境中保留原始意图、语境与可信度。</p><h2>从真实用户需求出发</h2><p>产品团队应先明确最需要本地化的用户旅程，例如内容发现、搜索、客户支持或协作。按照影响力排序，能够避免分散投入，并让首个版本就产生可衡量的价值。</p><h2>让人始终掌握控制权</h2><p>语言模型可以快速生成译稿，但重要内容仍需编辑审核。专业流程应保存原始语言、翻译版本、处理状态和修改记录，使每个决策都可以追溯。</p><blockquote>质量并非来自单一模型，而是来自数据、人员与产品之间持续的反馈循环。</blockquote><h2>衡量真正重要的指标</h2><ul><li>按语言跟踪阅读完成率与互动率。</li><li>检查术语准确性与语气。</li><li>收集母语社区的反馈。</li><li>定期审查安全与偏见风险。</li></ul><p>当语言成为产品架构的一部分，而不是最后一步处理时，AI 才能帮助内容走得更远，同时保留原有特色。</p>`,
            },
            es: {
              title: 'Cómo crear productos de IA multilingües responsables',
              slug: 'crear-productos-ia-multilingues-responsables',
              content: `<p class="lead">Un buen producto de IA multilingüe hace más que traducir palabras: conserva la intención, el contexto y la confianza entre culturas diferentes.</p><h2>Empezar por necesidades reales</h2><p>El equipo debe decidir qué recorridos necesitan localización primero: descubrimiento, búsqueda, soporte o colaboración. Priorizar por impacto evita esfuerzos dispersos y genera valor medible desde la primera versión.</p><h2>Mantener a las personas al mando</h2><p>Los modelos pueden producir borradores rápidamente, pero el contenido importante todavía necesita revisión editorial. Un flujo profesional conserva el idioma original, las versiones, el estado y el historial de cambios.</p><blockquote>La calidad no procede de un solo modelo, sino de la retroalimentación continua entre datos, personas y producto.</blockquote><h2>Medir lo que importa</h2><ul><li>Analizar la lectura y la interacción por idioma.</li><li>Revisar terminología y tono.</li><li>Escuchar a las comunidades nativas.</li><li>Auditar periódicamente seguridad y sesgos.</li></ul><p>Cuando el idioma forma parte de la arquitectura del producto, la IA permite que el contenido llegue más lejos sin perder su identidad.</p>`,
            },
          },
          comment: {
            authorId: demoReader.id,
            originalCode: 'vi',
            content: 'Bài viết trình bày rất rõ mối liên hệ giữa chất lượng bản dịch và thiết kế sản phẩm. Phần đo lường đặc biệt hữu ích cho đội ngũ đang xây dựng MVP.',
            translations: {
              en: 'The article clearly explains the relationship between translation quality and product design. The measurement section is especially useful for teams building an MVP.',
              zh: '文章清楚说明了翻译质量与产品设计之间的关系，其中衡量指标部分对正在构建 MVP 的团队尤其有用。',
              es: 'El artículo explica claramente la relación entre la calidad de la traducción y el diseño del producto. La sección de métricas resulta especialmente útil para equipos que crean un MVP.',
            },
          },
        },
        {
          authorId: demoReader.id,
          originalCode: 'en',
          inlineImage: {
            url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=85&w=1400',
            alt: {
              vi: 'Đội ngũ kỹ thuật cộng tác quanh một bàn làm việc',
              en: 'Engineering team collaborating around a shared workspace',
              zh: '工程团队在共享工作空间中协作',
              es: 'Equipo de ingeniería colaborando en un espacio compartido',
            },
            caption: {
              vi: 'Ranh giới rõ ràng giúp nhiều nhóm phát triển song song mà không làm tăng chi phí phối hợp.',
              en: 'Clear boundaries let multiple teams move in parallel without increasing coordination cost.',
              zh: '清晰的边界让多个团队能够并行推进，而不会增加协调成本。',
              es: 'Los límites claros permiten avanzar en paralelo sin aumentar el coste de coordinación.',
            },
          },
          viewCount: 946,
          publishedAt: new Date(now.getTime() - 1000 * 60 * 60 * 18),
          translations: {
            vi: {
              title: 'Từ nguyên mẫu đến sản phẩm: kiến trúc cho đội ngũ tăng trưởng',
              slug: 'tu-nguyen-mau-den-san-pham-kien-truc-cho-doi-ngu-tang-truong',
              content: `<p class="lead">Kiến trúc tốt không phải là kiến trúc phức tạp nhất, mà là kiến trúc giúp đội ngũ thay đổi sản phẩm nhanh mà vẫn kiểm soát được rủi ro.</p><h2>Thiết lập ranh giới rõ ràng</h2><p>Mỗi tính năng nên sở hữu giao diện, logic và dữ liệu thuộc phạm vi của nó. Các thành phần dùng chung chỉ nên chứa những khả năng thực sự phục vụ nhiều luồng, chẳng hạn xác thực, kết nối HTTP và hệ thống thiết kế.</p><h2>Ưu tiên khả năng quan sát</h2><p>Log có cấu trúc, chỉ số hiệu năng và lịch sử triển khai giúp nhóm phát hiện vấn đề trước khi người dùng phải báo lỗi. Đây là nền tảng để phát hành thường xuyên mà không đánh đổi độ tin cậy.</p><h2>Mở rộng theo bằng chứng</h2><ol><li>Đo điểm nghẽn thực tế.</li><li>Tối ưu phần tạo ra tác động lớn nhất.</li><li>Tách dịch vụ khi ranh giới nghiệp vụ đã ổn định.</li><li>Ghi lại quyết định và tiêu chí đánh đổi.</li></ol><p>Một nền tảng bền vững cho phép sản phẩm tiến hóa theo nhu cầu, thay vì buộc đội ngũ dự đoán mọi tình huống ngay từ ngày đầu.</p>`,
            },
            en: {
              title: 'From Prototype to Product: Architecture for Growing Teams',
              slug: 'responsible-multilingual-ai-product-design',
              content: `<p class="lead">Good architecture is not the most complicated architecture. It is the one that lets a team change the product quickly while keeping risk under control.</p><h2>Create clear boundaries</h2><p>Each feature should own the interface, logic, and data within its domain. Shared areas should contain only capabilities that genuinely serve multiple flows, such as authentication, HTTP infrastructure, and the design system.</p><h2>Prioritize observability</h2><p>Structured logs, performance metrics, and deployment history help teams identify problems before users need to report them. This foundation enables frequent releases without sacrificing reliability.</p><h2>Scale from evidence</h2><ol><li>Measure the real bottleneck.</li><li>Optimize the area with the greatest impact.</li><li>Split services only when business boundaries are stable.</li><li>Record decisions and trade-off criteria.</li></ol><p>A sustainable platform allows the product to evolve with demand instead of forcing the team to predict every scenario on day one.</p>`,
            },
            zh: {
              title: '从原型到产品：面向成长团队的架构',
              slug: 'cong-yuan-xing-dao-chan-pin-jia-gou',
              content: `<p class="lead">好的架构并不是最复杂的架构，而是让团队在控制风险的同时快速调整产品的架构。</p><h2>建立清晰边界</h2><p>每项功能都应拥有其领域内的界面、逻辑和数据。共享区域只保留真正服务于多个流程的能力，例如身份验证、HTTP 基础设施和设计系统。</p><h2>优先建设可观测性</h2><p>结构化日志、性能指标和部署历史能够帮助团队在用户反馈之前发现问题，从而在不牺牲可靠性的前提下频繁发布。</p><h2>依据证据扩展</h2><ol><li>测量真实瓶颈。</li><li>优化影响最大的环节。</li><li>仅在业务边界稳定后拆分服务。</li><li>记录决策和权衡标准。</li></ol><p>可持续的平台应随着需求演进，而不是要求团队从第一天就预测所有场景。</p>`,
            },
            es: {
              title: 'Del prototipo al producto: arquitectura para equipos en crecimiento',
              slug: 'del-prototipo-al-producto-arquitectura-equipos',
              content: `<p class="lead">Una buena arquitectura no es la más complicada, sino la que permite cambiar el producto rápidamente manteniendo el riesgo bajo control.</p><h2>Crear límites claros</h2><p>Cada función debe ser responsable de su interfaz, lógica y datos. Las áreas compartidas deben contener únicamente capacidades útiles para varios flujos, como autenticación, infraestructura HTTP y sistema de diseño.</p><h2>Priorizar la observabilidad</h2><p>Los registros estructurados, las métricas y el historial de despliegues ayudan a detectar problemas antes de que los usuarios tengan que informarlos.</p><h2>Escalar con evidencias</h2><ol><li>Medir el cuello de botella real.</li><li>Optimizar el área de mayor impacto.</li><li>Separar servicios cuando los límites estén estables.</li><li>Documentar decisiones y compromisos.</li></ol><p>Una plataforma sostenible permite que el producto evolucione con la demanda sin intentar predecir todos los escenarios desde el primer día.</p>`,
            },
          },
          comment: {
            authorId: demoAuthor.id,
            originalCode: 'en',
            content: 'The distinction between feature ownership and genuinely shared infrastructure is practical. It gives teams a useful rule for keeping a codebase maintainable.',
            translations: {
              vi: 'Sự phân biệt giữa phạm vi của tính năng và hạ tầng dùng chung thực sự rất thực tế. Đây là nguyên tắc hữu ích để đội ngũ giữ codebase dễ bảo trì.',
              zh: '对功能归属与真正共享基础设施的区分非常实用，为团队保持代码库可维护性提供了清晰原则。',
              es: 'La distinción entre la responsabilidad de una función y la infraestructura realmente compartida es muy práctica para mantener el código.',
            },
          },
        },
        {
          authorId: demoAuthor.id,
          originalCode: 'zh',
          inlineImage: {
            url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=85&w=1400',
            alt: {
              vi: 'Màn hình giám sát bảo mật và hạ tầng mạng',
              en: 'Security monitoring and network infrastructure screens',
              zh: '安全监控与网络基础设施屏幕',
              es: 'Pantallas de supervisión de seguridad e infraestructura de red',
            },
            caption: {
              vi: 'Khả năng quan sát giúp đội ngũ phát hiện sớm và phản ứng có kiểm soát trước sự cố.',
              en: 'Observability helps teams detect incidents early and respond in a controlled way.',
              zh: '可观测性帮助团队尽早发现事件并有序响应。',
              es: 'La observabilidad ayuda a detectar incidentes pronto y responder de forma controlada.',
            },
          },
          video: {
            url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
            poster: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=85&w=1400',
            title: {
              vi: 'Video mẫu kiểm tra trình phát media trong bài viết',
              en: 'Sample video for testing the in-article media player',
              zh: '用于测试文章内媒体播放器的示例视频',
              es: 'Vídeo de muestra para probar el reproductor dentro del artículo',
            },
            caption: {
              vi: 'Video CC0 dùng để kiểm tra khả năng phát media nhúng, điều khiển và bố cục responsive.',
              en: 'A CC0 sample used to verify embedded playback, controls, and responsive layout.',
              zh: '该 CC0 示例用于验证嵌入式播放、控制按钮与响应式布局。',
              es: 'Muestra CC0 para verificar reproducción, controles y diseño adaptable.',
            },
          },
          viewCount: 731,
          publishedAt: new Date(now.getTime() - 1000 * 60 * 60 * 8),
          translations: {
            vi: {
              title: 'Bảo mật theo thiết kế cho nền tảng nội dung hiện đại',
              slug: 'bao-mat-theo-thiet-ke-cho-nen-tang-noi-dung-hien-dai',
              content: `<p class="lead">Bảo mật hiệu quả không phải một lớp được thêm vào trước ngày phát hành. Nó là tập hợp các quyết định nhỏ, nhất quán trong toàn bộ vòng đời sản phẩm.</p><h2>Giảm quyền truy cập mặc định</h2><p>Mỗi người dùng và dịch vụ chỉ nên có quyền cần thiết cho công việc hiện tại. Token ngắn hạn, cơ chế thu hồi rõ ràng và phân quyền ở phía máy chủ giúp giới hạn thiệt hại khi thông tin xác thực bị lộ.</p><h2>Bảo vệ dữ liệu ở mọi trạng thái</h2><p>Mã hóa đường truyền, quản lý bí mật tập trung và chính sách sao lưu đã kiểm thử cần được xem là yêu cầu nền tảng. Dữ liệu nhạy cảm không nên xuất hiện trong log hoặc phản hồi lỗi.</p><h2>Chuẩn bị trước cho sự cố</h2><ul><li>Xác định người chịu trách nhiệm ứng phó.</li><li>Duy trì nhật ký kiểm toán có thể tìm kiếm.</li><li>Diễn tập khôi phục định kỳ.</li><li>Thông báo minh bạch theo mức độ ảnh hưởng.</li></ul><p>Một hệ thống an toàn không giả định rằng lỗi sẽ không xảy ra; nó được thiết kế để phát hiện sớm, giới hạn tác động và phục hồi có kiểm soát.</p>`,
            },
            en: {
              title: 'Security by Design for Modern Content Platforms',
              slug: 'security-by-design-modern-content-platforms',
              content: `<p class="lead">Effective security is not a layer added before launch. It is a collection of small, consistent decisions throughout the product lifecycle.</p><h2>Reduce access by default</h2><p>Every user and service should receive only the permissions needed for the current task. Short-lived tokens, explicit revocation, and server-side authorization limit damage when credentials are exposed.</p><h2>Protect data in every state</h2><p>Transport encryption, centralized secret management, and tested backup policies are foundational requirements. Sensitive data should never appear in logs or error responses.</p><h2>Prepare for incidents</h2><ul><li>Assign clear response ownership.</li><li>Maintain searchable audit records.</li><li>Practice recovery regularly.</li><li>Communicate transparently according to impact.</li></ul><p>A secure system does not assume failures will never happen; it is designed to detect them early, limit their impact, and recover in a controlled way.</p>`,
            },
            zh: {
              title: '现代内容平台的安全设计',
              slug: 'fu-ze-ren-de-duo-yu-yan-ai-chan-pin',
              content: `<p class="lead">有效的安全并不是上线前临时增加的一层，而是贯穿产品生命周期的一系列一致决策。</p><h2>默认减少访问权限</h2><p>每位用户和每个服务都只应获得完成当前任务所需的权限。短期令牌、明确的撤销机制和服务端授权，可以在凭据泄露时限制损失。</p><h2>保护各种状态下的数据</h2><p>传输加密、集中式密钥管理以及经过验证的备份策略都应成为基础要求。敏感数据不应出现在日志或错误响应中。</p><h2>提前准备事故响应</h2><ul><li>明确响应负责人。</li><li>维护可搜索的审计记录。</li><li>定期演练恢复流程。</li><li>根据影响程度透明沟通。</li></ul><p>安全系统并不假设故障永远不会发生，而是能够尽早发现、限制影响并有序恢复。</p>`,
            },
            es: {
              title: 'Seguridad desde el diseño para plataformas de contenido',
              slug: 'seguridad-desde-diseno-plataformas-contenido',
              content: `<p class="lead">La seguridad eficaz no es una capa añadida antes del lanzamiento, sino un conjunto de decisiones coherentes durante todo el ciclo de vida del producto.</p><h2>Reducir el acceso por defecto</h2><p>Cada persona y servicio debe recibir únicamente los permisos necesarios. Los tokens de corta duración, la revocación explícita y la autorización en el servidor limitan el daño si se exponen credenciales.</p><h2>Proteger los datos en todo estado</h2><p>El cifrado, la gestión centralizada de secretos y las copias de seguridad verificadas son requisitos fundamentales. Los datos sensibles nunca deben aparecer en registros ni respuestas de error.</p><h2>Prepararse para incidentes</h2><ul><li>Asignar responsables claros.</li><li>Mantener registros de auditoría consultables.</li><li>Practicar la recuperación.</li><li>Comunicar con transparencia.</li></ul><p>Un sistema seguro está diseñado para detectar fallos pronto, limitar su impacto y recuperarse de forma controlada.</p>`,
            },
          },
          comment: {
            authorId: demoReader.id,
            originalCode: 'zh',
            content: '把安全设计为日常工程习惯，比在发布前集中修补更有效。事故演练和可搜索的审计记录尤其重要。',
            translations: {
              vi: 'Biến bảo mật thành thói quen kỹ thuật hằng ngày hiệu quả hơn nhiều so với vá lỗi tập trung trước khi phát hành. Diễn tập sự cố và nhật ký kiểm toán đặc biệt quan trọng.',
              en: 'Treating security as a daily engineering habit is more effective than patching everything before release. Incident drills and searchable audit records are especially important.',
              es: 'Convertir la seguridad en un hábito diario es más eficaz que corregir todo antes del lanzamiento. Los simulacros y registros de auditoría son especialmente importantes.',
            },
          },
        },
      ];

      for (const article of articles) {
        const originalLanguageId = languageByCode.get(article.originalCode);
        const source = article.translations[article.originalCode];
        const existing = await queryInterface.sequelize.query(
          `SELECT post_id FROM post_translations WHERE language_id = :languageId AND slug = :slug LIMIT 1`,
          {
            replacements: { languageId: originalLanguageId, slug: source.slug },
            type: QueryTypes.SELECT,
            transaction,
          },
        );

        const translationsWithMedia = Object.entries(article.translations).map(([code, translation]) => ({
          code,
          ...translation,
          content: withEmbeddedMedia(translation.content, article, code),
        }));

        if (existing.length) {
          const postId = existing[0].post_id;
          await queryInterface.bulkUpdate(
            'posts',
            { updated_at: now },
            { id: postId },
            { transaction },
          );
          for (const translation of translationsWithMedia) {
            await queryInterface.bulkUpdate(
              'post_translations',
              { content: translation.content, updated_at: now },
              { post_id: postId, language_id: languageByCode.get(translation.code) },
              { transaction },
            );
          }
          continue;
        }

        await queryInterface.bulkInsert(
          'posts',
          [{
            author_id: article.authorId,
            category_id: categoryId,
            original_language_id: originalLanguageId,
            view_count: article.viewCount,
            status: 'published',
            review_note: 'Professional multilingual demo content',
            published_at: article.publishedAt,
            created_at: article.publishedAt,
            updated_at: now,
            deleted_at: null,
          }],
          { transaction },
        );

        const inserted = await queryInterface.sequelize.query(
          'SELECT LAST_INSERT_ID() AS id',
          { type: QueryTypes.SELECT, transaction },
        );
        const postId = inserted[0].id;

        await queryInterface.bulkInsert(
          'post_translations',
          translationsWithMedia.map((translation) => ({
            post_id: postId,
            language_id: languageByCode.get(translation.code),
            title: translation.title,
            slug: translation.slug,
            content: translation.content,
            translation_status: 'completed',
            translation_provider: 'editorial-demo',
            created_at: article.publishedAt,
            updated_at: now,
          })),
          { transaction },
        );

        const likers = users.filter((user) => user.id !== article.authorId).slice(0, 3);
        if (likers.length) {
          await queryInterface.bulkInsert(
            'post_likes',
            likers.map((user) => ({ post_id: postId, user_id: user.id, created_at: now })),
            { transaction },
          );
        }

        const comment = article.comment;
        await queryInterface.bulkInsert(
          'comments',
          [{
            post_id: postId,
            user_id: comment.authorId,
            parent_id: null,
            reply_to_comment_id: null,
            reply_to_user_id: null,
            reply_to_username: null,
            content: comment.content,
            status: 'approved',
            original_language_id: languageByCode.get(comment.originalCode),
            created_at: now,
            updated_at: now,
          }],
          { transaction },
        );

        const insertedComment = await queryInterface.sequelize.query(
          'SELECT LAST_INSERT_ID() AS id',
          { type: QueryTypes.SELECT, transaction },
        );
        const commentId = insertedComment[0].id;

        await queryInterface.bulkInsert(
          'comment_translations',
          Object.entries(comment.translations).map(([code, content]) => ({
            comment_id: commentId,
            language_id: languageByCode.get(code),
            content,
            translation_status: 'completed',
            created_at: now,
            updated_at: now,
          })),
          { transaction },
        );

        if (article.authorId !== comment.authorId) {
          await queryInterface.bulkInsert(
            'comment_likes',
            [{ comment_id: commentId, user_id: article.authorId, created_at: now }],
            { transaction },
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const { QueryTypes } = Sequelize;
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const posts = await queryInterface.sequelize.query(
        `SELECT DISTINCT post_id FROM post_translations WHERE slug IN (:slugs)`,
        {
          replacements: { slugs: ARTICLE_SLUGS },
          type: QueryTypes.SELECT,
          transaction,
        },
      );

      const postIds = posts.map((post) => post.post_id);
      if (postIds.length) {
        await queryInterface.bulkDelete('posts', { id: postIds }, { transaction });
      }

      await queryInterface.bulkDelete(
        'users',
        { email: ['demo.author@lingora.local', 'demo.reader@lingora.local'] },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
