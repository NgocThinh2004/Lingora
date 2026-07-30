import { BadRequestException } from '@nestjs/common';
import { AuthorPostsService } from './author-posts.service';

jest.mock('sanitize-html', () => ({
  __esModule: true,
  default: (html: string) => html.replace(/<[^>]*>/g, ' '),
}));

describe('AuthorPostsService state machine', () => {
  let service: AuthorPostsService;

  beforeEach(() => {
    service = new AuthorPostsService(
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

  it('returns distinct post update months for the current author', async () => {
    const postModel = {
      findAll: jest.fn().mockResolvedValue([
        { updated_at: new Date('2026-07-29T08:00:00Z') },
        { updated_at: new Date('2026-07-01T08:00:00Z') },
        { updated_at: new Date('2026-06-15T08:00:00Z') },
      ]),
    };
    const optionsModel = { findAll: jest.fn().mockResolvedValue([]) };
    const optionsService = new AuthorPostsService(
      undefined as never,
      postModel as never,
      undefined as never,
      optionsModel as never,
      optionsModel as never,
      optionsModel as never,
    );

    await expect(optionsService.getAuthorPostFilterOptions('author-1')).resolves.toEqual({
      languages: [],
      categories: [],
      updatedMonths: ['2026-07', '2026-06'],
    });
    expect(postModel.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { author_id: 'author-1' },
    }));
  });
});
