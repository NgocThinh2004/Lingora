export interface DashboardPoint {
  date: string;
  count: number;
}

export interface DashboardArticle {
  id: string;
  title: string;
  viewCount: number;
}

export interface DashboardCategory {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

export interface AdminDashboardOverview {
  summary: {
    totalUsers: number;
    totalArticles: number;
    totalComments: number;
    totalLikes: number;
  };
  users: {
    total: number;
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    growth: DashboardPoint[];
  };
  posts: {
    total: number;
    totalViews: number;
    pendingReview: number;
    byStatus: Record<string, number>;
    topArticles: DashboardArticle[];
    topCategories: DashboardCategory[];
  };
  social: {
    comments: number;
    commentsByStatus: Record<string, number>;
    postLikes: number;
    commentLikes: number;
    totalLikes: number;
    follows: number;
  };
  translations: Record<string, number>;
}
