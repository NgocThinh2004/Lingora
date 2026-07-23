import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PaginationMeta } from '../../../core/http/api-response.model';
import { LocaleService } from '../../../core/locale/locale.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';
import { AdminLanguage } from '../languages/models/admin-language.model';
import { AdminLanguagesService } from '../languages/services/admin-languages.service';
import {
  AdminCategory,
  AdminCategoryPost,
  AdminCategoryTranslation,
  CategoryTranslationRequest,
  CreateAdminCategoryRequest,
  UpdateAdminCategoryRequest,
} from './models/admin-category.model';
import { AdminCategoriesService } from './services/admin-categories.service';

type CategoryPanelMode = 'add' | 'edit' | null;

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UiStateComponent],
  templateUrl: './admin-categories.component.html',
  styleUrl: './admin-categories.component.scss',
})
export class AdminCategoriesComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly categoriesService = inject(AdminCategoriesService);
  private readonly languagesService = inject(AdminLanguagesService);
  private readonly localeService = inject(LocaleService);
  private readonly toastService = inject(ToastService);
  private readonly destroy$ = new Subject<void>();

  readonly categories = signal<AdminCategory[]>([]);
  readonly activeLanguages = signal<AdminLanguage[]>([]);
  readonly loading = signal(true);
  readonly languagesLoading = signal(true);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly errorMessage = signal('');
  readonly panelMode = signal<CategoryPanelMode>(null);
  readonly selectedCategory = signal<AdminCategory | null>(null);
  readonly pendingDelete = signal<AdminCategory | null>(null);
  readonly postsCategory = signal<AdminCategory | null>(null);
  readonly categoryPosts = signal<AdminCategoryPost[]>([]);
  readonly postsLoading = signal(false);
  readonly postsError = signal('');
  readonly postsMeta = signal({ total: 0, shown: 0 });
  readonly pagination = signal<PaginationMeta>({ total: 0, page: 1, limit: 8, totalPages: 0 });
  readonly selectedLocale = this.localeService.selectedLocale;

  readonly filters = this.fb.nonNullable.group({
    search: [''],
    status: ['all' as const],
    postFilter: ['all' as const],
    sort: ['newest' as const],
  });

  readonly categoryForm = this.fb.nonNullable.group({
    isActive: true,
    translations: this.fb.array([] as ReturnType<typeof this.createTranslationGroup>[]),
  });

  get translationForms(): FormArray<ReturnType<typeof this.createTranslationGroup>> {
    return this.categoryForm.controls.translations;
  }

  ngOnInit(): void {
    this.loadLanguages();
    this.loadCategories();
    this.filters.valueChanges
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe(() => this.loadCategories(1));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    const filters = this.filters.getRawValue();
    this.categoriesService.getCategories({
      search: filters.search.trim(),
      status: filters.status,
      postFilter: filters.postFilter,
      sort: filters.sort,
      page,
      limit: this.pagination().limit,
    }).subscribe({
      next: response => {
        this.categories.set(response.data);
        if (response.meta?.pagination) {
          this.pagination.set(response.meta.pagination);
        }
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(error.error?.meta?.error?.message || 'Unable to load categories.');
        this.loading.set(false);
      },
    });
  }

  loadLanguages(): void {
    this.languagesLoading.set(true);
    this.languagesService.getLanguages(1, 100).subscribe({
      next: response => {
        this.activeLanguages.set(response.data.filter(language => language.isActive));
        this.languagesLoading.set(false);
      },
      error: () => {
        this.languagesLoading.set(false);
        this.toastService.showError('Unable to load active languages for category translations.');
      },
    });
  }

  clearFilters(): void {
    this.filters.reset({ search: '', status: 'all', postFilter: 'all', sort: 'newest' });
  }

  openAddPanel(): void {
    if (!this.activeLanguages().length) {
      this.toastService.showError('Add at least one active language before creating a category.');
      return;
    }
    this.selectedCategory.set(null);
    this.categoryForm.controls.isActive.setValue(true);
    this.rebuildTranslationForms(null);
    this.showPanel('add');
  }

  openEditPanel(category: AdminCategory): void {
    this.selectedCategory.set(category);
    this.categoryForm.controls.isActive.setValue(category.isActive);
    this.rebuildTranslationForms(category);
    this.showPanel('edit');
  }

  openEditFromKeyboard(event: KeyboardEvent, category: AdminCategory): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openEditPanel(category);
    }
  }

  closePanel(): void {
    this.panelMode.set(null);
    this.selectedCategory.set(null);
  }

  suggestSlug(index: number): void {
    const group = this.translationForms.at(index);
    if (!group.controls.slug.dirty || !group.controls.slug.value) {
      group.controls.slug.setValue(this.slugify(group.controls.name.value));
    }
  }

  saveCategory(): void {
    if (this.saving()) {
      return;
    }
    const translations = this.translationPayload();
    if (this.categoryForm.invalid || !translations) {
      this.categoryForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    if (this.panelMode() === 'add') {
      const payload: CreateAdminCategoryRequest = {
        isActive: this.categoryForm.controls.isActive.value,
        translations,
      };
      this.categoriesService.createCategory(payload).subscribe({
        next: response => this.finishSave(`${this.displayName(response.data)} was created.`),
        error: error => this.failSave(error, 'Unable to create this category.'),
      });
      return;
    }

    const category = this.selectedCategory();
    if (!category) {
      this.saving.set(false);
      return;
    }
    const payload: UpdateAdminCategoryRequest = {
      isActive: this.categoryForm.controls.isActive.value,
      translations,
    };
    this.categoriesService.updateCategory(category.id, payload).subscribe({
      next: response => this.finishSave(`${this.displayName(response.data)} was updated.`),
      error: error => this.failSave(error, 'Unable to update this category.'),
    });
  }

  requestDelete(category: AdminCategory): void {
    this.pendingDelete.set(category);
  }

  openPostsPanel(category: AdminCategory): void {
    this.postsCategory.set(category);
    this.categoryPosts.set([]);
    this.postsError.set('');
    this.postsMeta.set({ total: category.postCount, shown: 0 });
    this.postsLoading.set(true);
    this.categoriesService.getCategoryPosts(category.id, this.selectedLocale())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          if (this.postsCategory()?.id !== category.id) {
            return;
          }
          this.categoryPosts.set(response.data);
          this.postsMeta.set({
            total: Number(response.meta?.['total'] ?? response.data.length),
            shown: Number(response.meta?.['shown'] ?? response.data.length),
          });
          this.postsLoading.set(false);
        },
        error: error => {
          this.postsError.set(error.error?.meta?.error?.message || 'Unable to load posts in this category.');
          this.postsLoading.set(false);
        },
      });
  }

  closePostsPanel(): void {
    this.postsCategory.set(null);
    this.categoryPosts.set([]);
    this.postsError.set('');
    this.postsLoading.set(false);
  }

  cancelDelete(): void {
    if (!this.deleting()) {
      this.pendingDelete.set(null);
    }
  }

  confirmDelete(): void {
    const category = this.pendingDelete();
    if (!category || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.categoriesService.deleteCategory(category.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toastService.showSuccess(`${this.displayName(category)} was deleted.`);
        const nextPage = this.categories().length === 1 && this.pagination().page > 1
          ? this.pagination().page - 1
          : this.pagination().page;
        this.loadCategories(nextPage);
      },
      error: error => {
        this.deleting.set(false);
        this.toastService.showError(error.error?.meta?.error?.message || 'Unable to delete this category.');
      },
    });
  }

  displayTranslation(category: AdminCategory): AdminCategoryTranslation | undefined {
    return category.translations.find(item => item.languageCode === this.selectedLocale())
      ?? category.translations.find(item => item.languageCode === 'en')
      ?? category.translations[0];
  }

  displayName(category: AdminCategory): string {
    return this.displayTranslation(category)?.name ?? category.slug;
  }

  translationSummary(category: AdminCategory) {
    const languages = this.activeLanguages();
    if (!languages.length) {
      const [primary, ...remaining] = category.translations;
      return {
        primary,
        remainingCount: remaining.length,
        tooltip: remaining.map(item => `${item.languageName}: ${item.name}`).join(' · '),
        complete: true,
      };
    }
    const primaryLanguage = languages[0];
    const primary = category.translations.find(item => item.languageId === primaryLanguage.id)
      ?? category.translations[0];
    const remainingLanguages = languages.filter(language => language.id !== primaryLanguage.id);
    const remaining = remainingLanguages.map(language => ({
      language,
      translation: category.translations.find(item => item.languageId === language.id),
    }));
    return {
      primary,
      remainingCount: remaining.length,
      tooltip: remaining.map(item => `${item.language.name}: ${item.translation?.name || 'Missing translation'}`).join(' · '),
      complete: remaining.every(item => Boolean(item.translation)),
    };
  }

  postStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  flagUrl(flagCode: string | null): string {
    const code = (flagCode || '').trim().toLowerCase();
    return /^[a-z]{2}$/.test(code)
      ? `https://flagcdn.com/w40/${code}.png`
      : 'assets/images/lingora-mark.svg';
  }

  pageNumbers(): number[] {
    const { page, totalPages } = this.pagination();
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    const end = Math.min(totalPages, start + 4);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }

  private createTranslationGroup(
    language: AdminLanguage,
    translation?: AdminCategoryTranslation,
    required = true,
  ) {
    const validators = required ? [Validators.required, Validators.maxLength(150)] : [Validators.maxLength(150)];
    return this.fb.nonNullable.group({
      languageId: language.id,
      name: [translation?.name ?? '', validators],
      slug: [translation?.slug ?? '', [
        ...validators,
        Validators.pattern(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u),
      ]],
    });
  }

  private rebuildTranslationForms(category: AdminCategory | null): void {
    this.translationForms.clear();
    for (const language of this.activeLanguages()) {
      const translation = category?.translations.find(item => item.languageId === language.id);
      this.translationForms.push(this.createTranslationGroup(
        language,
        translation,
        !category || Boolean(translation),
      ));
    }
    this.categoryForm.markAsPristine();
  }

  private translationPayload(): CategoryTranslationRequest[] | null {
    const payload: CategoryTranslationRequest[] = [];
    for (const group of this.translationForms.controls) {
      const value = group.getRawValue();
      const name = value.name.trim();
      const slug = value.slug.trim();
      if (!name && !slug && this.panelMode() === 'edit') {
        continue;
      }
      if (!name || !slug) {
        group.controls.name.setErrors(name ? null : { required: true });
        group.controls.slug.setErrors(slug ? null : { required: true });
        return null;
      }
      payload.push({ languageId: value.languageId, name, slug });
    }
    return payload.length ? payload : null;
  }

  private showPanel(mode: Exclude<CategoryPanelMode, null>): void {
    this.panelMode.set(mode);
  }

  private finishSave(message: string): void {
    this.saving.set(false);
    this.closePanel();
    this.toastService.showSuccess(message);
    this.loadCategories(this.pagination().page);
  }

  private failSave(error: any, fallback: string): void {
    this.saving.set(false);
    this.toastService.showError(error.error?.meta?.error?.message || fallback);
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLocaleLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]+/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
