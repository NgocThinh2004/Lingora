import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AuthorPost, CreatePostPayload, PostTranslation } from '../posts/models/post.model';
import { EditorMediaType } from './models/editor-upload.model';
import { AuthorPostsService } from '../posts/services/author-posts.service';
import { EditorUploadsService } from './services/editor-uploads.service';
import { ToastService } from '../../core/notifications/toast.service';

type SaveMode = 'draft' | 'submit';
type BaselineFormat = 'normal' | 'superscript' | 'subscript';

@Component({
  selector: 'app-post-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-editor.component.html',
  styleUrl: './post-editor.component.scss',
})
export class PostEditorComponent implements OnInit, OnDestroy {
  private readonly postsService = inject(AuthorPostsService);
  private readonly uploadsService = inject(EditorUploadsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private savedRange: Range | null = null;
  private activeBaselineFormat: BaselineFormat = 'normal';
  private navigateAfterSave = false;
  private activeLinkElement: HTMLAnchorElement | null = null;
  private editingLinkElement: HTMLAnchorElement | null = null;
  private readonly codeProtectedCommands = new Set(['bold', 'italic', 'strikeThrough']);
  private previousTheme: string | null = null;
  readonly titleWordLimit = 20;
  readonly bodyWordLimit = 3000;

  get authorDisplayName(): string {
    const user = this.authService.currentUser();
    return user?.displayName?.trim() || user?.username || 'Lingora Author';
  }

  get authorInitial(): string {
    return this.authorDisplayName.charAt(0).toUpperCase();
  }

  @ViewChild('postBody') private readonly postBody?: ElementRef<HTMLElement>;

  languageOptions = [
    { id: 1, code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt' },
    { id: 2, code: 'en', label: 'English', nativeLabel: 'English' },
    { id: 3, code: 'zh', label: 'Chinese', nativeLabel: '中文 (Chinese)' },
  ];

  categoryOptions: Array<{ id: number; label: string }> = [];

  draft: CreatePostPayload = {
    title: '',
    categoryId: undefined,
    originalLanguageId: 1,
    targetLanguageIds: [2, 3],
    content: '',
  };

  targetInput = '2,3';
  createdPost: AuthorPost | null = null;
  saveMode: SaveMode | null = null;
  uploadingType: EditorMediaType | null = null;
  showPreview = false;
  showPublishOptions = false;
  showLinkModal = false;
  showDraftConfirm = false;
  previewMode: 'desktop' | 'mobile' = 'desktop';
  previewLanguageId = 1;
  linkText = '';
  linkUrl = '';
  linkModalTop = 150;
  linkModalLeft = 150;
  linkModalAbove = false;
  showLinkBubble = false;
  linkBubbleUrl = '';
  linkBubbleTop = 150;
  linkBubbleLeft = 150;
  linkBubbleAbove = false;
  shareLabel = 'Share';
  private readonly allowedTargetLanguageIds = new Set<number>([2, 3]);

  ngOnInit(): void {
    this.previousTheme = document.documentElement.getAttribute('data-bs-theme');
    document.documentElement.setAttribute('data-bs-theme', 'light');
    document.body.classList.add('editor-page');
    this.updateBodyModalClasses();
    this.postsService.getPostOptions().subscribe({
      next: options => {
        this.languageOptions = options.languages;
        this.categoryOptions = options.categories;
      },
      error: () => {
        // Language fallbacks remain available; an empty category list safely saves as uncategorized.
      },
    });

    const postId = this.route.snapshot.paramMap.get('id');
    if (postId) {
      this.loadPost(postId);
    }
  }

  ngOnDestroy(): void {
    if (this.previousTheme) {
      document.documentElement.setAttribute('data-bs-theme', this.previousTheme);
    } else {
      document.documentElement.removeAttribute('data-bs-theme');
    }
    document.body.classList.remove('editor-page', 'preview-modal-open', 'publish-modal-open', 'draft-modal-open');
  }

  get contentPreview(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.buildPreviewHtml(this.draft.content || '<p>No content yet.</p>'));
  }

  get titleWordCount(): number {
    return this.countWords(this.draft.title);
  }

  get bodyWordCount(): number {
    return this.countWords(this.draft.content.replace(/<[^>]*>/g, ' '));
  }

  get titleLimitLabel(): string {
    return this.formatLimitLabel(this.titleWordCount, this.titleWordLimit);
  }

  get bodyLimitLabel(): string {
    return this.formatLimitLabel(this.bodyWordCount, this.bodyWordLimit);
  }

  get isTitleNearLimit(): boolean {
    return this.isNearLimit(this.titleWordCount, this.titleWordLimit);
  }

  get isTitleOverLimit(): boolean {
    return this.titleWordCount > this.titleWordLimit;
  }

  get isBodyNearLimit(): boolean {
    return this.isNearLimit(this.bodyWordCount, this.bodyWordLimit);
  }

  get isBodyOverLimit(): boolean {
    return this.bodyWordCount > this.bodyWordLimit;
  }

  get sourceTranslation(): PostTranslation | null {
    if (!this.createdPost) {
      return null;
    }

    return (
      this.createdPost.translations.find(
        (translation) => translation.languageId === this.createdPost?.originalLanguageId,
      ) ?? null
    );
  }

  updateOriginalLanguageId(value: string | number): void {
    this.draft.originalLanguageId = this.toRequiredNumber(value, 1);
    this.allowedTargetLanguageIds.delete(this.draft.originalLanguageId);
    this.syncTargetInput();
  }

  updateCategoryId(value: string | number): void {
    const parsed = Number(value);
    this.draft.categoryId = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  updateContentFromEditor(event: Event): void {
    this.draft.content = (event.target as HTMLElement).innerHTML;
    this.saveEditorSelection();
  }

  autoResizeTitle(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const limitedTitle = this.trimToWordLimit(textarea.value, this.titleWordLimit);
    if (textarea.value !== limitedTitle) {
      textarea.value = limitedTitle;
      this.draft.title = limitedTitle;
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  saveDraft(): void {
    this.save('draft');
  }

  openPublishOptions(): void {
    this.syncContentFromEditor();
    if (this.isBodyOverLimit) {
      return;
    }
    this.showPublishOptions = true;
    this.updateBodyModalClasses();
  }

  closePublishOptions(openDraftConfirm = false): void {
    this.showPublishOptions = false;
    this.showDraftConfirm = openDraftConfirm;
    this.updateBodyModalClasses();
  }

  saveAndSubmit(): void {
    this.showPublishOptions = false;
    this.updateBodyModalClasses();
    this.save('submit');
  }

  triggerFileInput(input: HTMLInputElement): void {
    this.saveEditorSelection();
    input.click();
  }

  openPreview(languageId = this.draft.originalLanguageId): void {
    this.syncContentFromEditor();
    this.previewLanguageId = languageId;
    this.shareLabel = 'Share';
    this.showPreview = true;
    this.updateBodyModalClasses();
  }

  closePreview(): void {
    this.showPreview = false;
    this.updateBodyModalClasses();
  }

  setPreviewMode(mode: 'desktop' | 'mobile'): void {
    this.previewMode = mode;
  }

  copyPreview(): void {
    const text = [this.draft.title || 'Untitled post', this.editorTextContent()].filter(Boolean).join('\n\n');
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        this.shareLabel = 'Copied';
        window.setTimeout(() => (this.shareLabel = 'Share'), 1400);
      })
      .catch(() => {
        this.shareLabel = 'Ready';
        window.setTimeout(() => (this.shareLabel = 'Share'), 1400);
      });
  }

  handleToolbarMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      this.saveEditorSelection();
      event.preventDefault();
    }
  }

  handleToolbarClick(event: Event): void {
    const target = event.target as HTMLElement;
    const button = target.closest('button') as HTMLButtonElement | null;
    if (!button) {
      return;
    }

    const menu = button.closest('.tool-menu');
    if (button.matches('[data-menu-trigger]')) {
      event.preventDefault();
      const shouldOpen = !!menu && !menu.classList.contains('is-open');
      this.closeToolbarMenus();
      if (shouldOpen && menu) {
        menu.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    const command = button.dataset['command'];
    const formatBlock = button.dataset['formatBlock'];
    const alignCommand = button.dataset['alignCommand'];
    const insertMedia = button.dataset['insertMedia'] as EditorMediaType | undefined;
    const applyColor = button.dataset['applyColor'];
    const color = button.dataset['color'];
    const inlineFormat = button.dataset['inlineFormat'];
    const insertMore = button.dataset['insertMore'];

    if (command) {
      event.preventDefault();
      if (command === 'createLink') {
        this.openLinkModalFromSelection();
        this.closeToolbarMenus();
        return;
      }

      if (this.isCodeProtectedCommand(command) && this.selectionTouchesCode()) {
        this.closeToolbarMenus();
        this.updateToolbarState();
        return;
      }

      this.runEditorCommand(command);
      this.closeToolbarMenus();
      return;
    }

    if (button.hasAttribute('data-inline-code')) {
      event.preventDefault();
      this.toggleInlineCode();
      this.closeToolbarMenus();
      return;
    }

    if (formatBlock) {
      event.preventDefault();
      this.insertBlock(formatBlock);
      this.markMenuSelection(button, '[data-format-block]');
      this.closeToolbarMenus();
      return;
    }

    if (alignCommand) {
      event.preventDefault();
      this.runEditorCommand(alignCommand);
      this.markMenuSelection(button, '[data-align-command]');
      this.closeToolbarMenus();
      return;
    }

    if (insertMedia) {
      event.preventDefault();
      this.saveEditorSelection();
      document.getElementById(`editor${this.capitalize(insertMedia)}Input`)?.click();
      this.closeToolbarMenus();
      return;
    }

    if (applyColor !== undefined) {
      event.preventDefault();
      if (this.selectionTouchesCode()) {
        this.closeToolbarMenus();
        this.updateToolbarState();
        return;
      }

      this.updateColorTrigger(button, color);
      if (!color) {
        this.runEditorCommand('removeFormat');
      } else if (applyColor === 'text') {
        this.runEditorCommand('foreColor', color);
      } else if (applyColor === 'highlight') {
        this.runEditorCommand('hiliteColor', color);
      }
      this.closeToolbarMenus();
      return;
    }

    if (inlineFormat) {
      event.preventDefault();
      this.setBaselineFormat(inlineFormat);
      this.markMenuSelection(button, '[data-inline-format]');
      this.closeToolbarMenus();
      return;
    }

    if (insertMore) {
      event.preventDefault();
      this.insertMoreBlock(insertMore);
      this.closeToolbarMenus();
    }
  }

  runEditorCommand(command: string, value?: string): void {
    if (this.isCodeProtectedCommand(command) && this.selectionTouchesCode()) {
      this.updateToolbarState();
      return;
    }

    this.restoreSelection();
    document.execCommand(command, false, value);
    this.syncContentFromEditor();
    this.saveEditorSelection();
    this.updateToolbarState();
  }

  insertBlock(tagName: string): void {
    this.runEditorCommand('formatBlock', tagName);
  }

  uploadMedia(mediaType: EditorMediaType, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    input.value = '';

    if (!file) {
      return;
    }

    this.uploadingType = mediaType;
    this.uploadsService.uploadEditorMedia(mediaType, file).subscribe({
      next: (upload) => {
        const url = this.uploadsService.toAbsoluteUrl(upload.url);
        this.insertHtml(this.buildMediaHtml(mediaType, url, upload.filename), true);
        this.toast.showSuccess(`Đã tải lên ${upload.filename}.`);
        this.uploadingType = null;
      },
      error: (error: unknown) => {
        this.toast.showError(this.formatError(error));
        this.uploadingType = null;
      },
    });
  }

  goToMyPosts(): void {
    this.syncContentFromEditor();
    if (this.hasDraftContent()) {
      this.showDraftConfirm = true;
      this.updateBodyModalClasses();
      return;
    }

    void this.router.navigateByUrl('/workspace/posts');
  }

  languageLabel(languageId: number): string {
    return this.languageOptions.find((language) => language.id === languageId)?.label ?? `Language ${languageId}`;
  }

  languageNativeLabel(languageId: number): string {
    return this.languageOptions.find((language) => language.id === languageId)?.nativeLabel ?? this.languageLabel(languageId);
  }

  languageCode(languageId: number): string {
    return this.languageOptions.find((language) => language.id === languageId)?.code ?? String(languageId);
  }

  isTargetLanguageEnabled(languageId: number): boolean {
    return this.allowedTargetLanguageIds.has(languageId);
  }

  toggleTargetLanguage(languageId: number, checked: boolean): void {
    if (languageId === this.draft.originalLanguageId) {
      this.allowedTargetLanguageIds.delete(languageId);
      this.syncTargetInput();
      return;
    }

    if (checked) {
      this.allowedTargetLanguageIds.add(languageId);
    } else {
      this.allowedTargetLanguageIds.delete(languageId);
    }

    this.syncTargetInput();
  }

  previewTranslation(languageId = this.draft.originalLanguageId): void {
    this.showPublishOptions = false;
    this.openPreview(languageId);
  }

  closeLinkModal(): void {
    this.showLinkModal = false;
  }

  applyLink(event: Event): void {
    event.preventDefault();
    const url = this.normalizeUrl(this.linkUrl);
    if (!url) {
      return;
    }

    const text = this.linkText.trim() || url.replace(/^https?:\/\//i, '');
    if (this.editingLinkElement?.isConnected) {
      this.editingLinkElement.href = url;
      this.editingLinkElement.textContent = text;
      this.prepareEditorLink(this.editingLinkElement);
      this.showLinkBubbleFor(this.editingLinkElement);
      this.syncContentFromEditor();
    } else {
      this.insertHtml(
        `<a href="${this.escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" data-editor-link="true" contenteditable="false">${this.escapeHtml(text)}</a>`,
        true,
      );
    }

    this.editingLinkElement = null;
    this.closeLinkModal();
  }

  handleEditorClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const editorLink = target.closest('.rich-editor a[href]') as HTMLAnchorElement | null;
    if (editorLink) {
      event.preventDefault();
      this.showLinkBubbleFor(editorLink);
      return;
    }

    const mediaRemove = target.closest('[data-remove-media]');
    if (mediaRemove) {
      event.preventDefault();
      const mediaWrapper = mediaRemove.closest('.editor-media-wrapper');
      this.removeEmptyParagraphAfter(mediaWrapper);
      mediaWrapper?.remove();
      this.syncContentFromEditor();
      return;
    }

    const languageTrigger = target.closest('[data-code-language-trigger]') as HTMLElement | null;
    if (languageTrigger) {
      event.preventDefault();
      const languageWrap = languageTrigger.closest('.editor-code-language');
      const isOpen = !languageWrap?.classList.contains('is-open');
      this.closeCodeLanguageMenus();
      languageWrap?.classList.toggle('is-open', isOpen);
      languageTrigger.setAttribute('aria-expanded', String(isOpen));
      return;
    }

    const languageItem = target.closest('[data-code-language]') as HTMLElement | null;
    if (languageItem) {
      event.preventDefault();
      const languageWrap = languageItem.closest('.editor-code-language');
      const label = languageWrap?.querySelector('[data-code-language-label]');
      const selectedLanguage = languageItem.getAttribute('data-code-language') || 'Auto-detect';
      if (label) {
        label.textContent = selectedLanguage;
      }
      languageWrap
        ?.querySelectorAll('.editor-code-language-item')
        .forEach((item) => item.classList.remove('is-selected'));
      languageItem.classList.add('is-selected');
      languageWrap?.classList.remove('is-open');
      languageWrap?.querySelector('[data-code-language-trigger]')?.setAttribute('aria-expanded', 'false');
      this.syncContentFromEditor();
      return;
    }

    const codeRemove = target.closest('[data-remove-code-block]');
    if (codeRemove) {
      event.preventDefault();
      const codeBlock = codeRemove.closest('.editor-code-block');
      this.removeEmptyParagraphAfter(codeBlock);
      codeBlock?.remove();
      this.syncContentFromEditor();
      return;
    }

    this.closeLinkBubble();
    this.saveEditorSelection();
  }

  handleEditorKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.selectEditorContents();
    }
  }

  saveEditorSelection(): void {
    const editor = this.editorElement();
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (this.rangeBelongsToEditor(range, editor)) {
      this.savedRange = range.cloneRange();
    }
  }

  closeDraftConfirm(): void {
    this.showDraftConfirm = false;
    this.updateBodyModalClasses();
  }

  discardDraft(): void {
    this.showDraftConfirm = false;
    this.updateBodyModalClasses();
    void this.router.navigateByUrl('/workspace/posts');
  }

  saveDraftAndLeave(): void {
    this.navigateAfterSave = true;
    this.showDraftConfirm = false;
    this.updateBodyModalClasses();
    this.save('draft');
  }

  @HostListener('document:selectionchange')
  onDocumentSelectionChange(): void {
    this.saveEditorSelection();
    this.updateToolbarState();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.tool-menu')) {
      this.closeToolbarMenus();
    }

    if (!target.closest('.editor-code-language')) {
      this.closeCodeLanguageMenus();
    }

    if (
      this.showLinkModal &&
      !target.closest('[data-link-modal]') &&
      !target.closest('[data-link-bubble]') &&
      !target.closest('[data-command="createLink"]')
    ) {
      this.closeLinkModal();
    }

    if (
      this.showLinkBubble &&
      !target.closest('[data-link-bubble]') &&
      !target.closest('.rich-editor a[href]')
    ) {
      this.closeLinkBubble();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }

    if (this.showLinkModal) {
      event.preventDefault();
      this.closeLinkModal();
      return;
    }

    if (this.showLinkBubble) {
      event.preventDefault();
      this.closeLinkBubble();
      return;
    }

    if (this.showPreview) {
      event.preventDefault();
      this.closePreview();
      return;
    }

    if (this.showPublishOptions) {
      event.preventDefault();
      this.closePublishOptions(true);
      return;
    }

    if (this.showDraftConfirm) {
      event.preventDefault();
      this.closeDraftConfirm();
      return;
    }

    this.closeToolbarMenus();
    this.closeCodeLanguageMenus();
  }

  changeActiveLink(): void {
    if (!this.activeLinkElement?.isConnected) {
      return;
    }

    this.openLinkModalFromLink(this.activeLinkElement);
  }

  removeActiveLink(): void {
    const link = this.activeLinkElement;
    if (!link?.isConnected || !link.parentNode) {
      this.closeLinkBubble();
      return;
    }

    const marker = document.createTextNode('');
    link.parentNode.insertBefore(marker, link.nextSibling);
    while (link.firstChild) {
      link.parentNode.insertBefore(link.firstChild, link);
    }
    link.remove();
    this.placeCaretAtNode(marker);
    marker.remove();
    this.closeLinkBubble();
    this.syncContentFromEditor();
  }

  private save(mode: SaveMode): void {
    this.syncContentFromEditor();
    const payload = this.buildPayload();
    if (!payload.title.trim() || !this.hasMeaningfulContent(payload.content)) {
      this.toast.showError('Tiêu đề và nội dung là bắt buộc.');
      return;
    }
    if (this.isTitleOverLimit || this.isBodyOverLimit) {
      this.toast.showError(
        `Tiêu đề tối đa ${this.titleWordLimit} từ và nội dung tối đa ${this.bodyWordLimit} từ.`,
      );
      return;
    }

    this.saveMode = mode;

    const request$ = this.createdPost
      ? this.postsService.updateAuthorPost(this.createdPost.id, payload)
      : this.postsService.createAuthorPost(payload);

    request$
      .pipe(
        switchMap((post) => {
          this.createdPost = post;

          if (mode === 'submit' && post.status !== 'pending_review') {
            return this.postsService.submitAuthorPost(post.id);
          }

          return of(post);
        }),
      )
      .subscribe({
        next: (post) => {
          this.createdPost = post;
          this.saveMode = null;
          if (mode === 'submit') {
            this.navigateToMyPosts(`Bài #${post.id} đã được gửi duyệt.`);
            return;
          }
          if (this.navigateAfterSave) {
            this.navigateAfterSave = false;
            this.navigateToMyPosts(`Đã lưu bản nháp #${post.id}.`);
            return;
          }
          this.toast.showSuccess(`Đã lưu bản nháp #${post.id}.`);
        },
        error: (error: unknown) => {
          this.toast.showError(this.formatError(error));
          this.saveMode = null;
          this.navigateAfterSave = false;
        },
      });
  }

  private loadPost(postId: string): void {
    this.saveMode = 'draft';
    this.postsService.getAuthorPost(postId).subscribe({
      next: post => {
        const source = post.translations.find(item => item.languageId === post.originalLanguageId) ?? post.translations[0];
        this.createdPost = post;
        this.draft = {
          title: source?.title ?? '',
          categoryId: post.categoryId ?? undefined,
          originalLanguageId: post.originalLanguageId,
          targetLanguageIds: post.translationMatrix
            .filter(item => item.languageId !== post.originalLanguageId)
            .map(item => item.languageId),
          content: source?.content ?? '',
        };
        this.allowedTargetLanguageIds.clear();
        this.draft.targetLanguageIds?.forEach(id => this.allowedTargetLanguageIds.add(id));
        this.targetInput = this.draft.targetLanguageIds?.join(',') ?? '';
        if (this.postBody?.nativeElement) {
          this.postBody.nativeElement.innerHTML = this.draft.content;
        }
        this.saveMode = null;
      },
      error: error => {
        this.toast.showError(this.formatError(error));
        this.saveMode = null;
      },
    });
  }

  private navigateToMyPosts(successMessage: string): void {
    this.toast.showSuccess(successMessage);
    void this.router.navigateByUrl('/workspace/posts')
      .then(navigated => {
        if (!navigated) {
          this.toast.showError('Không thể mở trang bài viết của tôi.');
        }
      })
      .catch(() => this.toast.showError('Không thể mở trang bài viết của tôi.'));
  }

  private buildPayload(): CreatePostPayload {
    return {
      title: this.draft.title.trim(),
      categoryId: this.draft.categoryId,
      originalLanguageId: this.draft.originalLanguageId,
      targetLanguageIds: this.parseTargetLanguageIds(),
      content: this.draft.content,
    };
  }

  private parseTargetLanguageIds(): number[] {
    const ids = [...this.allowedTargetLanguageIds].filter(
      (value) => Number.isInteger(value) && value > 0 && value !== this.draft.originalLanguageId,
    );

    return [...new Set(ids)];
  }

  private buildMediaHtml(mediaType: EditorMediaType, url: string, filename: string): string {
    const safeName = this.escapeAttribute(filename);
    const safeUrl = this.escapeAttribute(url);
    const mediaHtml =
      mediaType === 'image'
        ? `<img src="${safeUrl}" alt="${safeName}" loading="lazy">`
        : mediaType === 'audio'
          ? `<audio controls src="${safeUrl}" title="${safeName}"></audio>`
          : `<video controls playsinline src="${safeUrl}" title="${safeName}"></video>`;

    return (
      `<div class="editor-media-wrapper" contenteditable="false">` +
      `${mediaHtml}` +
      `<button type="button" class="editor-media-delete" data-remove-media title="Delete media">` +
      `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">` +
      `<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>` +
      `</svg>` +
      `</button>` +
      `</div><p><br></p>`
    );
  }

  private buildPreviewHtml(html: string): string {
    const container = document.createElement('div');
    container.innerHTML = html;
    this.numberPreviewCodeBlocks(container);
    container.querySelectorAll('[contenteditable]').forEach((node) => node.removeAttribute('contenteditable'));
    return container.innerHTML;
  }

  private numberPreviewCodeBlocks(root: HTMLElement): void {
    const blocks = Array.from(root.querySelectorAll<HTMLElement>('.editor-code-body'));
    if (root.matches('.editor-code-body')) {
      blocks.unshift(root);
    }

    blocks.forEach((pre) => {
      const existingLines = Array.from(pre.querySelectorAll<HTMLElement>('.code-line'));
      const outsideNumberedLines = pre.cloneNode(true) as HTMLElement;
      outsideNumberedLines.querySelectorAll('.code-line').forEach((line) => line.remove());
      outsideNumberedLines.querySelectorAll('code').forEach((code) => {
        if (code.textContent?.trim()) {
          code.replaceWith(...Array.from(code.childNodes));
        } else {
          code.remove();
        }
      });

      const hasContentOutsideNumberedLines = Boolean(outsideNumberedLines.textContent?.trim());
      if (existingLines.length && !hasContentOutsideNumberedLines) {
        existingLines.forEach((line, index) => this.normalizePreviewCodeLine(line, index));
        return;
      }

      const code = pre.querySelector('code');
      const hasCodeContent = Boolean(code?.textContent?.trim());
      const source = hasContentOutsideNumberedLines
        ? outsideNumberedLines
        : hasCodeContent && code
          ? code
          : outsideNumberedLines;
      let sourceHtml = source.innerHTML;
      sourceHtml = sourceHtml.replace(/<br\s*[/]?>/gi, '\n');
      sourceHtml = sourceHtml.replace(/<div>/gi, '\n').replace(/<\/div>/gi, '');
      sourceHtml = sourceHtml.replace(/\r\n/g, '\n');

      const lines = sourceHtml.split('\n');
      if (lines.length > 1 && lines[lines.length - 1] === '') {
        lines.pop();
      }

      pre.innerHTML = lines
        .map(
          (line, index) =>
            `<span class="code-line"><span class="line-number" aria-hidden="true">${index + 1}</span>` +
            `<span class="line-content">${line || '&nbsp;'}</span></span>`,
        )
        .join('');
    });
  }

  private normalizePreviewCodeLine(line: HTMLElement, index: number): void {
    let lineNumber = Array.from(line.children).find((child) => child.classList.contains('line-number')) as
      | HTMLElement
      | undefined;
    if (!lineNumber) {
      lineNumber = document.createElement('span');
      lineNumber.className = 'line-number';
      line.prepend(lineNumber);
    }

    lineNumber.textContent = String(index + 1);
    lineNumber.setAttribute('aria-hidden', 'true');

    if (Array.from(line.children).some((child) => child.classList.contains('line-content'))) {
      return;
    }

    const lineContent = document.createElement('span');
    lineContent.className = 'line-content';
    Array.from(line.childNodes).forEach((child) => {
      if (child !== lineNumber) {
        lineContent.appendChild(child);
      }
    });
    line.appendChild(lineContent);
  }

  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private escapeHtml(value: string): string {
    return this.escapeAttribute(value).replace(/'/g, '&#39;');
  }

  private insertHtml(html: string, preferSavedRange = false): void {
    const editor = this.editorElement();
    if (!editor) {
      this.draft.content = this.draft.content.trim() ? `${this.draft.content}${html}` : html;
      return;
    }

    const selection = window.getSelection();
    const savedRange = preferSavedRange && this.savedRange ? this.savedRange.cloneRange() : null;
    if (savedRange && this.rangeBelongsToEditor(savedRange, editor)) {
      selection?.removeAllRanges();
      selection?.addRange(savedRange);
    } else {
      this.restoreSelection();
    }

    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (range && this.rangeBelongsToEditor(range, editor)) {
      range.deleteContents();
      const fragment = range.createContextualFragment(html);
      const lastNode = fragment.lastChild;
      range.insertNode(fragment);
      if (lastNode) {
        this.placeCaretAtNode(lastNode);
      }
    } else {
      editor.insertAdjacentHTML('beforeend', html);
    }
    this.syncContentFromEditor();
    this.saveEditorSelection();
    this.updateToolbarState();
  }

  private insertMoreBlock(action: string): void {
    if (action === 'divider') {
      this.insertHtml('<hr class="editor-divider">');
      return;
    }

    if (action === 'code-block') {
      this.insertHtml(this.createCodeBlockHtml());
    }
  }

  private toggleInlineCode(): void {
    this.restoreSelection();
    const selection = window.getSelection();
    const wrapper = selection && selection.rangeCount > 0
      ? this.getInlineCodeWrapper(selection.anchorNode) || this.getInlineCodeWrapper(selection.focusNode)
      : null;

    if (wrapper) {
      this.unwrapInlineCode(wrapper);
    } else {
      this.wrapSelectionInInlineCode(selection);
    }

    this.syncContentFromEditor();
    this.saveEditorSelection();
    this.updateToolbarState();
  }

  private setBaselineFormat(format: string): void {
    const baselineFormat = this.toBaselineFormat(format);
    this.restoreSelection();
    const isSuperscript = document.queryCommandState('superscript');
    const isSubscript = document.queryCommandState('subscript');

    if (baselineFormat === 'normal') {
      if (isSuperscript) {
        document.execCommand('superscript', false);
      }
      if (isSubscript) {
        document.execCommand('subscript', false);
      }
      this.removeBaselineMarkupFromSelection();
      this.afterBaselineChange(baselineFormat);
      return;
    }

    if (baselineFormat === 'superscript') {
      if (isSubscript) {
        document.execCommand('subscript', false);
      }
      if (!isSuperscript) {
        document.execCommand('superscript', false);
      }
      this.afterBaselineChange(baselineFormat);
      return;
    }

    if (baselineFormat === 'subscript') {
      if (isSuperscript) {
        document.execCommand('superscript', false);
      }
      if (!isSubscript) {
        document.execCommand('subscript', false);
      }
      this.afterBaselineChange(baselineFormat);
    }
  }

  private openLinkModalFromSelection(): void {
    this.restoreSelection();
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    const rect = range?.getBoundingClientRect();
    const editorRect = this.editorElement()?.getBoundingClientRect();
    const anchorRect = rect && (rect.width || rect.height) ? rect : editorRect;
    const width = 304;
    const height = 190;
    const left = anchorRect ? anchorRect.left : window.innerWidth / 2 - width / 2;
    const top = anchorRect ? anchorRect.bottom + 12 : 130;
    const maxLeft = Math.max(12, window.innerWidth - width - 12);

    this.linkText = selection?.toString().trim() || '';
    this.linkUrl = this.isLikelyUrl(this.linkText) ? this.linkText : '';
    this.editingLinkElement = null;
    this.linkModalLeft = Math.min(Math.max(left, 12), maxLeft);
    this.linkModalAbove = top + height > window.innerHeight;
    this.linkModalTop = this.linkModalAbove && anchorRect ? Math.max(12, anchorRect.top - height - 12) : top;
    this.showLinkModal = true;
  }

  private openLinkModalFromLink(link: HTMLAnchorElement): void {
    this.editingLinkElement = link;
    this.linkText = link.textContent?.trim() || '';
    this.linkUrl = link.getAttribute('href') || '';
    const rect = link.getBoundingClientRect();
    this.positionFloatingLinkUi(rect, 'modal');
    this.showLinkModal = true;
    this.closeLinkBubble();
  }

  private restoreSelection(): void {
    const editor = this.editorElement();
    if (!editor) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const activeElement = document.activeElement;
    const currentSelectionIsInEditor =
      activeElement === editor || (activeElement instanceof Node && editor.contains(activeElement));

    if (currentSelectionIsInEditor && selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (this.rangeBelongsToEditor(currentRange, editor)) {
        this.savedRange = currentRange.cloneRange();
        return;
      }
    }

    editor.focus({ preventScroll: true });
    selection.removeAllRanges();
    if (this.savedRange && this.rangeBelongsToEditor(this.savedRange, editor)) {
      selection.addRange(this.savedRange);
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
    this.savedRange = range.cloneRange();
  }

  private syncContentFromEditor(): void {
    const editor = this.editorElement();
    if (editor) {
      this.draft.content = editor.innerHTML;
    }
  }

  private editorElement(): HTMLElement | null {
    return this.postBody?.nativeElement ?? document.getElementById('postBody');
  }

  private selectEditorContents(): void {
    const editor = this.editorElement();
    const selection = window.getSelection();
    if (!editor || !selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    this.savedRange = range.cloneRange();
    this.updateToolbarState();
  }

  private rangeBelongsToEditor(range: Range, editor: HTMLElement): boolean {
    const ancestor = range.commonAncestorContainer;
    const node = ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentNode;
    return !!node && editor.contains(node);
  }

  private editorTextContent(): string {
    const editor = this.editorElement();
    return (editor?.textContent || this.draft.content.replace(/<[^>]*>/g, ' ')).trim();
  }

  private hasDraftContent(): boolean {
    return Boolean(this.draft.title.trim() || this.editorTextContent());
  }

  private closeToolbarMenus(): void {
    document.querySelectorAll('.tool-menu.is-open').forEach((menu) => {
      menu.classList.remove('is-open');
      menu.querySelector('[data-menu-trigger]')?.setAttribute('aria-expanded', 'false');
    });
  }

  private markMenuSelection(button: HTMLElement, selector: string): void {
    const panel = button.closest('.tool-menu-panel');
    panel?.querySelectorAll(selector).forEach((item) => item.classList.remove('is-selected'));
    button.classList.add('is-selected');
  }

  private updateColorTrigger(button: HTMLElement, color?: string): void {
    const trigger = button.closest('.tool-menu-panel')?.previousElementSibling as HTMLElement | null;
    if (!trigger) {
      return;
    }

    if (color) {
      trigger.style.setProperty('--underline-color', color);
    } else {
      trigger.style.removeProperty('--underline-color');
    }
  }

  private updateToolbarState(syncBaseline = true): void {
    const editor = this.editorElement();
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      this.updateCodeProtectedToolbarState(false);
      return;
    }

    const range = selection.getRangeAt(0);
    if (!this.rangeBelongsToEditor(range, editor)) {
      this.updateCodeProtectedToolbarState(false);
      return;
    }

    ['italic', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].forEach((command) => {
      const button = document.querySelector(`[data-command="${command}"]`);
      button?.classList.toggle('is-active', document.queryCommandState(command));
    });
    document
      .querySelector('[data-command="bold"]')
      ?.classList.toggle('is-active', this.isExplicitInlineFormatActive('b, strong'));
    this.updateCodeProtectedToolbarState(this.selectionTouchesCode());

    ['undo', 'redo'].forEach((command) => {
      const button = document.querySelector(`[data-command="${command}"]`);
      button?.classList.toggle('is-muted', !document.queryCommandEnabled(command));
    });

    let activeAlign = 'justifyLeft';
    ['justifyCenter', 'justifyRight', 'justifyFull'].forEach((command) => {
      const button = document.querySelector(`[data-align-command="${command}"]`);
      const isActive = document.queryCommandState(command);
      button?.classList.toggle('is-selected', isActive);
      if (isActive) {
        activeAlign = command;
      }
    });

    const leftButton = document.querySelector('[data-align-command="justifyLeft"]');
    leftButton?.classList.toggle('is-selected', activeAlign === 'justifyLeft');
    this.updateAlignTrigger(activeAlign);
    this.updateBaselineUi(syncBaseline ? this.getBaselineFormat() : this.activeBaselineFormat);

    const codeButton = document.querySelector('[data-inline-code]');
    codeButton?.classList.toggle('is-active', this.isInlineCodeActive());
  }

  private createCodeBlockHtml(): string {
    const languages = [
      'Auto-detect',
      'Plain Text',
      'JavaScript',
      'TypeScript',
      'JSX',
      'TSX',
      'Python',
      'CSS',
      'HTML',
      'JSON',
      'Bash',
    ];
    const languageItems = languages
      .map(
        (language, index) =>
          `<button class="editor-code-language-item ${index === 0 ? 'is-selected' : ''}" type="button" data-code-language="${this.escapeAttribute(language)}">` +
          `<span>${this.escapeHtml(language)}</span><span class="editor-code-language-check" aria-hidden="true"></span></button>`,
      )
      .join('');

    return (
      '<div class="editor-code-block" contenteditable="false">' +
      '<div class="editor-code-toolbar">' +
      '<div class="editor-code-language">' +
      '<button class="editor-code-language-trigger" type="button" data-code-language-trigger aria-expanded="false">' +
      '<span data-code-language-label>Auto-detect</span><span class="tool-caret editor-code-caret" aria-hidden="true"></span>' +
      '</button>' +
      `<div class="editor-code-language-menu">${languageItems}</div>` +
      '</div>' +
      '<button class="editor-code-delete" type="button" data-remove-code-block aria-label="Delete code block" title="Delete code block"><svg class="editor-code-delete-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg></button>' +
      '</div>' +
      '<pre class="editor-code-body" contenteditable="true" spellcheck="false"><code></code></pre>' +
      '</div><p><br></p>'
    );
  }

  private closeCodeLanguageMenus(): void {
    document.querySelectorAll('.editor-code-language.is-open').forEach((languageWrap) => {
      languageWrap.classList.remove('is-open');
      languageWrap.querySelector('[data-code-language-trigger]')?.setAttribute('aria-expanded', 'false');
    });
  }

  private removeEmptyParagraphAfter(element: Element | null): void {
    const nextNode = element?.nextElementSibling;
    if (nextNode?.tagName === 'P' && !nextNode.textContent?.trim()) {
      nextNode.remove();
    }
  }

  private getInlineCodeWrapper(node: Node | null): HTMLElement | null {
    if (!node) {
      return null;
    }

    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    const wrapper = element?.closest('code, .editor-inline-code-font, font') as HTMLElement | null;
    if (!wrapper || !this.editorElement()?.contains(wrapper) || wrapper.closest('pre')) {
      return null;
    }

    return wrapper;
  }

  private isInlineCodeActive(): boolean {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return false;
    }

    return Boolean(this.getInlineCodeWrapper(selection.anchorNode) || this.getInlineCodeWrapper(selection.focusNode));
  }

  private wrapSelectionInInlineCode(selection: Selection | null): void {
    if (!selection || selection.rangeCount === 0) {
      this.insertHtml('<span class="editor-inline-code-font">code</span>');
      return;
    }

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'editor-inline-code-font';

    if (range.collapsed) {
      span.textContent = '\u200b';
      range.insertNode(span);
      this.placeCaretInside(span);
      return;
    }

    const fragment = range.extractContents();
    this.stripCodeFormatting(fragment);
    span.appendChild(fragment);
    range.insertNode(span);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    this.savedRange = nextRange.cloneRange();
  }

  private unwrapInlineCode(wrapper: HTMLElement): void {
    const parent = wrapper.parentNode;
    if (!parent) {
      return;
    }

    const marker = document.createTextNode('');
    parent.insertBefore(marker, wrapper.nextSibling);
    wrapper.textContent = wrapper.textContent?.replace(/\u200b/g, '') || '';
    while (wrapper.firstChild) {
      parent.insertBefore(wrapper.firstChild, wrapper);
    }
    wrapper.remove();
    this.placeCaretAtNode(marker);
    marker.remove();
  }

  private placeCaretInside(node: Node): void {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.savedRange = range.cloneRange();
  }

  private placeCaretAtNode(node: Node): void {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.savedRange = range.cloneRange();
  }

  private afterBaselineChange(format: BaselineFormat): void {
    this.syncContentFromEditor();
    this.saveEditorSelection();
    this.updateBaselineUi(format);
    this.updateToolbarState(false);
  }

  private getBaselineFormat(): BaselineFormat {
    if (typeof document.queryCommandState === 'function' && document.queryCommandState('superscript')) {
      return 'superscript';
    }
    if (typeof document.queryCommandState === 'function' && document.queryCommandState('subscript')) {
      return 'subscript';
    }

    const selection = window.getSelection();
    const editor = this.editorElement();
    if (!selection || !editor || selection.rangeCount === 0) {
      return 'normal';
    }

    const range = selection.getRangeAt(0);
    if (!this.rangeBelongsToEditor(range, editor)) {
      return 'normal';
    }

    const nodeFormat =
      this.getBaselineFormatFromNode(selection.anchorNode) ??
      this.getBaselineFormatFromNode(selection.focusNode) ??
      this.getBaselineFormatFromNode(range.commonAncestorContainer);
    if (nodeFormat) {
      return nodeFormat;
    }

    const selectedContent = range.cloneContents();
    if (selectedContent.querySelector('sup')) {
      return 'superscript';
    }
    if (selectedContent.querySelector('sub')) {
      return 'subscript';
    }

    return 'normal';
  }

  private updateBaselineUi(format: BaselineFormat): void {
    this.activeBaselineFormat = format;
    const label = document.querySelector('[data-baseline-label]') as HTMLElement | null;
    if (label) {
      label.classList.toggle('is-script', format === 'superscript' || format === 'subscript');
      label.classList.toggle('is-superscript', format === 'superscript');
      label.classList.toggle('is-subscript', format === 'subscript');
      label.innerHTML =
        format === 'superscript' || format === 'subscript'
          ? 'x<span class="baseline-script">2</span>'
          : 'A';
    }

    const baselineTrigger = document.querySelector('.baseline-trigger');
    baselineTrigger?.classList.toggle('is-active', format !== 'normal');
    document.querySelectorAll('[data-inline-format]').forEach((button) => {
      button.classList.toggle('is-selected', (button as HTMLElement).dataset['inlineFormat'] === format);
    });
  }

  private getBaselineFormatFromNode(node: Node | null): BaselineFormat | null {
    const editor = this.editorElement();
    if (!node || !editor) {
      return null;
    }

    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
    const baselineElement = element?.closest('sup, sub');
    if (!baselineElement || !editor.contains(baselineElement)) {
      return null;
    }

    return baselineElement.tagName.toLowerCase() === 'sup' ? 'superscript' : 'subscript';
  }

  private removeBaselineMarkupFromSelection(): void {
    const editor = this.editorElement();
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    if (!this.rangeBelongsToEditor(range, editor)) {
      return;
    }

    const wrappers = new Set<HTMLElement>();
    [selection.anchorNode, selection.focusNode, range.commonAncestorContainer].forEach((node) => {
      const element = node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null);
      const wrapper = element?.closest('sup, sub') as HTMLElement | null;
      if (wrapper && editor.contains(wrapper)) {
        wrappers.add(wrapper);
      }
    });

    editor.querySelectorAll<HTMLElement>('sup, sub').forEach((wrapper) => {
      if (range.intersectsNode(wrapper)) {
        wrappers.add(wrapper);
      }
    });

    let lastMovedNode: Node | null = null;
    Array.from(wrappers)
      .sort((a, b) => (a.contains(b) ? 1 : b.contains(a) ? -1 : 0))
      .forEach((wrapper) => {
        const parent = wrapper.parentNode;
        if (!parent) {
          return;
        }

        while (wrapper.firstChild) {
          lastMovedNode = wrapper.firstChild;
          parent.insertBefore(wrapper.firstChild, wrapper);
        }
        wrapper.remove();
      });

    if (lastMovedNode) {
      this.placeCaretAtNode(lastMovedNode);
    }
  }

  private toBaselineFormat(format: string): BaselineFormat {
    return format === 'superscript' || format === 'subscript' ? format : 'normal';
  }

  private updateAlignTrigger(activeAlign: string): void {
    const svgPaths: Record<string, string> = {
      justifyLeft: '<path d="M21 6H3"></path><path d="M15 12H3"></path><path d="M17 18H3"></path>',
      justifyCenter: '<path d="M21 6H3"></path><path d="M17 12H7"></path><path d="M19 18H5"></path>',
      justifyRight: '<path d="M21 6H3"></path><path d="M21 12H9"></path><path d="M21 18H7"></path>',
      justifyFull: '<path d="M21 6H3"></path><path d="M21 12H3"></path><path d="M21 18H3"></path>',
    };
    const svg = document.querySelector('.align-menu')?.previousElementSibling?.querySelector('svg');
    if (svg && svgPaths[activeAlign]) {
      svg.innerHTML = svgPaths[activeAlign];
    }
  }

  private isCodeProtectedCommand(command: string): boolean {
    return this.codeProtectedCommands.has(command);
  }

  private isExplicitInlineFormatActive(selector: string): boolean {
    const editor = this.editorElement();
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return false;
    }

    const range = selection.getRangeAt(0);
    if (!this.rangeBelongsToEditor(range, editor)) {
      return false;
    }

    const nodes = [selection.anchorNode, selection.focusNode, range.commonAncestorContainer];
    if (nodes.some((node) => this.nodeMatchesInsideEditor(node, selector, editor))) {
      return true;
    }

    const selectedContent = range.cloneContents();
    return !!selectedContent.querySelector(selector);
  }

  private selectionTouchesCode(): boolean {
    const editor = this.editorElement();
    if (!editor) {
      return false;
    }

    const ranges: Range[] = [];
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (this.rangeBelongsToEditor(range, editor)) {
        ranges.push(range.cloneRange());
      }
    }

    if (this.savedRange && this.rangeBelongsToEditor(this.savedRange, editor)) {
      ranges.push(this.savedRange.cloneRange());
    }

    return ranges.some((range) => this.rangeTouchesCode(range, editor));
  }

  private rangeTouchesCode(range: Range, editor: HTMLElement): boolean {
    if (
      this.nodeBelongsToCode(range.startContainer, editor) ||
      this.nodeBelongsToCode(range.endContainer, editor) ||
      this.nodeBelongsToCode(range.commonAncestorContainer, editor)
    ) {
      return true;
    }

    return Array.from(editor.querySelectorAll('code, .editor-inline-code-font, .editor-code-block, .editor-code-body')).some(
      (node) => {
        try {
          return range.intersectsNode(node);
        } catch {
          return false;
        }
      },
    );
  }

  private nodeBelongsToCode(node: Node | null, editor: HTMLElement): boolean {
    if (!node) {
      return false;
    }

    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
    const codeElement = element?.closest('code, .editor-inline-code-font, .editor-code-block, .editor-code-body');
    return !!codeElement && editor.contains(codeElement);
  }

  private nodeMatchesInsideEditor(node: Node | null, selector: string, editor: HTMLElement): boolean {
    if (!node) {
      return false;
    }

    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
    const matchedElement = element?.closest(selector);
    return !!matchedElement && editor.contains(matchedElement);
  }

  private updateCodeProtectedToolbarState(isLocked: boolean): void {
    this.codeProtectedCommands.forEach((command) => {
      const button = document.querySelector<HTMLButtonElement>(`[data-command="${command}"]`);
      if (!button) {
        return;
      }

      button.disabled = isLocked;
      button.setAttribute('aria-disabled', String(isLocked));
      button.classList.toggle('is-muted', isLocked);
      if (isLocked) {
        button.classList.remove('is-active');
      }
    });

    document
      .querySelectorAll<HTMLButtonElement>('button[aria-label="Text color"], button[aria-label="Highlight color"]')
      .forEach((button) => {
        button.disabled = isLocked;
        button.setAttribute('aria-disabled', String(isLocked));
        button.classList.toggle('is-muted', isLocked);
      });
  }

  private stripCodeFormatting(root: ParentNode): void {
    root.querySelectorAll('[style]').forEach((element) => element.removeAttribute('style'));
    root
      .querySelectorAll('b, strong, i, em, s, strike, font, span[style], .editor-text-red, .editor-highlight-yellow')
      .forEach((element) => this.unwrapElement(element));
  }

  private unwrapElement(element: Element): void {
    const parent = element.parentNode;
    if (!parent) {
      return;
    }

    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    element.remove();
  }

  private prepareEditorLink(link: HTMLAnchorElement): void {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('contenteditable', 'false');
    link.dataset['editorLink'] = 'true';
  }

  private showLinkBubbleFor(link: HTMLAnchorElement): void {
    this.prepareEditorLink(link);
    this.activeLinkElement = link;
    this.linkBubbleUrl = link.getAttribute('href') || '';
    this.positionFloatingLinkUi(link.getBoundingClientRect(), 'bubble');
    this.showLinkBubble = true;
  }

  private closeLinkBubble(): void {
    this.showLinkBubble = false;
    this.activeLinkElement = null;
  }

  private positionFloatingLinkUi(rect: DOMRect, kind: 'modal' | 'bubble'): void {
    const width = kind === 'modal' ? 304 : 420;
    const height = kind === 'modal' ? 190 : 54;
    const top = rect.bottom + 12;
    const maxLeft = Math.max(12, window.innerWidth - width - 12);
    const left = Math.min(Math.max(rect.left, 12), maxLeft);
    const isAbove = top + height > window.innerHeight;
    const resolvedTop = isAbove ? Math.max(12, rect.top - height - 12) : top;

    if (kind === 'modal') {
      this.linkModalLeft = left;
      this.linkModalTop = resolvedTop;
      this.linkModalAbove = isAbove;
    } else {
      this.linkBubbleLeft = left;
      this.linkBubbleTop = resolvedTop;
      this.linkBubbleAbove = isAbove;
    }
  }

  private updateBodyModalClasses(): void {
    document.body.classList.toggle('preview-modal-open', this.showPreview);
    document.body.classList.toggle('publish-modal-open', this.showPublishOptions);
    document.body.classList.toggle('draft-modal-open', this.showDraftConfirm);
  }

  private syncTargetInput(): void {
    this.draft.targetLanguageIds = this.parseTargetLanguageIds();
    this.targetInput = this.draft.targetLanguageIds.join(',');
  }

  private normalizeUrl(value: string): string {
    const url = value.trim();
    if (!url) {
      return '';
    }

    if (/^(https?:|mailto:|tel:|#|\/)/i.test(url)) {
      return url;
    }

    return `https://${url}`;
  }

  private isLikelyUrl(value: string): boolean {
    return /^(https?:\/\/|www\.|[\w-]+\.[a-z]{2,})/i.test(value.trim());
  }

  private toRequiredNumber(value: string | number, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private countWords(value: string): number {
    return value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;
  }

  private hasMeaningfulContent(content: string): boolean {
    const container = document.createElement('div');
    container.innerHTML = content;
    const text = (container.textContent || '').replace(/\u00a0/g, ' ').trim();

    return Boolean(text || container.querySelector('img, audio, video'));
  }

  private trimToWordLimit(value: string, limit: number): string {
    const words = value.match(/\S+/g) ?? [];
    if (words.length <= limit) {
      return value;
    }

    let usedWords = 0;
    let endIndex = 0;
    const matches = value.matchAll(/\S+/g);
    for (const match of matches) {
      usedWords += 1;
      endIndex = (match.index ?? 0) + match[0].length;
      if (usedWords >= limit) {
        break;
      }
    }

    return value.slice(0, endIndex).trimEnd();
  }

  private formatLimitLabel(count: number, limit: number): string {
    return `${count} / ${limit} ${this.wordLimitUnitLabel()}`;
  }

  private wordLimitUnitLabel(): string {
    const language = localStorage.getItem('preferredLanguage') || 'en';
    if (language === 'vi') {
      return 'từ';
    }
    if (language === 'zh') {
      return '字词';
    }
    return 'words';
  }

  private isNearLimit(count: number, limit: number): boolean {
    return count >= Math.ceil(limit * 0.9) && count <= limit;
  }

  private capitalize(value: string): string {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
  }

  private formatError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = (error.error?.meta?.error?.message ?? error.error?.message) as string | string[] | undefined;
      if (Array.isArray(message)) {
        return message.join(' ');
      }

      return message || error.message;
    }

    return 'Co loi xay ra, hay kiem tra backend dang chay.';
  }
}
