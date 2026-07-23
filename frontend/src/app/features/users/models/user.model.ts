export interface User {
  id: number;
  name: string;
  email?: string;
  handle: string;
  avatarUrl?: string | null;
  bio?: string | null;
  role: 'admin' | 'member';
  accentColor?: string;
  backgroundColor?: string | null;
  allowShowSubscribers: boolean;
  allowShowFollowing: boolean;
  createdAt?: string;
}
