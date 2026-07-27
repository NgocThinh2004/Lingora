export interface User {
  id: number;
  name: string;
  email?: string;
  handle: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: 'admin' | 'member';
  accentColor?: string | null;
  backgroundColor?: string | null;
  followersCount?: number;
  followingCount?: number;
  allowShowSubscribers: boolean;
  allowShowFollowing: boolean;
  createdAt?: string;
}
