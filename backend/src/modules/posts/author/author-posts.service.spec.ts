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

  it('allows autosave with only a title or only meaningful content', () => {
    expect(() => service.assertAutosaveContentLimits('Incomplete title', '')).not.toThrow();
    expect(() => service.assertAutosaveContentLimits('', '<p>Incomplete content</p>')).not.toThrow();
    expect(() => service.assertAutosaveContentLimits('', '<img src="/uploads/draft.png">')).not.toThrow();
  });

  it('rejects an entirely empty autosave snapshot', () => {
    expect(() => service.assertAutosaveContentLimits('', '<p><br></p>')).toThrow(BadRequestException);
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

  it('includes hidden categories used by the author in filter options', async () => {
    const postModel = {
      findAll: jest.fn().mockResolvedValue([
        { category_id: 8, updated_at: new Date('2026-07-29T08:00:00Z') },
      ]),
    };
    const languageModel = { findAll: jest.fn().mockResolvedValue([]) };
    const categoryModel = {
      findAll: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 8, slug: 'technology', status: 'inactive' }]),
    };
    const categoryTranslationModel = {
      findAll: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ category_id: 8, language_id: 1, name: 'Technology' }]),
    };
    const optionsService = new AuthorPostsService(
      undefined as never,
      postModel as never,
      undefined as never,
      languageModel as never,
      categoryModel as never,
      categoryTranslationModel as never,
    );

    await expect(optionsService.getAuthorPostFilterOptions('author-1')).resolves.toEqual({
      languages: [],
      categories: [{ id: 8, label: 'Technology', isActive: false }],
      updatedMonths: ['2026-07'],
    });
  });

  it('permanently discards an owned draft', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    const transaction = {};
    const postModel = {
      findOne: jest.fn().mockResolvedValue({ id: 'draft-1', status: 'draft', destroy }),
    };
    const sequelize = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback(transaction)),
    };
    const draftService = new AuthorPostsService(
      sequelize as never,
      postModel as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );

    await expect(draftService.discardAuthorDraft('author-1', 'draft-1')).resolves.toEqual({
      id: 'draft-1',
    });
    expect(postModel.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'draft-1', author_id: 'author-1', deleted_at: null },
      transaction,
    }));
    expect(destroy).toHaveBeenCalledWith({ transaction });
  });

  it('does not discard a post that is already pending review', async () => {
    const postModel = {
      findOne: jest.fn().mockResolvedValue({ id: 'pending-1', status: 'pending_review' }),
    };
    const sequelize = {
      transaction: jest.fn((callback: (value: unknown) => unknown) => callback({})),
    };
    const draftService = new AuthorPostsService(
      sequelize as never,
      postModel as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );

    await expect(draftService.discardAuthorDraft('author-1', 'pending-1')).rejects.toThrow(
      BadRequestException,
    );
  });
});
