// ========================================================
// SECURITY & ROUTING CHECKS
// ========================================================
(function () {
  const currentUserJson = localStorage.getItem('currentUser');
  let user = null;
  try {
    user = currentUserJson ? JSON.parse(currentUserJson) : null;
  } catch (e) {
    localStorage.removeItem('currentUser');
  }
  const path = window.location.pathname.toLowerCase();

  if (path.includes('/admin/')) {
    if (!user || user.role !== 'admin') {
      // If we are in /admin/, home is at ../index.html
      window.location.replace('../index.html');
      return;
    }
  }

  if (path.includes('/create-post.html')) {
    if (!user) {
      window.location.replace('login.html');
      return;
    }
  }

  if (path.includes('/profile.html')) {
    const search = window.location.search.toLowerCase();
    const isGuestProfile = search.includes('id=') || search.includes('author=');
    if (!user && !isGuestProfile) {
      window.location.replace('login.html');
      return;
    }
  }
})();

window.numberLingoraCodeBlocks = function numberLingoraCodeBlocks(root = document) {
  const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
  const blocks = [];

  if (scope.nodeType === Node.ELEMENT_NODE && scope.matches('.editor-code-body')) {
    blocks.push(scope);
  }
  scope.querySelectorAll('.editor-code-body').forEach(block => blocks.push(block));

  blocks.forEach(pre => {
    if (pre.closest('.rich-editor') && (pre.isContentEditable || pre.closest('[contenteditable="true"]'))) {
      return;
    }

    const existingLines = Array.from(pre.querySelectorAll('.code-line'));
    const outsideNumberedLines = pre.cloneNode(true);
    outsideNumberedLines.querySelectorAll('.code-line').forEach(line => line.remove());
    outsideNumberedLines.querySelectorAll('code').forEach(code => {
      if (String(code.textContent || '').trim()) {
        code.replaceWith(...Array.from(code.childNodes));
      } else {
        code.remove();
      }
    });
    const hasContentOutsideNumberedLines = Boolean(String(outsideNumberedLines.textContent || '').trim());

    if (existingLines.length && !hasContentOutsideNumberedLines) {
      existingLines.forEach((line, index) => {
        let lineNumber = Array.from(line.children).find(child => child.classList.contains('line-number'));
        if (!lineNumber) {
          lineNumber = document.createElement('span');
          lineNumber.className = 'line-number';
          line.prepend(lineNumber);
        }
        lineNumber.textContent = String(index + 1);
        lineNumber.setAttribute('aria-hidden', 'true');

        if (!Array.from(line.children).some(child => child.classList.contains('line-content'))) {
          const lineContent = document.createElement('span');
          lineContent.className = 'line-content';
          Array.from(line.childNodes).forEach(child => {
            if (child !== lineNumber) lineContent.appendChild(child);
          });
          line.appendChild(lineContent);
        }
      });
      return;
    }

    const code = pre.querySelector('code');
    const hasCodeContent = Boolean(code && String(code.textContent || '').trim());
    const source = hasContentOutsideNumberedLines
      ? outsideNumberedLines
      : (hasCodeContent ? code : outsideNumberedLines);
    let html = source.innerHTML;
    html = html.replace(/<br\s*[\/]?>/gi, '\n');
    html = html.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
    html = html.replace(/\r\n/g, '\n');

    const lines = html.split('\n');
    if (lines.length > 1 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    pre.innerHTML = lines.map((line, index) =>
      `<span class="code-line"><span class="line-number" aria-hidden="true">${index + 1}</span><span class="line-content">${line || '&nbsp;'}</span></span>`
    ).join('');
  });
};

window.sanitizePostHtml = function sanitizePostHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = String(value ?? '');

  template.content
    .querySelectorAll('script, style, iframe, object, embed, form, input, textarea, select, button, meta, link, base, svg, math')
    .forEach(element => element.remove());

  template.content.querySelectorAll('*').forEach(element => {
    Array.from(element.attributes).forEach(attribute => {
      const name = attribute.name.toLowerCase();
      const attributeValue = attribute.value.trim();

      if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction') {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === 'href' && /^(?:javascript|vbscript|data):/i.test(attributeValue)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === 'src' && /^(?:javascript|vbscript):/i.test(attributeValue)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === 'src' && /^data:/i.test(attributeValue) && !/^data:(?:image|audio|video)\//i.test(attributeValue)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (name === 'style' && /(?:expression\s*\(|javascript\s*:|vbscript\s*:)/i.test(attributeValue)) {
        element.removeAttribute(attribute.name);
      }
    });

    element.removeAttribute('contenteditable');
    element.removeAttribute('spellcheck');

    if (element.tagName === 'A') {
      element.setAttribute('rel', 'noopener noreferrer');
    }
  });

  if (typeof window.numberLingoraCodeBlocks === 'function') {
    window.numberLingoraCodeBlocks(template.content);
  }

  return template.innerHTML;
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.numberLingoraCodeBlocks === 'function') {
    window.numberLingoraCodeBlocks(document);
  }

  if (!document.body || typeof MutationObserver === 'undefined') return;

  const codeObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.matches('.editor-code-body') || node.querySelector('.editor-code-body')) {
          window.numberLingoraCodeBlocks(node);
        }
      });
    });
  });

  codeObserver.observe(document.body, { childList: true, subtree: true });
});


// ========================================================
// Global Posts Data (Accessible across all pages for Live Search)
// ========================================================
window.globalPostsData = {
  1: {
    author_name: "Elena Rostova",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "101",
    timestamp: "2 hours ago",
    category: "Artificial Intelligence",
    supported_langs: "en,vi,zh",
    image: "https://res.cloudinary.com/ddizrhk7g/video/upload/v1784192503/Top_5_m%C3%B3n_%C4%83n_nguy_hi%E1%BB%83m_nh%E1%BA%A5t_Vi%E1%BB%87t_Nam-_food_shorts_health_-_YouTube_lyyec7.mp4",
    likes: 142,
    comments: 28,
    title_en: "The Future of AI Agentic Coding in 2026",
    title_vi: "Tương lai của Lập trình Tự động hóa với AI năm 2026",
    title_zh: "2026年AI代理编程的未来",
    content_en: "We are witnessing a monumental paradigm shift where AI agents can autonomously plan, reason, and execute complex full-stack engineering tasks. From real-time DOM manipulation to database synchronization, modern coding assistants act as true pair programmers.\n\nIn traditional software development, developers spent substantial time on boilerplate code, debugging syntax errors, and configuring environments. With advanced agentic frameworks, the AI not only writes code but also understands project architecture, adheres to established design patterns, and executes automated verification plans.\n\nAs we move further into 2026, the collaboration between human creativity and AI execution will redefine what is possible in software engineering.",
    content_vi: "Chúng ta đang chứng kiến một sự chuyển dịch mô hình lớn khi các tác nhân AI có thể tự chủ lập kế hoạch, suy luận và thực thi các nhiệm vụ kỹ thuật toàn diện. Từ thao tác DOM theo thời gian thực đến đồng bộ hóa cơ sở dữ liệu, trợ lý AI hiện đại đóng vai trò như người đồng hành thực thụ.\n\nTrong phát triển phần mềm truyền thống, lập trình viên dành nhiều thời gian cho các đoạn mã lặp lại, sửa lỗi cú pháp và cấu hình môi trường. Với các khung tự động hóa tiên tiến, AI không chỉ viết mã mà còn hiểu kiến trúc dự án, tuân thủ các mẫu thiết kế và thực thi các kế hoạch xác minh tự động.\n\nKhi tiến sâu vào năm 2026, sự kết hợp giữa sáng tạo của con người và khả năng thực thi của AI sẽ định nghĩa lại giới hạn trong kỹ thuật phần mềm.",
    content_zh: "我们正在见证一场巨大的范式转变，AI代理可以自主计划、推理并执行复杂的全栈工程任务。从实时DOM操作到数据库同步，现代编码助手充当真正的结对程序员。\n\n在传统的软件开发中，开发人员将大量时间花费在样板代码、调试语法错误和配置环境上。借助先进的代理框架，AI不仅编写代码，还能理解项目架构，遵循既定的设计模式，并执行自动验证计划。\n\n随着我们进入2026年，人类创造力与AI执行力的协作将重新定义软件工程的未来。"
  },
  2: {
    views: 987,
    author_name: "李明 (Li Ming)",
    author_avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "103",
    timestamp: "3 days ago",
    category: "Backend Engineering",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 210,
    comments: 45,
    title_en: "Deep Dive into Modern Web Rendering Architectures",
    title_vi: "Hiểu sâu về Kiến trúc Render Web Hiện đại và Tối ưu hiệu năng",
    title_zh: "深入理解现代Web渲染架构与性能优化",
    content_en: "In an era where Single Page Applications and Server-Side Rendering go hand-in-hand, frontend engineers must choose the right architectural pattern to balance initial load speed with SEO.\n\nServer-Side Rendering (SSR) delivers pre-rendered HTML to the client, resulting in significantly faster Largest Contentful Paint (LCP) times. Meanwhile, Client-Side Rendering (CSR) excels at dynamic, application-like interactivity once loaded.\n\nBy adopting hybrid approaches like Progressive Hydration and Islands Architecture, modern frameworks give developers the best of both worlds without compromising user experience.",
    content_vi: "Trong kỷ nguyên ứng dụng trang đơn (SPA) và Server-Side Rendering song hành, kỹ sư frontend cần lựa chọn kiến trúc phù hợp nhất để cân bằng giữa tốc độ tải trang và tối ưu hóa SEO.\n\nServer-Side Rendering (SSR) cung cấp HTML đã được render sẵn cho máy khách, giúp cải thiện đáng kể thời gian hiển thị nội dung lớn nhất (LCP). Trong khi đó, Client-Side Rendering (CSR) vượt trội trong các tương tác động sau khi tải xong.\n\nBằng cách áp dụng các giải pháp lai như Progressive Hydration và Islands Architecture, các framework hiện đại mang lại ưu điểm của cả hai mô hình mà không làm giảm trải nghiệm người dùng.",
    content_zh: "在单页应用与服务器端渲染齐头并进的今天，前端工程师需要针对不同业务场景选择最合理的架构设计，确保首屏加载速度与搜索引擎优化（SEO）的最佳平衡。\n\n服务器端渲染 (SSR) 向客户端提供预渲染的HTML，从而显著缩短最大内容渲染时间 (LCP)。同时，客户端渲染 (CSR) 在加载后擅长处理动态交互。\n\n通过采用渐进式水合和孤岛架构等混合方法，现代框架让开发者在不牺牲用户体验的前提下获得两者的优势。"
  },
  3: {
    views: 456,
    author_name: "Hồ Quốc Tuấn",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "102",
    timestamp: "Yesterday",
    category: "Design",
    supported_langs: "en,vi",
    image: "",
    likes: 89,
    comments: 14,
    title_en: "10 Essential Principles for Modern Glassmorphism UI",
    title_vi: "10 Nguyên tắc cốt lõi cho Giao diện Glassmorphism hiện đại",
    title_zh: "",
    content_en: "Designing interfaces that feel responsive and alive encourages interaction. Achieve this with subtle hover effects, vibrant harmonious color palettes, and clean modern typography. Always prioritize visual excellence.\n\nGlassmorphism relies on multi-layered interfaces where background elements show through a frosted-glass overlay. The key is balancing background blur with subtle multi-stop borders to maintain high contrast and readability.\n\nWhen implemented thoughtfully, this style elevates the interface from a flat document to a rich, premium digital workspace.",
    content_vi: "Thiết kế giao diện mang lại cảm giác sống động và phản hồi tốt sẽ thúc đẩy sự tương tác. Hãy đạt được điều này với hiệu ứng hover tinh tế, bảng màu hài hòa sống động và nghệ thuật chữ hiện đại.\n\nGlassmorphism dựa trên giao diện nhiều lớp, nơi các phần tử nền hiển thị qua một lớp kính mờ. Bí quyết là cân bằng độ mờ nền với đường viền sắc nét để duy trì độ tương phản cao và dễ đọc.\n\nKhi được áp dụng đúng cách, phong cách này nâng tầm giao diện từ một tài liệu phẳng thành một không gian làm việc kỹ thuật số cao cấp.",
    content_zh: ""
  },
  4: {
    views: 1500,
    author_name: "Sarah Connor",
    author_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "104",
    timestamp: "5 hours ago",
    category: "Artificial Intelligence",
    supported_langs: "en,vi,zh",
    likes: 178,
    comments: 32,
    title_en: "Next-Gen LLM Reasoning & Tool Use in 2026",
    title_vi: "Khả năng Suy luận & Sử dụng Công cụ của LLM Thế hệ mới năm 2026",
    title_zh: "2026年下一代大语言模型推理与工具使用",
    content_en: "Modern language models are moving beyond simple pattern matching. By integrating external tools, code interpreters, and multi-agent loops, they can tackle complex engineering workflows autonomously.\n\nWe are now seeing systems that can formulate hypotheses, test them against real-world APIs, and self-correct when encountering unexpected errors. This loop of reasoning and action represents the bridge from passive chat assistants to autonomous AI engineers.",
    content_vi: "Các mô hình ngôn ngữ hiện đại đang vượt qua giới hạn nhận diện mẫu đơn thuần. Bằng cách tích hợp công cụ bên ngoài, trình thông dịch mã và vòng lặp đa tác nhân, chúng có thể tự động giải quyết các quy trình kỹ thuật phức tạp.\n\nChúng ta đang chứng kiến các hệ thống có thể đưa ra giả thuyết, kiểm thử với API thực tế và tự sửa lỗi khi gặp sự cố không mong muốn. Vòng lặp suy luận và hành động này là bước tiến từ trợ lý trò chuyện thụ động sang kỹ sư AI tự chủ.",
    content_zh: "现代语言模型正在超越简单的模式匹配。通过集成外部工具、代码解释器和多代理循环，它们能够自主处理复杂的工程工作流。\n\n我们现在看到系统可以提出假设，在实际API中测试它们，并在遇到意外错误时自我纠正。这种推理与行动的循环代表了从被动聊天助手到自主AI工程师的跨越。"
  },
  5: {
    views: 800,
    author_name: "Alex Rivera",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "105",
    timestamp: "1 day ago",
    category: "Backend Engineering",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 312,
    comments: 54,
    title_en: "Building High-Throughput Microservices with Rust & gRPC",
    title_vi: "Xây dựng Microservices Hiệu năng cao với Rust & gRPC",
    title_zh: "使用Rust和gRPC构建高吞吐量微服务",
    content_en: "As backend scalability requirements grow, transitioning performance-critical services to Rust and gRPC has proven to drastically reduce memory footprint while eliminating garbage collection pauses.\n\nRust's ownership model guarantees memory safety and thread safety without runtime overhead. Coupled with gRPC's HTTP/2 multiplexing and Protocol Buffers serialization, microservices can handle tens of thousands of concurrent requests with predictable sub-millisecond latency.",
    content_vi: "Khi yêu cầu về khả năng mở rộng tăng lên, việc chuyển đổi các dịch vụ quan trọng về hiệu năng sang Rust và gRPC đã chứng minh giảm đáng kể lượng bộ nhớ sử dụng đồng thời loại bỏ các khoảng dừng do garbage collection.\n\nMô hình sở hữu của Rust đảm bảo an toàn bộ nhớ và luồng mà không tốn chi phí thời gian chạy. Kết hợp với giao thức gRPC trên HTTP/2 và serialization Protocol Buffers, microservices có thể xử lý hàng chục nghìn yêu cầu đồng thời với độ trễ dưới mili giây.",
    content_zh: "随着后端可扩展性需求的增长，将关键性能服务过渡到Rust和gRPC极大地减少了内存占用，同时消除了垃圾回收停顿。\n\nRust的所有权模型确保了内存安全和线程安全，且没有运行时开销。结合gRPC的HTTP/2多路复用和Protocol Buffers序列化，微服务能够以可预测的亚毫秒级延迟处理数万个并发请求。"
  },
  6: {
    views: 620,
    author_name: "Maya Lin",
    author_avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "106",
    timestamp: "2 days ago",
    category: "Design",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 95,
    comments: 19,
    title_en: "The Psychology of Color in Modern Web Applications",
    title_vi: "Tâm lý học Màu sắc trong các Ứng dụng Web Hiện đại",
    title_zh: "现代Web应用程序中的色彩心理学",
    content_en: "Color is not just an aesthetic choice; it is a fundamental communication tool that guides user interaction, establishes brand trust, and influences cognitive load in complex user interfaces.\n\nWarm tones stimulate urgency and excitement, making them ideal for call-to-action buttons, while cool blues and neutral slates foster concentration and reliability in analytical dashboards. Understanding these cognitive responses enables designers to craft intuitive user experiences.",
    content_vi: "Màu sắc không chỉ là lựa chọn thẩm mỹ; nó là công cụ giao tiếp cốt lõi dẫn dắt tương tác người dùng, xây dựng lòng tin thương hiệu và ảnh hưởng đến tải nhận thức trong các giao diện phức tạp.\n\nCác tông màu ấm kích thích sự cấp bách và hào hứng, lý tưởng cho nút kêu gọi hành động, trong khi sắc xanh lạnh và xám trung tính tạo sự tập trung và tin cậy cho bảng điều khiển phân tích. Hiểu được các phản ứng nhận thức này giúp nhà thiết kế tạo ra trải nghiệm người dùng trực quan.",
    content_zh: "色彩不仅是美学选择，更是指导用户交互、建立品牌信任并在复杂用户界面中影响认知负荷的核心沟通工具。\n\n暖色调激发紧迫感和兴奋感，非常适合号召性用语按钮；而冷蓝色和中性石板色则在分析仪表板中培养专注力和可靠性。理解这些认知反应使设计师能够打造直观的用户体验。"
  },
  7: {
    views: 1120,
    author_name: "Kenji Sato",
    author_avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "107",
    timestamp: "3 days ago",
    category: "Backend Engineering",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 245,
    comments: 38,
    title_en: "Distributed Caching Strategies for High-Traffic APIs",
    title_vi: "Chiến lược Caching Phân tán cho API Lưu lượng cao",
    title_zh: "高流量API的分布式缓存策略",
    content_en: "When scaling web applications to millions of daily active users, database bottlenecks become the primary limiting factor. Implementing multi-tiered distributed caching using Redis and Memcached can alleviate up to 95% of read load.\n\nWe explore cache invalidation patterns, write-through vs write-behind architectures, and preventing cache stampedes during traffic spikes. Proper caching architecture is essential for maintaining sub-10ms response times globally.",
    content_vi: "Khi mở rộng quy mô ứng dụng web lên hàng triệu người dùng hoạt động mỗi ngày, nghẽn cổ chai cơ sở dữ liệu trở thành yếu tố cản trở chính. Triển khai bộ nhớ đệm phân tán nhiều tầng bằng Redis và Memcached có thể giảm tới 95% tải đọc.\n\nChúng tôi phân tích các mô hình vô hiệu hóa cache, kiến trúc write-through và write-behind, cùng cách ngăn chặn hiện tượng cache stampede trong các đợt tăng đột biến lưu lượng truy cập.",
    content_zh: "将Web应用程序扩展到数百万日活跃用户时，数据库瓶颈成为主要的限制因素。使用Redis和Memcached实施多层分布式缓存可以减轻高达95%的读负载。\n\n我们深入探讨了缓存失效模式、写穿透与写回架构，以及防止流量峰值期间的缓存雪崩。正确的缓存架构对于在全球范围内保持在10毫秒以内的响应时间至关重要。"
  },
  8: {
    views: 890,
    author_name: "Vũ Thu Hà",
    author_avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "108",
    timestamp: "4 days ago",
    category: "Design",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 189,
    comments: 24,
    title_en: "Designing Accessible & Inclusive Dark Mode Interfaces",
    title_vi: "Thiết kế Giao diện Dark Mode Dễ tiếp cận & Toàn diện",
    title_zh: "设计无障碍与包容性的深色模式界面",
    content_en: "Dark mode is more than just inverting colors; it requires careful calibration of contrast ratios, elevation shadows, and typographic hierarchy to prevent eye strain and astigmatism halation.\n\nBy utilizing desaturated primary colors and elevation-based surface lightness, designers can create dark interfaces that feel comfortable in low-light environments while maintaining WCAG AAA accessibility standards.",
    content_vi: "Dark mode không chỉ đơn thuần là đảo ngược màu sắc; nó đòi hỏi sự tinh chỉnh cẩn thận về tỷ lệ tương phản, độ bóng của các lớp không gian và cấu trúc chữ để ngăn ngừa mỏi mắt và hiện tượng lóa sáng.\n\nBằng cách sử dụng các màu chủ đạo giảm độ bão hòa và độ sáng bề mặt theo từng lớp, nhà thiết kế có thể tạo ra các giao diện tối thoải mái trong môi trường thiếu sáng đồng thời tuân thủ tiêu chuẩn tiếp cận WCAG AAA.",
    content_zh: "深色模式不仅仅是反转颜色；它需要仔细校准对比度、层级阴影和排版层级，以防止视疲劳和散光晕影。\n\n通过使用低饱和度的主色调和基于层级的表面亮度，设计师可以创建在低光环境下令人舒适的深色界面，同时达到WCAG AAA无障碍标准。"
  },
  9: {
    views: 1850,
    author_name: "Elena Rostova",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "101",
    timestamp: "5 days ago",
    category: "Artificial Intelligence",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 310,
    comments: 62,
    title_en: "Optimizing LLM Inference: Quantization & Speculative Decoding",
    title_vi: "Tối ưu hóa LLM Inference: Lượng tử hóa & Speculative Decoding",
    title_zh: "优化大语言模型推理：量化与推测解码",
    content_en: "Running large language models in production efficiently demands cutting-edge optimization techniques. Quantizing models from FP16 down to INT4 or FP8 significantly reduces memory bandwidth requirements with negligible perplexity degradation.\n\nFurthermore, speculative decoding leverages a smaller draft model to generate candidate tokens verified in parallel by the target model, speeding up inference generation rates by up to 3x without changing the output distribution.",
    content_vi: "Vận hành hiệu quả các mô hình ngôn ngữ lớn trong môi trường thực tế đòi hỏi các kỹ thuật tối ưu tiên tiến nhất. Lượng tử hóa mô hình từ FP16 xuống INT4 hoặc FP8 giúp giảm đáng kể yêu cầu băng thông bộ nhớ với độ suy giảm chất lượng gần như không đáng kể.\n\nHơn nữa, speculative decoding sử dụng một mô hình nháp nhỏ hơn để tạo các token ứng viên được kiểm chứng song song bởi mô hình chính, tăng tốc độ tạo văn bản lên tới 3 lần mà không làm thay đổi kết quả đầu ra.",
    content_zh: "在生产环境中高效运行大语言模型需要最先进的优化技术。将模型从FP16量化到INT4或FP8大大降低了内存带宽需求，且困惑度下降微乎其微。\n\n此外，推测解码利用一个较小的草稿模型生成候选词元，并由目标模型并行验证，在不改变输出分布的情况下将推理生成速度提高了近3倍。"
  },
  10: {
    views: 740,
    author_name: "Hồ Quốc Tuấn",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "102",
    timestamp: "6 days ago",
    category: "Design",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 165,
    comments: 21,
    title_en: "Micro-Animations: Bringing Interactive Web Layouts to Life",
    title_vi: "Micro-Animations: Thổi hồn vào các Giao diện Web Tương tác",
    title_zh: "微动画：赋予交互式Web布局生命力",
    content_en: "Subtle micro-animations provide crucial feedback to user interactions, making interfaces feel tactile and responsive. From button press animations to smooth drawer transitions, motion design bridges the gap between static screens and fluid software.\n\nWhen implementing animations, respecting prefers-reduced-motion media queries and maintaining 60fps performance via CSS transforms is paramount for a polished, professional user experience.",
    content_vi: "Các vi chuyển động (micro-animations) tinh tế mang lại phản hồi quan trọng cho các tương tác của người dùng, giúp giao diện mang lại cảm giác chân thực và nhạy bén. Từ hiệu ứng nhấn nút đến các chuyển tiếp mượt mà, thiết kế chuyển động thu hẹp khoảng cách giữa màn hình tĩnh và phần mềm sống động.\n\nKhi triển khai hoạt ảnh, việc tuân thủ cấu hình prefers-reduced-motion và duy trì hiệu năng 60fps qua CSS transforms là tối quan trọng để có một trải nghiệm chuyên nghiệp.",
  },
  11: {
    views: 1240,
    author_name: "Elena Rostova",
    author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "101",
    timestamp: "1 week ago",
    category: "Frontend Development",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 420,
    comments: 85,
    title_en: "React 19 vs Vue 3: The Framework Wars Continue",
    title_vi: "React 19 vs Vue 3: Cuộc chiến Framework Tiếp diễn",
    title_zh: "React 19 vs Vue 3：框架之争继续",
    content_en: "With React 19 introducing the new compiler and use() hook, and Vue 3 perfecting the Composition API with Vapor Mode, the frontend landscape is evolving faster than ever. We dive deep into bundle sizes, rendering benchmarks, and developer experience.",
    content_vi: "Với việc React 19 giới thiệu trình biên dịch mới và hook use(), cùng với Vue 3 hoàn thiện Composition API qua Vapor Mode, bối cảnh frontend đang phát triển nhanh hơn bao giờ hết. Chúng tôi phân tích sâu về kích thước bundle, hiệu suất kết xuất và trải nghiệm nhà phát triển.",
    content_zh: "随着React 19引入新的编译器和use()钩子，以及Vue 3通过Vapor模式完善Composition API，前端领域的发展比以往任何时候都快。我们深入探讨捆绑包大小、渲染基准和开发者体验。"
  },
  12: {
    views: 980,
    author_name: "Hồ Quốc Tuấn",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "102",
    timestamp: "2 weeks ago",
    category: "Mobile Development",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 315,
    comments: 42,
    title_en: "Flutter Impeller: Redefining Cross-Platform Rendering",
    title_vi: "Flutter Impeller: Định nghĩa lại Rendering Đa nền tảng",
    title_zh: "Flutter Impeller：重新定义跨平台渲染",
    content_en: "Skia has served Flutter well, but Impeller brings a new era of jank-free rendering by precompiling shaders. Learn how this architectural shift fundamentally solves the long-standing iOS shader compilation stutter.",
    content_vi: "Skia đã phục vụ tốt cho Flutter, nhưng Impeller mang đến một kỷ nguyên mới của việc hiển thị mượt mà bằng cách biên dịch trước các shaders. Hãy tìm hiểu cách sự thay đổi kiến trúc này giải quyết triệt để tình trạng giật lag biên dịch shader trên iOS.",
    content_zh: "Skia为Flutter提供了很好的服务，但Impeller通过预编译着色器开启了无卡顿渲染的新纪元。了解这种架构转变如何从根本上解决长期存在的iOS着色器编译卡顿问题。"
  },
  13: {
    views: 1560,
    author_name: "李明 (Li Ming)",
    author_avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "103",
    timestamp: "1 month ago",
    category: "Data Science",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 540,
    comments: 112,
    title_en: "Migrating from Pandas to Polars for Big Data Processing",
    title_vi: "Chuyển đổi từ Pandas sang Polars để Xử lý Dữ liệu Lớn",
    title_zh: "从Pandas迁移到Polars以进行大数据处理",
    content_en: "Pandas has been the standard for data manipulation in Python, but it struggles with large datasets due to its single-threaded nature. Polars, written in Rust, leverages multi-threading and lazy evaluation to process data up to 50x faster.",
    content_vi: "Pandas từng là tiêu chuẩn để thao tác dữ liệu trong Python, nhưng nó gặp khó khăn với các tập dữ liệu lớn do bản chất luồng đơn. Polars, được viết bằng Rust, tận dụng đa luồng và đánh giá lười (lazy evaluation) để xử lý dữ liệu nhanh hơn tới 50 lần.",
    content_zh: "Pandas一直是Python中数据操作的标准，但由于其单线程特性，在处理大型数据集时显得吃力。用Rust编写的Polars利用多线程和延迟计算，将数据处理速度提高了多达50倍。"
  },
  14: {
    views: 890,
    author_name: "Sarah Connor",
    author_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "104",
    timestamp: "1 month ago",
    category: "Cybersecurity",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 210,
    comments: 34,
    title_en: "Zero Trust Architecture: Never Trust, Always Verify",
    title_vi: "Kiến trúc Zero Trust: Không bao giờ tin tưởng, Luôn luôn xác minh",
    title_zh: "零信任架构：永不信任，始终验证",
    content_en: "Traditional network security models based on perimeter defense are obsolete in the era of remote work and cloud infrastructure. Zero Trust mandates strict identity verification for every person and device trying to access resources, regardless of their network location.",
    content_vi: "Các mô hình bảo mật mạng truyền thống dựa trên phòng thủ vành đai đã lỗi thời trong kỷ nguyên làm việc từ xa và cơ sở hạ tầng đám mây. Zero Trust bắt buộc xác minh danh tính nghiêm ngặt đối với mọi người và thiết bị cố gắng truy cập tài nguyên, bất kể vị trí mạng của họ.",
    content_zh: "在远程工作和云基础设施时代，基于边界防御的传统网络安全模型已经过时。零信任要求对试图访问资源的每个人和设备进行严格的身份验证，无论其网络位置如何。"
  },
  15: {
    views: 2100,
    author_name: "Alex Rivera",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "105",
    timestamp: "2 months ago",
    category: "Backend Engineering",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 670,
    comments: 156,
    title_en: "Kubernetes Anti-Patterns: Why Your Cluster is Failing",
    title_vi: "Các Anti-Pattern trong Kubernetes: Tại sao Cluster của bạn thất bại",
    title_zh: "Kubernetes反模式：为什么你的集群会失败",
    content_en: "Adopting Kubernetes does not automatically make your application scalable or resilient. We explore common anti-patterns such as omitting resource limits, hardcoding configuration inside containers, and relying on implicit dependencies.",
    content_vi: "Việc áp dụng Kubernetes không tự động làm cho ứng dụng của bạn có khả năng mở rộng hay phục hồi. Chúng tôi khám phá các anti-pattern phổ biến như bỏ qua giới hạn tài nguyên, hardcode cấu hình bên trong container và phụ thuộc vào các liên kết ngầm.",
    content_zh: "采用Kubernetes并不会自动使您的应用程序具有可扩展性或弹性。我们探讨了常见的反模式，例如省略资源限制、在容器内硬编码配置以及依赖隐式依赖项。"
  },
  16: {
    views: 1120,
    author_name: "Vũ Thu Hà",
    author_avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "108",
    timestamp: "2 months ago",
    category: "Design",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 380,
    comments: 65,
    title_en: "The Return to Minimalism in Enterprise Software",
    title_vi: "Sự Trở lại của Chủ nghĩa Tối giản trong Phần mềm Doanh nghiệp",
    title_zh: "企业软件中极简主义的回归",
    content_en: "After years of feature bloat and complex dashboards, enterprise users are experiencing cognitive overload. We analyze the shift back towards minimalist interfaces that prioritize white space, clear typography, and focused user workflows.",
    content_vi: "Sau nhiều năm nhồi nhét tính năng và bảng điều khiển phức tạp, người dùng doanh nghiệp đang trải qua sự quá tải nhận thức. Chúng tôi phân tích sự chuyển dịch quay lại các giao diện tối giản, ưu tiên khoảng trắng, kiểu chữ rõ ràng và quy trình làm việc tập trung.",
    content_zh: "经过多年的功能膨胀和复杂的仪表板，企业用户正经历着认知超载。我们分析了回归极简主义界面的趋势，这些界面优先考虑留白、清晰的排版和专注的用户工作流。"
  },
  17: {
    views: 3200,
    author_name: "Hồ Quốc Tuấn",
    author_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "102",
    timestamp: "3 days ago",
    category: "Economics & Markets",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 840,
    comments: 120,
    title_en: "Global Macro Outlook: Interest Rates & Financial Markets in 2026",
    title_vi: "Triển vọng Vĩ mô Toàn cầu: Lãi suất & Thị trường Tài chính năm 2026",
    title_zh: "全球宏观展望：2026年利率与金融市场",
    content_en: "As central banks navigate post-inflation dynamics, monetary policy shifts are creating both challenges and opportunities across global equities and fixed income. We analyze the trajectory of real interest rates, liquidity cycles, and capital reallocation across emerging markets.",
    content_vi: "Khi các ngân hàng trung ương điều hướng động thái hậu lạm phát, sự thay đổi chính sách tiền tệ đang tạo ra cả thách thức lẫn cơ hội trên thị trường cổ phiếu và trái phiếu toàn cầu. Chúng tôi phân tích quỹ đạo lãi suất thực, chu kỳ thanh khoản và dòng vốn tái phân bổ tại các thị trường mới nổi.",
    content_zh: "随着央行驾驭通胀后的动态，货币政策的转向在全球股票和固定收益市场中既创造了挑战也带来了机遇。我们分析了实际利率的轨迹、流动性周期以及新兴市场的资金重新配置。"
  },
  18: {
    views: 1450,
    author_name: "Thái Dương",
    author_avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=80&h=80",
    author_id: "109",
    timestamp: "5 days ago",
    category: "Life & Philosophy",
    supported_langs: "en,vi,zh",
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=720&h=360",
    likes: 410,
    comments: 68,
    title_en: "The Art of Deep Work: Engineering Culture in an Asynchronous World",
    title_vi: "Nghệ thuật Làm việc Sâu: Văn hóa Kỹ thuật trong Thế giới Bất đồng bộ",
    title_zh: "深度工作的艺术：异步世界中的工程文化",
    content_en: "True engineering breakthroughs require uninterrupted stretches of focus. In a remote work environment dominated by instant messaging and constant notifications, preserving cognitive flow and building an asynchronous writing culture is the most valuable organizational superpower.",
    content_vi: "Những đột phá kỹ thuật thực sự đòi hỏi những khoảng thời gian tập trung liên tục không bị gián đoạn. Trong môi trường làm việc từ xa bị chi phối bởi tin nhắn tức thì và thông báo liên tục, việc bảo vệ luồng nhận thức và xây dựng văn hóa viết bất đồng bộ là siêu năng lực quý giá nhất của tổ chức.",
    content_zh: "真正的技术突破需要深度且连续的专注时间。在由即时通讯和不断推送通知主导的远程工作环境中，保护认知流和建立异步写作文化是组织最有价值的超能力。"
  }
};

// One public post source for the feed, Explore, profiles and the admin dashboard.
// Approved local submissions are projected into the same shape as the seeded mock posts.
window.getLingoraPostsData = function () {
  const posts = { ...(window.globalPostsData || {}) };
  let submittedPosts = [];
  try {
    const stored = JSON.parse(localStorage.getItem('mundiBlogSubmittedPosts') || '[]');
    submittedPosts = Array.isArray(stored) ? stored : [];
  } catch (error) {
    submittedPosts = [];
  }

  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem('mundiBlogProfile') || localStorage.getItem('lingoraProfile') || '{}') || {};
  } catch (error) {
    profile = {};
  }

  submittedPosts.forEach(post => {
    const status = String(post.status || '').toLowerCase();
    if (!['approved', 'published'].includes(status)) return;
    const language = String(post.originalLanguage || 'en').toLowerCase();
    const id = `submitted-${post.id}`;
    const body = document.createElement('div');
    body.innerHTML = typeof window.sanitizePostHtml === 'function'
      ? window.sanitizePostHtml(post.body || '')
      : String(post.body || '');
    const summary = String(body.textContent || '').trim().slice(0, 320);
    const authors = Array.isArray(post.authors) ? post.authors : [];
    const currentUser = typeof window.getLingoraCurrentUser === 'function' ? window.getLingoraCurrentUser() : null;
    const authorName = post.authorName || currentUser?.name || profile.displayName || authors[0] || 'Alone';
    const authorAvatar = post.authorAvatar || currentUser?.avatar || profile.avatar || '';
    const allowedTranslations = Array.isArray(post.allowedTranslations) ? post.allowedTranslations : [];
    const supportedLanguages = [...new Set([language, ...allowedTranslations]
      .map(code => String(code || '').trim().toLowerCase())
      .filter(Boolean))];
    const localizedContent = {};
    supportedLanguages.forEach(code => {
      const storedTranslation = post.translations?.[code] || {};
      const translatedBody = storedTranslation.content || storedTranslation.body || '';
      const translatedBodyNode = document.createElement('div');
      translatedBodyNode.innerHTML = typeof window.sanitizePostHtml === 'function'
        ? window.sanitizePostHtml(translatedBody)
        : translatedBody;
      const translatedSummary = String(translatedBodyNode.textContent || '').trim().slice(0, 320);
      localizedContent[`title_${code}`] = storedTranslation.title || post.title || post.subtitle || 'Untitled post';
      localizedContent[`content_${code}`] = translatedSummary || summary || post.subtitle || '';
    });
    posts[id] = {
      author_name: authorName,
      author_avatar: authorAvatar,
      author_id: authorName === (profile.displayName || 'Alone') ? 'self' : String(post.authorId || 'self'),
      profile_href: authorName === (profile.displayName || 'Alone') ? 'profile.html' : undefined,
      detail_href: `post-detail.html?submitted=${encodeURIComponent(post.id)}`,
      timestamp: post.updatedAt ? new Date(post.updatedAt).toLocaleDateString() : 'Just now',
      category: post.category || post.categoryLabel || 'General',
      categoryLabel: post.categoryLabel || post.category || 'General',
      supported_langs: supportedLanguages.join(','),
      image: post.coverImage || post.image || '',
      likes: Number(post.likes || 0),
      comments: Number(post.comments || 0),
      views: Number(post.views || 0),
      status: 'published',
      ...localizedContent
    };
  });

  return posts;
};

window.ensureLingoraSubmittedTranslations = async function () {
  let posts = [];
  try {
    posts = JSON.parse(localStorage.getItem('mundiBlogSubmittedPosts') || '[]');
  } catch (error) {
    return false;
  }
  if (!Array.isArray(posts) || !posts.length) return false;

  const localizedUntitledTranslations = {
    en: 'Untitled post',
    vi: 'B\u00e0i vi\u1ebft kh\u00f4ng t\u00ean',
    zh: '\u672a\u547d\u540d\u6587\u7ae0'
  };
  const normalizeTranslationText = value => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = String(value || '');
    return String(wrapper.textContent || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  };
  const isUntitledPlaceholder = value => Object.values(localizedUntitledTranslations)
    .some(label => normalizeTranslationText(label) === normalizeTranslationText(value));
  const translationLooksCopied = (translation, post) => {
    if (!translation || typeof translation !== 'object') return false;
    const pairs = [
      [translation.title, post.title],
      [translation.subtitle, post.subtitle],
      [translation.body || translation.content, post.body]
    ].filter(([, source]) => normalizeTranslationText(source));
    return pairs.length > 0 && pairs.every(([translated, source]) =>
      normalizeTranslationText(translated) === normalizeTranslationText(source)
    );
  };

  const translateText = async (text, language) => {
    if (!String(text || '').trim()) return String(text || '');
    const normalized = String(text).trim().toLocaleLowerCase();
    const untitledTranslations = { en: 'Untitled post', vi: 'Bài viết không tên', zh: '未命名文章' };
    if (['untitled post', 'bài viết chưa có tiêu đề', 'bài viết không tên', '未命名文章'].includes(normalized)) {
      return untitledTranslations[language] || untitledTranslations.en;
    }
    const target = language === 'zh' ? 'zh-CN' : language;
    const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(String(text).trim())}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Translation request failed');
    const data = await response.json();
    return Array.isArray(data?.[0]) ? data[0].map(part => part?.[0] || '').join('') : String(text);
  };
  const translateHtml = async (html, language) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = typeof window.sanitizePostHtml === 'function' ? window.sanitizePostHtml(html || '') : String(html || '');
    const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim() && !node.parentElement?.closest('code, pre')) nodes.push(node);
    }
    const values = await Promise.all(nodes.map(item => translateText(item.nodeValue, language)));
    values.forEach((value, index) => { nodes[index].nodeValue = value; });
    return wrapper.innerHTML;
  };

  let changed = false;
  for (const post of posts) {
    const status = String(post.status || '').toLowerCase();
    if (!['approved', 'published'].includes(status)) continue;
    const originalLanguage = String(post.originalLanguage || 'en').toLowerCase();
    const languages = [...new Set([originalLanguage, ...(Array.isArray(post.allowedTranslations) ? post.allowedTranslations : [])])];
    post.translations = post.translations && typeof post.translations === 'object' ? post.translations : {};
    if (!post.translations[originalLanguage]) {
      post.translations[originalLanguage] = {
        title: isUntitledPlaceholder(post.title) ? (localizedUntitledTranslations[originalLanguage] || post.title || '') : post.title || '',
        subtitle: post.subtitle || '', body: post.body || '', content: post.body || ''
      };
      changed = true;
    } else if (isUntitledPlaceholder(post.translations[originalLanguage].title)) {
      const localizedTitle = localizedUntitledTranslations[originalLanguage] || post.translations[originalLanguage].title;
      if (post.translations[originalLanguage].title !== localizedTitle) {
        post.translations[originalLanguage].title = localizedTitle;
        changed = true;
      }
    }
    for (const language of languages.filter(code => code && code !== originalLanguage)) {
      const existingTranslation = post.translations[language];
      const staleUntitled = isUntitledPlaceholder(existingTranslation?.title)
        && normalizeTranslationText(existingTranslation.title) !== normalizeTranslationText(localizedUntitledTranslations[language]);
      if (existingTranslation && !existingTranslation.translationFailed
        && !translationLooksCopied(existingTranslation, post) && !staleUntitled) continue;
      const results = await Promise.allSettled([
        translateText(post.title || '', language),
        translateText(post.subtitle || '', language),
        translateHtml(post.body || '', language)
      ]);
      const title = results[0].status === 'fulfilled' ? results[0].value : post.title || '';
      const subtitle = results[1].status === 'fulfilled' ? results[1].value : post.subtitle || '';
      const body = results[2].status === 'fulfilled' ? results[2].value : post.body || '';
      post.translations[language] = {
        title, subtitle, body, content: body,
        translationFailed: results.some(result => result.status === 'rejected')
      };
      changed = true;
    }
  }
  if (!changed) return false;
  localStorage.setItem('mundiBlogSubmittedPosts', JSON.stringify(posts));
  window.dispatchEvent(new CustomEvent('lingora:submittedtranslationsready'));
  return true;
};

window.addEventListener('DOMContentLoaded', () => {
  window.ensureLingoraSubmittedTranslations().catch(() => { });
});

// Keep every current-user avatar consumer on the same profile source. Older
// sessions can still have a string in `currentUser`, so normalize that shape
// before merging the latest editable profile fields.
window.getLingoraCurrentUser = function () {
  let sessionUser = null;
  let savedProfile = {};

  try {
    const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (storedUser && typeof storedUser === 'object') {
      sessionUser = { ...storedUser };
    } else if (typeof storedUser === 'string' && storedUser.trim()) {
      sessionUser = { name: storedUser.trim() };
    }
  } catch (error) {
    sessionUser = null;
  }

  try {
    savedProfile = JSON.parse(localStorage.getItem('mundiBlogProfile') || '{}') || {};
  } catch (error) {
    savedProfile = {};
  }

  if (!sessionUser) return null;
  return {
    ...sessionUser,
    name: savedProfile.displayName || sessionUser.name || '',
    avatar: savedProfile.avatar || sessionUser.avatar || ''
  };
};

window.getLingoraSubscribedAuthors = function () {
  try {
    const raw = localStorage.getItem('lingoraSubscribedAuthors');
    if (!raw) {
      const defaults = ['Elena Rostova', 'Hồ Quốc Tuấn', 'Thái Dương'];
      localStorage.setItem('lingoraSubscribedAuthors', JSON.stringify(defaults));
      return defaults;
    }
    const stored = JSON.parse(raw);
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    return [];
  }
};

// Shared destructive confirmation dialog used across the site.
window.confirmDestructive = function (options = {}) {
  return new Promise(resolve => {
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const defaults = {
      en: { title: 'Confirm deletion', message: 'Are you sure you want to delete this item?', warning: 'This action cannot be undone.', cancel: 'Cancel', confirm: 'Delete permanently', input: 'Type the item name to confirm:' },
      vi: { title: 'Xác nhận xóa', message: 'Bạn có chắc chắn muốn xóa mục này?', warning: 'Hành động này không thể hoàn tác.', cancel: 'Hủy bỏ', confirm: 'Xóa vĩnh viễn', input: 'Nhập chính xác tên để xác nhận:' },
      zh: { title: '确认删除', message: '确定要删除此项目吗？', warning: '此操作无法撤销。', cancel: '取消', confirm: '永久删除', input: '请输入准确名称以确认：' }
    };
    const trashDefaults = {
      en: { title: 'Move to trash', message: 'Do you want to move this item to trash?', warning: 'You can restore it later from the trash.', cancel: 'Cancel', confirm: 'Move to trash', input: 'Type the item name to confirm:' },
      vi: { title: 'Chuyển vào thùng rác', message: 'Bạn có muốn chuyển mục này vào thùng rác?', warning: 'Bạn có thể khôi phục lại mục này từ thùng rác.', cancel: 'Hủy bỏ', confirm: 'Chuyển vào thùng rác', input: 'Nhập chính xác tên để xác nhận:' },
      zh: { title: '移至回收站', message: '要将此项目移至回收站吗？', warning: '稍后可以从回收站恢复此项目。', cancel: '取消', confirm: '移至回收站', input: '请输入准确名称以确认：' }
    };
    const copySet = options.variant === 'trash' ? trashDefaults : defaults;
    const copy = copySet[lang] || copySet.en;
    let element = document.getElementById('sharedDestructiveModal');
    if (!element) {
      element = document.createElement('div');
      element.id = 'sharedDestructiveModal';
      element.className = 'modal fade destructive-confirm-modal';
      element.tabIndex = -1;
      element.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content shadow-lg"><div class="modal-header border-0 pb-0"><button class="btn-close ms-auto" type="button" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body text-center px-4 pt-1 pb-4"><div class="destructive-confirm-icon mb-3"><i class="bi bi-trash3-fill"></i></div><h4 class="fw-bold text-main mb-2" data-shared-delete-title></h4><p class="text-muted mb-3" data-shared-delete-message></p><div class="destructive-confirm-warning text-start mb-3"><i class="bi bi-exclamation-triangle-fill me-2"></i><span data-shared-delete-warning></span></div><div class="text-start d-none" data-shared-delete-input-wrap><label class="form-label small fw-semibold text-main" data-shared-delete-input-label></label><input class="form-control" type="text" data-shared-delete-input autocomplete="off"></div></div><div class="modal-footer border-0 px-4 pb-4 pt-0"><button class="btn btn-light rounded-pill px-4" type="button" data-bs-dismiss="modal" data-shared-delete-cancel></button><button class="btn btn-primary rounded-pill px-4" type="button" data-shared-delete-confirm></button></div></div></div>`;
      document.body.appendChild(element);
    }
    const modal = bootstrap.Modal.getOrCreateInstance(element);
    const requiredText = options.requireText || '';
    const inputWrap = element.querySelector('[data-shared-delete-input-wrap]');
    const input = element.querySelector('[data-shared-delete-input]');
    const confirmButton = element.querySelector('[data-shared-delete-confirm]');
    element.querySelector('[data-shared-delete-title]').textContent = options.title || copy.title;
    element.querySelector('[data-shared-delete-message]').textContent = options.message || copy.message;
    element.querySelector('[data-shared-delete-warning]').textContent = options.warning || copy.warning;
    element.querySelector('[data-shared-delete-cancel]').textContent = options.cancelText || copy.cancel;
    element.querySelector('[data-shared-delete-input-label]').textContent = options.inputLabel || copy.input;
    confirmButton.textContent = options.confirmText || copy.confirm;
    inputWrap.classList.toggle('d-none', !requiredText);
    input.value = '';
    confirmButton.disabled = Boolean(requiredText);
    const sync = () => { confirmButton.disabled = Boolean(requiredText) && input.value !== requiredText; };
    input.addEventListener('input', sync);
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      input.removeEventListener('input', sync);
      confirmButton.removeEventListener('click', approve);
      element.removeEventListener('hidden.bs.modal', dismiss);
      resolve(value);
    };
    const approve = () => { finish(true); modal.hide(); };
    const dismiss = () => finish(false);
    confirmButton.addEventListener('click', approve, { once: true });
    element.addEventListener('hidden.bs.modal', dismiss, { once: true });
    modal.show();
    if (requiredText) element.addEventListener('shown.bs.modal', () => input.focus(), { once: true });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  // ========================================================
  // Theme Toggle Mechanism (Circle button)
  // ========================================================
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const htmlElement = document.documentElement;
  const supportedLanguages = new Set(['en', 'vi', 'zh']);

  const mobileSidebarBody = document.querySelector('#mobileSidebar .offcanvas-body');
  if (mobileSidebarBody && !mobileSidebarBody.querySelector('.mobile-preference-panel')) {
    const currentLanguage = String(localStorage.getItem('preferredLanguage') || 'en').toLowerCase();
    const flagMap = { en: 'gb', vi: 'vn', zh: 'cn' };
    const preferencePanel = document.createElement('div');
    preferencePanel.className = 'mobile-preference-panel';
    preferencePanel.setAttribute('aria-label', 'Display preferences');
    preferencePanel.innerHTML = `<div class="dropdown"><button class="mobile-preference-btn w-100" type="button" data-bs-toggle="dropdown" aria-expanded="false"><img id="mobileLangFlag" src="https://flagcdn.com/w20/${flagMap[currentLanguage] || 'gb'}.png" alt=""><span id="mobileCurrentLang">${supportedLanguages.has(currentLanguage) ? currentLanguage.toUpperCase() : 'EN'}</span><i class="bi bi-chevron-down ms-auto"></i></button><ul class="dropdown-menu shadow-sm w-100"><li><a class="dropdown-item global-lang-select" href="#" data-lang="en"><img src="https://flagcdn.com/w20/gb.png" width="18" class="me-2" alt="">English</a></li><li><a class="dropdown-item global-lang-select" href="#" data-lang="vi"><img src="https://flagcdn.com/w20/vn.png" width="18" class="me-2" alt="">Tiếng Việt</a></li><li><a class="dropdown-item global-lang-select" href="#" data-lang="zh"><img src="https://flagcdn.com/w20/cn.png" width="18" class="me-2" alt="">中文</a></li></ul></div><button class="mobile-preference-btn" id="mobileThemeToggle" type="button"><i class="bi bi-moon-fill" id="mobileThemeIcon"></i><span id="mobileThemeText" data-i18n="dark_mode">Dark mode</span></button>`;
    preferencePanel.querySelector('[data-bs-toggle="dropdown"]')?.setAttribute('aria-label', 'Change language');
    preferencePanel.querySelector('#mobileThemeToggle')?.setAttribute('aria-label', 'Toggle color theme');
    const mobileFooter = mobileSidebarBody.querySelector('.mt-auto');
    if (mobileFooter) mobileSidebarBody.insertBefore(preferencePanel, mobileFooter);
    else mobileSidebarBody.appendChild(preferencePanel);
  }

  window.getLingoraLanguage = function () {
    const storedLanguage = String(localStorage.getItem('preferredLanguage') || 'en').toLowerCase();
    return supportedLanguages.has(storedLanguage) ? storedLanguage : 'en';
  };

  window.syncLingoraLanguageUI = function (requestedLanguage) {
    const normalizedLanguage = String(requestedLanguage || window.getLingoraLanguage()).toLowerCase();
    const language = supportedLanguages.has(normalizedLanguage) ? normalizedLanguage : 'en';
    htmlElement.setAttribute('lang', language === 'zh' ? 'zh-CN' : language);
    if (typeof window.updateGlobalFlags === 'function') window.updateGlobalFlags(language);
    if (typeof window.applyUiTranslations === 'function') window.applyUiTranslations(language);
    if (typeof window.syncFeedCategoryMenu === 'function') window.syncFeedCategoryMenu();
    if (typeof window.applyLanguageFilter === 'function') window.applyLanguageFilter(language);
    return language;
  };

  window.setLingoraLanguage = function (requestedLanguage) {
    const normalizedLanguage = String(requestedLanguage || '').toLowerCase();
    const language = supportedLanguages.has(normalizedLanguage) ? normalizedLanguage : 'en';
    localStorage.setItem('preferredLanguage', language);
    window.syncLingoraLanguageUI(language);
    window.dispatchEvent(new CustomEvent('lingora:languagechange', { detail: { language } }));
    document.dispatchEvent(new CustomEvent('lingoraLangChange', { detail: { lang: language } }));
    Promise.resolve().then(() => {
      if (window.getLingoraLanguage() === language) window.syncLingoraLanguageUI(language);
    });
    return language;
  };

  window.addEventListener('pageshow', () => {
    window.syncLingoraLanguageUI(window.getLingoraLanguage());
  });

  // Initialize sidebar language label and flag
  const sidebarCurrentLang = document.getElementById('sidebarCurrentLang');
  if (sidebarCurrentLang) {
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    sidebarCurrentLang.textContent = currentLang.toUpperCase();
  }
  const sidebarLangFlag = document.getElementById('sidebarLangFlag');
  if (sidebarLangFlag) {
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const flagMap = { 'en': 'gb', 'vi': 'vn', 'zh': 'cn' };
    sidebarLangFlag.src = 'https://flagcdn.com/w20/' + (flagMap[currentLang] || 'gb') + '.png';
  }
  const mobileLangFlag = document.getElementById('mobileLangFlag');
  if (mobileLangFlag) {
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const flagMap = { 'en': 'gb', 'vi': 'vn', 'zh': 'cn' };
    mobileLangFlag.src = 'https://flagcdn.com/w20/' + (flagMap[currentLang] || 'gb') + '.png';
  }

  // Global language switch listener for sidebars and other selectors
  document.addEventListener('click', (e) => {
    const langSelect = e.target.closest('.global-lang-select');
    if (langSelect) {
      e.preventDefault();
      const lang = langSelect.getAttribute('data-lang');
      // Route every language control through the single state setter. Writing
      // localStorage directly does not fire a storage event in the same tab,
      // so page-specific widgets would otherwise update only after a reload.
      if (typeof window.setLingoraLanguage === 'function') {
        window.setLingoraLanguage(lang);
      } else {
        localStorage.setItem('preferredLanguage', lang);
        window.updateGlobalFlags(lang);
        if (window.applyUiTranslations) window.applyUiTranslations(lang);
        if (window.applyLanguageFilter) window.applyLanguageFilter(lang);
      }
    }
  });

  const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  htmlElement.setAttribute('data-bs-theme', savedTheme);
  updateThemeIcon(savedTheme);
  applySavedBrandAccent();

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const activeTheme = htmlElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      htmlElement.setAttribute('data-bs-theme', activeTheme);
      localStorage.setItem('theme', activeTheme);
      updateThemeIcon(activeTheme);
      applySavedBrandAccent();
    });
  }

  function updateThemeIcon(theme) {
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    let dict = null;
    try { dict = uiTranslations[lang] || uiTranslations.en; } catch (e) { }
    const modeKey = theme === 'dark' ? 'light_mode' : 'dark_mode';

    if (themeIcon) {
      if (theme === 'dark') {
        themeIcon.className = 'bi bi-sun';
      } else {
        themeIcon.className = 'bi bi-moon';
      }
    }

    // Update sidebar theme controls
    const sidebarThemeIcon = document.getElementById('sidebarThemeIcon');
    const sidebarThemeText = document.getElementById('sidebarThemeText');

    if (sidebarThemeIcon) {
      sidebarThemeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    }
    if (sidebarThemeText) {
      sidebarThemeText.setAttribute('data-i18n', modeKey);
      if (dict) sidebarThemeText.textContent = dict[modeKey];
    }

    // Update mobile theme controls
    const mobileThemeIcon = document.getElementById('mobileThemeIcon');
    const mobileThemeText = document.getElementById('mobileThemeText');

    if (mobileThemeIcon) {
      mobileThemeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    }
    if (mobileThemeText) {
      mobileThemeText.setAttribute('data-i18n', modeKey);
      if (dict) mobileThemeText.textContent = dict[modeKey];
    }
  }

  // Sidebar theme toggle click listener via event delegation (for dynamically injected DOM)
  document.addEventListener('click', (e) => {
    const themeToggle = e.target.closest('#sidebarThemeToggle') || e.target.closest('#mobileThemeToggle');
    if (themeToggle) {
      const activeTheme = htmlElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      htmlElement.setAttribute('data-bs-theme', activeTheme);
      localStorage.setItem('theme', activeTheme);
      updateThemeIcon(activeTheme);
    }
  });

  window.updateGlobalFlags = function (lang) {
    const languages = {
      en: { flag: 'gb', name: 'English' },
      vi: { flag: 'vn', name: 'Tiếng Việt' },
      zh: { flag: 'cn', name: '中文' }
    };
    const requestedLanguage = String(lang || window.getLingoraLanguage()).toLowerCase();
    const currentLang = languages[requestedLanguage] ? requestedLanguage : 'en';
    const language = languages[currentLang];
    document.documentElement.setAttribute('lang', currentLang === 'zh' ? 'zh-CN' : currentLang);

    // querySelectorAll is intentional: a few layouts contain desktop/mobile
    // language controls at the same time, and every visible flag must stay synced.
    const flags = ['currentLangFlag', 'sidebarLangFlag', 'mobileLangFlag', 'authModalLangFlag'];
    flags.forEach(id => {
      document.querySelectorAll(`[id="${id}"]`).forEach(el => {
        const nextSource = `https://flagcdn.com/w20/${language.flag}.png`;
        if (el.getAttribute('src') !== nextSource) el.setAttribute('src', nextSource);
        el.setAttribute('data-current-language', currentLang);
        el.alt = language.name;
        el.title = language.name;
      });
    });
    const labels = ['sidebarCurrentLang', 'mobileCurrentLang', 'currentLangLabel'];
    labels.forEach(id => {
      document.querySelectorAll(`[id="${id}"]`).forEach(el => {
        el.textContent = currentLang.toUpperCase();
      });
    });

    document.querySelectorAll('.global-lang-select').forEach(option => {
      const isActive = option.getAttribute('data-lang') === currentLang;
      option.classList.toggle('active', isActive);
      option.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  // Apply the persisted language after all static controls on the page exist.
  window.updateGlobalFlags(window.getLingoraLanguage());

  window.updateGlobalTheme = function (theme) {
    htmlElement.setAttribute('data-bs-theme', theme);
    updateThemeIcon(theme);
    applySavedBrandAccent();
  };

  window.addEventListener('storage', (e) => {
    if (e.key === 'preferredLanguage') {
      window.syncLingoraLanguageUI(e.newValue || 'en');
    }
    if (e.key === 'theme') {
      const theme = e.newValue || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      window.updateGlobalTheme(theme);
    }
  });

  function hexToRgb(hex) {
    const normalized = String(hex || '').replace('#', '').trim();
    if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;

    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    };
  }

  function normalizeHex(value) {
    const rgb = hexToRgb(value);
    if (!rgb) return '';
    return `#${[rgb.r, rgb.g, rgb.b].map(part => part.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }

  function shiftColor(hex, amount) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const shift = channel => {
      const target = amount < 0 ? 0 : 255;
      return Math.round(channel + (target - channel) * Math.abs(amount));
    };

    return `#${[shift(rgb.r), shift(rgb.g), shift(rgb.b)].map(part => part.toString(16).padStart(2, '0')).join('')}`;
  }

  function getRelativeLuminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  }

  function colorToRgba(hex, alpha) {
    const rgb = hexToRgb(hex);
    if (!rgb) return `rgba(255, 90, 0, ${alpha})`;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  function applyBrandAccent(accentColor) {
    const accent = normalizeHex(accentColor);
    if (!accent) return;

    const sourceLuminance = getRelativeLuminance(accent);
    const isDarkTheme = htmlElement.getAttribute('data-bs-theme') === 'dark';
    const needsLightCanvasContrast = !isDarkTheme && sourceLuminance > 0.92;
    const needsDarkCanvasContrast = isDarkTheme && sourceLuminance < 0.08;
    const uiAccent = needsLightCanvasContrast ? '#59636F' : needsDarkCanvasContrast ? '#AAB2BD' : accent;
    const borderAccent = needsLightCanvasContrast ? '#98A2B3' : needsDarkCanvasContrast ? '#667085' : accent;
    const hover = needsLightCanvasContrast ? '#F2F4F7' : shiftColor(accent, sourceLuminance > 0.58 ? -0.18 : 0.16);
    const contrast = sourceLuminance > 0.58 ? '#141616' : '#ffffff';

    htmlElement.dataset.accentContrast = needsLightCanvasContrast ? 'light-on-light' : needsDarkCanvasContrast ? 'dark-on-dark' : 'normal';
    htmlElement.dataset.accentTone = sourceLuminance > 0.92 ? 'light' : sourceLuminance < 0.08 ? 'dark' : 'normal';
    htmlElement.style.setProperty('--brand-accent-color', accent);
    htmlElement.style.setProperty('--primary-color', accent);
    htmlElement.style.setProperty('--primary-hover', hover);
    htmlElement.style.setProperty('--accent-ui-color', uiAccent);
    htmlElement.style.setProperty('--accent-border-color', borderAccent);
    htmlElement.style.setProperty('--accent-button-bg', needsLightCanvasContrast ? '#FFFFFF' : colorToRgba(accent, isDarkTheme ? 0.16 : 0.1));
    htmlElement.style.setProperty('--accent-button-text', uiAccent);
    htmlElement.style.setProperty('--accent', accent);
    htmlElement.style.setProperty('--accent-strong', hover);
    htmlElement.style.setProperty('--accent-contrast', contrast);
  }

  function applySavedBrandAccent() {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('mundiBlogProfile') || '{}');
      applyBrandAccent(savedProfile.accentColor);
    } catch (error) {
      // Ignore malformed local profile data and keep the default theme color.
    }
  }

  window.applyMundiBrandAccent = applyBrandAccent;

  // ========================================================
  // Dynamic Feed & UI Language Filtering / i18n
  // ========================================================
  const uiTranslations = {
    en: {
      auth_modal_title: "Sign in to Lingora",
      auth_modal_subtitle: "First time here?",
      auth_modal_register: "Create account",
      auth_modal_login: "Sign in",
      btn_save: "Save",
      btn_saved: "Saved",
      btn_preview: "Preview",
      btn_continue: "Continue",
      btn_share: "Share",
      btn_done: "Done",
      link_create_title: "Create a link",
      link_text_placeholder: "Enter text...",
      link_url_placeholder: "Enter URL...",
      link_apply: "Link",
      link_change: "Change",
      link_remove: "Remove",


      cat_tech: "Technology",
      cat_life: "Lifestyle",
      cat_edu: "Education",
      cat_ent: "Entertainment",
      cat_travel: "Travel",
      cat_food: "Food",
      cat_biz: "Business",
      cat_health: "Health",
      draft_save_prompt: "Save this post as a draft?",
      draft_discard_warn: "If you discard now, you will lose this post.",
      delete_draft: "Delete draft",
      save_as_draft: "Save as draft",
      confirm_trash: "Do you want to move this post to trash?",
      confirm_delete_permanent: "Are you sure you want to permanently delete this post?",
      publish_options: "Publish Options",
      post_category: "Post Category",
      original_language: "Original Language",
      allowed_translations: "Allowed Translations",
      preview_translation: "Preview translation",
      publish_btn: "Publish",

      on: "On",
      off: "Off",
      home: "Home",

      liked_posts: "Liked Posts",
      my_articles: "My Articles",
      about: "About",
      profile: "Profile",
      create: "Create",
      more: "More",
      settings: "Settings",
      admin_panel: "Admin Panel",
      security: "Security",
      change_password: "Change password",
      password_description_short: "Update the password for your Lingora account.",
      password_description_long: "Update the password for your Lingora account. Use a strong password that you do not use anywhere else.",
      back_to_profile: "Back to profile",
      current_password_label: "Current password",
      new_password_label: "New password",
      confirm_new_password_label: "Confirm new password",
      password_min_hint: "Use at least 8 characters.",
      update_password: "Update password",
      password_min_error: "New password must be at least 8 characters.",
      password_same_error: "New password must be different from current password.",
      password_mismatch_error: "New passwords do not match.",
      password_success: "Password updated successfully.",
      sign_out: "Sign Out",
      sign_out_success: "Signed out successfully!",
      active: "Active",
      inactive: "Inactive",
      created_date: "Created:",
      default: "Default",
      login: "Log in",
      what_on_mind: "What is on your mind?",
      for_you: "For you",
      cat_ai: "Artificial Intelligence",
      cat_backend: "Backend Engineering",
      cat_design: "Design",
      cat_frontend: "Frontend Development",
      cat_mobile: "Mobile Development",
      cat_data: "Data Science",
      cat_cyber: "Cybersecurity",
      slug_ai: "ai",
      slug_backend: "backend",
      slug_design: "design",
      search_placeholder: "Search Lingora...",
      subscriptions: "Subscriptions",
      join_creators: "Join creators on Lingora",
      recommended: "Recommended for You",
      see_all: "See all",
      view_profile: "View Profile",
      subscribe: "Subscribe",
      profile_see_subscribers: "See subscribers",
      profile_edit_profile: "Edit profile",

      profile_edit_title: "Edit Profile",
      profile_done: "Done",
      profile_name_label: "Name",
      profile_handle_label: "Handle",
      profile_edit_handle: "Edit",
      profile_bio_label: "Bio",
      profile_branding: "Branding",
      profile_branding_desc: "Customize the look of your profile.",
      profile_header_image: "Header image",
      profile_header_drop: "Drop your header image here",
      profile_header_hint: "At least 1344x256px - 3:2 to 21:4 aspect ratio",
      profile_select_image: "Select image",
      profile_accent_color: "Accent color",
      profile_background_color: "Background color",
      profile_none: "None",
      // Settings page
      settings_title: "Settings & Preferences",
      settings_desc: "Manage your interface, display language, and reading preferences on Lingora.",
      appearance_title: "Appearance & Theme",
      appearance_desc: "Choose a light or dark theme to suit your environment and protect your eyes when reading posts.",
      theme_light: "Light",
      theme_light_sub: "Substack clean white paper",
      theme_dark: "Dark",
      theme_dark_sub: "Comfortable in low-light environments",
      lang_title: "Feed & UI Language",
      lang_desc: "Choose your default language. The Home Feed and UI will automatically display in your selected language.",
      pref_title: "Reading Preferences",
      pref_desc: "Customize how posts and multimedia content appear on your feed.",
      compact_view: "Compact View",
      compact_desc: "Reduce image size and increase post density on the feed.",
      autoplay: "Auto-play Media",
      autoplay_desc: "Automatically play animated GIFs and short clips when scrolling.",
      back_feed: "Back to Feed",
      auto_saved: "Changes auto-saved",
      dark_mode: "Dark Mode",
      light_mode: "Light Mode",
      toast_theme_changed: "Switched to <b>{theme}</b> theme",
      toast_language_changed: "Feed and interface language set to <b>{language}</b>",
      toast_compact_on: "Compact view turned on",
      toast_compact_off: "Compact view turned off",
      toast_autoplay_on: "Media auto-play turned on",
      toast_autoplay_off: "Media auto-play turned off",
      show_subscribers: "Show Subscribers",
      show_subscribers_desc: "Allow others to see the list of people following you.",
      toast_show_subscribers_on: "Subscribers visibility turned on",
      toast_show_subscribers_off: "Subscribers visibility turned off",
      show_following: "Show Following List",
      show_following_desc: "Allow others to see the list of people you are following.",
      toast_show_following_on: "Following list visibility turned on",
      toast_show_following_off: "Following list visibility turned off",
      // Post Detail page
      comments: "Comments",
      comment_placeholder: "Write a comment in any language...",
      post_comment: "Post Comment",
      translate_comment: "Translate",
      show_original: "Show original content",
      related_posts: "Related Posts",
      related_posts_in: "Related Posts in",
      no_comments: "No comments yet. Be the first to comment!",
      reply: "Reply",
      cancel: "Cancel",
      submit_reply: "Submit Reply",
      replying_to: "Replying to @",
      replying_to_comment: "Replying to comment by ",
      login_required_comment: "Please log in first to reply or comment!",
      please_enter_reply: "Please enter your reply!",
      please_enter_comment: "Please enter your comment!",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      delete_confirm_root: "Are you sure you want to delete this comment? All child replies will also be deleted!",
      delete_confirm_reply: "Are you sure you want to delete this reply?",
      comment_edited: "(edited)",
      reset_demo: "Reset Demo Data",
      my_posts_title: "My Articles",
      my_posts_desc: "Manage drafts, published posts, and the AI translation status matrix for EN, VI, and ZH.",
      new_post: "New post",
      all_posts: "All posts",
      drafts: "Drafts",
      published: "Published",
      total_posts: "Total posts",
      translation_ready: "Translations ready",
      translations_attention: "Need attention",
      search_posts: "Search your posts...",
      status_label: "Status",
      title_label: "Title",
      original_language: "Original language",
      ai_translation_matrix: "AI translation matrix",
      updated: "Updated",
      reads: "Reads",
      actions: "Actions",
      open: "Open",
      restore: "Restore",
      status_draft: "Draft",
      status_published: "Published",
      status_pending: "Pending",
      status_trash: "Trash",
      ai_status_ready: "Ready",
      ai_status_processing: "Processing",
      ai_status_missing: "Missing",
      ai_status_failed: "Failed",
      no_posts_found: "No posts match your filters.",
      all_posts_tab: "All",
      trash: "Trash",
      translated_language: "Translated language",
      all_languages: "All languages",
      english: "English",
      vietnamese: "Vietnamese",
      chinese: "Chinese",
      all_dates: "All dates",
      all_categories: "All categories",
      select_all: "Select all",
      selected: "selected",
      delete_selected: "Delete Selected",
      restore_selected: "Restore Selected",
      cat_ai_translation: "AI Translation",
      cat_profile_branding: "Profile Branding",
      cat_design_general: "Design",
      cat_analytics: "Analytics",
      cat_localization: "Localization",
      search_placeholder_modal: "Search people, publications, or topics...",
      recommended_people: "People & Publications",
      no_results: "No matching results found.",
      // Explore page
      explore: "Explore",
      top: "Top",
      recent: "Recent",
      posts: "Posts",
      publications: "Publications",
      people: "People",
      subscribed: "Subscribed",
      author_economics: "Economics Author",
      author_economics_lead: "Economics Lead",
      author_tech_lead: "Tech Lead",
      featured_creators: "Featured Creators",
      people_matching: "People matching \"{query}\"",
      publications_matching: "Publications matching \"{query}\"",
      posts_matching: "Posts matching \"{query}\"",
      top_trending_posts: "Top Trending Posts",
      suggestions: "Suggestions",
      // Admin Panel
      admin_dashboard: "Admin Dashboard",
      manage_users: "Manage Users",
      manage_posts: "Manage Posts",
      manage_categories: "Manage Categories",
      manage_languages: "Manage Languages",
      total_users: "Total Users",
      total_articles: "Total Articles",
      ai_translated: "AI Translated",
      total_comments: "Total Comments",
      total_likes: "Total Likes",
      queue_status: "AI Translation Queue",
      user_management: "User Management",
      category_management: "Category Management",
      language_management: "Language Management",
      search_user_placeholder: "Search users by name or email...",
      search_cat_placeholder: "Search categories...",
      add_category: "Add Category",
      edit_category: "Edit Category",
      category_name: "Category Name",
      slug: "Slug",
      status: "Status",
      role: "Role",
      active: "Active",
      banned: "Banned",
      translation_coverage: "Translation Coverage",
      admin_desc: "Overview of users, articles, total comments, and community engagement.",
      col_article: "Article",
      col_author: "Author",
      col_source: "Source",
      col_target: "Target",
      col_status: "Status",
      col_actions: "Actions",
      status_translating: "Translating",
      status_completed: "Completed",
      status_hidden: "Hidden",
      user_desc: "View user directory, filter by roles, and manage account statuses.",
      col_user: "User",
      col_email: "Email",
      col_joined: "Joined",
      role_all: "All Roles",
      role_admin: "Admin",
      role_member: "Member",
      cat_desc: "Create, organize, and edit post categories for the home feed.",
      col_posts_count: "Total Posts",
      cat_name_placeholder: "Enter category name...",
      slug_auto_placeholder: "Slug automatically generated...",
      slug_help: "URLs will use this slug to route categories.",
      lang_desc_page: "Configure system languages and monitor AI automatic translation coverage.",
      add_language: "Add Language",
      col_code: "Code",
      col_lang_name: "Language Name",
      col_progress: "AI Translation Progress",
      primary_language: "Primary Language",
      system_default: "System Default",
      back_admin: "Back to Admin Dashboard",
      posts_suffix: "posts",
      select_language: "Select Language",
      choose_lang_placeholder: "Choose a language...",
      language_code: "Language Code",
      lang_code_placeholder: "Language code will be generated...",
      published_2h: "Published 2 hours ago",
      published_3d: "Published 3 days ago",
      published_1d: "Published 1 day ago",
      published_5h: "Published 5 hours ago",
      showing_results_for: "Showing results for ",
      views: "Views",
      view: "View",
      yesterday: "Yesterday",
      just_now: "Just now",
      hours_ago: "hours ago",
      days_ago: "days ago",
      weeks_ago: "weeks ago",
      months_ago: "months ago",
      password: "Password",
      confirm_password: "Confirm Password",
      full_name: "Full Name",
      create_account: "Create Account",
      register: "Register",
      dont_have_account: "Don't have an account?",
      already_have_account: "Already have an account?",
      quick_demo_login: "QUICK DEMO LOGIN",
      quick_admin_login: "Quick login as Admin",
      register_here: "Register here",
      login_here: "Log in here",
      post_list: "Article List",
      translated_articles: "Translated Articles:",
      make_primary: "Make Primary",
      danger_warning: "Data Destruction Warning",
      delete_lang_desc1: "You are about to delete the entire language ",
      delete_lang_desc2: "This will permanently delete ",
      delete_lang_desc3: " translated articles. This action cannot be undone!",
      delete_lang_desc4: "To proceed, please type the exact language name in the box below:",
      type_lang_name: "Type language name...",
      cancel_safe: "Cancel Safely",
      confirm_delete: "Confirm Permanent Deletion",
      user_details: "User Details",
      activity_info: "Activity & Info",
      joined_date: "Joined Date",
      articles_published: "Articles Published",
      joined: "Joined",
      views_over_time: "Views over time",
      top_languages: "Top Languages",
      featured_posts: "Featured Articles",
      featured_posts_desc: "Base posts ranked by total views",
      lang_vi: "Vietnamese",
      lang_zh: "Chinese",
      lang_en: "English",
      top_categories: "Top Categories",
      cat_ai_auto: "AI & Automation",
      cat_web_dev: "Web Development",
      cat_ui_ux: "UI/UX Design",
      new_users_growth: "New Users Growth",
      mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
      post_ai_1: "The Future of AI Agent Programming in 2026",
      post_ai_2: "Next-Gen LLM Reasoning & Tool Use in 2026",









      manage_subscriptions: "Manage Subscriptions",
      subscriptions_desc: "Manage the creators you follow and their notification preferences.",
      search_creators_placeholder: "Search creators...",
      following_tab: "Following",
      discover_tab: "Discover",
      you_follow: "You are following",
      latest_from_following: "Latest from following",
      top: "Top",
      followers: "Followers",
      following: "Following",
      posts: "Posts",
      publications: "Publications",
      people: "People",
      showing_results_for: "Showing results for ",
      no_results: "No matching results found.",
      sub_empty_title: "You haven't followed any authors yet",
      sub_empty_desc: "Discover insightful articles and follow authors so you never miss their latest updates!",
      sub_suggested_authors: "Suggested Authors",
      sub_tab_all: "Feed",
      sub_tab_manage: "Following",
      sub_search_placeholder: "Search posts from followed authors...",
      sub_filtering: "Filtering by",
      sub_clear_filter: "Clear filter",
      sub_manage_search: "Search list...",
      sub_sort_recent: "Recently followed",
      sub_sort_az: "Name A-Z",
      sub_following_count: "Following {n} people",
      sub_new_posts_count: "{n} with new posts",
      sub_view_all: "View all",
      sub_back_to_feed: "← Back to Feed",
      btn_follow: "Follow",
      btn_following: "Following",
      btn_unfollow: "Unfollow",

    },
    vi: {
      auth_modal_title: "Đăng nhập vào Lingora",
      auth_modal_subtitle: "Lần đầu đến đây?",
      auth_modal_register: "Tạo tài khoản",
      auth_modal_login: "Đăng nhập",
      btn_save: "Lưu",
      btn_saved: "Đã lưu",
      btn_preview: "Xem trước",
      btn_continue: "Tiếp tục",
      btn_share: "Chia sẻ",
      btn_done: "Xong",
      link_create_title: "T\u1ea1o li\u00ean k\u1ebft",
      link_text_placeholder: "Nh\u1eadp t\u00ean hi\u1ec3n th\u1ecb...",
      link_url_placeholder: "Nh\u1eadp URL...",
      link_apply: "Li\u00ean k\u1ebft",
      link_change: "S\u1eeda",
      link_remove: "X\u00f3a",


      cat_tech: "Công nghệ",
      cat_life: "Đời sống",
      cat_edu: "Giáo dục",
      cat_ent: "Giải trí",
      cat_travel: "Du lịch",
      cat_food: "Ẩm thực",
      cat_biz: "Kinh doanh",
      cat_health: "Sức khỏe",
      draft_save_prompt: "Lưu bài viết này làm bản nháp?",
      draft_discard_warn: "Nếu bỏ bây giờ, bạn sẽ mất bài viết này.",
      delete_draft: "Xóa bản nháp",
      save_as_draft: "Lưu làm bản nháp",
      confirm_trash: "Bạn có muốn chuyển bài viết này vào thùng rác?",
      confirm_delete_permanent: "Bạn có chắc chắn muốn xóa vĩnh viễn bài viết này?",
      publish_options: "Tùy chọn đăng bài",
      post_category: "Thể loại bài viết",
      original_language: "Ngôn ngữ gốc",
      allowed_translations: "Ngôn ngữ được phép dịch",
      preview_translation: "Xem bản dịch",
      publish_btn: "Đăng",

      on: "Bật",
      off: "Tắt",
      home: "Trang chủ",

      liked_posts: "Bài đã thích",
      my_articles: "Bài viết của tôi",
      about: "Giới thiệu",
      profile: "Hồ sơ",
      create: "Viết bài",
      more: "Thêm",
      settings: "Cài đặt",
      admin_panel: "Quản trị viên",
      security: "Bảo mật",
      change_password: "Đổi mật khẩu",
      password_description_short: "Cập nhật mật khẩu cho tài khoản Lingora của bạn.",
      password_description_long: "Cập nhật mật khẩu cho tài khoản Lingora của bạn. Hãy dùng mật khẩu mạnh mà bạn không dùng ở nơi khác.",
      back_to_profile: "Quay lại hồ sơ",
      current_password_label: "Mật khẩu hiện tại",
      new_password_label: "Mật khẩu mới",
      confirm_new_password_label: "Xác nhận mật khẩu mới",
      password_min_hint: "Sử dụng ít nhất 8 ký tự.",
      update_password: "Cập nhật mật khẩu",
      password_min_error: "Mật khẩu mới phải có ít nhất 8 ký tự.",
      password_same_error: "Mật khẩu mới phải khác mật khẩu hiện tại.",
      password_mismatch_error: "Mật khẩu mới không khớp.",
      password_success: "Đã cập nhật mật khẩu thành công.",
      sign_out: "Đăng xuất",
      sign_out_success: "Đăng xuất thành công!",
      active: "Bật",
      inactive: "Tắt",
      created_date: "Ngày tạo:",
      default: "Mặc định",
      login: "Đăng nhập",
      what_on_mind: "Bạn đang nghĩ gì?",
      for_you: "Dành cho bạn",
      cat_ai: "Trí tuệ nhân tạo (AI)",
      cat_backend: "Kỹ thuật Backend",
      cat_design: "Thiết kế UI/UX",
      cat_frontend: "Lập trình Frontend",
      cat_mobile: "Lập trình Mobile",
      cat_data: "Khoa học Dữ liệu",
      cat_cyber: "An ninh mạng",
      slug_ai: "tri-tue-nhan-tao",
      slug_backend: "ky-thuat-backend",
      slug_design: "thiet-ke-ui-ux",
      search_placeholder: "Tìm kiếm trên Lingora...",
      subscriptions: "Đang theo dõi",
      join_creators: "Kết nối cùng tác giả",
      recommended: "Gợi ý cho bạn",
      see_all: "Xem tất cả",
      view_profile: "Xem hồ sơ",
      subscribe: "Đăng ký",
      profile_see_subscribers: "Xem người đăng ký",
      profile_edit_profile: "Chỉnh sửa hồ sơ",

      profile_edit_title: "Chỉnh sửa hồ sơ",
      profile_done: "Xong",
      profile_name_label: "Tên",
      profile_handle_label: "Tên người dùng",
      profile_edit_handle: "Sửa",
      profile_bio_label: "Tiểu sử",
      profile_branding: "Thương hiệu",
      profile_branding_desc: "Tùy chỉnh giao diện hồ sơ của bạn.",
      profile_header_image: "Ảnh bìa",
      profile_header_drop: "Thả ảnh bìa của bạn tại đây",
      profile_header_hint: "Tối thiểu 1344x256px - tỷ lệ 3:2 đến 21:4",
      profile_select_image: "Chọn ảnh",
      profile_accent_color: "Màu nhấn",
      profile_background_color: "Màu nền",
      profile_none: "Không có",
      // Settings page
      settings_title: "Cài đặt & Tùy chọn",
      settings_desc: "Quản lý giao diện, ngôn ngữ hiển thị và cấu hình trải nghiệm đọc bài viết trên Lingora.",
      appearance_title: "Chế độ Giao diện",
      appearance_desc: "Chọn chế độ màu sáng hoặc tối phù hợp với môi trường và bảo vệ thị lực của bạn khi đọc bài đăng.",
      theme_light: "Sáng",
      theme_light_sub: "Giao diện giấy trắng chuẩn Substack",
      theme_dark: "Tối",
      theme_dark_sub: "Dễ chịu trong môi trường thiếu sáng",
      lang_title: "Ngôn ngữ Bảng tin & UI",
      lang_desc: "Chọn ngôn ngữ mặc định của bạn. Bảng tin (Home Feed) và giao diện sẽ hiển thị bằng ngôn ngữ được chọn.",
      pref_title: "Tùy chọn Đọc",
      pref_desc: "Tùy chỉnh cách các bài đăng và nội dung đa phương tiện hiển thị trên luồng bảng tin của bạn.",
      compact_view: "Chế độ đọc gọn gàng",
      compact_desc: "Thu nhỏ kích thước hình ảnh và tăng mật độ bài viết trên bảng tin.",
      autoplay: "Tự động phát Video & GIF",
      autoplay_desc: "Tự động phát hình ảnh động và clip ngắn khi cuộn qua bài viết.",
      back_feed: "Quay lại Bảng tin",
      auto_saved: "Tự động lưu thay đổi",
      toast_theme_changed: "Đã đổi sang giao diện <b>{theme}</b>",
      toast_language_changed: "Đã đặt ngôn ngữ bảng tin và giao diện là <b>{language}</b>",
      toast_compact_on: "Đã bật chế độ đọc gọn gàng",
      toast_compact_off: "Đã tắt chế độ đọc gọn gàng",
      toast_autoplay_on: "Đã bật tự động phát video/GIF",
      toast_autoplay_off: "Đã tắt tự động phát video/GIF",
      show_subscribers: "Hiển thị người đăng ký",
      show_subscribers_desc: "Cho phép người khác xem danh sách những người đang theo dõi bạn.",
      toast_show_subscribers_on: "Đã bật hiển thị người đăng ký",
      toast_show_subscribers_off: "Đã tắt hiển thị người đăng ký",
      show_following: "Hiển thị danh sách đang theo dõi",
      show_following_desc: "Cho phép người khác xem danh sách những người bạn đang theo dõi.",
      toast_show_following_on: "Đã bật hiển thị danh sách đang theo dõi",
      toast_show_following_off: "Đã tắt hiển thị danh sách đang theo dõi",
      // Post Detail page
      comments: "Bình luận",
      comment_placeholder: "Viết bình luận bằng bất kỳ ngôn ngữ nào...",
      post_comment: "Gửi bình luận",
      translate_comment: "Dịch",
      show_original: "Hiển thị nội dung gốc",
      related_posts: "Các bài viết liên quan",
      related_posts_in: "Bài viết liên quan trong danh mục",
      no_comments: "Chưa có bình luận nào. Hãy là người đầu tiên bình luận!",
      reply: "Trả lời",
      cancel: "Hủy",
      submit_reply: "Gửi trả lời",
      replying_to: "Trả lời @",
      replying_to_comment: "Trả lời bình luận của ",
      login_required_comment: "Vui lòng đăng nhập để bình luận hoặc trả lời!",
      please_enter_reply: "Vui lòng nhập nội dung trả lời!",
      please_enter_comment: "Vui lòng nhập nội dung bình luận!",
      edit: "Sửa",
      delete: "Xóa",
      save: "Lưu",
      delete_confirm_root: "Bạn có chắc muốn xóa bình luận này? Toàn bộ các bình luận phản hồi bên trong cũng sẽ bị xóa theo!",
      delete_confirm_reply: "Bạn có chắc muốn xóa câu trả lời này?",
      comment_edited: "(đã chỉnh sửa)",
      reset_demo: "Khôi phục dữ liệu mẫu",
      my_posts_title: "Bài viết của tôi",
      my_posts_desc: "Quản lý bài nháp, bài đã đăng và ma trận trạng thái dịch thuật AI cho EN, VI, ZH.",
      new_post: "Bài viết mới",
      all_posts: "Tất cả bài viết",
      drafts: "Bài nháp",
      published: "Đã đăng",
      total_posts: "Tổng bài viết",
      translation_ready: "Bản dịch sẵn sàng",
      translations_attention: "Cần chú ý",
      search_posts: "Tìm bài viết của bạn...",
      status_label: "Trạng thái",
      title_label: "Tiêu đề",
      original_language: "Ngôn ngữ gốc",
      ai_translation_matrix: "Ma trận dịch thuật AI",
      updated: "Cập nhật",
      reads: "Lượt đọc",
      actions: "Thao tác",
      open: "Mở",
      restore: "Khôi phục",
      status_draft: "Nháp",
      status_published: "Đã đăng",
      status_pending: "Chờ duyệt",
      status_trash: "Thùng rác",
      ai_status_ready: "Sẵn sàng",
      ai_status_processing: "Đang xử lý",
      ai_status_missing: "Thiếu",
      ai_status_failed: "Lỗi dịch",
      no_posts_found: "Không có bài viết nào phù hợp với bộ lọc của bạn.",
      all_posts_tab: "Tất cả",
      trash: "Thùng rác",
      translated_language: "Ngôn ngữ dịch",
      all_languages: "Tất cả ngôn ngữ",
      english: "Tiếng Anh",
      vietnamese: "Tiếng Việt",
      chinese: "Tiếng Trung",
      all_dates: "Tất cả ngày",
      all_categories: "Tất cả danh mục",
      select_all: "Chọn tất cả",
      selected: "đã chọn",
      delete_selected: "Xóa mục đã chọn",
      restore_selected: "Khôi phục mục đã chọn",
      cat_ai_translation: "Dịch thuật AI",
      cat_profile_branding: "Thương hiệu hồ sơ",
      cat_design_general: "Thiết kế",
      cat_analytics: "Phân tích",
      cat_localization: "Bản địa hóa",
      search_placeholder_modal: "Tìm kiếm tác giả, bài viết hoặc danh mục...",
      recommended_people: "Tác giả & Danh mục",
      no_results: "Không tìm thấy kết quả phù hợp.",
      // Explore page
      explore: "Khám phá",
      top: "Nổi bật",
      recent: "Mới nhất",
      posts: "Bài viết",
      publications: "Chuyên mục",
      people: "Tác giả",
      subscribed: "Đã theo dõi",
      author_economics: "Chuyên gia Kinh tế",
      author_economics_lead: "Trưởng phòng Kinh tế",
      author_tech_lead: "Trưởng nhóm Kỹ thuật",
      featured_creators: "Tác giả nổi bật",
      people_matching: "Tác giả khớp với \"{query}\"",
      publications_matching: "Chuyên mục khớp với \"{query}\"",
      posts_matching: "Bài viết khớp với \"{query}\"",
      top_trending_posts: "Bài viết thịnh hành",
      suggestions: "Gợi ý tìm kiếm",
      showing_results_for: "Hiển thị kết quả cho ",
      yesterday: "Hôm qua",
      just_now: "Vừa xong",
      hours_ago: "giờ trước",
      days_ago: "ngày trước",
      weeks_ago: "tuần trước",
      months_ago: "tháng trước",
      // Admin Panel
      admin_dashboard: "Bảng điều khiển Admin",
      manage_users: "Quản lý thành viên",
      manage_posts: "Quản lý bài viết",
      manage_categories: "Quản lý danh mục",
      manage_languages: "Quản lý ngôn ngữ",
      total_users: "Tổng số thành viên",
      total_articles: "Tổng số bài viết",
      ai_translated: "Đã dịch bằng AI",
      total_comments: "Tổng bình luận",
      total_likes: "Tổng lượt thích",
      queue_status: "Hàng đợi biên dịch AI",
      user_management: "Quản lý thành viên",
      category_management: "Quản lý danh mục",
      language_management: "Quản lý ngôn ngữ",
      search_user_placeholder: "Tìm thành viên theo tên hoặc email...",
      search_cat_placeholder: "Tìm kiếm danh mục...",
      add_category: "Thêm danh mục",
      edit_category: "Sửa danh mục",
      category_name: "Tên danh mục",
      slug: "Slug (Đường dẫn)",
      actions: "Thao tác",
      status: "Trạng thái",
      role: "Vai trò",
      active: "Hoạt động",
      banned: "Bị khóa",
      save_changes: "Lưu thay đổi",
      translation_coverage: "Mức độ phủ dịch",
      admin_desc: "Tổng quan về thành viên, bài viết, bình luận và mức độ tương tác của cộng đồng.",
      col_article: "Bài viết",
      col_author: "Tác giả",
      col_source: "Nguồn",
      col_target: "Đích",
      col_status: "Trạng thái",
      col_actions: "Thao tác",
      status_translating: "Đang dịch...",
      status_completed: "Hoàn thành",
      status_failed: "Thất bại",
      status_hidden: "Tạm ẩn",
      user_desc: "Xem danh sách thành viên, lọc theo vai trò và quản lý trạng thái tài khoản.",
      col_user: "Người dùng",
      col_email: "Email",
      col_joined: "Ngày tham gia",
      role_all: "Tất cả vai trò",
      role_admin: "Quản trị viên",
      role_member: "Thành viên",
      cat_desc: "Tạo, sắp xếp và chỉnh sửa các danh mục bài viết trên bảng tin.",
      col_posts_count: "Tổng số bài viết",
      cat_name_placeholder: "Nhập tên danh mục...",
      slug_auto_placeholder: "Đường dẫn tự động tạo...",
      slug_help: "Đường dẫn liên kết (Slug) sẽ dùng để định tuyến danh mục bài viết.",
      lang_desc_page: "Cấu hình ngôn ngữ hệ thống và theo dõi tiến độ dịch thuật tự động của AI.",
      add_language: "Thêm ngôn ngữ",
      col_code: "Mã",
      col_lang_name: "Tên ngôn ngữ",
      col_progress: "Tiến độ dịch thuật AI",
      primary_language: "Ngôn ngữ chính",
      system_default: "Mặc định hệ thống",
      back_admin: "Quay lại Bảng điều khiển Admin",
      posts_suffix: "bài viết",
      dark_mode: "Giao diện Tối",
      light_mode: "Giao diện Sáng",
      select_language: "Chọn ngôn ngữ",
      choose_lang_placeholder: "Chọn một ngôn ngữ...",
      language_code: "Mã ngôn ngữ",
      lang_code_placeholder: "Mã ngôn ngữ sẽ tự động sinh...",
      published_2h: "Đã đăng 2 giờ trước",
      published_3d: "Đã đăng 3 ngày trước",
      published_1d: "Đã đăng 1 ngày trước",
      published_5h: "Đã đăng 5 giờ trước",
      views: "Lượt xem",
      view: "Xem",
      password: "Mật khẩu",
      confirm_password: "Xác nhận mật khẩu",
      full_name: "Họ và tên",
      create_account: "Tạo tài khoản",
      register: "Đăng ký",
      dont_have_account: "Chưa có tài khoản?",
      already_have_account: "Đã có tài khoản?",
      quick_demo_login: "ĐĂNG NHẬP NHANH DEMO",
      quick_admin_login: "Đăng nhập nhanh với vai trò Admin",
      register_here: "Đăng ký tại đây",
      login_here: "Đăng nhập tại đây",
      post_list: "Danh sách bài viết",
      translated_articles: "Bài viết đã dịch:",
      make_primary: "Mặc định",
      danger_warning: "Cảnh báo Hủy diệt Dữ liệu",
      delete_lang_desc1: "Bạn đang chuẩn bị xóa toàn bộ ngôn ngữ ",
      delete_lang_desc2: "Việc này sẽ xóa sạch ",
      delete_lang_desc3: " bài viết đã được dịch. Hành động này không thể hoàn tác!",
      delete_lang_desc4: "Để tiếp tục, vui lòng gõ chính xác tên ngôn ngữ vào ô bên dưới:",
      type_lang_name: "Gõ tên ngôn ngữ...",
      cancel_safe: "Hủy bỏ an toàn",
      confirm_delete: "Đồng ý Xóa vĩnh viễn",
      user_details: "Chi tiết Người dùng",
      activity_info: "Hoạt động & Thông tin",
      joined_date: "Ngày tham gia",
      articles_published: "Bài viết đã xuất bản",
      joined: "Tham gia",
      views_over_time: "Lượt xem theo thời gian",
      top_languages: "Ngôn ngữ phổ biến",
      featured_posts: "Bài viết nổi bật",
      featured_posts_desc: "Xếp hạng bài gốc theo tổng lượt xem",
      lang_vi: "Tiếng Việt",
      lang_zh: "Tiếng Trung",
      lang_en: "Tiếng Anh",
      top_categories: "Danh mục phổ biến",
      cat_ai_auto: "Trí tuệ nhân tạo (AI)",
      cat_web_dev: "Lập trình Web",
      cat_ui_ux: "Thiết kế UI/UX",
      new_users_growth: "Tăng trưởng Người dùng",
      mon: "T2", tue: "T3", wed: "T4", thu: "T5", fri: "T6", sat: "T7", sun: "CN",
      post_ai_1: "Tương lai của Lập trình Tác tử AI năm 2026",
      post_ai_2: "Suy luận LLM thế hệ mới & Sử dụng Công cụ năm 2026",









      manage_subscriptions: "Quản lý theo dõi",
      subscriptions_desc: "Quản lý các tác giả bạn đang theo dõi và cài đặt thông báo.",
      search_creators_placeholder: "Tìm kiếm tác giả...",
      following_tab: "Đang theo dõi",
      discover_tab: "Khám phá",
      you_follow: "Bạn đang theo dõi",
      latest_from_following: "Mới nhất từ tác giả đang theo dõi",
      top: "Nổi bật",
      followers: "Người theo dõi",
      following: "Đang theo dõi",
      posts: "Bài viết",
      publications: "Chuyên mục",
      people: "Tác giả",
      showing_results_for: "Kết quả tìm kiếm cho ",
      no_results: "Không tìm thấy kết quả phù hợp.",
      sub_empty_title: "Bạn chưa theo dõi tác giả nào",
      sub_empty_desc: "Hãy khám phá những bài viết thú vị và theo dõi họ để không bỏ lỡ cập nhật mới nhất nhé!",
      sub_suggested_authors: "Gợi ý tác giả nổi bật",
      sub_tab_all: "Bài viết",
      sub_tab_manage: "Đang theo dõi",
      sub_search_placeholder: "Tìm trong bài viết đang theo dõi...",
      sub_filtering: "Đang lọc theo",
      sub_clear_filter: "Xóa lọc",
      sub_manage_search: "Tìm trong danh sách...",
      sub_sort_recent: "Mới theo dõi nhất",
      sub_sort_az: "Tên A-Z",
      sub_following_count: "Đang theo dõi {n} người",
      sub_new_posts_count: "{n} người có bài mới",
      sub_view_all: "Xem tất cả",
      sub_back_to_feed: "← Quay lại Feed",
      btn_follow: "Theo dõi",
      btn_following: "Đang theo dõi",
      btn_unfollow: "Bỏ theo dõi",

    },
    zh: {
      auth_modal_title: "登录 Lingora",
      auth_modal_subtitle: "第一次来这里？",
      auth_modal_register: "创建账户",
      auth_modal_login: "登录",
      btn_save: "保存",
      btn_saved: "已保存",
      btn_preview: "预览",
      btn_continue: "继续",
      btn_share: "分享",
      btn_done: "完成",
      link_create_title: "\u521b\u5efa\u94fe\u63a5",
      link_text_placeholder: "\u8f93\u5165\u663e\u793a\u6587\u5b57...",
      link_url_placeholder: "\u8f93\u5165 URL...",
      link_apply: "\u94fe\u63a5",
      link_change: "\u66f4\u6539",
      link_remove: "\u79fb\u9664",


      cat_tech: "科技",
      cat_life: "生活",
      cat_edu: "教育",
      cat_ent: "娱乐",
      cat_travel: "旅游",
      cat_food: "美食",
      cat_biz: "商业",
      cat_health: "健康",
      draft_save_prompt: "将此文章保存为草稿？",
      draft_discard_warn: "如果现在放弃，您将丢失此文章。",
      delete_draft: "删除草稿",
      save_as_draft: "保存为草稿",
      confirm_trash: "您要将此文章移到垃圾箱吗？",
      confirm_delete_permanent: "您确定要永久删除此文章吗？",
      publish_options: "发布选项",
      post_category: "文章分类",
      original_language: "源语言",
      allowed_translations: "允许的翻译",
      preview_translation: "预览翻译",
      publish_btn: "发布",

      on: "开启",
      off: "关闭",
      inactive: "关闭",
      home: "首页",

      liked_posts: "喜欢的文章",
      my_articles: "我的文章",
      about: "关于我们",
      profile: "个人资料",
      create: "发布",
      more: "更多",
      settings: "设置",
      admin_panel: "管理后台",
      security: "安全设置",
      change_password: "修改密码",
      password_description_short: "更新你的 Lingora 账户密码。",
      password_description_long: "更新你的 Lingora 账户密码。请使用你没有在其他地方使用过的强密码。",
      back_to_profile: "返回个人资料",
      current_password_label: "当前密码",
      new_password_label: "新密码",
      confirm_new_password_label: "确认新密码",
      password_min_hint: "至少使用 8 个字符。",
      update_password: "更新密码",
      password_min_error: "新密码至少需要 8 个字符。",
      password_same_error: "新密码必须不同于当前密码。",
      password_mismatch_error: "两次输入的新密码不一致。",
      password_success: "密码已成功更新。",
      sign_out: "退出登录",
      sign_out_success: "退出登录成功！",
      login: "登录",
      what_on_mind: "你想分享什么？",
      for_you: "推荐",
      cat_ai: "人工智能 (AI)",
      cat_backend: "后端工程",
      cat_design: "设计 (Design)",
      cat_frontend: "前端开发",
      cat_mobile: "移动开发",
      cat_data: "数据科学",
      cat_cyber: "网络安全",
      slug_ai: "ren-gong-zhi-neng",
      slug_backend: "hou-duan-gong-cheng",
      slug_design: "ui-ux-she-ji",
      search_placeholder: "搜索 Lingora...",
      subscriptions: "关注作者",
      join_creators: "在 Lingora 上连接创作者",
      recommended: "为你推荐",
      see_all: "查看全部",
      view_profile: "查看主页",
      subscribe: "关注",
      profile_see_subscribers: "查看订阅者",
      profile_edit_profile: "编辑个人资料",

      profile_edit_title: "编辑个人资料",
      profile_done: "完成",
      profile_name_label: "姓名",
      profile_handle_label: "用户名",
      profile_edit_handle: "编辑",
      profile_bio_label: "简介",
      profile_branding: "品牌",
      profile_branding_desc: "自定义你的个人资料外观。",
      profile_header_image: "头图",
      profile_header_drop: "将头图拖放到这里",
      profile_header_hint: "至少 1344x256px - 宽高比 3:2 到 21:4",
      profile_select_image: "选择图片",
      profile_accent_color: "强调色",
      profile_background_color: "背景色",
      profile_none: "无",
      // Settings page
      settings_title: "设置与偏好",
      settings_desc: "管理您的界面、显示语言和 Lingora 上的阅读偏好。",
      appearance_title: "外观与主题",
      appearance_desc: "选择适合您环境的明亮或黑暗主题，在阅读文章时保护您的视力。",
      theme_light: "明亮",
      theme_light_sub: "简洁整洁的白纸风格",
      theme_dark: "黑暗",
      theme_dark_sub: "在低光环境中舒适阅读",
      lang_title: "动态与界面语言",
      lang_desc: "选择您的默认语言。主页动态和界面将自动以您选择的语言显示。",
      pref_title: "阅读偏好",
      pref_desc: "自定义文章和多媒体内容在您的动态中的显示方式。",
      compact_view: "紧凑视图",
      compact_desc: "减小图片尺寸并增加动态中的文章密度。",
      autoplay: "自动播放媒体",
      autoplay_desc: "滚动时自动播放动图和短视频。",
      back_feed: "返回动态",
      auto_saved: "更改已自动保存",
      toast_theme_changed: "已切换到<b>{theme}</b>主题",
      toast_language_changed: "动态和界面语言已设置为<b>{language}</b>",
      toast_compact_on: "已开启紧凑视图",
      toast_compact_off: "已关闭紧凑视图",
      toast_autoplay_on: "已开启媒体自动播放",
      toast_autoplay_off: "已关闭媒体自动播放",
      show_subscribers: "显示订阅者",
      show_subscribers_desc: "允许其他人查看关注您的人的列表。",
      toast_show_subscribers_on: "订阅者可见性已开启",
      toast_show_subscribers_off: "订阅者可见性已关闭",
      show_following: "显示关注列表",
      show_following_desc: "允许其他人查看您关注的作者列表。",
      toast_show_following_on: "关注列表可见性已开启",
      toast_show_following_off: "关注列表可见性已关闭",
      // Post Detail page
      comments: "评论",
      comment_placeholder: "用任何语言写下你的评论...",
      post_comment: "发表评论",
      translate_comment: "翻译",
      show_original: "显示原文",
      related_posts: "相关文章",
      related_posts_in: "相关分类文章：",
      no_comments: "暂无评论。来发表第一条评论吧！",
      reply: "回复",
      cancel: "取消",
      submit_reply: "提交回复",
      replying_to: "回复 @",
      replying_to_comment: "回复 ",
      login_required_comment: "请先登录后再发表评论或回复！",
      please_enter_reply: "请输入回复内容！",
      please_enter_comment: "请输入评论内容！",
      edit: "编辑",
      delete: "删除",
      save: "保存",
      delete_confirm_root: "确定要删除此评论吗？所有子回复也将被一起删除！",
      delete_confirm_reply: "确定要删除此回复吗？",
      comment_edited: "(已编辑)",
      reset_demo: "恢复演示数据",
      my_posts_title: "我的文章",
      my_posts_desc: "管理草稿、已发布文章，以及 EN、VI、ZH 的 AI 翻译状态矩阵。",
      new_post: "新文章",
      all_posts: "全部文章",
      drafts: "草稿",
      published: "已发布",
      total_posts: "文章总数",
      translation_ready: "翻译已就绪",
      translations_attention: "需要处理",
      search_posts: "搜索你的文章...",
      status_label: "状态",
      title_label: "标题",
      original_language: "原始语言",
      ai_translation_matrix: "AI 翻译矩阵",
      updated: "更新于",
      reads: "阅读量",
      actions: "操作",
      open: "打开",
      restore: "恢复",
      status_draft: "草稿",
      status_published: "已发布",
      status_pending: "待审核",
      status_trash: "回收站",
      ai_status_ready: "已完成",
      ai_status_processing: "处理中",
      ai_status_missing: "缺失",
      ai_status_failed: "失败",
      no_posts_found: "没有符合您筛选条件的文章。",
      all_posts_tab: "全部",
      trash: "回收站",
      translated_language: "翻译语言",
      all_languages: "所有语言",
      english: "英语",
      vietnamese: "越南语",
      chinese: "中文",
      all_dates: "所有日期",
      all_categories: "所有类别",
      select_all: "全选",
      selected: "已选择",
      delete_selected: "删除所选",
      restore_selected: "恢复所选",
      cat_ai_translation: "AI翻译",
      cat_profile_branding: "个人资料品牌",
      cat_design_general: "设计",
      cat_analytics: "分析",
      cat_localization: "本地化",
      search_placeholder_modal: "搜索作者、文章或主题...",
      recommended_people: "作者与出版物",
      no_results: "未找到匹配的结果。",
      // Explore page
      explore: "探索",
      top: "热门",
      recent: "最新",
      posts: "文章",
      publications: "专栏与出版物",
      people: "创作者",
      subscribed: "已订阅",
      author_economics: "经济学作者",
      author_economics_lead: "经济学主管",
      author_tech_lead: "技术主管",
      featured_creators: "推荐作者",
      people_matching: "与 \"{query}\" 匹配的作者",
      publications_matching: "与 \"{query}\" 匹配的专栏",
      posts_matching: "与 \"{query}\" 匹配的文章",
      top_trending_posts: "热门趋势文章",
      suggestions: "搜索建议",
      // Admin Panel
      admin_dashboard: "管理后台",
      manage_users: "用户管理",
      manage_posts: "文章管理",
      manage_categories: "分类管理",
      manage_languages: "语言管理",
      total_users: "总用户数",
      total_articles: "总文章数",
      ai_translated: "AI 已翻译",
      total_comments: "总评论数",
      total_likes: "总点赞数",
      queue_status: "AI 翻译队列",
      user_management: "用户管理",
      category_management: "分类管理",
      language_management: "语言管理",
      search_user_placeholder: "按姓名或邮箱搜索用户...",
      search_cat_placeholder: "搜索分类...",
      add_category: "添加分类",
      edit_category: "编辑分类",
      category_name: "分类名称",
      slug: "别名 (Slug)",
      actions: "操作",
      status: "状态",
      role: "角色",
      active: "活跃",
      banned: "已封禁",
      save_changes: "保存更改",
      translation_coverage: "翻译覆盖率",
      admin_desc: "用户、文章、评论数量与社区互动指标总览。",
      col_article: "文章",
      col_author: "作者",
      col_source: "源语言",
      col_target: "目标语言",
      col_status: "状态",
      col_actions: "操作",
      status_translating: "翻译中...",
      status_completed: "已完成",
      status_failed: "失败",
      status_hidden: "已隐藏",
      user_desc: "查看用户目录，按角色过滤，并管理帐户状态。",
      col_user: "用户",
      col_email: "邮箱",
      col_joined: "加入时间",
      role_all: "所有角色",
      role_admin: "管理员",
      role_member: "成员",
      cat_desc: "创建、组织和编辑首页动态的文章分类。",
      col_posts_count: "总文章数",
      cat_name_placeholder: "输入分类名称...",
      slug_auto_placeholder: "别名将自动生成...",
      slug_help: "URL 将使用此别名进行分类路由。",
      lang_desc_page: "配置系统语言并监控 AI 自动翻译覆盖率。",
      add_language: "添加语言",
      col_code: "代码",
      col_lang_name: "语言名称",
      col_progress: "AI 翻译进度",
      primary_language: "主要语言",
      system_default: "系统默认",
      back_admin: "返回管理后台",
      posts_suffix: "篇文章",
      dark_mode: "深色模式",
      light_mode: "浅色模式",
      select_language: "选择语言",
      choose_lang_placeholder: "选择语言...",
      language_code: "语言代码",
      lang_code_placeholder: "系统将自动生成语言代码...",
      published_2h: "发布于 2 小时前",
      published_3d: "发布于 3 天前",
      published_1d: "发布于 1 天前",
      published_5h: "发布于 5 小时前",
      showing_results_for: "显示结果: ",
      views: "次阅读",
      view: "阅读",
      yesterday: "昨天",
      just_now: "刚刚",
      hours_ago: "小时前",
      days_ago: "天前",
      weeks_ago: "周前",
      months_ago: "个月前",
      password: "密码",
      confirm_password: "确认密码",
      full_name: "姓名",
      create_account: "创建账号",
      register: "注册",
      dont_have_account: "还没有账号？",
      already_have_account: "已有账号？",
      quick_demo_login: "快速测试登录",
      quick_admin_login: "以管理员身份快速登录",
      register_here: "点击注册",
      login_here: "点击登录",
      post_list: "文章列表",
      translated_articles: "已翻译文章：",
      make_primary: "设为默认",
      danger_warning: "数据销毁警告",
      delete_lang_desc1: "您即将删除整个语言 ",
      delete_lang_desc2: "这将永久删除 ",
      delete_lang_desc3: " 篇已翻译的文章。此操作无法撤销！",
      delete_lang_desc4: "要继续，请在下面的框中输入确切的语言名称：",
      type_lang_name: "输入语言名称...",
      cancel_safe: "安全取消",
      confirm_delete: "确认永久删除",
      user_details: "用户详情",
      activity_info: "活动与信息",
      joined_date: "加入日期",
      articles_published: "已发布文章",
      joined: "加入",
      views_over_time: "浏览量趋势",
      top_languages: "热门语言",
      featured_posts: "热门文章",
      featured_posts_desc: "按总浏览量对原始文章排名",
      lang_vi: "越南语",
      lang_zh: "中文",
      lang_en: "英语",
      top_categories: "热门分类",
      cat_ai_auto: "人工智能与自动化",
      cat_web_dev: "Web开发",
      cat_ui_ux: "UI/UX设计",
      new_users_growth: "新用户增长",
      mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日",
      post_ai_1: "2026 年 AI 代理编程的未来",
      post_ai_2: "2026 年下一代 LLM 推理与工具使用",


      manage_subscriptions: "管理订阅",
      subscriptions_desc: "管理您关注的创作者及其通知设置。",
      search_creators_placeholder: "搜索创作者...",
      following_tab: "关注中",
      discover_tab: "发现",
      you_follow: "您关注了",
      latest_from_following: "关注作者的最新发布",
      top: "热门",
      followers: "关注者",
      following: "正在关注",
      posts: "文章",
      publications: "专栏",
      people: "作者",
      showing_results_for: "搜索结果：",
      no_results: "未找到匹配项。",
      sub_empty_title: "您还未关注任何作者",
      sub_empty_desc: "探索精彩好文并关注作者，不错过最新动态！",
      sub_suggested_authors: "推荐关注作者",
      sub_tab_all: "文章",
      sub_tab_manage: "正在关注",
      sub_search_placeholder: "搜索已关注作者的文章...",
      sub_filtering: "正在筛选",
      sub_clear_filter: "清除筛选",
      sub_manage_search: "搜索列表...",
      sub_sort_recent: "最新关注",
      sub_sort_az: "姓名 A-Z",
      sub_following_count: "关注了 {n} 人",
      sub_new_posts_count: "{n} 人有新文章",
      sub_view_all: "查看全部",
      sub_back_to_feed: "← 返回动态",
      btn_follow: "关注",
      btn_following: "已关注",
      btn_unfollow: "取消关注",

    }
  };
  window.uiTranslations = uiTranslations;

  window.renderAdminPagination = function (container, currentPage, totalItems, pageSize = 8) {
    if (!container) return 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
    container.hidden = totalPages <= 1;
    if (totalPages <= 1) {
      container.innerHTML = '';
      return page;
    }
    const pages = [];
    for (let number = 1; number <= totalPages; number += 1) {
      if (number === 1 || number === totalPages || Math.abs(number - page) <= 1) pages.push(number);
    }
    const items = [];
    pages.forEach((number, index) => {
      if (index && number - pages[index - 1] > 1) items.push('<span class="admin-page-gap" aria-hidden="true">…</span>');
      items.push(`<button class="admin-page-btn${number === page ? ' is-active' : ''}" type="button" data-page="${number}" ${number === page ? 'aria-current="page"' : ''}>${number}</button>`);
    });
    container.innerHTML = `<button class="admin-page-btn" type="button" data-page="${page - 1}" aria-label="Previous page" ${page === 1 ? 'disabled' : ''}><i class="bi bi-chevron-left"></i></button>${items.join('')}<button class="admin-page-btn" type="button" data-page="${page + 1}" aria-label="Next page" ${page === totalPages ? 'disabled' : ''}><i class="bi bi-chevron-right"></i></button>`;
    return page;
  };

  window.showLingoraToast = function (message, options = {}) {
    document.querySelector('.lingora-app-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'lingora-app-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    const icon = document.createElement('i');
    icon.className = `bi ${options.icon || 'bi-check-circle-fill'}`;
    const text = document.createElement('span');
    text.textContent = String(message || '');
    toast.append(icon, text);
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    window.setTimeout(() => {
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.remove(), 220);
    }, options.duration || 1800);
  };

  window.formatTimestampI18n = function (ts) {
    if (!ts) return "";
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    if (currentLang === 'en') return ts;

    let str = ts.toString();
    if (currentLang === 'vi') {
      return str
        .replace(/Yesterday/i, "Hôm qua")
        .replace(/Just now/i, "Vừa xong")
        .replace(/hours ago/i, "giờ trước")
        .replace(/hour ago/i, "giờ trước")
        .replace(/days ago/i, "ngày trước")
        .replace(/day ago/i, "ngày trước")
        .replace(/weeks ago/i, "tuần trước")
        .replace(/week ago/i, "tuần trước")
        .replace(/months ago/i, "tháng trước")
        .replace(/month ago/i, "tháng trước")
        .replace(/years ago/i, "năm trước")
        .replace(/year ago/i, "năm trước")
        .replace(/min read/i, "phút đọc")
        .replace(/mins read/i, "phút đọc")
        .replace(/reads/i, "lượt xem")
        .replace(/read/i, "lượt xem");
    } else if (currentLang === 'zh') {
      return str
        .replace(/Yesterday/i, "昨天")
        .replace(/Just now/i, "刚刚")
        .replace(/hours ago/i, "小时前")
        .replace(/hour ago/i, "小时前")
        .replace(/days ago/i, "天前")
        .replace(/day ago/i, "天前")
        .replace(/weeks ago/i, "周前")
        .replace(/week ago/i, "周前")
        .replace(/months ago/i, "个月前")
        .replace(/month ago/i, "个月前")
        .replace(/years ago/i, "年前")
        .replace(/year ago/i, "年前")
        .replace(/min read/i, "分钟阅读")
        .replace(/mins read/i, "分钟阅读")
        .replace(/reads/i, "次阅读")
        .replace(/read/i, "次阅读");
    }
    return str;
  };

  // Map category English names to i18n dictionary keys
  const categoryKeyMap = {
    "artificial intelligence": "cat_ai",
    "backend engineering": "cat_backend",
    "design": "cat_design",
    "frontend development": "cat_frontend",
    "mobile development": "cat_mobile",
    "data science": "cat_data",
    "cybersecurity": "cat_cyber",
    "technology": "cat_tech",
    "tech": "cat_tech",
    "lifestyle": "cat_life",
    "education": "cat_edu",
    "entertainment": "cat_ent",
    "travel": "cat_travel",
    "food": "cat_food",
    "business": "cat_biz",
    "health": "cat_health"
  };

  window.translateCategory = function (category) {
    if (!category) return category;
    const currentLang = typeof window.getLingoraLanguage === 'function' ? window.getLingoraLanguage() : (localStorage.getItem('preferredLanguage') || 'en');
    try {
      const managedCategories = JSON.parse(localStorage.getItem('admin_categories_v2') || '[]');
      const normalizedCategory = String(category).trim().toLowerCase();
      const managedCategory = Array.isArray(managedCategories) ? managedCategories.find(item =>
        String(item.name || '').trim().toLowerCase() === normalizedCategory ||
        Object.values(item.translations || {}).some(translation => String(translation?.name || '').trim().toLowerCase() === normalizedCategory)
      ) : null;
      const managedTranslation = managedCategory?.translations?.[currentLang];
      if (managedTranslation?.name && !managedCategory?.deletedTranslations?.[currentLang]) return managedTranslation.name;
      // Once the admin catalog exists it is authoritative: a removed/hidden
      // category must not fall back to an English built-in label.
      if (Array.isArray(managedCategories) && managedCategories.length) return '';
    } catch (error) {
      // Fall back to the built-in category dictionary.
    }
    const key = categoryKeyMap[String(category).trim().toLowerCase()];
    if (!key) return category;
    const dict = (window.uiTranslations && window.uiTranslations[currentLang]) || (window.uiTranslations && window.uiTranslations.en) || {};
    const englishDict = (window.uiTranslations && window.uiTranslations.en) || {};
    return dict[key] || englishDict[key] || category;
  };

  window.isCategoryTranslationActive = function (categoryName, language = localStorage.getItem('preferredLanguage') || 'en') {
    try {
      const categories = JSON.parse(localStorage.getItem('admin_categories_v2') || '[]');
      if (!Array.isArray(categories) || !categories.length) return true;
      const normalizedName = String(categoryName || '').trim().toLowerCase();
      const category = categories.find(item => {
        if (String(item.name || '').trim().toLowerCase() === normalizedName) return true;
        return Object.values(item.translations || {}).some(translation =>
          String(translation?.name || '').trim().toLowerCase() === normalizedName
        );
      });
      if (!category) return false;
      const translation = category.translations?.[language];
      const activeValue = translation?.active;
      const categoryActive = category.active;
      return Boolean(
        translation &&
        !category.deletedTranslations?.[language] &&
        categoryActive !== false &&
        categoryActive !== 'false' &&
        categoryActive !== 0 &&
        categoryActive !== '0' &&
        activeValue !== false &&
        activeValue !== 'false' &&
        activeValue !== 0 &&
        activeValue !== '0'
      );
    } catch (error) {
      return true;
    }
  };

  function syncFeedCategoryMenu() {
    const lang = typeof window.getLingoraLanguage === 'function' ? window.getLingoraLanguage() : (localStorage.getItem('preferredLanguage') || 'en');
    const menu = document.querySelector('.feed-filter-row .dropdown-menu');
    if (!menu) return;

    let managedCategories = [];
    try {
      const stored = JSON.parse(localStorage.getItem('admin_categories_v2') || '[]');
      managedCategories = Array.isArray(stored) ? stored : [];
    } catch (error) {
      managedCategories = [];
    }

    if (managedCategories.length) {
      menu.querySelectorAll('[data-feed-category]').forEach(item => item.closest('li')?.remove());
      managedCategories.forEach(category => {
        const canonicalName = category.name || category.id || '';
        const translation = category.translations?.[lang];
        if (!canonicalName || !translation || !window.isCategoryTranslationActive(canonicalName, lang)) return;

        const listItem = document.createElement('li');
        const link = document.createElement('a');
        const label = document.createElement('span');
        link.className = `dropdown-item${canonicalName === window.currentSelectedCategory ? ' active' : ''}`;
        link.href = '#';
        link.setAttribute('data-feed-category', canonicalName);
        link.setAttribute('aria-disabled', 'false');
        label.textContent = translation.name || canonicalName;
        link.appendChild(label);
        link.addEventListener('click', event => selectCategory(event, canonicalName));
        listItem.appendChild(link);
        menu.appendChild(listItem);
      });
    }

    const categoryItems = menu.querySelectorAll('[data-feed-category]');

    let selectedCategoryIsActive = window.currentSelectedCategory === 'all';
    categoryItems.forEach(item => {
      const category = item.getAttribute('data-feed-category') || '';
      const isActive = window.isCategoryTranslationActive(category, lang);
      const itemLabel = item.querySelector('span');
      if (itemLabel) itemLabel.textContent = window.translateCategory(category);
      const listItem = item.closest('li');
      if (listItem) listItem.hidden = !isActive;
      item.classList.toggle('disabled', !isActive);
      item.setAttribute('aria-disabled', String(!isActive));
      if (category === window.currentSelectedCategory && isActive) selectedCategoryIsActive = true;
    });

    const selectedLabel = document.getElementById('currentCategoryLabel');
    if (selectedLabel) {
      if (window.currentSelectedCategory === 'all') {
        selectedLabel.setAttribute('data-i18n', 'for_you');
        const dict = uiTranslations[lang] || uiTranslations.en;
        selectedLabel.textContent = dict.for_you || 'For you';
      } else {
        selectedLabel.removeAttribute('data-i18n');
        selectedLabel.textContent = window.translateCategory(window.currentSelectedCategory, lang);
      }
    }

    if (!selectedCategoryIsActive) {
      window.currentSelectedCategory = 'all';
      document.querySelectorAll('.feed-filter-row .dropdown-item').forEach(item => item.classList.remove('active'));
      const allItem = document.querySelector('.feed-filter-row .dropdown-item:not([data-feed-category])');
      if (allItem) allItem.classList.add('active');
      const label = document.getElementById('currentCategoryLabel');
      if (label) {
        label.setAttribute('data-i18n', 'for_you');
        const dict = uiTranslations[lang] || uiTranslations.en;
        label.textContent = dict.for_you || 'For you';
      }
      if (typeof window.renderFeedPosts === 'function') {
        window.renderFeedPosts('postsFeedContainer', window.getLingoraPostsData ? window.getLingoraPostsData() : window.globalPostsData, 'all');
      }
    }
  }

  window.syncFeedCategoryMenu = syncFeedCategoryMenu;

  function refreshPublicCategoryState() {
    const language = localStorage.getItem('preferredLanguage') || 'en';
    syncFeedCategoryMenu(language);
    applyLanguageFilter(language);
  }

  window.addEventListener('pageshow', refreshPublicCategoryState);
  window.addEventListener('storage', event => {
    if (event.key === 'admin_categories_v2') refreshPublicCategoryState();
  });


  window.applyUiTranslations = applyUiTranslations;

  function applyUiTranslations() {
    const lang = typeof window.getLingoraLanguage === 'function' ? window.getLingoraLanguage() : (localStorage.getItem('preferredLanguage') || 'en');
    const dict = uiTranslations[lang] || uiTranslations.en;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.setAttribute('placeholder', dict[key]);
        } else {
          el.textContent = dict[key];
        }
      }
    });

    const sidebarCurrentLang = document.getElementById('sidebarCurrentLang');
    if (sidebarCurrentLang) sidebarCurrentLang.textContent = lang.toUpperCase();
    const mobileCurrentLang = document.getElementById('mobileCurrentLang');
    if (mobileCurrentLang) mobileCurrentLang.textContent = lang.toUpperCase();
    const currentLangLabel = document.getElementById('currentLangLabel');
    if (currentLangLabel) currentLangLabel.textContent = lang.toUpperCase();

    // Translate dynamic titles in any list items (such as the admin queue)
    document.querySelectorAll('[data-translate-title-vi], [data-translate-title-zh]').forEach(el => {
      const originalText = el.getAttribute('data-original-title') || el.textContent.trim();
      if (!el.getAttribute('data-original-title')) {
        el.setAttribute('data-original-title', originalText);
      }
      const transText = el.getAttribute(`data-translate-title-${lang}`);
      if (transText) {
        el.textContent = transText;
      } else {
        el.textContent = el.getAttribute('data-original-title');
      }
    });

    // Translate dynamic content
    document.querySelectorAll('[data-translate-content-vi], [data-translate-content-zh]').forEach(el => {
      const isRichPostContent = el.classList.contains('post-content');
      const originalText = el.getAttribute('data-original-content') ||
        (isRichPostContent ? el.innerHTML.trim() : el.textContent.trim());
      if (!el.getAttribute('data-original-content')) {
        el.setAttribute('data-original-content', originalText);
      }
      const transText = el.getAttribute(`data-translate-content-${lang}`);
      if (transText) {
        if (isRichPostContent) {
          el.innerHTML = window.sanitizePostHtml(transText);
        } else {
          el.textContent = transText;
        }
      } else {
        const originalContent = el.getAttribute('data-original-content');
        if (isRichPostContent) {
          el.innerHTML = window.sanitizePostHtml(originalContent);
        } else {
          el.textContent = originalContent;
        }
      }
    });

    // Translate timestamps across the page
    document.querySelectorAll('.post-timestamp, .comment-time, .article-time, [data-timestamp]').forEach(el => {
      const origTs = el.getAttribute('data-original-ts') || el.textContent.trim();
      if (!el.getAttribute('data-original-ts')) {
        el.setAttribute('data-original-ts', origTs);
      }
      if (typeof window.formatTimestampI18n === 'function') {
        el.innerHTML = window.formatTimestampI18n(origTs);
      }
    });

    // Translate category labels dynamically
    document.querySelectorAll('.category-label[data-original-cat]').forEach(el => {
      const originalCat = el.getAttribute('data-original-cat');
      if (typeof window.translateCategory === 'function') {
        const translatedCategory = window.translateCategory(originalCat);
        const keepVisible = el.dataset.keepCategoryVisible === 'true';
        const fallbackCategory = el.dataset.categoryFallback || originalCat;
        el.textContent = translatedCategory || (keepVisible ? fallbackCategory : '');
        el.classList.toggle('d-none', !translatedCategory && !keepVisible);
      }
    });

    const searchInput = document.getElementById('feedSearchInput') || document.querySelector('.right-search-box input');
    if (searchInput && dict.search_placeholder) {
      searchInput.setAttribute('placeholder', dict.search_placeholder);
    }

    // NOTE: Page-specific re-renders (renderSubscriptionsPage, renderComments,
    // renderTrendingWidgets, renderExploreResults) are intentionally NOT called here.
    // They were causing cascading double-renders on every interaction.
    // Instead, they are triggered only from language-switch event handlers that
    // need a full page re-render after translations are applied.

    // Sync comment counts only when feed posts exist on the page
    if (typeof syncFeedCommentCounts === 'function' && document.querySelector('.substack-post')) {
      syncFeedCommentCounts();
    }

    // Automatically update all subscribe / following buttons based on their .subscribed class state
    document.querySelectorAll('.btn-subscribe').forEach(btn => {
      const isSubbed = btn.classList.contains('subscribed');
      if (isSubbed) {
        const followingText = dict.btn_following || dict.following || 'Following';
        btn.innerHTML = `<span class="btn-subscribe-label">${followingText}</span>`;
        btn.setAttribute('data-unfollow-label', dict.btn_unfollow || 'Unfollow');
      } else {
        const isAuthorCard = btn.classList.contains('px-5') || btn.getAttribute('data-btn-type') === 'author';
        const followText = isAuthorCard
          ? (dict.subscribe_author || dict.btn_follow || 'Follow')
          : (dict.btn_follow || dict.subscribe || 'Follow');
        btn.innerHTML = `<span class="btn-subscribe-label">${followText}</span>`;
        btn.removeAttribute('data-unfollow-label');
      }
    });
  }

  window.currentSelectedCategory = 'all';

  function selectCategory(event, category, i18nKey) {
    if (event) event.preventDefault();
    window.currentSelectedCategory = category;

    const label = document.getElementById('currentCategoryLabel');
    if (label) {
      if (i18nKey) {
        label.setAttribute('data-i18n', i18nKey);
        const lang = localStorage.getItem('preferredLanguage') || 'en';
        const dict = uiTranslations[lang] || uiTranslations.en;
        if (dict[i18nKey]) label.textContent = dict[i18nKey];
      } else {
        label.removeAttribute('data-i18n');
        label.textContent = typeof window.translateCategory === 'function' ? window.translateCategory(category) : category;
      }
    }

    document.querySelectorAll('.feed-filter-row .dropdown-item').forEach(el => el.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    if (typeof window.renderFeedPosts === 'function') {
      const posts = window.getLingoraPostsData ? window.getLingoraPostsData() : window.globalPostsData;
      window.renderFeedPosts('postsFeedContainer', posts, category);
    }

    const lang = localStorage.getItem('preferredLanguage') || 'en';
    applyLanguageFilter(lang);
  }

  function applyLanguageFilter() {
    const lang = typeof window.getLingoraLanguage === 'function' ? window.getLingoraLanguage() : (localStorage.getItem('preferredLanguage') || 'en');
    const posts = document.querySelectorAll('.substack-post');
    if (!posts || posts.length === 0) return;

    if (typeof syncFeedCommentCounts === 'function') {
      syncFeedCommentCounts();
    }

    console.log(`Applying Feed Language Filter: ${lang.toUpperCase()}`);
    const selectedCategory = window.currentSelectedCategory || 'all';
    const isPostDetailPage = window.location.pathname.toLowerCase().includes('post-detail.html') || document.getElementById('postDetailContainer') !== null;

    posts.forEach(post => {
      const supportedLangs = post.getAttribute('data-supported-langs') || '';
      const titleEl = post.querySelector('.post-title');
      const contentEl = post.querySelector('.post-content');

      const hasTranslation = supportedLangs.split(',').includes(lang) ||
        post.hasAttribute(`data-translate-title-${lang}`) ||
        (titleEl && titleEl.hasAttribute(`data-translate-title-${lang}`));

      const postCategory = post.getAttribute('data-category') || '';
      const isPostDetail = Boolean(document.getElementById('postDetailContainer'));
      const includesInactiveCategory = post.getAttribute('data-include-inactive-category') === 'true';
      const categoryIsActive = isPostDetail || includesInactiveCategory || window.isCategoryTranslationActive(postCategory, lang);
      const matchesCategory = categoryIsActive && ((selectedCategory === 'all') || (postCategory === selectedCategory));

      if (isPostDetailPage) {
        // Trên trang chi tiết bài viết, KHÔNG BAO GIỜ ẩn bài viết chính theo bộ lọc danh mục
        post.classList.remove('d-none');
        if (titleEl) {
          const transTitle = titleEl.getAttribute(`data-translate-title-${lang}`) || post.getAttribute(`data-translate-title-${lang}`);
          if (transTitle) titleEl.textContent = transTitle;
        }
        if (contentEl) {
          const transContent = contentEl.getAttribute(`data-translate-content-${lang}`) || post.getAttribute(`data-translate-content-${lang}`);
          if (transContent) contentEl.textContent = transContent;
        }
      } else if (hasTranslation && matchesCategory) {
        // 1. Nếu bài viết hỗ trợ ngôn ngữ được chọn và khớp danh mục -> Hiển thị
        post.classList.remove('d-none');

        if (titleEl) {
          const transTitle = titleEl.getAttribute(`data-translate-title-${lang}`) || post.getAttribute(`data-translate-title-${lang}`);
          if (transTitle) titleEl.textContent = transTitle;
        }
        if (contentEl) {
          const transContent = contentEl.getAttribute(`data-translate-content-${lang}`) || post.getAttribute(`data-translate-content-${lang}`);
          if (transContent) contentEl.innerHTML = window.sanitizePostHtml(transContent);
        }
      } else {
        // 2. Nếu KHÔNG hỗ trợ hoặc không khớp danh mục -> Ẩn bài viết đi
        post.classList.add('d-none');
      }
    });

    // Translate Related Posts on post-detail.html if any
    document.querySelectorAll('.related-post-card').forEach(card => {
      const titleEl = card.querySelector('h5');
      if (titleEl) {
        const transTitle = titleEl.getAttribute(`data-translate-title-${lang}`) || card.getAttribute(`data-translate-title-${lang}`);
        if (transTitle) titleEl.textContent = transTitle;
      }
      const catEl = card.querySelector('.category-label');
      if (catEl && typeof window.translateCategory === 'function') {
        const origCat = catEl.getAttribute('data-original-cat') || catEl.textContent;
        catEl.textContent = window.translateCategory(origCat);
      }
    });
  }

  // ==========================================
  // MULTILINGUAL COMMENTS DATABASE & HELPERS
  // ==========================================
  const defaultCommentsDatabase = {
    1: [
      {
        id: 1,
        author: "Minh Khang",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=40&h=40",
        time: "2 hours ago",
        content: "Great insights! This really changed how I approach full-stack architecture and engineering workflows. Highly recommended!",
        lang: "en",
        translations: {
          vi: "Góc nhìn rất tuyệt vời! Điều này thực sự đã thay đổi cách tôi tiếp cận kiến trúc full-stack và quy trình kỹ thuật. Rất đáng xem!",
          zh: "极好的见解！这确实改变了我处理全栈架构和工程工作流的方式。强烈推荐！"
        },
        replies: [
          {
            id: 101,
            author: "Hải Đăng",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=40&h=40",
            time: "1 hour ago",
            content: "Mình hoàn toàn đồng ý! Kiến trúc này giúp giảm đáng kể thời gian xử lý và tải trang.",
            lang: "vi",
            replyTo: "",
            translations: {
              en: "I completely agree! This architecture significantly reduces processing and page load times.",
              zh: "我完全同意！这种架构极大地缩短了处理和页面加载时间。"
            }
          },
          {
            id: 102,
            author: "Li Wei (李伟)",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=40&h=40",
            time: "30 mins ago",
            content: "非常同意！我们在生产环境中也采用了这种处理模式，效果很好。",
            lang: "zh",
            replyTo: "Hải Đăng",
            translations: {
              en: "Strongly agree! We also adopted this processing model in our production environment, and the results are great.",
              vi: "Hoàn toàn đồng ý! Chúng tôi cũng đã áp dụng mô hình xử lý này trong môi trường thực tế, hiệu quả rất tốt."
            }
          }
        ]
      },
      {
        id: 4,
        author: "Hồ Quốc Tuấn",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=40&h=40",
        time: "30 mins ago",
        content: "Kiến trúc này thực sự giúp tối ưu hóa hiệu năng rất tốt. Mình đã thử nghiệm trên dự án thực tế và thấy tốc độ cải thiện đáng kể!",
        lang: "vi",
        translations: {
          en: "This architecture really helps optimize performance very well. I tested it on a real project and saw a significant improvement in speed!",
          zh: "这种架构的确实有助于很好地优化性能。我在真实项目中做了测试，发现速度有了显著提高！"
        },
        replies: [
          {
            id: 401,
            author: "Elena Rostova",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=40&h=40",
            time: "15 mins ago",
            content: "That is awesome to hear, Tuấn! What database load did you test it with?",
            lang: "en",
            replyTo: "",
            translations: {
              vi: "Thật tuyệt vời khi nghe điều đó, Tuấn! Bạn đã kiểm thử với tải cơ sở dữ liệu bao nhiêu?",
              zh: "太棒了，Tuấn！你使用的是多大的数据库负载进行测试的？"
            }
          },
          {
            id: 402,
            author: "Hồ Quốc Tuấn",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=40&h=40",
            time: "5 mins ago",
            content: "Mình test với khoảng 1 triệu record trong database, tốc độ truy vấn vẫn dưới 10ms nhé!",
            lang: "vi",
            replyTo: "Elena Rostova",
            translations: {
              en: "I tested with about 1 million records in the database, query speed remained under 10ms!",
              zh: "我测试了大约100万条数据库记录，查询速度仍然保持在10毫秒以下！"
            }
          }
        ]
      },
      {
        id: 2,
        author: "Elena Rostova",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=40&h=40",
        time: "3 hours ago",
        content: "Cảm ơn tác giả đã chia sẻ bài viết rất hữu ích! Bạn có thể nói rõ hơn về phần tối ưu hóa hiệu năng khi scale lớn không?",
        lang: "vi",
        translations: {
          en: "Thank you author for sharing such a useful article! Could you elaborate on performance optimization when scaling up?",
          zh: "感谢作者分享如此有用的文章！您能详细阐述一下在大规模扩展时的性能优化吗？"
        },
        replies: []
      },
      {
        id: 3,
        author: "Chen Bo (陈博)",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=40&h=40",
        time: "5 hours ago",
        content: "这篇文章很有深度，特别喜欢关于微服务和数据库同步的解释。赞！",
        lang: "zh",
        translations: {
          en: "This article has great depth, especially loved the explanation about microservices and database synchronization. Kudos!",
          vi: "Bài viết này rất có chiều sâu, đặc biệt thích phần giải thích về microservices và đồng bộ hóa cơ sở dữ liệu. Tuyệt vời!"
        },
        replies: []
      }
    ],
    3: [
      {
        id: 301,
        author: "Elena Rostova",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=40&h=40",
        time: "2 hours ago",
        content: "Bài viết về Glassmorphism này quá đẹp và trực quan! Cảm ơn Tuấn đã chia sẻ.",
        lang: "vi",
        translations: {
          en: "This Glassmorphism article is so beautiful and intuitive! Thanks Tuấn for sharing.",
          zh: "这篇关于毛玻璃特效的文章太美观直观了！感谢Tuấn的分享。"
        },
        replies: [
          {
            id: 3011,
            author: "Minh Khang",
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=40&h=40",
            time: "1 hour ago",
            content: "Đúng vậy, mình áp dụng nguyên tắc số 4 và thấy UI cải thiện rõ rệt.",
            lang: "vi",
            replyTo: "",
            translations: {
              en: "Exactly, I applied principle #4 and saw clear UI improvement.",
              zh: "没错，我应用了原则#4，UI提升明显。"
            }
          },
          {
            id: 3012,
            author: "Hồ Quốc Tuấn",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=40&h=40",
            time: "30 mins ago",
            content: "Cảm ơn hai bạn rất nhiều! Nếu cần hỗ trợ thêm về phần shadow thì cứ nhắn mình nhé.",
            lang: "vi",
            replyTo: "Minh Khang",
            translations: {
              en: "Thank you both so much! If you need help with shadows, let me know.",
              zh: "非常感谢你们！如果需要关于阴影的帮助请告诉我。"
            }
          }
        ]
      },
      {
        id: 302,
        author: "Sarah Connor",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=40&h=40",
        time: "3 hours ago",
        content: "Great explanation of multi-layered interfaces and background blur balancing!",
        lang: "en",
        translations: {
          vi: "Giải thích rất tuyệt vời về giao diện nhiều lớp và cân bằng độ mờ nền!",
          zh: "关于多层界面和背景模糊平衡的解释特别棒！"
        },
        replies: []
      },
      {
        id: 303,
        author: "Hồ Quốc Tuấn",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=40&h=40",
        time: "4 hours ago",
        content: "Hy vọng bài viết này sẽ giúp ích cho các dự án sắp tới của mọi người!",
        lang: "vi",
        translations: {
          en: "Hope this article helps with everyone's upcoming projects!",
          zh: "希望这篇文章对大家接下来的项目有所帮助！"
        },
        replies: []
      }
    ]
  };

  function getCommentsForPost(postId) {
    let db = null;
    try {
      db = JSON.parse(localStorage.getItem('mundi_comments_db') || 'null');
    } catch (error) {
      db = null;
    }
    if (!db || db._version !== 3) {
      db = JSON.parse(JSON.stringify(defaultCommentsDatabase));
      db._version = 3;
      localStorage.setItem('mundi_comments_db', JSON.stringify(db));
    }

    // Older builds could leave a truthy non-array value at a post key. That
    // value passed the old existence check and later crashed on `.forEach()`;
    // resetting demo data only appeared to fix it because it removed the key.
    if (Object.prototype.hasOwnProperty.call(db, postId) && !Array.isArray(db[postId])) {
      delete db[postId];
    }

    // Don't auto-generate sample comments for user-submitted posts.
    const submittedPostId = new URLSearchParams(window.location.search).get('submitted');
    const isSubmittedPost = String(submittedPostId || '') === String(postId)
      || String(postId).startsWith('pending-')
      || String(postId).startsWith('submitted-');
    if (!db[postId] && isSubmittedPost) {
      db[postId] = [];
      localStorage.setItem('mundi_comments_db', JSON.stringify(db));
    }

    if (!db[postId]) {
      db[postId] = [
        {
          id: Date.now() + 1,
          author: "Tuấn Hưng",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=40&h=40",
          time: "1 hour ago",
          content: "Bài viết rất chất lượng và chi tiết! Cảm ơn tác giả.",
          lang: "vi",
          translations: {
            en: "Very high quality and detailed article! Thank you author.",
            zh: "非常高质量和详细的文章！感谢作者。"
          },
          replies: []
        },
        {
          id: Date.now() + 2,
          author: "Sarah Jenkins",
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=40&h=40",
          time: "2 hours ago",
          content: "Really clear explanation and awesome design aesthetics. Keep writing!",
          lang: "en",
          translations: {
            vi: "Giải thích rất rõ ràng và thẩm mỹ thiết kế tuyệt vời. Hãy tiếp tục viết nhé!",
            zh: "解释得很清楚，设计美学也很棒。继续写作吧！"
          },
          replies: []
        }
      ];
      localStorage.setItem('mundi_comments_db', JSON.stringify(db));
    }


    // Repair malformed individual comments/replies without discarding the
    // user's valid comments for this or any other post.
    let repaired = false;
    db[postId] = db[postId].filter(comment => {
      const valid = comment && typeof comment === 'object' && !Array.isArray(comment);
      if (!valid) repaired = true;
      return valid;
    }).map(comment => {
      if (!Array.isArray(comment.replies)) {
        comment.replies = [];
        repaired = true;
      } else {
        const validReplies = comment.replies.filter(reply => reply && typeof reply === 'object' && !Array.isArray(reply));
        if (validReplies.length !== comment.replies.length) repaired = true;
        comment.replies = validReplies;
      }
      return comment;
    });
    if (repaired) localStorage.setItem('mundi_comments_db', JSON.stringify(db));
    return db[postId];
  }

  function ensureCommentsLikesInitialized(comments) {
    let modified = false;
    comments.forEach(root => {
      if (typeof root.likes === 'undefined') { root.likes = Math.floor(Math.random() * 15) + 2; modified = true; }
      if (typeof root.isLiked === 'undefined') { root.isLiked = false; modified = true; }
      if (root.replies) {
        root.replies.forEach(rep => {
          if (typeof rep.likes === 'undefined') { rep.likes = Math.floor(Math.random() * 8) + 1; modified = true; }
          if (typeof rep.isLiked === 'undefined') { rep.isLiked = false; modified = true; }
        });
      }
    });
    return modified;
  }

  function saveCommentsForPost(postId, comments) {
    let db = null;
    try {
      db = JSON.parse(localStorage.getItem('mundi_comments_db') || 'null');
    } catch (error) {
      db = null;
    }
    if (!db || typeof db !== 'object') {
      db = JSON.parse(JSON.stringify(defaultCommentsDatabase));
      db._version = 3;
    }
    db[postId] = Array.isArray(comments) ? comments : [];
    localStorage.setItem('mundi_comments_db', JSON.stringify(db));
  }

  function getCommentTranslation(comment, targetLang) {
    if (comment.translations && comment.translations[targetLang]) {
      return comment.translations[targetLang];
    }
    if (targetLang === 'vi') return "[Bản dịch Tiếng Việt]: " + comment.content;
    if (targetLang === 'zh') return "[中文翻译]: " + comment.content;
    return "[English Translation]: " + comment.content;
  }

  function syncFeedCommentCounts() {
    const posts = document.querySelectorAll('.substack-post');
    if (!posts.length) return;

    // Parse localStorage ONCE for all posts instead of per-post
    let db;
    try {
      db = JSON.parse(localStorage.getItem('mundi_comments_db'));
    } catch (e) { db = null; }
    if (!db || db._version !== 3) {
      db = JSON.parse(JSON.stringify(defaultCommentsDatabase));
      db._version = 3;
      localStorage.setItem('mundi_comments_db', JSON.stringify(db));
    }

    posts.forEach(post => {
      const linkEl = post.querySelector('a[href*="post-detail.html?"]');
      if (!linkEl) return;
      const href = linkEl.getAttribute('href');
      let postId = '';
      try {
        const params = new URL(href, window.location.href).searchParams;
        postId = params.get('submitted') || params.get('id') || '';
      } catch (error) { }
      if (postId) {
        const comments = Array.isArray(db[postId]) ? db[postId] : getCommentsForPost(postId);
        let totalCount = 0;
        comments.forEach(c => {
          totalCount += 1 + (c.replies ? c.replies.length : 0);
        });
        const chatBtnSpan = post.querySelector('.footer-action-item i.bi-chat')?.nextElementSibling;
        if (chatBtnSpan) {
          chatBtnSpan.textContent = totalCount;
        }
      }
    });
  }

  // ==========================================
  // MULTILINGUAL COMMENTS ENGINE (CENTRALLY MANAGED)
  // ==========================================
  function showAuthRequiredModal(redirectUrl) {
    let modalEl = document.getElementById('authRequiredModal');
    
    // Setup translations based on current preferred language
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (window.uiTranslations && window.uiTranslations[currentLang]) || (window.uiTranslations && window.uiTranslations.en) || {};
    const flagMap = { 'en': 'gb', 'vi': 'vn', 'zh': 'cn' };
    const currentFlag = flagMap[currentLang] || 'gb';
    
    const targetUrl = redirectUrl || encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    
    if (!modalEl) {
      const modalHtml = `
        <div class="modal fade" id="authRequiredModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered" style="max-width: 440px;">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden p-3 p-sm-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div class="dropdown">
                  <button class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 shadow-none rounded-pill" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="border: none;">
                    <img id="authModalLangFlag" src="https://flagcdn.com/w20/${currentFlag}.png" width="18" alt="Language">
                    <i class="bi bi-chevron-down" style="font-size: 0.75rem;"></i>
                  </button>
                  <ul class="dropdown-menu shadow-sm" style="min-width: 120px; font-size: 0.9rem;">
                    <li><a class="dropdown-item global-lang-select" href="#" data-lang="en"><img src="https://flagcdn.com/w20/gb.png" width="18" class="me-2" alt="">English</a></li>
                    <li><a class="dropdown-item global-lang-select" href="#" data-lang="vi"><img src="https://flagcdn.com/w20/vn.png" width="18" class="me-2" alt="">Tiếng Việt</a></li>
                    <li><a class="dropdown-item global-lang-select" href="#" data-lang="zh"><img src="https://flagcdn.com/w20/cn.png" width="18" class="me-2" alt="">中文</a></li>
                  </ul>
                </div>
                <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close" style="font-size: 0.85rem;"></button>
              </div>
              <div class="modal-body text-center p-0">
                <div class="d-inline-flex align-items-center justify-content-center rounded-3 mb-4" style="width: 56px; height: 56px; background-color: transparent; border: none;">
                  <img src="${window.location.pathname.includes('/admin/') ? '../' : ''}assets/images/lingora-mark.svg" width="48" height="48" alt="Lingora Logo">
                </div>
                <h4 class="fw-bold text-main mb-2" id="authRequiredTitle" data-i18n="auth_modal_title">${dict.auth_modal_title || 'Sign in to Lingora'}</h4>
                <p class="text-secondary mb-4" style="font-size: 0.95rem;">
                  <span id="authRequiredSubtitle" data-i18n="auth_modal_subtitle">${dict.auth_modal_subtitle || 'First time here?'}</span> <a href="register.html?redirect=${targetUrl}" id="authRequiredRegisterBtn" class="text-decoration-none fw-medium" data-i18n="auth_modal_register" style="color: var(--primary-color, #ff6c1f);">${dict.auth_modal_register || 'Create account'}</a>
                </p>
                <div class="d-grid gap-3 mb-3">
                  <a href="login.html?redirect=${targetUrl}" id="authRequiredLoginBtn" class="btn btn-primary fw-bold py-2" data-i18n="auth_modal_login" style="border-radius: 8px; font-size: 1rem;">${dict.auth_modal_login || 'Sign in'}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modalEl = document.getElementById('authRequiredModal');
    } else {
      // Update text in existing modal
      const titleEl = document.getElementById('authRequiredTitle');
      if (titleEl) titleEl.textContent = dict.auth_modal_title || 'Sign in to Lingora';
      
      const subtitleEl = document.getElementById('authRequiredSubtitle');
      if (subtitleEl) subtitleEl.textContent = dict.auth_modal_subtitle || 'First time here?';
      
      const registerEl = document.getElementById('authRequiredRegisterBtn');
      if (registerEl) {
        registerEl.textContent = dict.auth_modal_register || 'Create account';
        registerEl.href = `register.html?redirect=${targetUrl}`;
      }
      
      const loginEl = document.getElementById('authRequiredLoginBtn');
      if (loginEl) {
        loginEl.textContent = dict.auth_modal_login || 'Sign in';
        loginEl.href = `login.html?redirect=${targetUrl}`;
      }
    }
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }

  function checkAuthOrSimulate(redirectUrl) {
    let currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      showAuthRequiredModal(redirectUrl);
      return null;
    }
    const fallbackAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=40&h=40";
    try {
      const parsed = JSON.parse(currentUserStr);
      if (parsed && typeof parsed === 'object') {
        let savedProfile = {};
        try {
          savedProfile = JSON.parse(localStorage.getItem('mundiBlogProfile') || '{}') || {};
        } catch (error) { }
        return {
          name: parsed.name || parsed.displayName || savedProfile.displayName || parsed.username || 'Lingora user',
          avatar: savedProfile.avatar || parsed.avatar || fallbackAvatar
        };
      }
      if (typeof parsed === 'string' && parsed.trim()) return { name: parsed.trim(), avatar: fallbackAvatar };
    } catch (error) { }
    return { name: currentUserStr.trim() || 'Lingora user', avatar: fallbackAvatar };
  }

  // Intercept protected routes for unauthenticated users
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (href.includes('login.html') || href.includes('register.html')) return;
    
    const isProtected = 
      href.includes('my-posts.html') || 
      href.includes('create-post.html') || 
      href.includes('settings.html') || 
      href.includes('subscriptions.html') ||
      (href.includes('profile.html') && !href.includes('id=') && !href.includes('author='));
      
    if (isProtected) {
      if (typeof window.checkAuthOrSimulate === 'function') {
        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) {
          e.preventDefault();
          window.checkAuthOrSimulate(encodeURIComponent(href));
        }
      }
    }
  });

  function getCurrentPostCommentId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('submitted') || urlParams.get('id') || '1';
  }

  function parseUserName(userStr) {
    if (!userStr) return '';
    if (typeof userStr === 'string' && userStr.startsWith('{')) {
      try { return JSON.parse(userStr).name || userStr; } catch (e) { }
    }
    return userStr;
  }

  function escapeCommentHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function normalizeAuthorName(value) {
    return parseUserName(value || '').trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function isSelfAuthor(authorName) {
    if (!authorName) return false;
    const cleanAuthor = normalizeAuthorName(authorName);
    const cleanCurrent = normalizeAuthorName(localStorage.getItem('currentUser') || '');
    return Boolean(cleanCurrent) && cleanAuthor === cleanCurrent;
  }

  function getAuthorProfileHref(authorName, authorAvatar) {
    if (!authorName) return 'profile.html';
    const nameClean = normalizeAuthorName(authorName);
    const selfName = normalizeAuthorName(localStorage.getItem('currentUser') || '');
    if (selfName && nameClean === selfName) return 'profile.html';

    const publicPosts = window.getLingoraPostsData ? window.getLingoraPostsData() : window.globalPostsData;
    const matchingPost = Object.values(publicPosts || {}).find(post => normalizeAuthorName(post && post.author_name) === nameClean);
    if (matchingPost && matchingPost.author_id && matchingPost.author_id !== 'self') {
      return `profile.html?id=${encodeURIComponent(matchingPost.author_id)}`;
    }

    const knownAuthors = [
      ['101', ['elena rostova']], ['102', ['ho quoc tuan']], ['103', ['李明 (li ming)', 'li ming']],
      ['104', ['sarah connor']], ['105', ['alex rivera']], ['106', ['maya lin']],
      ['107', ['kenji sato']], ['108', ['vu thu ha']], ['109', ['thai duong']]
    ];
    const known = knownAuthors.find(([, names]) => names.some(name => nameClean === normalizeAuthorName(name)));
    if (known) return `profile.html?id=${known[0]}`;

    const params = new URLSearchParams({ author: parseUserName(authorName).trim() });
    if (authorAvatar) params.set('avatar', authorAvatar);
    return `profile.html?${params.toString()}`;
  }

  function getAuthorTooltipHtml(authorName, avatar) {
    const isSelf = isSelfAuthor(authorName);
    const safeHandle = (authorName || 'user').replace(/\s+/g, '').toLowerCase();
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (window.uiTranslations && window.uiTranslations[currentLang]) || {};
    const followLabel = dict.btn_follow || dict.subscribe || 'Follow';
    const followBtnHtml = isSelf ? '' : `<button class="btn btn-primary btn-sm rounded-pill fw-bold px-3 py-1 shadow-sm btn-subscribe" onclick="if(typeof window.toggleSubscribe === 'function') window.toggleSubscribe(this, event); else alert('Subscribed');">${followLabel}</button>`;
    const profileUrl = getAuthorProfileHref(authorName, avatar);

    return `
      <div class="author-hover-card shadow-lg border rounded-4 position-absolute overflow-hidden text-start" style="padding: 0; min-width: 280px; max-width: 320px; z-index: 1060; cursor: default;" onclick="event.stopPropagation()">
        <div style="height: 56px; background: linear-gradient(135deg, rgba(var(--bs-primary-rgb), 0.8), rgba(var(--bs-primary-rgb), 0.4));"></div>
        <div class="p-3 pt-0 position-relative">
          <div class="d-flex justify-content-between align-items-end mb-2" style="margin-top: -24px;">
            <a href="${profileUrl}" class="d-inline-block text-decoration-none">
              <img src="${avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80'}" class="rounded-circle" width="52" height="52" style="object-fit: cover; border: 3px solid var(--bg-panel); background: var(--bg-panel);" alt="Avatar">
            </a>
            ${followBtnHtml}
          </div>
          <div class="mb-2">
            <a href="${profileUrl}" class="text-decoration-none text-main hover-text-primary">
              <h6 class="mb-0 fw-bold fs-6" style="margin: 0; padding: 0;">${authorName}</h6>
              <small class="text-muted">@${safeHandle}</small>
            </a>
          </div>
          <p class="small mb-3 text-muted" style="line-height: 1.4;">Member of Lingora community, sharing insights and engaging in discussions.</p>
          <div class="d-flex gap-3 small">
            <div><span class="fw-bold text-main">840</span> <span class="text-muted" data-i18n="followers">Followers</span></div>
            <div><span class="fw-bold text-main">15</span> <span class="text-muted" data-i18n="posts">Posts</span></div>
          </div>
        </div>
      </div>
    `;
  }

  window.isSelfAuthor = isSelfAuthor;
  window.getAuthorProfileHref = getAuthorProfileHref;
  window.getAuthorTooltipHtml = getAuthorTooltipHtml;

  function renderComments(postId) {
    const comments = window.getCommentsForPost ? window.getCommentsForPost(postId) : [];
    const container = document.getElementById('commentsListContainer');
    if (!container) return;

    // Calculate total count (roots + replies)
    let totalCount = 0;
    comments.forEach(c => {
      totalCount += 1 + (c.replies ? c.replies.length : 0);
    });
    const countTextEl = document.getElementById('commentCountText');
    if (countTextEl) countTextEl.textContent = totalCount;
    const footerCountEl = document.getElementById('footerCommentCount');
    if (footerCountEl) footerCountEl.textContent = totalCount;
    if (window.globalPostsData && window.globalPostsData[postId]) {
      window.globalPostsData[postId].comments = totalCount;
    }

    if (comments.length === 0) {
      const currentLang = localStorage.getItem('preferredLanguage') || 'en';
      const dict = (uiTranslations && uiTranslations[currentLang]) || (uiTranslations && uiTranslations.en) || {};
      container.innerHTML = `<p class="text-muted">${dict.no_comments || "No comments yet. Be the first to comment!"}</p>`;
      return;
    }

    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (uiTranslations && uiTranslations[currentLang]) || (uiTranslations && uiTranslations.en) || {};
    const translateLabel = dict.translate_comment || "Dịch";
    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = parseUserName(currentUserStr) || 'Hồ Quốc Tuấn';
    const post = (window.globalPostsData && window.globalPostsData[postId]) || (window.globalPostsData && window.globalPostsData["1"]) || {};
    const isPostAuthor = (post.author_name === currentUser);

    let html = "";
    comments.forEach(root => {
      let repliesHtml = "";
      if (root.replies && root.replies.length > 0) {
        repliesHtml += `<div class="comment-reply-list mt-3 ps-3 border-start border-2">`;
        root.replies.forEach(rep => {
          const repReplyToName = parseUserName(rep.replyTo);
          const repAuthorName = parseUserName(rep.author);
          const rootAuthorName = parseUserName(root.author);
          const tagHtml = (repReplyToName && repReplyToName !== rootAuthorName) ? `<span class="text-primary fw-semibold">@${repReplyToName}</span> ` : '';

          let repTranslateBtnHtml = "";
          if (rep.lang && rep.lang !== currentLang) {
            const translatedText = getCommentTranslation(rep, currentLang);
            repTranslateBtnHtml = `
              <button class="btn-reply btn-translate-toggle" 
                      data-original="${encodeURIComponent(rep.content)}" 
                      data-translated="${encodeURIComponent(translatedText)}" 
                      data-tag="${encodeURIComponent(tagHtml)}"
                      title="${translateLabel}" 
                      onclick="if(window.toggleCommentTranslation) window.toggleCommentTranslation(this); else toggleCommentTranslation(this);">
                <i class="bi bi-translate"></i>
              </button>
            `;
          }

          let repOwnerActionsHtml = "";
          if (repAuthorName === currentUser || (typeof window.isSelfAuthor === 'function' && window.isSelfAuthor(repAuthorName))) {
            repOwnerActionsHtml = `
              <button class="btn-reply text-secondary ms-2" onclick="window.editComment(${root.id}, ${rep.id}, true)" title="${dict.edit || 'Sửa'}"><i class="bi bi-pencil-square"></i></button>
              <button class="btn-reply text-danger ms-1" onclick="window.deleteComment(${root.id}, ${rep.id}, true)" title="${dict.delete || 'Xóa'}"><i class="bi bi-trash"></i></button>
            `;
          } else if (isPostAuthor) {
            repOwnerActionsHtml = `
              <button class="btn-reply text-danger ms-1" onclick="window.deleteComment(${root.id}, ${rep.id}, true)" title="${dict.delete || 'Xóa'}"><i class="bi bi-trash"></i></button>
            `;
          }

          const safeRepAuthorId = (repAuthorName || 'user').replace(/\s+/g, '');
          const repTooltipHtml = getAuthorTooltipHtml(repAuthorName, rep.avatar);
          repliesHtml += `
            <div class="comment-reply-card py-2 border-bottom border-light-subtle" id="comment-${rep.id}">
              <div class="d-flex align-items-center gap-2 mb-1">
                <div class="author-tooltip-container position-relative d-inline-flex align-items-center gap-2" style="cursor: pointer;">
                  <img src="${rep.avatar}" class="rounded-circle" width="28" height="28" alt="User">
                  <span class="fw-bold fs-6 text-main">${repAuthorName}</span>
                  ${repTooltipHtml}
                </div>
                <span class="text-muted small ms-auto">${typeof window.formatTimestampI18n === 'function' ? window.formatTimestampI18n(rep.time) : rep.time}</span>
              </div>
              <p class="mb-1 text-secondary comment-content-text" style="font-size: 0.95rem;">${tagHtml}${rep.content}</p>
              <div class="d-flex align-items-center gap-1 mt-2">
                <button class="btn-reply d-flex align-items-center gap-1 ${rep.isLiked ? 'liked text-danger' : ''}" onclick="if(window.toggleCommentLike) window.toggleCommentLike(this, ${root.id}, ${rep.id}, true, event);"><i class="bi ${rep.isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i> <span class="like-count">${rep.likes || 0}</span></button>
                <button class="btn-reply" onclick="window.openReplyBox(${root.id}, '${repAuthorName.replace(/'/g, "\\'")}', true)"><i class="bi bi-chat"></i></button>
                ${repTranslateBtnHtml}
                ${repOwnerActionsHtml}
              </div>
              <div id="reply-box-child-${root.id}-${safeRepAuthorId}"></div>
              <div id="edit-box-child-${root.id}-${rep.id}"></div>
            </div>
          `;
        });
        repliesHtml += `</div>`;
      }

      const rootAuthorName = parseUserName(root.author);
      let rootTranslateBtnHtml = "";
      if (root.lang && root.lang !== currentLang) {
        const translatedText = getCommentTranslation(root, currentLang);
        rootTranslateBtnHtml = `
          <button class="btn-reply btn-translate-toggle" 
                  data-original="${encodeURIComponent(root.content)}" 
                  data-translated="${encodeURIComponent(translatedText)}" 
                  data-tag=""
                  title="${translateLabel}" 
                  onclick="if(window.toggleCommentTranslation) window.toggleCommentTranslation(this); else toggleCommentTranslation(this);">
            <i class="bi bi-translate"></i>
          </button>
        `;
      }

      let rootOwnerActionsHtml = "";
      if (rootAuthorName === currentUser || (typeof window.isSelfAuthor === 'function' && window.isSelfAuthor(rootAuthorName))) {
        rootOwnerActionsHtml = `
          <button class="btn-reply text-secondary ms-2" onclick="window.editComment(${root.id}, null, false)" title="${dict.edit || 'Sửa'}"><i class="bi bi-pencil-square"></i></button>
          <button class="btn-reply text-danger ms-1" onclick="window.deleteComment(${root.id}, null, false)" title="${dict.delete || 'Xóa'}"><i class="bi bi-trash"></i></button>
        `;
      } else if (isPostAuthor) {
        rootOwnerActionsHtml = `
          <button class="btn-reply text-danger ms-1" onclick="window.deleteComment(${root.id}, null, false)" title="${dict.delete || 'Xóa'}"><i class="bi bi-trash"></i></button>
        `;
      }

      const rootTooltipHtml = getAuthorTooltipHtml(rootAuthorName, root.avatar);
      html += `
        <div class="comment-card py-3 border-bottom border-light-subtle" id="comment-${root.id}">
          <div class="d-flex align-items-center gap-2 mb-2">
            <div class="author-tooltip-container position-relative d-inline-flex align-items-center gap-2" style="cursor: pointer;">
              <img src="${root.avatar}" class="rounded-circle" width="36" height="36" alt="User">
              <span class="fw-bold fs-6 text-main">${rootAuthorName}</span>
              ${rootTooltipHtml}
            </div>
            <span class="text-muted small ms-auto">${typeof window.formatTimestampI18n === 'function' ? window.formatTimestampI18n(root.time) : root.time}</span>
          </div>
          <p class="mb-1 text-secondary comment-content-text">${root.content}</p>
          <div class="d-flex align-items-center gap-1 mt-2">
            <button class="btn-reply d-flex align-items-center gap-1 ${root.isLiked ? 'liked text-danger' : ''}" onclick="if(window.toggleCommentLike) window.toggleCommentLike(this, ${root.id}, null, false, event);"><i class="bi ${root.isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'}"></i> <span class="like-count">${root.likes || 0}</span></button>
            <button class="btn-reply" onclick="window.openReplyBox(${root.id}, '${rootAuthorName.replace(/'/g, "\\'")}', false)"><i class="bi bi-chat"></i></button>
            ${rootTranslateBtnHtml}
            ${rootOwnerActionsHtml}
          </div>
          <div id="reply-box-root-${root.id}"></div>
          <div id="edit-box-root-${root.id}"></div>
          ${repliesHtml}
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function openReplyBox(rootId, targetAuthor, isChildReply) {
    const user = checkAuthOrSimulate();
    if (!user) return;

    document.querySelectorAll('[id^="reply-box-"], [id^="edit-box-"]').forEach(el => el.innerHTML = '');

    const safeAuthorId = (targetAuthor || 'user').replace(/\s+/g, '');
    const boxId = isChildReply ? `reply-box-child-${rootId}-${safeAuthorId}` : `reply-box-root-${rootId}`;
    const boxEl = document.getElementById(boxId);
    if (!boxEl) return;

    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (uiTranslations && uiTranslations[lang]) || (uiTranslations && uiTranslations.en) || {};
    const replyPrefix = isChildReply ? (dict.replying_to || "Replying to @") : (dict.replying_to_comment || "Replying to comment by ");
    const placeholderText = replyPrefix + targetAuthor + "...";

    boxEl.innerHTML = `
      <div class="mt-2 pt-2 border-top">
        <textarea id="input-reply-${rootId}" class="form-control form-control-sm mb-2" rows="2" placeholder="${placeholderText}" oninput="document.getElementById('btn-reply-${rootId}').disabled = !this.value.trim();"></textarea>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="this.parentElement.parentElement.innerHTML=''" data-i18n="cancel">${dict.cancel || "Cancel"}</button>
          <button id="btn-reply-${rootId}" class="btn btn-sm btn-primary rounded-pill px-3 fw-medium" disabled onclick="window.submitReply(${rootId}, ${isChildReply}, '${targetAuthor.replace(/'/g, "\\'")}')" data-i18n="reply">${dict.reply || "Reply"}</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      const inputEl = document.getElementById(`input-reply-${rootId}`);
      if (inputEl) inputEl.focus();
    }, 50);
  }

  function submitReply(rootId, isChildReply, replyToAuthor) {
    const inputEl = document.getElementById(`input-reply-${rootId}`);
    if (!inputEl || !inputEl.value.trim()) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id') || "1";
    const comments = window.getCommentsForPost(postId);
    const user = checkAuthOrSimulate();
    if (!user) return;

    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    const newReply = {
      id: Date.now(),
      author: user.name,
      avatar: user.avatar,
      time: "Just now",
      content: inputEl.value.trim(),
      lang: currentLang,
      replyTo: isChildReply ? replyToAuthor : "",
      translations: {},
      likes: 0,
      isLiked: false
    };

    const targetRoot = comments.find(c => String(c.id) === String(rootId));
    if (targetRoot) {
      if (!targetRoot.replies) targetRoot.replies = [];
      targetRoot.replies.push(newReply);
      saveCommentsForPost(postId, comments);
      renderComments(postId);
    }
  }

  function postNewComment() {
    const inputEl = document.getElementById('newCommentInput');
    if (!inputEl || !inputEl.value.trim()) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id') || "1";
    const comments = window.getCommentsForPost(postId);
    const user = checkAuthOrSimulate();
    if (!user) return;

    const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
    const newComment = {
      id: Date.now(),
      author: user.name,
      avatar: user.avatar,
      time: "Just now",
      content: inputEl.value.trim(),
      lang: currentLang,
      translations: {},
      likes: 0,
      isLiked: false,
      replies: []
    };

    comments.unshift(newComment);
    saveCommentsForPost(postId, comments);
    inputEl.value = '';
    const submitBtn = document.getElementById('submitCommentBtn');
    if (submitBtn) submitBtn.disabled = true;
    renderComments(postId);
  }

  async function deleteComment(rootId, repId, isChild) {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id') || "1";
    let comments = window.getCommentsForPost(postId);
    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = parseUserName(currentUserStr) || 'Hồ Quốc Tuấn';
    const post = (window.globalPostsData && window.globalPostsData[postId]) || (window.globalPostsData && window.globalPostsData["1"]) || {};
    const isPostAuthor = (post.author_name === currentUser);

    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (uiTranslations && uiTranslations[lang]) || (uiTranslations && uiTranslations.en) || {};

    if (isChild) {
      const root = comments.find(c => String(c.id) === String(rootId));
      if (!root || !root.replies) return;
      const targetRep = root.replies.find(r => String(r.id) === String(repId));
      if (!targetRep) return;

      if (parseUserName(targetRep.author) !== currentUser && !isPostAuthor) {
        alert("Bạn không có quyền xóa bình luận này! Chỉ tác giả bình luận hoặc chủ bài viết mới có quyền xóa.");
        return;
      }

      const confirmMsg = dict.delete_confirm_reply || "Bạn có chắc muốn xóa câu trả lời này?";
      if (typeof window.confirmDestructive === 'function') {
        if (!await window.confirmDestructive({ message: confirmMsg })) return;
      } else if (!confirm(confirmMsg)) return;

      root.replies = root.replies.filter(r => String(r.id) !== String(repId));
      saveCommentsForPost(postId, comments);
      renderComments(postId);
    } else {
      const targetRoot = comments.find(c => String(c.id) === String(rootId));
      if (!targetRoot) return;

      if (parseUserName(targetRoot.author) !== currentUser && !isPostAuthor) {
        alert("Bạn không có quyền xóa bình luận này! Chỉ tác giả bình luận hoặc chủ bài viết mới có quyền xóa.");
        return;
      }

      const confirmMsg = dict.delete_confirm_root || "Bạn có chắc muốn xóa bình luận này? Toàn bộ các bình luận phản hồi bên trong cũng sẽ bị xóa theo!";
      if (typeof window.confirmDestructive === 'function') {
        if (!await window.confirmDestructive({ message: confirmMsg })) return;
      } else if (!confirm(confirmMsg)) return;

      comments = comments.filter(c => String(c.id) !== String(rootId));
      saveCommentsForPost(postId, comments);
      renderComments(postId);
    }
  }

  function editComment(rootId, repId, isChild) {
    document.querySelectorAll('[id^="reply-box-"], [id^="edit-box-"]').forEach(el => el.innerHTML = '');

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id') || "1";
    const comments = window.getCommentsForPost(postId);
    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = parseUserName(currentUserStr) || 'Hồ Quốc Tuấn';

    let targetComment = null;
    if (isChild) {
      const root = comments.find(c => String(c.id) === String(rootId));
      if (root && root.replies) targetComment = root.replies.find(r => String(r.id) === String(repId));
    } else {
      targetComment = comments.find(c => String(c.id) === String(rootId));
    }
    if (!targetComment) return;

    if (parseUserName(targetComment.author) !== currentUser) {
      alert("Bạn chỉ có quyền chỉnh sửa bình luận do chính bạn viết!");
      return;
    }

    const boxId = isChild ? `edit-box-child-${rootId}-${repId}` : `edit-box-root-${rootId}`;
    const boxEl = document.getElementById(boxId);
    if (!boxEl) return;

    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (uiTranslations && uiTranslations[lang]) || (uiTranslations && uiTranslations.en) || {};

    boxEl.innerHTML = `
      <div class="mt-2 pt-2 border-top">
        <textarea id="input-edit-${isChild ? repId : rootId}" class="form-control form-control-sm mb-2" rows="3" oninput="document.getElementById('btn-edit-${isChild ? repId : rootId}').disabled = !this.value.trim();">${targetComment.content}</textarea>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="this.parentElement.parentElement.innerHTML=''" data-i18n="cancel">${dict.cancel || "Cancel"}</button>
          <button id="btn-edit-${isChild ? repId : rootId}" class="btn btn-sm btn-success rounded-pill px-3 fw-medium" ${targetComment.content.trim() ? '' : 'disabled'} onclick="window.submitEdit(${rootId}, ${isChild ? repId : 'null'}, ${isChild})" data-i18n="save">${dict.save || "Save"}</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      const inputEl = document.getElementById(`input-edit-${isChild ? repId : rootId}`);
      if (inputEl) {
        inputEl.focus();
        inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
      }
    }, 50);
  }

  function submitEdit(rootId, repId, isChild) {
    const inputId = `input-edit-${isChild ? repId : rootId}`;
    const inputEl = document.getElementById(inputId);
    if (!inputEl || !inputEl.value.trim()) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id') || "1";
    const comments = window.getCommentsForPost(postId);
    const currentUserStr = localStorage.getItem('currentUser');
    const currentUser = parseUserName(currentUserStr) || 'Hồ Quốc Tuấn';

    let targetComment = null;
    if (isChild) {
      const root = comments.find(c => String(c.id) === String(rootId));
      if (root && root.replies) targetComment = root.replies.find(r => String(r.id) === String(repId));
    } else {
      targetComment = comments.find(c => String(c.id) === String(rootId));
    }

    if (targetComment) {
      if (parseUserName(targetComment.author) !== currentUser) {
        alert("Bạn chỉ có quyền chỉnh sửa bình luận do chính bạn viết!");
        return;
      }
      targetComment.content = inputEl.value.trim();
      if (targetComment.translations) {
        const currentLang = localStorage.getItem('preferredLanguage') || 'vi';
        targetComment.lang = currentLang;
        targetComment.translations = {};
      }
      saveCommentsForPost(postId, comments);
      renderComments(postId);
    }
  }



  // Expose functions globally
  window.checkAuthOrSimulate = checkAuthOrSimulate;
  window.parseUserName = parseUserName;
  window.renderComments = renderComments;
  window.openReplyBox = openReplyBox;
  window.submitReply = submitReply;
  window.postNewComment = postNewComment;
  window.deleteComment = deleteComment;
  window.editComment = editComment;
  window.submitEdit = submitEdit;
  window.uiTranslations = uiTranslations;
  window.applyUiTranslations = applyUiTranslations;
  window.applyLanguageFilter = applyLanguageFilter;
  window.selectCategory = selectCategory;
  window.getCommentsForPost = function (postId) {
    const comments = getCommentsForPost(postId);
    if (ensureCommentsLikesInitialized(comments)) {
      saveCommentsForPost(postId, comments);
    }
    return comments;
  };
  window.saveCommentsForPost = saveCommentsForPost;
  window.getCommentTranslation = getCommentTranslation;
  window.syncFeedCommentCounts = syncFeedCommentCounts;

  // Global Toggle Like (Posts)
  function toggleLike(btn, postIdOrBaseCount, event) {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (!checkAuthOrSimulate()) return;
    const icon = btn.querySelector('i');
    const text = btn.querySelector('.like-count');
    const isLiked = !btn.classList.contains('liked');
    let currentCount = parseInt(text ? text.textContent : postIdOrBaseCount) || 0;

    if (isLiked) {
      btn.classList.add('liked', 'text-danger');
      if (icon) icon.className = 'bi bi-heart-fill text-danger';
      if (text) text.textContent = currentCount + 1;
      if (postIdOrBaseCount && window.globalPostsData && window.globalPostsData[postIdOrBaseCount]) {
        window.globalPostsData[postIdOrBaseCount].likes = currentCount + 1;
      }
    } else {
      btn.classList.remove('liked', 'text-danger');
      if (icon) icon.className = 'bi bi-heart';
      if (text) text.textContent = Math.max(0, currentCount - 1);
      if (postIdOrBaseCount && window.globalPostsData && window.globalPostsData[postIdOrBaseCount]) {
        window.globalPostsData[postIdOrBaseCount].likes = Math.max(0, currentCount - 1);
      }
    }
  }

  // Global Toggle Comment Like (Comments & Replies)
  function toggleCommentLike(btn, rootId, repId, isChild, event) {
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (!checkAuthOrSimulate()) return;
    const icon = btn.querySelector('i');
    const text = btn.querySelector('.like-count');
    const isLiked = !btn.classList.contains('liked') && !btn.classList.contains('text-danger');
    let currentCount = parseInt(text ? text.textContent : 0) || 0;

    if (isLiked) {
      btn.classList.add('liked', 'text-danger');
      if (icon) icon.className = 'bi bi-heart-fill text-danger';
      if (text) text.textContent = currentCount + 1;
    } else {
      btn.classList.remove('liked', 'text-danger');
      if (icon) icon.className = 'bi bi-heart';
      if (text) text.textContent = Math.max(0, currentCount - 1);
    }

    if (rootId && typeof window.getCommentsForPost === 'function') {
      const urlParams = new URLSearchParams(window.location.search);
      const postId = urlParams.get('id') || "1";
      const comments = window.getCommentsForPost(postId);
      const targetRoot = comments.find(c => String(c.id) === String(rootId));
      if (targetRoot) {
        if (isChild && targetRoot.replies) {
          const targetRep = targetRoot.replies.find(r => String(r.id) === String(repId));
          if (targetRep) {
            targetRep.likes = isLiked ? (currentCount + 1) : Math.max(0, currentCount - 1);
            targetRep.isLiked = isLiked;
          }
        } else if (!isChild) {
          targetRoot.likes = isLiked ? (currentCount + 1) : Math.max(0, currentCount - 1);
          targetRoot.isLiked = isLiked;
        }
        if (typeof window.saveCommentsForPost === 'function') {
          window.saveCommentsForPost(postId, comments);
        }
      }
    }
  }

  // Global Toggle Comment Translation
  function toggleCommentTranslation(btn) {
    if (!btn) return;
    const card = btn.closest('.comment-reply-card, .comment-card');
    if (!card) return;
    const contentEl = card.querySelector('.comment-content-text');
    if (!contentEl) return;

    const orig = decodeURIComponent(btn.getAttribute('data-original') || '');
    const trans = decodeURIComponent(btn.getAttribute('data-translated') || '');
    const tagHtml = decodeURIComponent(btn.getAttribute('data-tag') || '');
    const isShowingTranslated = btn.classList.toggle('active-translated');

    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = uiTranslations[currentLang] || uiTranslations.en;

    if (isShowingTranslated) {
      contentEl.innerHTML = tagHtml + trans;
      btn.classList.add('text-primary');
      btn.setAttribute('title', dict.show_original || "Show original content");
    } else {
      contentEl.innerHTML = tagHtml + orig;
      btn.classList.remove('text-primary');
      btn.setAttribute('title', dict.translate_comment || "Translate");
    }
  }

  window.toggleLike = toggleLike;
  window.toggleCommentLike = toggleCommentLike;
  window.toggleCommentTranslation = toggleCommentTranslation;

  const preferredLang = localStorage.getItem('preferredLanguage') || 'en';
  applyLanguageFilter(preferredLang);
  applyUiTranslations(preferredLang);

  // ========================================================
  // PATH & ROUTING RESOLUTION FOR STATIC WORKSPACE
  // ========================================================
  const path = window.location.pathname;
  let loginUrl = 'login.html';
  let writeUrl = 'create-post.html';
  let homeUrl = 'index.html';

  if (path.includes('/admin/')) {
    loginUrl = '../login.html';
    writeUrl = '../create-post.html';
    homeUrl = '../index.html';
  }

  // ========================================================
  // SESSION STATE & DYNAMIC ROLE-BASED UI MANAGEMENT
  // ========================================================
  window.applyUserUI = function (profileOverride = null) {
    const currentUserJson = localStorage.getItem('currentUser');
    let user = null;
    let isAdmin = false;
    try {
      if (currentUserJson) {
        user = typeof window.getLingoraCurrentUser === 'function'
          ? window.getLingoraCurrentUser()
          : JSON.parse(currentUserJson);
        if (user && profileOverride) {
          user = {
            ...user,
            name: profileOverride.displayName || user.name || '',
            avatar: profileOverride.avatar || ''
          };
        }
        isAdmin = user && user.role === 'admin';
      }
    } catch (e) {
      localStorage.removeItem('currentUser');
    }

    // 1. Dynamic Profile & Feed Avatar Syncing
    const defaultPlaceholder = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23b0bac5"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`;

    const ownProfileLinks = Array.from(document.querySelectorAll('a[href*="profile.html"]')).filter(link => {
      try {
        const url = new URL(link.getAttribute('href') || '', window.location.href);
        return url.pathname.toLowerCase().endsWith('/profile.html')
          && !url.searchParams.has('id')
          && !url.searchParams.has('author');
      } catch (error) {
        return false;
      }
    });

    if (user) {
      if (user.avatar) {
        ownProfileLinks.forEach(link => {
          const existingImg = link.querySelector('img');
          if (existingImg) {
            existingImg.src = user.avatar;
            existingImg.style.removeProperty('opacity');
          } else {
            const icon = link.querySelector('i.bi-person') || link.querySelector('i.bi-person-fill');
            if (icon) {
              const img = document.createElement('img');
              img.src = user.avatar;
              img.className = 'rounded-circle border';
              img.style.width = '20px';
              img.style.height = '20px';
              img.style.objectFit = 'cover';
              img.style.marginRight = '0.95rem';
              img.alt = user.name || 'Avatar';
              icon.replaceWith(img);
            }
          }
        });
        const draftAvatar = document.getElementById('quickDraftAvatar');
        if (draftAvatar) {
          draftAvatar.src = user.avatar;
          draftAvatar.style.removeProperty('opacity');
          draftAvatar.style.display = 'block';
        }
      }
    } else {
      ownProfileLinks.forEach(link => {
        link.querySelectorAll('img.rounded-circle').forEach(img => {
          img.src = defaultPlaceholder;
          img.style.opacity = '0.6';
        });
      });
      const draftAvatar = document.getElementById('quickDraftAvatar');
      if (draftAvatar) {
        draftAvatar.style.display = 'none';
      }
    }

    // 2. Hide / Show Admin Panel link based on role
    document.querySelectorAll('a[href*="admin/"]').forEach(link => {
      if (!isAdmin) {
        link.style.setProperty('display', 'none', 'important');
        const parentLi = link.closest('li');
        if (parentLi) {
          parentLi.style.setProperty('display', 'none', 'important');
        }
      } else {
        link.style.removeProperty('display');
        const parentLi = link.closest('li');
        if (parentLi) parentLi.style.removeProperty('display');
      }
    });

    // 3. Handle sign out once at the document level. Some pages still contain
    // legacy button listeners; capture phase plus stopImmediatePropagation keeps
    // one click from producing multiple stacked notifications.
    if (!window.__lingoraSignOutHandlerBound) {
      window.__lingoraSignOutHandlerBound = true;
      document.addEventListener('click', event => {
        const signOutLink = event.target.closest('#signOutBtn, #mobileSignOutBtn');
        if (!signOutLink || !localStorage.getItem('currentUser')) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        if (window.__lingoraSignOutInProgress) return;
        window.__lingoraSignOutInProgress = true;

        localStorage.removeItem('currentUser');
        const currentLang = localStorage.getItem('preferredLanguage') || 'en';
        const msg = uiTranslations[currentLang]?.sign_out_success || uiTranslations.en.sign_out_success;
        window.showLingoraToast(msg);
        window.setTimeout(() => { window.location.href = homeUrl; }, 900);
      }, true);
    }

    document.querySelectorAll('#signOutBtn, #mobileSignOutBtn').forEach(link => {
      if (currentUserJson) {
        link.style.removeProperty('display');
        link.classList.add('text-danger');
        link.innerHTML = `<i class="bi bi-box-arrow-right me-2"></i> <span data-i18n="sign_out">Sign Out</span>`;
      } else {
        link.classList.remove('text-danger');
        link.innerHTML = `<i class="bi bi-box-arrow-in-right me-2"></i> <span data-i18n="login">Log in</span>`;
        link.setAttribute('href', loginUrl);
      }
    });

    if (typeof applyUiTranslations === 'function') {
      applyUiTranslations();
    }

    // 4. Intercept Write post actions if not logged in
    document.querySelectorAll('a[href*="create-post.html"]').forEach(btn => {
      const href = btn.getAttribute('href') || '';
      const isEditorLink = /[?&](?:edit|submitted)=/i.test(href);
      const isCreateAction = btn.classList.contains('sidebar-create-btn') ||
        Boolean(btn.querySelector('[data-i18n="create"]'));

      if (isCreateAction && !isEditorLink && !/[?&]new=1(?:&|$)/i.test(href)) {
        const hashIndex = href.indexOf('#');
        const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
        const hrefWithoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
        const separator = hrefWithoutHash.includes('?') ? '&' : '?';
        btn.setAttribute('href', `${hrefWithoutHash}${separator}new=1${hash}`);
      }
    });

    syncFeedCategoryMenu();

    document.querySelectorAll('a[href*="create-post.html"]').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.replaceWith(newBtn);
    });

    document.querySelectorAll('a[href*="create-post.html"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (!localStorage.getItem('currentUser')) {
          e.preventDefault();
          const href = btn.getAttribute('href') || writeUrl;
          if (typeof window.checkAuthOrSimulate === 'function') {
            window.checkAuthOrSimulate(encodeURIComponent(href));
          } else {
            window.location.href = loginUrl;
          }
        }
      });
    });

    const quickDraftCard = document.getElementById('quickDraftCard');
    if (quickDraftCard) {
      quickDraftCard.style.display = 'flex';
      quickDraftCard.onclick = (e) => {
        if (!localStorage.getItem('currentUser')) {
          e.preventDefault();
          if (typeof window.checkAuthOrSimulate === 'function') {
            window.checkAuthOrSimulate(encodeURIComponent('create-post.html?new=1'));
          } else {
            window.location.href = loginUrl;
          }
        } else {
          window.location.href = writeUrl;
        }
      };
    }
  };

  // Call once immediately
  window.applyUserUI();

  const getAuthValidationCopy = () => {
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const copy = {
      en: {
        required: 'This field is required.', name: 'Full name must contain at least 2 characters.',
        email: 'Please enter a valid email address.', password: 'Password must contain at least 8 characters.',
        confirm: 'Please confirm your password.', mismatch: 'Passwords do not match.',
        duplicate: 'This email address is already registered.', credentials: 'Invalid email or password.'
      },
      vi: {
        required: 'Vui lòng nhập thông tin này.', name: 'Họ tên phải có ít nhất 2 ký tự.',
        email: 'Vui lòng nhập đúng định dạng email.', password: 'Mật khẩu phải có ít nhất 8 ký tự.',
        confirm: 'Vui lòng nhập lại mật khẩu.', mismatch: 'Mật khẩu nhập lại không khớp.',
        duplicate: 'Email này đã được đăng ký.', credentials: 'Email hoặc mật khẩu không chính xác.'
      },
      zh: {
        required: '请填写此字段。', name: '姓名至少需要 2 个字符。',
        email: '请输入有效的电子邮件地址。', password: '密码至少需要 8 个字符。',
        confirm: '请再次输入密码。', mismatch: '两次输入的密码不一致。',
        duplicate: '该电子邮件地址已注册。', credentials: '电子邮件或密码不正确。'
      }
    };
    return copy[lang] || copy.en;
  };
  const setAuthFieldError = (inputId, errorId, message) => {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    input?.classList.toggle('is-invalid', Boolean(message));
    if (error) {
      error.textContent = message || '';
      error.classList.toggle('is-visible', Boolean(message));
    }
  };
  const clearAuthFieldOnInput = (inputId, errorId) => {
    document.getElementById(inputId)?.addEventListener('input', () => setAuthFieldError(inputId, errorId, ''));
  };
  const isValidEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // ========================================================
  // LOGIN FORM CONTROLLER
  // ========================================================
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const pwdInput = document.getElementById('loginPassword');
    clearAuthFieldOnInput('loginEmail', 'loginEmailError');
    clearAuthFieldOnInput('loginPassword', 'loginPasswordError');
    if (toggleBtn && pwdInput) {
      toggleBtn.addEventListener('click', () => {
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        toggleBtn.querySelector('i').className = isPwd ? 'bi bi-eye-slash' : 'bi bi-eye';
      });
    }

    const elenaBtn = document.getElementById('quickLoginElena');
    const adminBtn = document.getElementById('quickLoginAdmin');
    if (elenaBtn) {
      elenaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginEmail').value = 'elena@lingora.com';
        document.getElementById('loginPassword').value = 'password123';
        loginForm.dispatchEvent(new Event('submit'));
      });
    }
    if (adminBtn) {
      adminBtn.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginEmail').value = 'admin@lingora.com';
        document.getElementById('loginPassword').value = 'admin123';
        loginForm.dispatchEvent(new Event('submit'));
      });
    }

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const alertDiv = document.getElementById('authAlert');
      const alertText = document.getElementById('authAlertText');
      const copy = getAuthValidationCopy();
      setAuthFieldError('loginEmail', 'loginEmailError', '');
      setAuthFieldError('loginPassword', 'loginPasswordError', '');
      alertDiv.classList.add('d-none');
      let isValid = true;
      if (!email) { setAuthFieldError('loginEmail', 'loginEmailError', copy.required); isValid = false; }
      else if (!isValidEmail(email)) { setAuthFieldError('loginEmail', 'loginEmailError', copy.email); isValid = false; }
      if (!password) { setAuthFieldError('loginPassword', 'loginPasswordError', copy.required); isValid = false; }
      if (!isValid) {
        loginForm.querySelector('.is-invalid')?.focus();
        return;
      }

      const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
      const mockUsers = [
        {
          email: 'admin@lingora.com',
          password: 'admin123',
          name: 'System Admin',
          role: 'admin',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=80&h=80'
        },
        {
          email: 'elena@lingora.com',
          password: 'password123',
          name: 'Elena Rostova',
          role: 'member',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80'
        }
      ];

      const allUsers = [...mockUsers, ...registeredUsers];
      const matchedUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

      if (matchedUser) {
        localStorage.setItem('currentUser', JSON.stringify({
          email: matchedUser.email,
          name: matchedUser.name,
          role: matchedUser.role,
          avatar: matchedUser.avatar
        }));
        alertDiv.classList.add('d-none');
        window.location.href = matchedUser.role === 'admin'
          ? 'admin/index.html'
          : 'index.html';
      } else {
        alertDiv.classList.remove('d-none');
        alertText.textContent = copy.credentials;
      }
    });
  }

  // ========================================================
  // REGISTER FORM CONTROLLER
  // ========================================================
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    const pwd1 = document.getElementById('regPassword');
    const pwd2 = document.getElementById('regConfirmPassword');
    const toggle1 = document.getElementById('togglePasswordBtn1');
    const toggle2 = document.getElementById('togglePasswordBtn2');
    clearAuthFieldOnInput('regName', 'regNameError');
    clearAuthFieldOnInput('regEmail', 'regEmailError');
    clearAuthFieldOnInput('regPassword', 'regPasswordError');
    clearAuthFieldOnInput('regConfirmPassword', 'regConfirmPasswordError');

    if (toggle1 && pwd1) {
      toggle1.addEventListener('click', () => {
        const isPwd = pwd1.type === 'password';
        pwd1.type = isPwd ? 'text' : 'password';
        toggle1.querySelector('i').className = isPwd ? 'bi bi-eye-slash' : 'bi bi-eye';
      });
    }
    if (toggle2 && pwd2) {
      toggle2.addEventListener('click', () => {
        const isPwd = pwd2.type === 'password';
        pwd2.type = isPwd ? 'text' : 'password';
        toggle2.querySelector('i').className = isPwd ? 'bi bi-eye-slash' : 'bi bi-eye';
      });
    }

    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const confirmPwd = document.getElementById('regConfirmPassword').value;
      const alertDiv = document.getElementById('authAlert');
      const copy = getAuthValidationCopy();
      ['regName', 'regEmail', 'regPassword', 'regConfirmPassword'].forEach(id => {
        const errorId = `${id}Error`;
        setAuthFieldError(id, errorId, '');
      });
      alertDiv.classList.add('d-none');
      let isValid = true;
      if (!name) { setAuthFieldError('regName', 'regNameError', copy.required); isValid = false; }
      else if (name.length < 2) { setAuthFieldError('regName', 'regNameError', copy.name); isValid = false; }
      if (!email) { setAuthFieldError('regEmail', 'regEmailError', copy.required); isValid = false; }
      else if (!isValidEmail(email)) { setAuthFieldError('regEmail', 'regEmailError', copy.email); isValid = false; }
      if (!password) { setAuthFieldError('regPassword', 'regPasswordError', copy.required); isValid = false; }
      else if (password.length < 8) { setAuthFieldError('regPassword', 'regPasswordError', copy.password); isValid = false; }
      if (!confirmPwd) { setAuthFieldError('regConfirmPassword', 'regConfirmPasswordError', copy.confirm); isValid = false; }
      else if (password !== confirmPwd) { setAuthFieldError('regConfirmPassword', 'regConfirmPasswordError', copy.mismatch); isValid = false; }
      if (!isValid) {
        registerForm.querySelector('.is-invalid')?.focus();
        return;
      }

      const registeredUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
      const emailExists = registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase()) ||
        email.toLowerCase() === 'admin@lingora.com' ||
        email.toLowerCase() === 'elena@lingora.com';

      if (emailExists) {
        setAuthFieldError('regEmail', 'regEmailError', copy.duplicate);
        document.getElementById('regEmail')?.focus();
        return;
      }

      const newUser = {
        name,
        email,
        password,
        role: 'member',
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=80&h=80`
      };

      registeredUsers.push(newUser);
      localStorage.setItem('registered_users', JSON.stringify(registeredUsers));

      alertDiv.classList.add('d-none');
      alert('Registration successful! Redirecting to log in...');
      window.location.href = 'login.html';
    });
  }
});

// Force page reload on back/forward navigation to refresh state (bfcache)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

// Helper: check if authorName matches currently logged in user
// Cached to avoid JSON.parse on every call (especially from mouseover)
(function () {
  let _cachedSelfName = null;
  let _cacheInitialized = false;

  function _resolveSelfName() {
    const currentStr = localStorage.getItem('currentUser');
    let name = '';
    if (currentStr) {
      if (typeof currentStr === 'string' && currentStr.startsWith('{')) {
        try {
          const obj = JSON.parse(currentStr);
          name = obj.name || obj.username || '';
        } catch (e) { }
      } else {
        name = currentStr;
      }
    }
    return name.toString().trim().toLowerCase();
  }

  window.isSelfAuthor = function (authorName) {
    if (!authorName) return false;
    if (!_cacheInitialized) {
      _cachedSelfName = _resolveSelfName();
      _cacheInitialized = true;
    }
    return authorName.toString().trim().toLowerCase() === _cachedSelfName;
  };

  // Invalidate cache when localStorage changes (login/logout)
  window.addEventListener('storage', function (e) {
    if (e.key === 'currentUser') {
      _cachedSelfName = _resolveSelfName();
    }
  });
})();

// Global mouseenter handler (NOT mouseover — mouseenter doesn't bubble into children,
// so it fires once per container entry instead of continuously on nested elements)
document.addEventListener('mouseenter', function (e) {
  if (!e.target || typeof e.target.closest !== 'function') return;
  const container = e.target.closest('.author-tooltip-container');
  if (container) {
    const nameEl = container.querySelector('.author-name, .fw-bold.fs-6, h6.text-main, .author-meta-info a');
    if (nameEl && typeof window.isSelfAuthor === 'function' && window.isSelfAuthor(nameEl.textContent)) {
      container.querySelectorAll('.btn-subscribe').forEach(btn => {
        btn.style.display = 'none';
      });
    }
  }
}, true);

