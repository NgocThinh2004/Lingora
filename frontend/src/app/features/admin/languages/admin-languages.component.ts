import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PaginationMeta } from '../../../core/http/api-response.model';
import { LocaleService } from '../../../core/locale/locale.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { UiStateComponent } from '../../../shared/components/ui-state/ui-state.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import {
  AdminLanguage,
  CreateAdminLanguageRequest,
  UpdateAdminLanguageRequest,
} from './models/admin-language.model';
import { AdminLanguagesService } from './services/admin-languages.service';

type LanguageDialog = 'add' | 'edit' | null;

@Component({
  selector: 'app-admin-languages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PaginationComponent, UiStateComponent, TranslatePipe],
  templateUrl: './admin-languages.component.html',
  styleUrl: './admin-languages.component.scss',
})
export class AdminLanguagesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly languagesService = inject(AdminLanguagesService);
  private readonly localeService = inject(LocaleService);
  private readonly toastService = inject(ToastService);

  readonly languages = signal<AdminLanguage[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly dialog = signal<LanguageDialog>(null);
  readonly dialogVisible = signal(false);
  readonly selectedLanguage = signal<AdminLanguage | null>(null);
  readonly updatingLanguageId = signal<number | null>(null);
  readonly pagination = signal<PaginationMeta>({ total: 0, page: 1, limit: 8, totalPages: 0 });

  readonly addForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,6})?$/)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    nativeName: ['', [Validators.required, Validators.maxLength(100)]],
    flagCode: ['', Validators.pattern(/^[A-Za-z]{2}$/)],
  });

  readonly editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    flagCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    isActive: true,
    isDefault: false,
  });

  constructor() {
    this.editForm.controls.isDefault.valueChanges.subscribe(isDefault => {
      const language = this.selectedLanguage();
      if (language?.isDefault) {
        return;
      }
      if (isDefault) {
        this.editForm.controls.isActive.setValue(true, { emitEvent: false });
        this.editForm.controls.isActive.disable({ emitEvent: false });
      } else {
        this.editForm.controls.isActive.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.loadLanguages();
  }

  loadLanguages(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.languagesService.getLanguages(page, this.pagination().limit).subscribe({
      next: response => {
        this.languages.set(response.data);
        if (response.meta?.pagination) {
          this.pagination.set(response.meta.pagination);
        }
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(this.localeService.translate('unable_load_languages'));
        this.loading.set(false);
      },
    });
  }

  openAddDialog(): void {
    this.addForm.reset({ code: '', name: '', nativeName: '', flagCode: '' });
    this.dialogVisible.set(false);
    this.dialog.set('add');
    this.revealDialog('add');
  }

  openEditDialog(language: AdminLanguage): void {
    this.selectedLanguage.set(language);
    this.editForm.controls.isActive.enable({ emitEvent: false });
    this.editForm.controls.isDefault.enable({ emitEvent: false });
    this.editForm.reset({
      name: language.name,
      flagCode: language.flagCode || '',
      isActive: language.isActive,
      isDefault: language.isDefault,
    }, { emitEvent: false });

    if (language.isDefault) {
      this.editForm.controls.isActive.disable({ emitEvent: false });
      this.editForm.controls.isDefault.disable({ emitEvent: false });
    }
    this.dialogVisible.set(false);
    this.dialog.set('edit');
    this.revealDialog('edit');
  }

  openEditFromKeyboard(event: KeyboardEvent, language: AdminLanguage): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openEditDialog(language);
    }
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.dialog.set(null);
    this.selectedLanguage.set(null);
  }

  private revealDialog(expectedDialog: Exclude<LanguageDialog, null>): void {
    requestAnimationFrame(() => {
      if (this.dialog() === expectedDialog) {
        this.dialogVisible.set(true);
      }
    });
  }

  createLanguage(): void {
    if (this.addForm.invalid || this.saving()) {
      this.addForm.markAllAsTouched();
      return;
    }
    const values = this.addForm.getRawValue();
    const payload: CreateAdminLanguageRequest = {
      code: values.code.trim().toLowerCase(),
      name: values.name.trim(),
      nativeName: values.nativeName.trim(),
      ...(values.flagCode.trim() ? { flagCode: values.flagCode.trim().toLowerCase() } : {}),
      isActive: true,
    };
    this.saving.set(true);
    this.localeService.hasStaticBundle(payload.code).subscribe(exists => {
      if (!exists) {
        this.saving.set(false);
        this.toastService.showError(this.localeService.translate('ui_locale_bundle_missing', {
          code: payload.code,
        }));
        return;
      }
      this.submitCreateLanguage(payload);
    });
  }

  private submitCreateLanguage(payload: CreateAdminLanguageRequest): void {
    this.languagesService.createLanguage(payload).subscribe({
      next: response => {
        this.saving.set(false);
        this.closeDialog();
        this.toastService.showSuccess(this.localeService.translate('language_added', { name: response.data.name }));
        this.localeService.refresh();
        this.loadLanguages(this.pagination().page);
      },
      error: error => {
        this.saving.set(false);
        this.toastService.showError(this.localeService.translate('unable_add_language'));
      },
    });
  }

  saveLanguage(): void {
    const language = this.selectedLanguage();
    if (!language || this.editForm.invalid || this.saving()) {
      this.editForm.markAllAsTouched();
      return;
    }
    const values = this.editForm.getRawValue();
    const payload: UpdateAdminLanguageRequest = {
      name: values.name.trim(),
      flagCode: values.flagCode.trim().toLowerCase(),
      isActive: language.isDefault ? true : values.isActive,
      ...(language.isDefault ? {} : { isDefault: values.isDefault }),
    };

    this.saving.set(true);
    this.languagesService.updateLanguage(language.id, payload).subscribe({
      next: response => {
        this.saving.set(false);
        this.closeDialog();
        this.toastService.showSuccess(this.localeService.translate('language_updated', { name: response.data.name }));
        this.localeService.refresh();
        this.loadLanguages(this.pagination().page);
      },
      error: error => {
        this.saving.set(false);
        this.toastService.showError(this.localeService.translate('unable_update_language'));
      },
    });
  }

  makeDefault(language: AdminLanguage): void {
    if (language.isDefault || this.updatingLanguageId() !== null) {
      return;
    }
    this.updatingLanguageId.set(language.id);
    this.languagesService.updateLanguage(language.id, { isDefault: true }).subscribe({
      next: response => {
        this.updatingLanguageId.set(null);
        this.toastService.showSuccess(this.localeService.translate('language_default_changed', { name: response.data.name }));
        this.localeService.refresh();
        this.loadLanguages(this.pagination().page);
      },
      error: error => {
        this.updatingLanguageId.set(null);
        this.toastService.showError(this.localeService.translate('unable_change_default_language'));
      },
    });
  }

  flagUrl(flagCode: string | null): string {
    const code = (flagCode || '').trim().toLowerCase();
    return /^[a-z]{2}$/.test(code)
      ? `https://flagcdn.com/w40/${code}.png`
      : 'assets/images/lingora-mark.svg';
  }
}
