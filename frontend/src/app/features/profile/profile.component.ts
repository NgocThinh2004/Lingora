import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, OnDestroy, signal, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PostsService } from '../../core/services/posts.service';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { AuthorPost } from '../../core/models/post.model';
import { SubscriptionsService } from '../../core/services/subscriptions.service';
import { AppSidebarComponent } from '../../shared/components/app-sidebar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AppSidebarComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private postsService = inject(PostsService);
  private ui = inject(UiPreferencesService);
  private router = inject(Router);
  private subscriptionsService = inject(SubscriptionsService);

  user = this.authService.currentUser;

  // Local profile state for editing
  profileForm = {
    displayName: '',
    username: '',
    bio: ''
  };

  isEditing = signal(false);
  posts = signal<AuthorPost[]>([]);
  categoryOptions: Array<{ id: number; label: string }> = [];
  followersCount = signal(0);
  followingCount = signal(0);
  loadingProfile = signal(true);
  savingProfile = signal(false);
  savingPassword = signal(false);
  notice = signal('');
  error = signal('');

  // Modals state
  showPasswordModal = signal(false);
  showHandleModal = signal(false);
  showSubscribersModal = signal(false);

  // Settings
  passwordForm = { current: '', new: '', confirm: '' };
  handleOption = 'current';
  customHandle = '';

  // Password UI
  passwordFieldType = 'password';

  ngOnInit() {
    this.ui.mount('Profile - Lingora');

    const currentUser = this.user();
    this.setProfileForm(currentUser);

    this.authService.getMe().subscribe({
      next: user => {
        this.setProfileForm(user);
        this.loadingProfile.set(false);
      },
      error: err => {
        this.error.set(this.formatError(err));
        this.loadingProfile.set(false);
      },
    });

    // Load user's posts
    this.postsService.listAuthorPosts({ status: 'published', limit: 10 }).subscribe({
      next: (res) => {
        if (res && res.data) {
          this.posts.set(res.data);
        }
      },
      error: (err) => {
        console.error('Failed to load posts', err);
      }
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
      error: err => this.error.set(this.formatError(err)),
    });
  }

  ngOnDestroy() {
    this.ui.unmount();
  }

  get initial(): string {
    const name = this.profileForm.displayName || 'U';
    return name.charAt(0).toUpperCase();
  }

  get avatarUrl(): string {
    return this.user()?.avatarUrl || '';
  }

  postTitle(post: AuthorPost): string {
    return post.translations.find(translation => translation.title)?.title || 'Untitled';
  }

  postContent(post: AuthorPost): string {
    const translation = post.translations.find(item => item.content || item.summary);
    return translation?.content || translation?.summary || '';
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
      this.error.set('Display name and a valid username are required.');
      return;
    }

    this.savingProfile.set(true);
    this.error.set('');
    this.notice.set('');
    this.authService.updateProfile({
      displayName: this.profileForm.displayName.trim(),
      username: this.normalizeUsername(this.profileForm.username),
      bio: this.profileForm.bio.trim(),
    }).subscribe({
      next: user => {
        this.setProfileForm(user);
        this.notice.set('Profile updated successfully.');
        this.savingProfile.set(false);
        this.isEditing.set(false);
      },
      error: err => {
        this.error.set(this.formatError(err));
        this.savingProfile.set(false);
      },
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
      this.error.set('');
      this.authService.changePassword({
        currentPassword: this.passwordForm.current,
        newPassword: this.passwordForm.new,
      }).subscribe({
        next: () => {
          this.passwordForm = { current: '', new: '', confirm: '' };
          this.showPasswordModal.set(false);
          this.savingPassword.set(false);
          this.authService.expireSession();
          void this.router.navigate(['/auth/login'], {
            queryParams: { message: 'Password updated. Please sign in again.' },
          });
        },
        error: err => {
          this.error.set(this.formatError(err));
          this.savingPassword.set(false);
        },
      });
    }
  }

  togglePasswordVisibility() {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  selectColor(color: string, type: 'accent' | 'background') {
    document.documentElement.style.setProperty(
      type === 'accent' ? '--profile-accent' : '--profile-background',
      color
    );
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

  private formatError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.meta?.error?.message ?? error.error?.message;
      return Array.isArray(message) ? message.join(' ') : message || error.message;
    }
    return 'Unable to complete the request. Please try again.';
  }
}
