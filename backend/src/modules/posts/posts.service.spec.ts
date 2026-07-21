import { BadRequestException } from '@nestjs/common';
import { PostsService } from './posts.service';

describe('PostsService state machine', () => {
  let service: PostsService;

  beforeEach(() => {
    service = new PostsService(undefined as never, undefined as never, undefined as never);
  });

  it('allows authors to submit draft and rejected posts for review', () => {
    expect(service.canTransition('draft', 'pending_review')).toBe(true);
    expect(service.canTransition('rejected', 'pending_review')).toBe(true);
  });

  it('blocks invalid post transitions', () => {
    expect(() => service.assertCanTransition('pending_review', 'published')).toThrow(BadRequestException);
    expect(() => service.assertCanTransition('published', 'draft')).toThrow(BadRequestException);
  });

  it('allows admins to approve, reject, and publish through the moderation path', () => {
    expect(service.canTransition('pending_review', 'approved')).toBe(true);
    expect(service.canTransition('pending_review', 'rejected')).toBe(true);
    expect(service.canTransition('approved', 'published')).toBe(true);
  });

  it('requires a review note when rejecting', () => {
    expect(() => service.assertRejectNote('')).toThrow(BadRequestException);
    expect(() => service.assertRejectNote('Needs clearer references.')).not.toThrow();
  });
});
