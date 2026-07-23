import { User } from './user.model';

export interface Comment {
  id: number;
  postId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  author: User;
  replies?: Comment[];
  createdAt: string;
}
