import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService dashboard metrics', () => {
  it('ranks active users by follower count and excludes unavailable accounts', async () => {
    const subscriptionModel = {
      count: jest.fn().mockResolvedValue(10),
      findAll: jest.fn().mockResolvedValue([
        { author_id: '3', followerCount: '6' },
        { author_id: '2', followerCount: '4' },
        { author_id: '1', followerCount: '3' },
      ]),
    };
    const userModel = {
      findAll: jest.fn().mockResolvedValue([
        { id: '2', username: 'alex', display_name: 'Alex', avatar: null },
        { id: '1', username: 'mai', display_name: null, avatar: '/mai.png' },
      ]),
    };
    const service = new SubscriptionsService(
      subscriptionModel as never,
      userModel as never,
      {} as never,
    );

    await expect(service.getDashboardMetrics()).resolves.toEqual({
      total: 10,
      topUsers: [
        { id: '2', username: 'alex', displayName: 'Alex', avatarUrl: null, followerCount: 4 },
        { id: '1', username: 'mai', displayName: null, avatarUrl: '/mai.png', followerCount: 3 },
      ],
    });
    expect(userModel.findAll).toHaveBeenCalledWith({
      where: { id: ['3', '2', '1'], status: 'active', deleted_at: null },
    });
  });
});
