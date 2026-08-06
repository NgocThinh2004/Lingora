import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LocaleService } from '../../../core/locale/locale.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { AdminLanguage } from './models/admin-language.model';
import { AdminLanguagesComponent } from './admin-languages.component';
import { AdminLanguagesService } from './services/admin-languages.service';

describe('AdminLanguagesComponent', () => {
  let fixture: ComponentFixture<AdminLanguagesComponent>;
  let component: AdminLanguagesComponent;
  let service: jasmine.SpyObj<AdminLanguagesService>;
  let toast: jasmine.SpyObj<ToastService>;
  let locale: jasmine.SpyObj<LocaleService>;

  const english: AdminLanguage = {
    id: 1,
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flagCode: 'gb',
    isDefault: true,
    isActive: true,
    translationCoverage: { translatedPosts: 3, totalPosts: 4, percent: 75, available: true },
  };

  const vietnamese: AdminLanguage = {
    id: 2,
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flagCode: 'vn',
    isDefault: false,
    isActive: true,
    translationCoverage: { translatedPosts: 0, totalPosts: 0, percent: 0, available: true },
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<AdminLanguagesService>('AdminLanguagesService', [
      'getLanguages',
      'createLanguage',
      'updateLanguage',
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess', 'showError']);
    locale = jasmine.createSpyObj<LocaleService>('LocaleService', ['refresh', 'translate', 'hasStaticBundle']);
    locale.translate.and.callFake((key: string) => key);
    locale.hasStaticBundle.and.returnValue(of(true));
    service.getLanguages.and.returnValue(of({
      success: true, status: 200, message: 'ok',
      data: [english, vietnamese],
      meta: { total: 2, page: 1, limit: 8, totalPages: 1 },
    }));

    await TestBed.configureTestingModule({
      imports: [AdminLanguagesComponent],
      providers: [
        provideRouter([]),
        { provide: AdminLanguagesService, useValue: service },
        { provide: ToastService, useValue: toast },
        { provide: LocaleService, useValue: locale },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLanguagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the configured language directory', () => {
    expect(service.getLanguages).toHaveBeenCalledWith(1, 8);
    expect(component.languages()).toEqual([english, vietnamese]);
    expect(component.loading()).toBeFalse();
  });

  it('renders translation coverage values including an empty zero metric', () => {
    const coverageCells = [...fixture.nativeElement.querySelectorAll('.coverage-cell')]
      .map((element: HTMLElement) => element.textContent?.replace(/\s+/g, ' ').trim());

    expect(coverageCells[0]).toContain('3 / 4');
    expect(coverageCells[0]).toContain('75%');
    expect(coverageCells[1]).toContain('0 / 0');
    expect(coverageCells[1]).toContain('0%');
    expect(coverageCells.join(' ')).not.toContain('awaiting_translation_metrics');
  });

  it('uses the same flag images as the static prototype', () => {
    expect(component.flagUrl('VN')).toBe('https://flagcdn.com/w40/vn.png');
    expect(component.flagUrl(null)).toBe('assets/images/lingora-mark.svg');
  });

  it('creates a language when its manually maintained frontend bundle exists', () => {
    const japanese: AdminLanguage = {
      ...vietnamese,
      id: 4,
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagCode: 'jp',
    };
    service.createLanguage.and.returnValue(of({ success: true, status: 200, message: 'ok', data: japanese }));
    component.openAddDialog();
    component.addForm.setValue({
      code: 'JA',
      name: 'Japanese',
      nativeName: '日本語',
      flagCode: 'JP',
    });

    component.createLanguage();

    expect(service.createLanguage).toHaveBeenCalledWith({
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagCode: 'jp',
      isActive: true,
    });
    expect(component.dialog()).toBeNull();
    expect(toast.showSuccess).toHaveBeenCalled();
    expect(locale.refresh).toHaveBeenCalled();
  });

  it('creates a language as inactive when its frontend locale file is missing', () => {
    locale.hasStaticBundle.and.returnValue(of(false));
    const korean = {
      ...vietnamese,
      id: 5,
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      flagCode: 'kr',
      isActive: false,
    };
    service.createLanguage.and.returnValue(of({ success: true, status: 200, message: 'ok', data: korean }));
    component.openAddDialog();
    component.addForm.setValue({
      code: 'KO',
      name: 'Korean',
      nativeName: '한국어',
      flagCode: 'KR',
    });

    component.createLanguage();

    expect(locale.hasStaticBundle).toHaveBeenCalledWith('ko');
    expect(service.createLanguage).toHaveBeenCalledWith({
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      flagCode: 'kr',
      isActive: false,
    });
    expect(component.saving()).toBeFalse();
    expect(toast.showSuccess).toHaveBeenCalledWith('language_added_inactive_missing_bundle');
  });

  it('does not allow a language without a locale file to be activated or made default', () => {
    locale.hasStaticBundle.and.returnValue(of(false));
    const korean = { ...vietnamese, id: 5, code: 'ko', isActive: false, isDefault: false };

    component.openEditDialog(korean);

    expect(component.selectedBundleAvailable()).toBeFalse();
    expect(component.editForm.controls.isActive.value).toBeFalse();
    expect(component.editForm.controls.isActive.disabled).toBeTrue();
    expect(component.editForm.controls.isDefault.disabled).toBeTrue();
  });

  it('keeps the current default language active and locked', () => {
    component.openEditDialog(english);

    expect(component.editForm.controls.isActive.disabled).toBeTrue();
    expect(component.editForm.controls.isDefault.disabled).toBeTrue();
    expect(component.editForm.getRawValue()).toEqual(jasmine.objectContaining({
      isActive: true,
      isDefault: true,
    }));
  });

  it('sets another language as default through the API', () => {
    const updated = { ...vietnamese, isDefault: true };
    service.updateLanguage.and.returnValue(of({ success: true, status: 200, message: 'ok', data: updated }));

    component.makeDefault(vietnamese);

    expect(service.updateLanguage).toHaveBeenCalledWith(vietnamese.id, { isDefault: true });
    expect(component.updatingLanguageId()).toBeNull();
    expect(toast.showSuccess).toHaveBeenCalled();
  });

  it('updates a language name, flag and active status', () => {
    const updated = { ...vietnamese, name: 'Vietnamese language', isActive: false };
    service.updateLanguage.and.returnValue(of({ success: true, status: 200, message: 'ok', data: updated }));
    component.openEditDialog(vietnamese);
    component.editForm.setValue({
      name: 'Vietnamese language',
      flagCode: 'VN',
      isActive: false,
      isDefault: false,
    });

    component.saveLanguage();

    expect(service.updateLanguage).toHaveBeenCalledWith(vietnamese.id, {
      name: 'Vietnamese language',
      flagCode: 'vn',
      isActive: false,
      isDefault: false,
    });
    expect(component.dialog()).toBeNull();
  });

  it('keeps the language code and flag code inputs aligned', fakeAsync(() => {
    component.openEditDialog(vietnamese);
    tick(16);
    fixture.detectChanges();

    const languageCode = fixture.nativeElement.querySelector('#editLanguageCode') as HTMLInputElement;
    const flagCode = fixture.nativeElement.querySelector('#editLanguageFlag') as HTMLInputElement;
    const languageCodeBox = languageCode.getBoundingClientRect();
    const flagCodeBox = flagCode.getBoundingClientRect();

    expect(Math.abs(languageCodeBox.top - flagCodeBox.top)).toBeLessThan(1);
    expect(Math.abs(languageCodeBox.height - flagCodeBox.height)).toBeLessThan(1);
  }));

  it('keeps add-language fields compact and uses lightly rounded footer buttons', fakeAsync(() => {
    component.openAddDialog();
    tick(16);
    fixture.detectChanges();

    const languageCode = fixture.nativeElement.querySelector('#addLanguageCode') as HTMLInputElement;
    const languageName = fixture.nativeElement.querySelector('#addLanguageName') as HTMLInputElement;
    const footerButtons = [...fixture.nativeElement.querySelectorAll('.dialog-footer .btn')] as HTMLButtonElement[];

    expect(languageCode.getBoundingClientRect().height).toBeLessThanOrEqual(50);
    expect(languageName.getBoundingClientRect().height).toBeLessThanOrEqual(50);
    expect(footerButtons.every(button => !button.classList.contains('rounded-pill'))).toBeTrue();
  }));

  it('slides the side panel in and closes it from its close button', fakeAsync(() => {
    component.openAddDialog();
    tick(16);
    fixture.detectChanges();

    const sidePanel = fixture.nativeElement.querySelector('.side-panel-modal') as HTMLElement;
    expect(sidePanel).not.toBeNull();
    expect(sidePanel.classList).toContain('show');
    const closeButton = fixture.nativeElement.querySelector('.dialog-close') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(component.dialog()).toBeNull();
    expect(fixture.nativeElement.querySelector('.side-panel-modal')).toBeNull();
  }));
});
