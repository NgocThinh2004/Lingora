import { Injectable } from '@nestjs/common';
import { CommentsService } from '../comments/comments.service';
import { LikesService } from '../likes/likes.service';
import { AdminPostsService } from '../posts/admin/admin-posts.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TranslationsService } from '../translations/translations.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly usersService: UsersService,
    private readonly commentsService: CommentsService,
    private readonly likesService: LikesService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly postsService: AdminPostsService,
    private readonly translationsService: TranslationsService,
  ) {}

  async getOverview(language?: string) {
    const [users, comments, likes, follows, posts, translations] = await Promise.all([
      this.usersService.getDashboardMetrics(),
      this.commentsService.getDashboardMetrics(),
      this.likesService.getDashboardMetrics(),
      this.subscriptionsService.getDashboardMetrics(),
      this.postsService.getDashboardMetrics(language),
      this.translationsService.getMetrics(),
    ]);

    return {
      summary: {
        totalUsers: users.total,
        totalArticles: posts.total,
        totalComments: comments.total,
        totalLikes: likes.total,
      },
      users,
      posts,
      social: {
        comments: comments.total,
        commentsByStatus: comments.byStatus,
        postLikes: likes.postLikes,
        commentLikes: likes.commentLikes,
        totalLikes: likes.total,
        follows: follows.total,
      },
      translations,
    };
  }
}
