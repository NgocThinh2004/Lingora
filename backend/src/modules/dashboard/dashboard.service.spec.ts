import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('combines metrics exported by the owning feature modules', async () => {
    const users = {
      total: 12,
      byRole: { admin: 2, member: 10 },
      byStatus: { active: 11, banned: 1 },
      growth: [{ date: '2026-07-27', count: 2 }],
    };
    const comments = { total: 20, byStatus: { approved: 18, hidden: 2 } };
    const likes = { postLikes: 30, commentLikes: 7, total: 37 };
    const posts = {
      total: 8,
      totalViews: 400,
      pendingReview: 3,
      byStatus: { published: 5, pending_review: 3 },
      topArticles: [],
      topCategories: [],
    };
    const translations = { not_started: 0, queued: 1, processing: 0, completed: 9, failed: 2 };
    const service = new DashboardService(
      { getDashboardMetrics: jest.fn().mockResolvedValue(users) } as never,
      { getDashboardMetrics: jest.fn().mockResolvedValue(comments) } as never,
      { getDashboardMetrics: jest.fn().mockResolvedValue(likes) } as never,
      { getDashboardMetrics: jest.fn().mockResolvedValue({ total: 14, topUsers: [{ id: '2', username: 'alex', displayName: 'Alex', avatarUrl: null, followerCount: 9 }] }) } as never,
      { getDashboardMetrics: jest.fn().mockResolvedValue(posts) } as never,
      { getMetrics: jest.fn().mockResolvedValue(translations) } as never,
    );

    await expect(service.getOverview('vi')).resolves.toEqual({
      summary: { totalUsers: 12, totalArticles: 8, totalComments: 20, totalLikes: 30 },
      users,
      posts,
      social: {
        comments: 20,
        commentsByStatus: comments.byStatus,
        postLikes: 30,
        commentLikes: 7,
        totalLikes: 37,
        follows: 14,
        topFollowedUsers: [{ id: '2', username: 'alex', displayName: 'Alex', avatarUrl: null, followerCount: 9 }],
      },
      translations,
    });
    expect((service as any).postsService.getDashboardMetrics).toHaveBeenCalledWith('vi');
  });
});
