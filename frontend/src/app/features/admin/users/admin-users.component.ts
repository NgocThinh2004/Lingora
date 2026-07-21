import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PaginationMeta } from '../../../core/models/api-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';
import { AdminUser, AdminUserRole, AdminUserStatus } from './models/admin-user.model';
import { AdminUsersService } from './services/admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiStateComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly pageSize = 8;
  readonly users = signal<AdminUser[]>([]);
  readonly directoryTotal = signal(0);
  readonly pagination = signal<PaginationMeta>({ total: 0, page: 1, limit: this.pageSize, totalPages: 0 });
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedUser = signal<AdminUser | null>(null);
  readonly detailLoading = signal(false);
  readonly saving = signal(false);
  readonly updatingUserIds = signal<ReadonlySet<string>>(new Set());
  readonly adminProtectionActive = signal(false);
  readonly drawerOpen = signal(false);
  readonly selectedUserIsSelf = computed(() => this.selectedUser()?.id === this.authService.currentUser()?.id);
  readonly selectedUserIsAdmin = computed(() => this.selectedUser()?.role === 'admin');

  readonly filterForm = this.fb.nonNullable.group({
    search: '',
    role: '',
    status: '',
  });

  readonly editForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.maxLength(80)]],
    bio: ['', Validators.maxLength(180)],
    role: 'member' as AdminUserRole,
    active: true,
  });

  ngOnInit(): void {
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.loadUsers(1));

    this.editForm.controls.role.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(role => this.applyRoleProtection(role));

    this.loadUsers(1);
  }

  loadUsers(page = this.pagination().page): void {
    const filters = this.filterForm.getRawValue();
    this.loading.set(true);
    this.errorMessage.set('');

    this.adminUsersService.getUsers({
      search: filters.search.trim() || undefined,
      role: (filters.role || undefined) as AdminUserRole | undefined,
      status: (filters.status || undefined) as AdminUserStatus | undefined,
      page,
      limit: this.pageSize,
    }).subscribe({
      next: response => {
        this.users.set(response.data);
        if (response.meta?.pagination) {
          this.pagination.set(response.meta.pagination);
        }
        this.directoryTotal.set(Number(response.meta?.['directoryTotal'] ?? response.meta?.pagination?.total ?? 0));
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(error.error?.meta?.error?.message || 'Unable to load users.');
        this.loading.set(false);
      },
    });
  }

  clearFilters(): void {
    this.filterForm.setValue({ search: '', role: '', status: '' });
  }

  openUser(user: AdminUser): void {
    this.drawerOpen.set(true);
    this.selectedUser.set(null);
    this.detailLoading.set(true);

    this.adminUsersService.getUser(user.id).subscribe({
      next: response => {
        if (!this.drawerOpen()) {
          return;
        }
        const selected = response.data;
        this.selectedUser.set(selected);
        this.editForm.reset({
          displayName: selected.displayName || selected.username,
          bio: selected.bio || '',
          role: selected.role ?? 'member',
          active: selected.status === 'active',
        }, { emitEvent: false });
        this.configureAccessControls(selected);
        this.detailLoading.set(false);
      },
      error: error => {
        this.detailLoading.set(false);
        this.errorMessage.set(error.error?.meta?.error?.message || 'Unable to load user details.');
      },
    });
  }

  openUserFromKeyboard(event: KeyboardEvent, user: AdminUser): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openUser(user);
    }
  }

  closeDrawer(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.saving()) {
      return;
    }
    this.drawerOpen.set(false);
    this.selectedUser.set(null);
    this.detailLoading.set(false);
  }

  toggleUserStatus(user: AdminUser, input: HTMLInputElement): void {
    if (user.role === 'admin' || this.updatingUserIds().has(user.id)) {
      input.checked = user.status === 'active';
      return;
    }

    const status: AdminUserStatus = input.checked ? 'active' : 'inactive';
    this.setUpdating(user.id, true);
    this.adminUsersService.updateUser(user.id, { status }).subscribe({
      next: response => {
        this.replaceUser(response.data);
        this.setUpdating(user.id, false);
        this.toastService.showSuccess(`${this.userName(response.data)} is now ${response.data.status}.`);
      },
      error: error => {
        input.checked = user.status === 'active';
        this.setUpdating(user.id, false);
        this.toastService.showError(error.error?.meta?.error?.message || 'Unable to change account status.');
      },
    });
  }

  saveUser(): void {
    const user = this.selectedUser();
    if (!user || this.saving()) {
      return;
    }
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const values = this.editForm.getRawValue();
    this.saving.set(true);
    this.adminUsersService.updateUser(user.id, {
      displayName: values.displayName.trim(),
      bio: values.bio.trim(),
      ...(user.role === 'admin' ? {} : {
        role: values.role,
        status: values.active ? 'active' : 'inactive',
      }),
    }).subscribe({
      next: response => {
        this.replaceUser(response.data);
        this.saving.set(false);
        this.closeDrawer();
        this.toastService.showSuccess(`Changes to ${this.userName(response.data)} were saved.`);
      },
      error: error => {
        this.saving.set(false);
        this.toastService.showError(error.error?.meta?.error?.message || 'Unable to update this user.');
      },
    });
  }

  pageNumbers(): number[] {
    const { page, totalPages } = this.pagination();
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }

  initials(user: AdminUser): string {
    return this.userName(user).slice(0, 2).toUpperCase();
  }

  userName(user: AdminUser): string {
    return user.displayName?.trim() || user.username;
  }

  isCurrentUser(user: AdminUser): boolean {
    return user.id === this.authService.currentUser()?.id;
  }

  private configureAccessControls(user: AdminUser): void {
    if (user.role === 'admin') {
      this.editForm.controls.role.disable({ emitEvent: false });
      this.editForm.controls.active.disable({ emitEvent: false });
      this.editForm.controls.active.setValue(true, { emitEvent: false });
      this.adminProtectionActive.set(true);
      return;
    }
    this.editForm.controls.role.enable({ emitEvent: false });
    this.editForm.controls.active.enable({ emitEvent: false });
    this.adminProtectionActive.set(false);
  }

  private applyRoleProtection(role: AdminUserRole): void {
    if (!this.selectedUser() || this.selectedUserIsAdmin()) {
      return;
    }
    const promoted = role === 'admin';
    this.adminProtectionActive.set(promoted);
    if (promoted) {
      this.editForm.controls.active.setValue(true, { emitEvent: false });
      this.editForm.controls.active.disable({ emitEvent: false });
    } else {
      this.editForm.controls.active.enable({ emitEvent: false });
    }
  }

  private replaceUser(updatedUser: AdminUser): void {
    this.users.update(users => users.map(user => user.id === updatedUser.id ? updatedUser : user));
    if (this.selectedUser()?.id === updatedUser.id) {
      this.selectedUser.set(updatedUser);
    }
  }

  private setUpdating(userId: string, updating: boolean): void {
    this.updatingUserIds.update(current => {
      const next = new Set(current);
      updating ? next.add(userId) : next.delete(userId);
      return next;
    });
  }
}
