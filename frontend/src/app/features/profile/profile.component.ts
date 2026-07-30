import { Component, HostListener, OnInit, OnDestroy, computed, signal, inject, ViewEncapsulation, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, map, Observable, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { CurrentUser } from '../../core/auth/current-user.model';
import { ToastService } from '../../core/notifications/toast.service';
import { BrandingService } from '../../core/theme/branding.service';
import { getApiErrorMessage } from '../../core/http/api-error.util';
import { Post } from '../posts/models/post.model';
import { AuthorPostsService } from '../posts/services/author-posts.service';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { SubscriptionAuthor } from '../subscriptions/models/subscription.model';
import { SubscriptionsService } from '../subscriptions/services/subscriptions.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/services/users.service';
import { EditorUploadsService } from '../workspace/services/editor-uploads.service';
import { AssetImageDirective } from '../../shared/directives/asset-image.directive';
import { SubscribeButtonComponent } from '../subscriptions/components/subscribe-button/subscribe-button.component';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LocaleService } from '../../core/locale/locale.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AssetImageDirective, SubscribeButtonComponent, PostCardComponent, TranslatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'feature-page-profile' },
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private postsService = inject(AuthorPostsService);
  private feedPostsService = inject(FeedPostsService);
  private usersService = inject(UsersService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptionsService = inject(SubscriptionsService);
  private uploadsService = inject(EditorUploadsService);
  private toast = inject(ToastService);
  private branding = inject(BrandingService);
  private localeService = inject(LocaleService);

  private observer?: IntersectionObserver;
  private routeSubscription?: Subscription;
  private previousAccent = this.branding.accent();
  viewedUserId: string | null = null;
  private cropSourceImage: HTMLImageElement | null = null;
  private cropSourceFile: File | null = null;
  private cropDragging = false;
  private cropPointerX = 0;
  private cropPointerY = 0;
  user = signal<CurrentUser | null>(this.authService.currentUser());
  isOwnProfile = signal(true);
  allowShowSubscribers = signal(true);
  allowShowFollowing = signal(true);

  // Local profile state for editing
  profileForm = {
    displayName: '',
    username: '',
    bio: ''
  };

  isEditing = signal(false);
  posts = signal<Post[]>([]);
  page = 1;
  feedLoading = signal(false);
  publicPostsCount = signal(0);
  categoryOptions: Array<{ id: number; label: string }> = [];
  followersCount = signal(0);
  followingCount = signal(0);
  loadingProfile = signal(true);
  savingProfile = signal(false);
  savingPassword = signal(false);
  uploadingAvatar = signal(false);
  avatarCropOpen = signal(false);
  cropImageUrl = signal('');
  cropZoom = signal(1);
  cropOffsetX = signal(0);
  cropOffsetY = signal(0);
  cropNaturalWidth = signal(1);
  cropNaturalHeight = signal(1);
  readonly cropViewportSize = 260;
  readonly cropDisplayWidth = computed(() => {
    const baseScale = Math.max(
      this.cropViewportSize / this.cropNaturalWidth(),
      this.cropViewportSize / this.cropNaturalHeight(),
    );
    return this.cropNaturalWidth() * baseScale * this.cropZoom();
  });
  readonly cropDisplayHeight = computed(() => {
    const baseScale = Math.max(
      this.cropViewportSize / this.cropNaturalWidth(),
      this.cropViewportSize / this.cropNaturalHeight(),
    );
    return this.cropNaturalHeight() * baseScale * this.cropZoom();
  });
  readonly cropTransform = computed(
    () => `translate(-50%, -50%) translate(${this.cropOffsetX()}px, ${this.cropOffsetY()}px)`,
  );
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
    this.postsService.getPostOptions().subscribe({
      next: options => {
        this.categoryOptions = options.categories;
      },
      error: () => {
        this.categoryOptions = [];
      },
    });

    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.loadProfile(params.get('id'));
    });
  }

  ngOnDestroy() {
    this.routeSubscription?.unsubscribe();
    this.observer?.disconnect();
    this.clearBrandingVariables();
    if (!this.isOwnProfile()) {
      this.branding.setAccent(this.previousAccent, false);
    }
    document.body.classList.remove('profile-modal-open');
    this.releaseCropImage();
  }

  get avatarUrl(): string {
    const url = this.user()?.avatarUrl;
    return url ? this.uploadsService.toAbsoluteUrl(url) : '';
  }

  onFollowChange(isSubscribed: boolean): void {
    this.followersCount.update(count => Math.max(0, count + (isSubscribed ? 1 : -1)));
  }

  toggleEdit(editing: boolean) {
    this.isEditing.set(editing);
  }

  saveProfile() {
    if (!this.profileForm.displayName.trim() || !this.normalizeUsername(this.profileForm.username)) {
      this.toast.showError(this.localeService.translate('profile_fields_required'));
      return;
    }

    this.savingProfile.set(true);
    this.authService.updateProfile({
      displayName: this.profileForm.displayName.trim(),
      username: this.normalizeUsername(this.profileForm.username),
      bio: this.profileForm.bio.trim(),
      accentColor: this.accentColor(),
      backgroundColor: this.backgroundColor(),
    }).subscribe({
      next: user => {
        this.user.set(user);
        this.setProfileForm(user);
        this.persistBranding();
        this.toast.showSuccess(this.localeService.translate('profile_updated_success'));
        this.savingProfile.set(false);
        this.isEditing.set(false);
      },
      error: err => {
        this.toast.showError(this.formatError(err));
        this.savingProfile.set(false);
      },
    });
  }

  @ViewChild('scrollTrigger') set scrollTrigger(el: ElementRef<HTMLElement> | undefined) {
    if (el) {
      if (!this.observer) {
        this.observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !this.feedLoading() && this.posts().length < this.publicPostsCount()) {
            this.page++;
            this.loadPosts();
          }
        }, { rootMargin: '200px' });
      }
      this.observer.observe(el.nativeElement);
    } else {
      this.observer?.disconnect();
      this.observer = undefined;
    }
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toast.showError(this.localeService.translate('select_image_file'));
      return;
    }

    this.openAvatarCropper(file);
  }

  beginAvatarCropDrag(event: PointerEvent): void {
    event.preventDefault();
    this.cropDragging = true;
    this.cropPointerX = event.clientX;
    this.cropPointerY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  moveAvatarCrop(event: PointerEvent): void {
    if (!this.cropDragging) {
      return;
    }

    const nextX = this.cropOffsetX() + event.clientX - this.cropPointerX;
    const nextY = this.cropOffsetY() + event.clientY - this.cropPointerY;
    this.cropPointerX = event.clientX;
    this.cropPointerY = event.clientY;
    this.setCropOffsets(nextX, nextY);
  }

  endAvatarCrop(event?: PointerEvent): void {
    this.cropDragging = false;
    const target = event?.currentTarget as HTMLElement | undefined;
    if (event && target?.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }

  updateCropZoom(value: string | number): void {
    this.cropZoom.set(Math.min(3, Math.max(1, Number(value) || 1)));
    this.setCropOffsets(this.cropOffsetX(), this.cropOffsetY());
  }

  cancelAvatarCrop(): void {
    this.avatarCropOpen.set(false);
    this.cropDragging = false;
    document.body.classList.remove('profile-modal-open');
    this.releaseCropImage();
  }

  confirmAvatarCrop(): void {
    const image = this.cropSourceImage;
    const original = this.cropSourceFile;
    if (!image || !original) {
      return;
    }

    const outputSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');
    if (!context) {
      this.toast.showError(this.localeService.translate('unable_crop_image'));
      return;
    }

    const displayScale = this.cropDisplayWidth() / this.cropNaturalWidth();
    const sourceX = ((this.cropDisplayWidth() - this.cropViewportSize) / 2 - this.cropOffsetX()) / displayScale;
    const sourceY = ((this.cropDisplayHeight() - this.cropViewportSize) / 2 - this.cropOffsetY()) / displayScale;
    const sourceSize = this.cropViewportSize / displayScale;

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, outputSize, outputSize);
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize,
    );

    canvas.toBlob(blob => {
      if (!blob) {
        this.toast.showError(this.localeService.translate('unable_crop_image'));
        return;
      }
      const baseName = original.name.replace(/\.[^.]+$/, '') || 'avatar';
      this.cancelAvatarCrop();
      this.uploadAvatar(new File([blob], `${baseName}-avatar.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  }

  private uploadAvatar(file: File): void {
    this.uploadingAvatar.set(true);
    this.uploadsService.uploadEditorMedia('image', file).pipe(
      switchMap(upload => this.authService.updateProfile({
        displayName: this.profileForm.displayName.trim(),
        username: this.normalizeUsername(this.profileForm.username),
        bio: this.profileForm.bio.trim(),
        avatarUrl: upload.url,
        accentColor: this.accentColor(),
        backgroundColor: this.backgroundColor(),
      })),
      finalize(() => this.uploadingAvatar.set(false)),
    ).subscribe({
      next: user => {
        this.user.set(user);
        this.setProfileForm(user);
        this.toast.showSuccess(this.localeService.translate('profile_photo_updated'));
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
            queryParams: { messageKey: 'password_updated_sign_in_again' },
          });
        },
        error: err => {
          this.toast.showError(this.formatError(err));
          this.savingPassword.set(false);
        },
      });
    } else {
      this.toast.showError(this.localeService.translate('new_passwords_invalid'));
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

    const request: Observable<Array<SubscriptionAuthor | User>> = this.isOwnProfile()
      ? (mode === 'followers'
          ? this.subscriptionsService.followers()
          : this.subscriptionsService.following().pipe(map(response => response.items)))
      : (mode === 'followers'
          ? this.usersService.getFollowers(Number(this.viewedUserId))
          : this.usersService.getFollowing(Number(this.viewedUserId)));
    request.subscribe({
      next: people => {
        if (this.showSubscribersModal() && this.peopleModalMode() === mode) {
          this.people.set(people.map(person => this.toSubscriptionAuthor(person)));
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
    return this.peopleModalMode() === 'followers' ? 'followers' : 'following';
  }

  peopleSearchPlaceholder(): string {
    return this.peopleModalMode() === 'followers'
      ? 'search_followers'
      : 'search_following';
  }

  personDisplayName(person: SubscriptionAuthor): string {
    return person.displayName || person.username;
  }

  personAvatar(person: SubscriptionAuthor): string {
    return person.avatarUrl && !this.failedPeopleAvatarIds().has(person.id)
      ? this.uploadsService.toAbsoluteUrl(person.avatarUrl)
      : 'assets/images/default-avatar.svg';
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
    if (this.avatarCropOpen()) {
      this.cancelAvatarCrop();
    }
  }

  private openAvatarCropper(file: File): void {
    this.releaseCropImage();
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      this.cropSourceFile = file;
      this.cropSourceImage = image;
      this.cropImageUrl.set(objectUrl);
      this.cropNaturalWidth.set(image.naturalWidth || 1);
      this.cropNaturalHeight.set(image.naturalHeight || 1);
      this.cropZoom.set(1);
      this.cropOffsetX.set(0);
      this.cropOffsetY.set(0);
      this.avatarCropOpen.set(true);
      document.body.classList.add('profile-modal-open');
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      this.toast.showError(this.localeService.translate('unable_open_image'));
    };
    image.src = objectUrl;
  }

  private setCropOffsets(x: number, y: number): void {
    const maxX = Math.max(0, (this.cropDisplayWidth() - this.cropViewportSize) / 2);
    const maxY = Math.max(0, (this.cropDisplayHeight() - this.cropViewportSize) / 2);
    this.cropOffsetX.set(Math.min(maxX, Math.max(-maxX, x)));
    this.cropOffsetY.set(Math.min(maxY, Math.max(-maxY, y)));
  }

  private releaseCropImage(): void {
    const objectUrl = this.cropImageUrl();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    this.cropImageUrl.set('');
    this.cropSourceImage = null;
    this.cropSourceFile = null;
  }

  private loadProfile(routeUserId: string | null): void {
    const currentUser = this.authService.currentUser();
    const ownProfile = !routeUserId || String(currentUser?.id) === routeUserId;
    this.isOwnProfile.set(ownProfile);
    this.viewedUserId = routeUserId || (currentUser ? String(currentUser.id) : null);
    this.isEditing.set(false);
    this.loadingProfile.set(true);
    this.page = 1;
    this.posts.set([]);
    this.publicPostsCount.set(0);
    this.followersCount.set(0);
    this.followingCount.set(0);

    if (ownProfile) {
      this.user.set(currentUser);
      this.setProfileForm(currentUser);
      this.loadBranding();
      this.loadOwnProfile();
      return;
    }

    const publicUserId = Number(routeUserId);
    if (!Number.isInteger(publicUserId) || publicUserId < 1) {
      this.loadingProfile.set(false);
      this.toast.showError(this.localeService.translate('profile_not_found'));
      void this.router.navigate(['/home']);
      return;
    }

    this.usersService.getPublicProfile(publicUserId).subscribe({
      next: profile => {
        const user: CurrentUser = {
          id: String(profile.id),
          email: '',
          username: profile.handle,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl || undefined,
          bio: profile.bio,
          accentColor: profile.accentColor,
          backgroundColor: profile.backgroundColor,
          role: profile.role,
        };
        this.user.set(user);
        this.setProfileForm(user);
        this.followersCount.set(profile.followersCount || 0);
        this.followingCount.set(profile.followingCount || 0);
        this.loadBranding();
        this.loadingProfile.set(false);
      },
      error: err => {
        this.loadingProfile.set(false);
        this.toast.showError(this.formatError(err));
      },
    });

    this.loadPosts();
  }

  private loadPosts(): void {
    if (!this.viewedUserId) return;
    this.feedLoading.set(true);
    this.feedPostsService.list({ authorId: Number(this.viewedUserId), limit: 10, page: this.page }).subscribe({
      next: response => {
        if (this.page === 1) {
          this.posts.set(response.items);
        } else {
          this.posts.set([...this.posts(), ...response.items]);
        }
        this.publicPostsCount.set(response.meta.total);
        this.feedLoading.set(false);
      },
      error: err => {
        this.toast.showError(this.formatError(err));
        this.feedLoading.set(false);
      },
    });
  }

  private loadOwnProfile(): void {
    this.authService.getMe().subscribe({
      next: user => {
        this.user.set(user);
        this.viewedUserId = String(user.id);
        this.setProfileForm(user);
        this.loadBranding();
        this.loadingProfile.set(false);

        // Read counts directly from the getMe() response (no extra API call needed)
        this.followersCount.set(user.followersCount ?? 0);
        this.followingCount.set(user.followingCount ?? 0);

        this.loadPosts();
      },
      error: err => {
        this.toast.showError(this.formatError(err));
        this.loadingProfile.set(false);
      },
    });
  }




  private toSubscriptionAuthor(person: SubscriptionAuthor | User): SubscriptionAuthor {
    if ('displayName' in person) {
      return person;
    }
    return {
      id: String(person.id),
      username: person.handle,
      displayName: person.name,
      avatarUrl: person.avatarUrl || null,
      bio: person.bio || null,
    };
  }

  private setProfileForm(user: CurrentUser | User | null): void {
    if (!user) {
      return;
    }
    const dName = ('displayName' in user ? user.displayName : user.name);
    const uName = ('username' in user ? user.username : user.handle);
    
    this.profileForm = {
      displayName: dName || uName,
      username: `@${uName.replace(/^@/, '')}`,
      bio: user.bio || '',
    };
    
    this.allowShowSubscribers.set((user as any).allowShowSubscribers ?? true);
    this.allowShowFollowing.set((user as any).allowShowFollowing ?? true);
  }

  private normalizeUsername(value: string): string {
    return value.trim().replace(/^@/, '');
  }

  private brandingStorageKey(): string {
    return `lingora:profile-branding:${this.user()?.id || 'current'}`;
  }

  private loadBranding(): void {
    const profile = this.user();
    const serverAccent = this.normalizeHex(profile?.accentColor || '');
    const serverBackground = this.normalizeHex(profile?.backgroundColor || '');
    if (!this.isOwnProfile()) {
      this.accentColor.set(serverAccent || '#FF6719');
      this.backgroundColor.set(serverBackground);
      this.applyBranding();
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem(this.brandingStorageKey()) || '{}') as {
        accentColor?: string;
        backgroundColor?: string;
      };
      this.accentColor.set(serverAccent || this.normalizeHex(stored.accentColor || '') || this.branding.accent());
      this.backgroundColor.set(serverBackground || this.normalizeHex(stored.backgroundColor || ''));
    } catch {
      this.accentColor.set(this.branding.accent());
      this.backgroundColor.set('');
    }
    this.applyBranding();
  }

  private persistBranding(): void {
    if (!this.isOwnProfile()) {
      return;
    }
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

    this.branding.setAccent(accent, this.isOwnProfile());

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
    return getApiErrorMessage(error, this.localeService.translate('request_failed'), true);
  }
}
