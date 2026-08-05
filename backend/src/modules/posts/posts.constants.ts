/**
 * Constants định nghĩa các trạng thái của bài viết (Post Status) và các luồng chuyển trạng thái.
 * 
 * Bao gồm:
 * - Các trạng thái hợp lệ của bài viết (draft, pending_review, approved, published, v.v.).
 * - Các trạng thái mà tác giả được quyền chỉnh sửa (AUTHOR_EDITABLE_POST_STATUSES).
 * - Luồng chuyển đổi trạng thái (POST_STATUS_TRANSITIONS) giúp kiểm soát workflow duyệt bài.
 */
export const POST_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'published',
  'archived',
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export const AUTHOR_EDITABLE_POST_STATUSES: readonly PostStatus[] = ['draft', 'pending_review', 'rejected'];

export const POST_STATUS_TRANSITIONS: Record<PostStatus, readonly PostStatus[]> = {
  draft: ['pending_review', 'archived'],
  pending_review: ['approved', 'rejected'],
  approved: ['published', 'archived'],
  rejected: ['pending_review', 'archived'],
  published: ['archived'],
  archived: ['draft'],
};
