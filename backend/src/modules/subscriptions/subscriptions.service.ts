import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, fn, Op } from 'sequelize';
import { Subscription, User } from '../../database/models';
import { PublicPostsService } from '../posts/public/public-posts.service';
import { removeAccents } from '../../utils/string.util';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription) private readonly subscriptionModel: typeof Subscription,
    @InjectModel(User) private readonly userModel: typeof User,
    private readonly postsService: PublicPostsService,
  ) {}

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER MỞ TRANG "FEED" (BẢNG TIN CỦA NHỮNG NGƯỜI MÌNH THEO DÕI)
   * ═══════════════════════════════════════════════════════════════════════════
   * Luồng xử lý chi tiết:
   * 1. Hệ thống tìm xem user này đang follow những ai.
   *    -> Lấy danh sách tác giả (author_id) từ bảng subscriptions dựa vào subscriber_id của user.
   * 2. Nếu người dùng có filter theo 1 người cụ thể (authorIdFilter), kiểm tra người đó có nằm trong danh sách đang follow không.
   * 3. Gọi qua PostsService, nhờ truy vấn lấy bài viết của NHỮNG TÁC GIẢ đó.
   *    -> Dùng WHERE author_id IN (danh sách ID).
   */
  async getFeed(subscriberId: string, authorIdFilter?: string, lang?: string, pageStr?: string, limitStr?: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { subscriber_id: subscriberId },
    });
    
    const followingIds = subscriptions.map(item => String(item.author_id));
    if (!followingIds.length) {
      return { items: [], meta: { total: 0, page: 1, totalPages: 1 } };
    }

    let queryAuthorIds = followingIds;
    if (authorIdFilter) {
      if (followingIds.includes(String(authorIdFilter))) {
        queryAuthorIds = [String(authorIdFilter)];
      } else {
        return { items: [], meta: { total: 0, page: 1, totalPages: 1 } };
      }
    }

    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;

    return await this.postsService.listFeedByAuthorIds(queryAuthorIds, { limit, page, lang }, Number(subscriberId));
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER BẤM "FOLLOW TÁC GIẢ" (SUBSCRIBE)
   * ═══════════════════════════════════════════════════════════════════════════
   * Luồng xử lý chi tiết từ request xuống DB:
   * 
   * 1. Validate Điều kiện:
   *    - Người dùng không được phép tự click Follow chính bản thân họ.
   *    - Tác giả mà họ định Follow phải TỒN TẠI trong hệ thống và TRẠNG THÁI ACTIVE.
   * 
   * 2. Xử lý Thêm Dữ Liệu (Idempotent / An Toàn):
   *    - Hành động: Sử dụng hàm `findOrCreate` (Tìm hoặc Tạo).
   *    - Mục đích: Tránh lỗi trùng lặp khi user spam nút Follow liên tục. 
   *      Bảng `subscriptions` đã có UNIQUE CONSTRAINT cho cặp (subscriber_id, author_id).
   *    - Cách DB chạy ngầm: 
   *      + SELECT xem cặp (User A follow User B) có tồn tại chưa.
   *      + Nếu CHƯA: Bắn lệnh INSERT INTO subscriptions (subscriber_id, author_id) VALUES (...).
   *      + Nếu CÓ RỒI: Hàm findOrCreate tự động nhận diện bản ghi đã có và bỏ qua bước Insert, không văng lỗi sập DB.
   * 
   * 3. Kết quả trả về: Trả về trạng thái `subscribed = true` để báo UI hiện nút "Đang theo dõi" xanh lá mạ.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async subscribe(subscriberId: string, authorId: string) {
    // Check 1: Không được tự follow chính mình
    if (String(subscriberId) === String(authorId)) {
      throw new ConflictException('You cannot subscribe to yourself');
    }
    
    // Check 2: Tác giả phải tồn tại và đang active
    // SQL: SELECT * FROM users WHERE id = :authorId AND status = 'active' AND deleted_at IS NULL LIMIT 1;
    const author = await this.userModel.findOne({ where: { id: authorId, status: 'active', deleted_at: null } });
    if (!author) throw new NotFoundException('Author not found');
    
    // Thực thi Tạo bản ghi (Có cơ chế kiểm tra chống trùng lặp từ ORM + DB Unique Constraint)
    const [subscription] = await this.subscriptionModel.findOrCreate({
      where: { subscriber_id: subscriberId, author_id: authorId },
      defaults: { subscriber_id: subscriberId, author_id: authorId, last_viewed_at: null, created_at: new Date() },
    });
    return { authorId: subscription.author_id, subscribed: true };
  }

  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * HÀNH ĐỘNG: USER BẤM "UNFOLLOW TÁC GIẢ" (UNSUBSCRIBE)
   * ═══════════════════════════════════════════════════════════════════════════
   * Luồng xử lý chi tiết từ request xuống DB:
   * 
   * 1. Hành động Xóa dữ liệu:
   *    - Khi user muốn hủy theo dõi (Unfollow), chúng ta chỉ đơn giản là xóa bản ghi liên kết giữa User A (người follow) và User B (tác giả) khỏi cơ sở dữ liệu.
   * 
   * 2. Câu lệnh SQL ngầm:
   *    - DELETE FROM subscriptions WHERE subscriber_id = [ID_CỦA_USER] AND author_id = [ID_TÁC_GIẢ];
   * 
   * 3. Kết quả trả về: 
   *    - Trả về `subscribed = false` để Frontend đổi nút "Đang theo dõi" thành "Theo dõi" màu xám bình thường.
   * ═══════════════════════════════════════════════════════════════════════════
   */
  async unsubscribe(subscriberId: string, authorId: string) {
    // Xóa record liên kết
    await this.subscriptionModel.destroy({ where: { subscriber_id: subscriberId, author_id: authorId } });
    return { authorId, subscribed: false };
  }

  /**
   * listFollowers - Lấy danh sách những người đang theo dõi user.
   */
  async listFollowers(userId: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { author_id: userId },
      order: [['created_at', 'DESC']],
    });
    return this.listActiveUsers(subscriptions.map(item => item.subscriber_id));
  }

  /**
   * listFollowing - Lấy danh sách các tác giả mà user đang theo dõi, có hỗ trợ tìm kiếm và phân trang.
   */
  async listFollowing(userId: string, q?: string, pageStr?: string, limitStr?: string) {
    const subscriptions = await this.subscriptionModel.findAll({
      where: { subscriber_id: userId },
      order: [['created_at', 'DESC']],
    });
    if (!subscriptions.length) {
      return { items: [], meta: { total: 0, page: 1, totalPages: 1 } };
    }

    const authorIds = subscriptions.map(item => item.author_id);
    let whereClause: any = { id: authorIds, status: 'active', deleted_at: null };
    
    if (q) {
      const rawQ = q.trim();
      const qWithoutAt = rawQ.startsWith('@') ? rawQ.substring(1) : rawQ;
      const keyword = `%${removeAccents(rawQ)}%`;
      const keywordWithoutAt = `%${removeAccents(qWithoutAt)}%`;
      whereClause = {
        ...whereClause,
        [Op.or]: [
          { username: { [Op.like]: keywordWithoutAt } },
          { unaccented_display_name: { [Op.like]: keyword } }
        ]
      };
    }

    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : authorIds.length;
    const offset = (page - 1) * limit;

    const { rows, count } = await this.userModel.findAndCountAll({
      where: whereClause,
      limit,
      offset
    });

    return {
      items: rows.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar,
        bio: user.bio,
      })),
      meta: {
        total: count,
        page,
        totalPages: Math.ceil(count / limit) || 1
      }
    };
  }

  /**
   * getDashboardMetrics - Thống kê tổng số lượt theo dõi và top 5 tác giả có nhiều follower nhất.
   */
  async getDashboardMetrics() {
    const [total, followerGroups] = await Promise.all([
      this.subscriptionModel.count(),
      this.subscriptionModel.findAll({
        attributes: [
          'author_id',
          [fn('COUNT', col('id')), 'followerCount'],
        ],
        group: ['author_id'],
        order: [[fn('COUNT', col('id')), 'DESC'], ['author_id', 'ASC']],
        limit: 5,
        raw: true,
      }),
    ]);

    const rankedAuthors = followerGroups as unknown as Array<{
      author_id: string;
      followerCount: string | number;
    }>;
    const authorIds = rankedAuthors.map(item => item.author_id);
    const authors = authorIds.length
      ? await this.userModel.findAll({
          where: { id: authorIds, status: 'active', deleted_at: null },
        })
      : [];
    const authorsById = new Map(authors.map(author => [String(author.id), author]));

    const topUsers = rankedAuthors
      .map(item => ({ item, user: authorsById.get(String(item.author_id)) }))
      .filter((entry): entry is { item: typeof entry.item; user: User } => Boolean(entry.user))
      .map(({ item, user }) => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar,
        followerCount: Number(item.followerCount),
      }));

    return { total, topUsers };
  }

  /**
   * listActiveUsers - Hàm helper để lấy thông tin public của một danh sách ID user.
   */
  private async listActiveUsers(userIds: string[]) {
    if (!userIds.length) {
      return [];
    }

    const users = await this.userModel.findAll({
      where: { id: userIds, status: 'active', deleted_at: null },
    });
    const usersById = new Map(users.map(user => [String(user.id), user]));

    return userIds
      .map(id => usersById.get(String(id)))
      .filter((user): user is User => Boolean(user))
      .map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar,
        bio: user.bio,
      }));
  }
}
