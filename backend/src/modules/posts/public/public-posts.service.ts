/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TỔNG QUAN CLASS: PublicPostsService
 * ═══════════════════════════════════════════════════════════════════════════
 * MỤC ĐÍCH: 
 * Xử lý logic API công khai cho thực thể bài viết (Post). Bao gồm lấy danh 
 * sách (News Feed), chi tiết bài viết, và các bài viết liên quan.
 *
 * GIẢI PHÁP:
 * 1. Sử dụng Promise.all để Eager Loading song song thay vì include của Sequelize
 *    nhằm tránh Cartesian product (tích Đề-các) và tăng tốc độ.
 * 2. Kết hợp In-Memory Cache (RAM) lưu cache-key (view:post:id:viewerId) với TTL 1 giờ.
 * 3. Sử dụng cột `unaccented_title` lưu sẵn chuỗi không dấu để tìm kiếm LIKE.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { Post } from '../models/post.model';
import { PostTranslation } from '../models/post-translation.model';
import { User } from '../../users/models/user.model';
import { Category } from '../../categories/models/category.model';
import { CategoryTranslation } from '../../categories/models/category-translation.model';
import { Language } from '../../languages/models/language.model';
import { removeAccents } from '../../../utils/string.util';
import { PostLike } from '../../likes/models/post-like.model';
import { PublicPostsQueryDto } from './dto/public-posts.dto';

@Injectable()
export class PublicPostsService {
  constructor(
    @InjectModel(Post) private readonly postModel: typeof Post,
    @InjectModel(PostTranslation)
    private readonly postTranslationModel: typeof PostTranslation,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(CategoryTranslation)
    private readonly categoryTranslationModel: typeof CategoryTranslation,
    @InjectModel(Language) private readonly languageModel: typeof Language,
    @InjectModel(PostLike) private readonly postLikeModel: typeof PostLike,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  /**
   * [Bảng posts]
   * posts.id                     → response.id
   * posts.author_id              → request user -> author.id
   * posts.category_id            → request category -> category.id
   * posts.view_count             → response.viewCount   (đọc trực tiếp, cached)
   * posts.like_count             → response.likeCount   (tăng/giảm qua likes.service)
   * posts.comment_count          → response.commentCount
   * posts.published_at           → response.createdAt (ưu tiên hơn created_at)
   * posts.original_language_id   → response.originalLanguage (ánh xạ qua bảng languages)
   *
   * [Bảng post_translations]
   * post_translations.title      → response.translations[].title
   * post_translations.content    → parse HTML → response.translations[].excerpt, coverImageUrl, coverVideoUrl
   *
   * [Bảng users]
   * users.display_name/username  → response.author.name
   * users.avatar                 → response.author.avatarUrl
   *
   * [Bảng categories / category_translations]
   * categories.slug              → response.category.slug
   * category_translations.name   → response.category.translations[].name
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async listFeed(
    query: PublicPostsQueryDto,
    postId?: number,
    userId?: number,
    followedAuthorIds?: Array<string | number>,
  ) {
    // Step 1: Xử lý phân trang (Pagination)
    // Tính toán offset (vị trí bắt đầu lấy dữ liệu) để query DB.
    // Nếu limit = 10, page = 2 thì offset = (2 - 1) * 10 = 10.
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    // Step 2: Tải danh sách ngôn ngữ
    // Cần giữ mã của cả ngôn ngữ đã tắt để không gán nhầm bản dịch cũ sang "en".
    // Chỉ các language ID đang active mới được phép xuất hiện trong feed công khai.
    const languages = await this.languageModel.findAll();
    const activeLanguageIds = languages
      .filter(language => language.is_active)
      .map(language => Number(language.id));
    const requestedLanguageCode = query.lang?.trim().toLowerCase();
    const requestedLanguage = requestedLanguageCode
      ? languages.find(language => language.is_active && language.code.toLowerCase() === requestedLanguageCode)
      : undefined;
    const fallbackLanguage = requestedLanguageCode
      ? languages.find(language => language.is_active && language.is_default)
        ?? languages.find(language => language.is_active)
      : undefined;
    const publicLanguage = requestedLanguage ?? fallbackLanguage;
    const languageMap = new Map<any, string>();
    languages.forEach((l) => {
      languageMap.set(l.id, l.code);
      languageMap.set(Number(l.id), l.code);
      languageMap.set(String(l.id), l.code);
    });

    // Step 3: Xử lý bộ lọc danh mục (Category)
    // Nếu client truyền query category (có thể là slug chuỗi hoặc ID số), tìm ID tương ứng để thêm vào điều kiện lọc.
    // SQL: SELECT id FROM categories WHERE slug = '...' OR id = ... LIMIT 1
    let categoryId: number | undefined;
    if (query.category) {
      const cat = await this.categoryModel.findOne({
        where: {
          [Op.or]: [
            { slug: query.category }, // categories.slug
            ...(isNaN(Number(query.category)) ? [] : [{ id: Number(query.category) }]),
          ],
        },
      });
      if (cat) categoryId = cat.id;
    }

    // Step 4: Khởi tạo điều kiện WHERE cho bảng posts
    // Chỉ lấy bài viết không bị xóa (deleted_at IS NULL) và đã được duyệt/xuất bản.
    const where: any = {
      deleted_at: null,
      status: { [Op.in]: ['approved', 'published'] }, // SQL: status IN ('approved', 'published')
    };

    // Gắn điều kiện category và tác giả vào Where
    if (categoryId) {
      where.category_id = categoryId; // SQL: AND category_id = ...
    }
    if (query.authorId) {
      where.author_id = query.authorId; // SQL: AND author_id = ...
    } else if (followedAuthorIds?.length) {
      where.author_id = { [Op.in]: followedAuthorIds }; // SQL: AND author_id IN (...)
    }

    // Step 5: Xử lý tìm kiếm toàn văn bản (Search bằng từ khóa)
    let matchingPostIds: number[] | null = null;
    const intersectPostIds = (ids: number[]) => {
      if (matchingPostIds === null) {
        matchingPostIds = [...new Set(ids)];
        return;
      }
      const allowed = new Set(ids);
      matchingPostIds = matchingPostIds.filter(id => allowed.has(id));
    };

    if (query.q && query.q.trim()) {
      // Tại sao dùng cột unaccented_title? 
      // Người dùng (ví dụ tiếng Việt) thường lười gõ dấu. Nếu họ gõ "bai viet", ta cần tìm ra "bài viết".
      // post_translations.unaccented_title → CHỈ dùng khi search (query.q có giá trị), LIKE '%keyword%'
      // Dùng LIKE thay vì match against để tìm kiếm 1 phần (partial match).
      const keyword = `%${removeAccents(query.q.trim())}%`;

      const translationWhere: any = {
        translation_status: 'completed', // post_translations.translation_status → filter WHERE = 'completed'
        unaccented_title: { [Op.like]: keyword }, // SQL: unaccented_title LIKE '%bai viet%'
      };

      // Lọc thêm theo ngôn ngữ nếu có query lang
      if (query.lang) {
        const langModel = await this.languageModel.findOne({ where: { code: query.lang } });
        if (langModel) {
          translationWhere.language_id = langModel.id; // SQL: AND language_id = ...
        }
      }

      // Lấy danh sách post_id thỏa mãn từ bảng bản dịch
      // SQL: SELECT post_id FROM post_translations WHERE translation_status = 'completed' AND unaccented_title LIKE ...
      const matchedTranslations = await this.postTranslationModel.findAll({
        where: translationWhere,
        attributes: ['post_id'],
      });
      intersectPostIds(matchedTranslations.map((t) => Number(t.post_id))); // post_translations.post_id
    }

    const filteredPostIds = matchingPostIds as number[] | null;

    // Áp dụng ID bộ lọc từ kết quả search hoặc lấy chi tiết 1 post
    if (postId !== undefined) {
      where.id = filteredPostIds === null || filteredPostIds.includes(postId) ? postId : 0;
    } else if (filteredPostIds !== null) {
      where.id = { [Op.in]: filteredPostIds.length ? filteredPostIds : [0] };
    }

    // Step 6: Cấu hình Sắp xếp (Sorting)
    // Nếu query.sort = 'trending', ta ưu tiên bài viết có điểm tương tác cao.
    // Công thức tính điểm: (View * 1) + (Like * 5) + (Comment * 10).
    const order: any = query.sort === 'trending'
      ? [
        [
          // SQL: ORDER BY (view_count + like_count * 5 + comment_count * 10) DESC, published_at DESC
          literal(`(view_count) + (like_count) * 5 + (comment_count) * 10`),
          'DESC',
        ],
        ['published_at', 'DESC'],
      ]
      : [
        // Mặc định sắp xếp theo ngày xuất bản mới nhất
        // SQL: ORDER BY published_at DESC, created_at DESC
        ['published_at', 'DESC'],
        ['created_at', 'DESC'],
      ];

    // Step 7: Truy vấn dữ liệu chính
    // Lấy mảng bài viết (rows) và tổng số lượng thỏa mãn điều kiện (count) để tính phân trang.
    // SQL: SELECT count(*) FROM posts WHERE ...
    // SQL: SELECT * FROM posts WHERE ... ORDER BY ... LIMIT ... OFFSET ...
    const { rows: posts, count: total } = await this.postModel.findAndCountAll({
      where,
      order,
      limit,
      offset,
    });

    // Trả về mảng rỗng nếu không có dữ liệu
    if (!posts.length) {
      return { items: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    // Step 8: Eager Loading Dữ Liệu Liên Quan bằng Promise.all thay vì JOIN (include)
    // Tại sao không dùng include của Sequelize? Tránh tích Đề-các.
    const postIds = posts.map((p) => Number(p.id));
    // posts.author_id → dùng để build Set authorIds
    const authorIds = [...new Set(posts.map((p) => Number(p.author_id)))];
    // posts.category_id → dùng để build Set categoryIds
    const categoryIds = [...new Set(posts.map((p) => p.category_id).filter(Boolean))] as number[];

    // Dùng Promise.all để bắn song song 5 câu lệnh truy vấn độc lập
    const [translations, authors, categories, categoryTranslations, userLikeRows] = await Promise.all([
      // 1. post_translations.translation_status → filter WHERE = 'completed'
      this.postTranslationModel.findAll({
        where: { post_id: postIds, translation_status: 'completed' },
      }),
      // 2. JOIN thủ công sang bảng users (lấy tác giả)
      this.userModel.findAll({ where: { id: authorIds } }),
      // 3. JOIN thủ công sang bảng categories (lấy danh mục)
      categoryIds.length ? this.categoryModel.findAll({ where: { id: categoryIds } }) : [],
      // 4. Lấy bản dịch của danh mục
      categoryIds.length ? this.categoryTranslationModel.findAll({ where: { category_id: categoryIds } }) : [],
      // 5. Kiểm tra trạng thái đã Like bài viết của user hiện tại
      // post_likes.post_id + post_likes.user_id → check xem user hiện tại có like bài này chưa
      userId
        ? this.postLikeModel.findAll({
          where: { post_id: postIds, user_id: userId },
          attributes: ['post_id'],
        })
        : Promise.resolve([]),
    ]);

    // Tạo tập hợp (Set) chứa các post_id mà user đã like, để lookup O(1)
    const userLikes = new Set(userId ? userLikeRows.map((row: any) => String(row.post_id)) : []);

    // Tạo Map cho Authors và Categories để tra cứu nhanh ở bước sau
    const authorMap = new Map<any, User>();
    authors.forEach((u) => { authorMap.set(u.id, u); authorMap.set(Number(u.id), u); });
    const categoryMap = new Map<any, Category>();
    categories.forEach((c) => { categoryMap.set(c.id, c); categoryMap.set(Number(c.id), c); });

    // Step 9: Format lại Data (Mapping)
    const items = posts.map((post) => {
      const postAuthor = authorMap.get(post.author_id);
      const postCategory = post.category_id ? categoryMap.get(post.category_id) : null;

      // Xử lý bản dịch
      const postTranslations = translations
        .filter((t) => Number(t.post_id) === Number(post.id))
        .map((t) => {
          // post_translations.language_id → tra languageMap lấy code ngôn ngữ
          const langCode = languageMap.get(t.language_id) || 'en';
          // posts.original_language_id → tra trong languageMap để biết ngôn ngữ gốc
          const origLangCode = languageMap.get(post.original_language_id) || 'en';

          // Trích xuất đoạn trích ngắn (excerpt) từ nội dung HTML
          let excerpt = '';
          if (t.content) { // post_translations.content → parse HTML lấy excerpt, tìm coverImageUrl
            // Xóa hết thẻ HTML, xóa khoảng trắng thừa, cắt lấy 200 ký tự đầu.
            const stripped = t.content.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
            excerpt = stripped.length > 200 ? stripped.substring(0, 200) + '...' : stripped;
          }

          return {
            id: Number(t.id),
            languageCode: langCode,
            title: t.title || '', // post_translations.title → map sang translation.title
            contentHtml: t.content || '',
            excerpt,
            // post_translations.translation_provider → xác định source: null='human', có giá trị='machine'
            source: (langCode === origLangCode ? 'original' : t.translation_provider ? 'machine' : 'human') as 'original' | 'human' | 'machine',
          };
        });

      // Tìm kiếm hình ảnh hoặc video đầu tiên trong bài viết để làm ảnh bìa (cover)
      let coverImageUrl: string | null = null;
      let coverVideoUrl: string | null = null;
      for (const t of postTranslations) {
        if (!t.contentHtml) continue;

        // Dùng Regex lấy URL trong thẻ img, video, iframe
        const imgMatch = t.contentHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
        const videoMatch =
          t.contentHtml.match(/<video[^>]+src=["']([^"']+)["']/i) ||
          t.contentHtml.match(/<source[^>]+src=["']([^"']+)["']/i) ||
          t.contentHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);

        const imgIdx = imgMatch ? t.contentHtml.indexOf(imgMatch[0]) : Infinity;
        const videoIdx = videoMatch ? t.contentHtml.indexOf(videoMatch[0]) : Infinity;

        if (imgIdx === Infinity && videoIdx === Infinity) continue;

        // Ưu tiên media nào xuất hiện trước trong nội dung bài viết
        if (imgIdx <= videoIdx) {
          coverImageUrl = imgMatch![1];
        } else {
          coverVideoUrl = videoMatch![1];
        }
        break; // Lấy được 1 ảnh/video thì dừng
      }

      // Ráp vào response object
      return {
        id: Number(post.id),
        authorId: Number(post.author_id),
        categoryId: post.category_id,
        originalLanguage: languageMap.get(post.original_language_id) || 'en',
        coverImageUrl,
        coverVideoUrl,
        status: 'published',
        viewCount: post.view_count || 0, // posts.view_count → map trực tiếp sang response.viewCount
        commentCount: post.comment_count || 0, // posts.comment_count → map sang response.commentCount
        likeCount: post.like_count || 0, // posts.like_count → map sang response.likeCount
        liked: userLikes.has(String(post.id)), // map sang response.liked dựa trên set userLikes
        author: {
          id: Number(postAuthor?.id || post.author_id),
          // users.display_name / users.username → author.name trong response
          name: postAuthor?.display_name || postAuthor?.username || 'Tác giả',
          handle: postAuthor?.username || 'author',
          email: postAuthor?.email,
          // users.avatar → author.avatarUrl
          avatarUrl: postAuthor?.avatar || null,
          // users.bio → author.bio
          bio: postAuthor?.bio || null,
          // users.role_id === 1 → author.role = 'admin', khác = 'member'
          role: postAuthor?.role_id === 1 ? ('admin' as const) : ('member' as const),
          allowShowSubscribers: true,
          allowShowFollowing: true,
        },
        category: postCategory
          ? {
            id: postCategory.id,
            // categories.slug → category.slug trong response
            slug: postCategory.slug,
            // categories.status === 'active' → category.isActive
            isActive: postCategory.status === 'active',
            translations: categoryTranslations
              .filter((ct) => Number(ct.category_id) === Number(postCategory.id))
              .map((ct) => ({
                id: Number(ct.id),
                // category_translations.language_id → tra languageMap lấy code
                languageCode: languageMap.get(ct.language_id) || 'en',
                // category_translations.name → tên danh mục đa ngôn ngữ
                name: ct.name,
              })),
          }
          : null,
        translations: postTranslations,
        // posts.published_at → dùng làm createdAt trong response (ưu tiên hơn posts.created_at)
        createdAt: post.published_at ? post.published_at.toISOString() : post.created_at.toISOString(),
      };
    });

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * listFeedByAuthorIds - Wrapper để lấy bài viết theo mảng authorId (dùng trong trang cá nhân / danh sách following)
   */
  async listFeedByAuthorIds(
    authorIds: string[],
    options: { limit?: number; page?: number; lang?: string } = {},
    userId?: number,
  ) {
    if (!authorIds.length) return { items: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    const limit = options.limit || 50;
    const page = options.page || 1;
    return await this.listFeed({ page, limit, lang: options.lang }, undefined, userId, authorIds);
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: XEM BÀI VIẾT (TĂNG VIEW)
   * ═══════════════════════════════════════════════════════════════════════════
   * getById - Lấy chi tiết một bài viết theo ID.
   * 
   * CƠ CHẾ HOẠT ĐỘNG (CHỐNG SPAM VIEW BẰNG IN-MEMORY CACHE):
   * 1. Khi người dùng click vào xem chi tiết bài viết, Frontend gọi API lấy chi tiết.
   * 2. Backend cần tăng view_count của bài viết này. Tuy nhiên, nếu user bấm F5 liên tục
   *    thì view sẽ tăng đột biến (Spam View).
   * 3. Giải pháp chống spam:
   *    - Lấy thông tin định danh người xem (Viewer ID), dựa trên userId hoặc IP.
   *    - Dùng In-Memory Cache (RAM của server Node.js, HOÀN TOÀN KHÔNG DÙNG REDIS) để lưu trữ trạng thái.
   *    - Cache key có định dạng: view:post:{id}:{viewerId}.
   *    - Trước khi gọi post.increment('view_count'), ta kiểm tra RAM xem cache key này đã tồn tại chưa.
   *    - Nếu CHƯA CÓ: Tiến hành tăng view trong Database, đồng thời set cache key vào RAM với TTL 1 giờ.
   *    - Nếu ĐÃ CÓ: Nghĩa là người này mới xem gần đây, bỏ qua việc tăng view.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async getById(id: number, userId?: number, lang?: string) {
    const post = await this.postModel.findOne({
      where: { id, deleted_at: null },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Lưu ý: Logic tăng view_count đã được TÁCH HOÀN TOÀN ra khỏi hàm này.
    // View chỉ được ghi nhận khi người dùng cuộn đọc >= 50% bài viết,
    // thông qua endpoint riêng POST /posts/:id/view → recordView().
    // Mục đích: Tách biệt rõ "lấy dữ liệu" và "ghi nhận hành vi đọc thực sự".

    // Tái sử dụng hàm listFeed để lấy full data (kèm relationship) về bài viết này
    const result = await this.listFeed({ page: 1, limit: 1 }, id, userId);
    const found = result.items.find((p) => p.id === Number(id));
    if (!found) throw new NotFoundException('Post details not found');
    return found;
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: GHI NHẬN VIEW THỰC SỰ (SCROLL DEPTH >= 50%)
   * ═══════════════════════════════════════════════════════════════════════════
   * recordView() - Được gọi khi Frontend xác nhận người dùng đã đọc >= 50% bài.
   *
   * CƠ CHẾ HOẠT ĐỘNG:
   * 1. Frontend dùng IntersectionObserver quan sát một "sentinel" element đặt tại
   *    điểm giữa bài viết. Khi sentinel vào viewport VÀ người dùng đã ở trang >= 3 giây,
   *    Frontend mới gọi POST /posts/:id/view.
   * 2. Backend nhận request, tạo viewerId từ userId (nếu đã đăng nhập) hoặc IP (nếu ẩn danh).
   * 3. Kiểm tra Redis: key "view:post:{id}:{viewerId}" đã tồn tại chưa?
   *    - Nếu ĐÃ CÓ (trong 24h qua): Bỏ qua, trả về { counted: false }.
   *    - Nếu CHƯA CÓ: Tăng view_count trong DB, lưu key vào Redis với TTL 24 giờ.
   * 4. Lý do dùng Redis (thay vì In-Memory cũ):
   *    - Tồn tại qua restart server (In-Memory mất toàn bộ khi server khởi động lại).
   *    - Đồng bộ khi scale nhiều instance (mỗi instance In-Memory là độc lập nhau).
   *    - TTL chính xác tuyệt đối (không bị ảnh hưởng bởi Node.js garbage collection).
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async recordView(id: number, userId?: number, ip?: string): Promise<{ counted: boolean }> {
    const post = await this.postModel.findOne({
      where: { id, deleted_at: null },
      attributes: ['id'], // Chỉ cần xác nhận bài tồn tại, không cần SELECT toàn bộ cột
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Ưu tiên định danh bằng UserID (chính xác nhất).
    // Người dùng ẩn danh → dùng IP (có thể nhiều người chung IP, nhưng chấp nhận được).
    const viewerId = userId ? `user:${userId}` : (ip ? `ip:${ip}` : `ip:unknown`);

    // Định dạng key Redis: "view:post:{postId}:{viewerId}"
    // Ví dụ: "view:post:42:user:99" hoặc "view:post:42:ip:192.168.1.1"
    const cacheKey = `view:post:${id}:${viewerId}`;

    // Kiểm tra trong Redis: người dùng này đã xem bài trong 24 giờ qua chưa?
    const alreadyViewed = await this.cacheManager.get(cacheKey);

    if (alreadyViewed) {
      // Đã xem trong 24h → không tính thêm view để tránh spam
      return { counted: false };
    }

    // Chưa xem → tăng view_count lên 1 trong DB
    // SQL: UPDATE posts SET view_count = view_count + 1 WHERE id = ?
    // Dùng .catch() để đảm bảo lỗi DB không làm crash toàn bộ request
    post.increment('view_count', { by: 1 }).catch(() => null);

    // Lưu key vào Redis với TTL = 24 giờ (86_400_000 ms)
    // Sau 24 giờ, key tự động bị xóa khỏi Redis → lần xem tiếp theo sẽ được tính là view mới
    await this.cacheManager.set(cacheKey, true, 86_400_000).catch(() => null);

    return { counted: true };
  }

  /**
   * getRelated - Lấy danh sách các bài viết liên quan (thường hiển thị ở dưới cùng của chi tiết bài viết).
   * Logic: Ưu tiên lấy các bài cùng category, nếu không đủ 3 bài thì bù thêm các bài viết mới nhất trên hệ thống.
   */
  async getRelated(id: number, userId?: number, lang?: string) {
    const post = await this.postModel.findOne({
      where: { id, deleted_at: null, status: { [Op.in]: ['approved', 'published'] } },
    });
    if (!post) throw new NotFoundException('Post not found');

    // 1. Tìm các bài viết cùng category với giới hạn limit 4 (để khi loại trừ chính bài đang xem vẫn dư đủ 3)
    const query = post.category_id
      ? { category: String(post.category_id), limit: 4, lang }
      : { limit: 4, lang };

    const feed = await this.listFeed(query, undefined, userId);
    // 2. Lọc bỏ bài viết đang xem hiện tại và chỉ lấy tối đa 3 bài
    const related = feed.items.filter(item => item.id !== Number(id)).slice(0, 3);

    // Nếu có đủ số lượng hoặc bài này không có danh mục thì trả về luôn.
    if (related.length >= 3 || !post.category_id) return related;

    // 3. Fallback: Nếu không đủ bài cùng chuyên mục, gọi thêm 1 truy vấn lấy bài mới nhất toàn trang
    const newest = await this.listFeed({ limit: 4, lang }, undefined, userId);

    // Dùng Set lưu lại ID của bài đang xem và các bài đã lấy được để tránh bị lặp lại
    const seen = new Set([Number(id), ...related.map(item => item.id)]);
    const fallback = newest.items.filter(item => !seen.has(item.id));

    // Trộn hai mảng lại và ngắt lấy 3 kết quả
    return [...related, ...fallback].slice(0, 3);
  }
}
