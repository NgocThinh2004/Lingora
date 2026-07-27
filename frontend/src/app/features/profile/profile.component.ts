import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit, OnDestroy, computed, signal, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize, forkJoin, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/notifications/toast.service';
import { BrandingService } from '../../core/theme/branding.service';
import { AuthorPost } from '../posts/models/post.model';
import { AuthorPostsService } from '../posts/services/author-posts.service';
import {
  SubscriptionAuthor,
  SubscriptionsService,
} from '../subscriptions/services/subscriptions.service';
import { EditorUploadsService } from '../workspace/services/editor-uploads.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent, AssetImageDirective],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'feature-page-profile' },
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private postsService = inject(AuthorPostsService);
  private router = inject(Router);
  private subscriptionsService = inject(SubscriptionsService);
  private uploadsService = inject(EditorUploadsService);
  private toast = inject(ToastService);
  private branding = inject(BrandingService);

  user = this.authService.currentUser;

  // Local profile state for editing
  profileForm = {
    displayName: '',
    username: '',
    bio: ''
  };

  isEditing = signal(false);
  posts = signal<AuthorPost[]>([]);
  publicPostsCount = signal(0);
  categoryOptions: Array<{ id: number; label: string }> = [];
  followersCount = signal(0);
  followingCount = signal(0);
  loadingProfile = signal(true);
  savingProfile = signal(false);
  savingPassword = signal(false);
  uploadingAvatar = signal(false);
  accentColor = signal(this.branding.accent());
  backgroundColor = signal('');
  openColorPicker = signal<'accent' | 'background' | null>(null);

  // Modals state
  showPasswordModal = signal(false);
  showHandleModal = signal(false);
  showSubscribersModal = signal(false);
  profileMoreOpen = signal(false);
  peopleModalMode = signal<'followers' | 'following'>('followers');
  people = signal<SubscriptionAuthor[]>([]);
  peopleLoading = signal(false);
  peopleSearch = signal('');
  failedPeopleAvatarIds = signal<Set<string>>(new Set());
  filteredPeople = computed(() => {
    const query = this.peopleSearch().trim().toLowerCase();
    if (!query) {
      return this.people();
    }

    return this.people().filter(person =>
      [person.displayName, person.username, person.bio]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(query)),
    );
  });

  // Settings
  passwordForm = { current: '', new: '', confirm: '' };
  handleOption = 'current';
  customHandle = '';

  // Password UI
  passwordFieldType = 'password';

  ngOnInit() {
    const currentUser = this.user();
    this.setProfileForm(currentUser);
    this.loadBranding();

    this.authService.getMe().subscribe({
      next: user => {
        this.setProfileForm(user);
        this.loadBranding();
        this.loadingProfile.set(false);
      },
      error: err => {
        this.toast.showError(this.formatError(err));
        this.loadingProfile.set(false);
      },
    });

    forkJoin([
      this.postsService.listAuthorPosts({ status: 'published', limit: 100 }),
      this.postsService.listAuthorPosts({ status: 'approved', limit: 100 }),
    ]).subscribe({
      next: responses => {
        this.publicPostsCount.set(responses.reduce((total, response) => total + response.meta.total, 0));
        const postsById = new Map(
          responses.flatMap(response => response.data).map(post => [post.id, post]),
        );
        this.posts.set(
          [...postsById.values()]
            .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
            .slice(0, 10),
        );
      },
      error: err => this.toast.showError(this.formatError(err)),
    });

    this.postsService.getPostOptions().subscribe({
      next: options => {
        this.categoryOptions = options.categories;
      },
      error: () => {
        this.categoryOptions = [];
      },
    });

    this.subscriptionsService.stats().subscribe({
      next: stats => {
        this.followersCount.set(stats.followers);
        this.followingCount.set(stats.following);
      },
      error: err => this.toast.showError(this.formatError(err)),
    });
  }

  ngOnDestroy() {
    this.clearBrandingVariables();
    document.body.classList.remove('profile-modal-open');
  }

  get initial(): string {
    const name = this.profileForm.displayName || 'U';
    return name.charAt(0).toUpperCase();
  }

  get avatarUrl(): string {
    const url = this.user()?.avatarUrl;
    return url ? this.uploadsService.toAbsoluteUrl(url) : '';
  }

  postTitle(post: AuthorPost): string {
    return post.translations.find(translation => translation.title)?.title || 'Untitled';
  }

  postContent(post: AuthorPost): string {
    const translation = post.translations.find(item => item.content);
    return translation?.content || '';
  }

  categoryLabel(post: AuthorPost): string {
    if (post.categoryId === null) {
      return 'General';
    }
    return this.categoryOptions.find(category => category.id === post.categoryId)?.label
      || `Category ${post.categoryId}`;
  }

  toggleEdit(editing: boolean) {
    this.isEditing.set(editing);
  }

  saveProfile() {
    if (!this.profileForm.displayName.trim() || !this.normalizeUsername(this.profileForm.username)) {
      this.toast.showError('Display name and a valid username are required.');
      return;
    }

    this.savingProfile.set(true);
    this.authService.updateProfile({
      displayName: this.profileForm.displayName.trim(),
      username: this.normalizeUsername(this.profileForm.username),
      bio: this.profileForm.bio.trim(),
    }).subscribe({
      next: user => {
        this.setProfileForm(user);
        this.persistBranding();
        this.toast.showSuccess('Profile updated successfully.');
        this.savingProfile.set(false);
        this.isEditing.set(false);
      },
      error: err => {
        this.toast.showError(this.formatError(err));
        this.savingProfile.set(false);
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toast.showError('Please select an image file.');
      return;
    }

    this.uploadingAvatar.set(true);
    this.uploadsService.uploadEditorMedia('image', file).pipe(
      switchMap(upload => this.authService.updateProfile({
        displayName: this.profileForm.displayName.trim(),
        username: this.normalizeUsername(this.profileForm.username),
        bio: this.profileForm.bio.trim(),
        avatarUrl: upload.url,
      })),
      finalize(() => this.uploadingAvatar.set(false)),
    ).subscribe({
      next: user => {
        this.setProfileForm(user);
        this.toast.showSuccess('Profile photo updated successfully.');
      },
      error: err => this.toast.showError(this.formatError(err)),
    });
  }

  updateHandle() {
    if (this.handleOption === 'custom') {
      const handle = this.customHandle.trim();
      this.profileForm.username = handle.startsWith('@') ? handle : `@${handle}`;
    } else if (this.handleOption === 'suggested') {
      this.profileForm.username = '@' + this.profileForm.displayName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 30);
    }
    this.showHandleModal.set(false);
  }

  submitPassword() {
    if (this.passwordForm.new.length >= 8 && this.passwordForm.new === this.passwordForm.confirm) {
      this.savingPassword.set(true);
      this.authService.changePassword({
        currentPassword: this.passwordForm.current,
        newPassword: this.passwordForm.new,
      }).subscribe({
        next: () => {
          this.passwordForm = { current: '', new: '', confirm: '' };
          this.savingPassword.set(false);
          this.closePasswordModal();
          this.authService.expireSession();
          void this.router.navigate(['/auth/login'], {
            queryParams: { message: 'Password updated. Please sign in again.' },
          });
        },
        error: err => {
          this.toast.showError(this.formatError(err));
          this.savingPassword.set(false);
        },
      });
    } else {
      this.toast.showError('The new passwords must match and contain at least 8 characters.');
    }
  }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  toggleProfileMore(event: Event): void {
    event.stopPropagation();
    this.openColorPicker.set(null);
    this.profileMoreOpen.update(open => !open);
  }

  openPasswordModal(event?: Event): void {
    event?.stopPropagation();
    this.profileMoreOpen.set(false);
    this.passwordForm = { current: '', new: '', confirm: '' };
    this.passwordFieldType = 'password';
    this.showPasswordModal.set(true);
    document.body.classList.add('profile-modal-open');
    queueMicrotask(() => document.getElementById('profileCurrentPassword')?.focus());
  }

  closePasswordModal(): void {
    if (this.savingPassword()) {
      return;
    }

    this.showPasswordModal.set(false);
    this.passwordFieldType = 'password';
    document.body.classList.remove('profile-modal-open');
  }

  openPeopleModal(mode: 'followers' | 'following', event?: Event): void {
    event?.preventDefault();
    this.peopleModalMode.set(mode);
    this.peopleSearch.set('');
    this.people.set([]);
    this.failedPeopleAvatarIds.set(new Set());
    this.peopleLoading.set(true);
    this.showSubscribersModal.set(true);
    document.body.classList.add('profile-modal-open');

    const request = mode === 'followers'
      ? this.subscriptionsService.followers()
      : this.subscriptionsService.following();
    request.subscribe({
      next: people => {
        if (this.showSubscribersModal() && this.peopleModalMode() === mode) {
          this.people.set(people);
        }
        this.peopleLoading.set(false);
      },
      error: err => {
        this.peopleLoading.set(false);
        this.toast.showError(this.formatError(err));
      },
    });
  }

  closePeopleModal(): void {
    this.showSubscribersModal.set(false);
    this.peopleSearch.set('');
    document.body.classList.remove('profile-modal-open');
  }

  peopleModalTitle(): string {
    return this.peopleModalMode() === 'followers' ? 'Followers' : 'Following';
  }

  peopleSearchPlaceholder(): string {
    return this.peopleModalMode() === 'followers'
      ? 'Search followers...'
      : 'Search following...';
  }

  personDisplayName(person: SubscriptionAuthor): string {
    return person.displayName || person.username;
  }

  personAvatar(person: SubscriptionAuthor): string {
    return person.avatarUrl && !this.failedPeopleAvatarIds().has(person.id)
      ? this.uploadsService.toAbsoluteUrl(person.avatarUrl)
      : 'assets/images/lingora-mark.svg';
  }

  handlePeopleAvatarError(personId: string): void {
    this.failedPeopleAvatarIds.update(ids => new Set(ids).add(personId));
  }

  toggleColorPicker(type: 'accent' | 'background', event: Event): void {
    event.stopPropagation();
    this.openColorPicker.update(open => open === type ? null : type);
  }

  handleColorFieldClick(event: Event, type: 'accent' | 'background'): void {
    const swatch = (event.target as HTMLElement).closest<HTMLElement>('[data-color-value]');
    if (!swatch) {
      return;
    }

    event.stopPropagation();
    this.selectColor(swatch.dataset['colorValue'] ?? '', type);
  }

  selectColor(color: string, type: 'accent' | 'background'): void {
    const normalized = this.normalizeHex(color);
    if (type === 'accent') {
      this.accentColor.set(normalized || '#FF6719');
    } else {
      this.backgroundColor.set(normalized);
    }
    this.applyBranding();
    this.persistBranding();
    this.openColorPicker.set(null);
  }

  isSelectedColor(color: string, type: 'accent' | 'background'): boolean {
    const selected = type === 'accent' ? this.accentColor() : this.backgroundColor();
    return this.normalizeHex(color) === this.normalizeHex(selected);
  }

  @HostListener('document:click', ['$event'])
  closeFloatingMenus(event: Event): void {
    this.openColorPicker.set(null);
    if (!(event.target as HTMLElement | null)?.closest('.profile-more')) {
      this.profileMoreOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeProfileOverlays(): void {
    this.openColorPicker.set(null);
    this.profileMoreOpen.set(false);
    this.showHandleModal.set(false);
    this.closePasswordModal();
    this.closePeopleModal();
  }

  private setProfileForm(user: ReturnType<AuthService['currentUser']>): void {
    if (!user) {
      return;
    }
    this.profileForm = {
      displayName: user.displayName || user.username,
      username: `@${user.username.replace(/^@/, '')}`,
      bio: user.bio || '',
    };
  }

  private normalizeUsername(value: string): string {
    return value.trim().replace(/^@/, '');
  }

  private brandingStorageKey(): string {
    return `lingora:profile-branding:${this.user()?.id || 'current'}`;
  }

  private loadBranding(): void {
    try {
      const stored = JSON.parse(localStorage.getItem(this.brandingStorageKey()) || '{}') as {
        accentColor?: string;
        backgroundColor?: string;
      };
      this.accentColor.set(this.normalizeHex(stored.accentColor || '') || this.branding.accent());
      this.backgroundColor.set(this.normalizeHex(stored.backgroundColor || ''));
    } catch {
      this.accentColor.set(this.branding.accent());
      this.backgroundColor.set('');
    }
    this.applyBranding();
  }

  private persistBranding(): void {
    localStorage.setItem(this.brandingStorageKey(), JSON.stringify({
      accentColor: this.accentColor(),
      backgroundColor: this.backgroundColor(),
    }));
  }

  private applyBranding(): void {
    const profilePage = document.body;
    const accent = this.accentColor();
    const background = this.backgroundColor();
    const isLightBackground = background ? this.isLightColor(background) : false;

    this.branding.setAccent(accent);

    if (background) {
      const text = isLightBackground ? '#111111' : '#ffffff';
      const muted = isLightBackground ? '#5e6466' : '#a4a6a8';
      const line = isLightBackground ? '#d7dddd' : '#303333';
      const lineSoft = isLightBackground ? '#e7ecec' : '#252828';
      const panel = isLightBackground ? '#f7f9f8' : '#181a1a';
      const panelSoft = isLightBackground ? '#e9eeee' : '#222525';

      profilePage.style.setProperty('--bg', background);
      profilePage.style.setProperty('--text', text);
      profilePage.style.setProperty('--muted', muted);
      profilePage.style.setProperty('--muted-2', isLightBackground ? '#7a8284' : '#7e8284');
      profilePage.style.setProperty('--line', line);
      profilePage.style.setProperty('--line-soft', lineSoft);
      profilePage.style.setProperty('--panel', panel);
      profilePage.style.setProperty('--panel-soft', panelSoft);

      // These layout variables are inherited by the shared sidebar and only live
      // for as long as the Profile component is mounted.
      profilePage.style.setProperty('--bg-body', background);
      profilePage.style.setProperty('--bg-sidebar', background);
      profilePage.style.setProperty('--bg-panel', panel);
      profilePage.style.setProperty('--bg-secondary', panelSoft);
      profilePage.style.setProperty('--text-main', text);
      profilePage.style.setProperty('--text-muted', muted);
      profilePage.style.setProperty('--border-color', line);
      profilePage.style.setProperty('--border-light', lineSoft);
    } else {
      for (const property of this.profileBackgroundProperties()) {
        profilePage.style.removeProperty(property);
      }
    }
  }

  private clearBrandingVariables(): void {
    for (const property of this.profileBackgroundProperties()) {
      document.body.style.removeProperty(property);
    }
  }

  private profileBackgroundProperties(): string[] {
    return [
      '--bg', '--text', '--muted', '--muted-2', '--line', '--line-soft', '--panel', '--panel-soft',
      '--bg-body', '--bg-sidebar', '--bg-panel', '--bg-secondary',
      '--text-main', '--text-muted', '--border-color', '--border-light',
    ];
  }

  private normalizeHex(value: string): string {
    const normalized = value.trim().toUpperCase();
    return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : '';
  }

  private isLightColor(color: string): boolean {
    const hex = this.normalizeHex(color).slice(1);
    if (!hex) {
      return false;
    }
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return (red * 299 + green * 587 + blue * 114) / 1000 > 160;
  }

  private formatError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.meta?.error?.message ?? error.error?.message;
      return Array.isArray(message) ? message.join(' ') : message || error.message;
    }
    return 'Unable to complete the request. Please try again.';
  }
}
