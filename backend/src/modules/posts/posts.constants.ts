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
