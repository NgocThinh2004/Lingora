import { BadRequestException } from '@nestjs/common';
import { PostsService } from './posts.service';

jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (html: string) => html.replace(/<[^>]*>/g, ' '),
}));

describe('PostsService state machine', () => {
  let service: PostsService;

  beforeEach(() => {
    service = new PostsService(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );
  });

  it('allows authors to submit draft and rejected posts for review', () => {
    expect(service.canTransition('draft', 'pending_review')).toBe(true);
    expect(service.canTransition('rejected', 'pending_review')).toBe(true);
  });

  it('allows authors to edit drafts, pending review posts, and rejected posts', () => {
    expect(() => service.assertAuthorCanEdit('draft')).not.toThrow();
    expect(() => service.assertAuthorCanEdit('pending_review')).not.toThrow();
    expect(() => service.assertAuthorCanEdit('rejected')).not.toThrow();
    expect(() => service.assertAuthorCanEdit('approved')).toThrow(BadRequestException);
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

  it('accepts editor content at the configured word limits', () => {
    expect(() => service.assertEditorContentLimits('word '.repeat(20), `<p>${'word '.repeat(3000)}</p>`)).not.toThrow();
  });

  it('rejects titles longer than 20 words', () => {
    expect(() => service.assertEditorContentLimits('word '.repeat(21), '<p>Content</p>')).toThrow(
      BadRequestException,
    );
  });

  it('rejects content longer than 3000 words while ignoring HTML tags', () => {
    expect(() => service.assertEditorContentLimits('Title', `<p>${'word '.repeat(3001)}</p>`)).toThrow(
      BadRequestException,
    );
  });

  it('rejects visually empty editor markup but accepts media-only content', () => {
    expect(() => service.assertEditorContentLimits('Title', '<p><br></p>')).toThrow(BadRequestException);
    expect(() => service.assertEditorContentLimits('Title', '<video controls src="/uploads/test.mp4"></video>')).not.toThrow();
  });
});
