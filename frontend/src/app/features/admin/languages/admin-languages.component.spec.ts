import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
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
    translationCoverage: { translatedPosts: 0, totalPosts: 0, percent: 0, available: false },
  };

  const vietnamese: AdminLanguage = {
    id: 2,
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flagCode: 'vn',
    isDefault: false,
    isActive: true,
    translationCoverage: { translatedPosts: 0, totalPosts: 0, percent: 0, available: false },
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<AdminLanguagesService>('AdminLanguagesService', [
      'getLanguages',
      'createLanguage',
      'updateLanguage',
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess', 'showError']);
    locale = jasmine.createSpyObj<LocaleService>('LocaleService', ['refresh']);
    service.getLanguages.and.returnValue(of({
      data: [english, vietnamese],
      meta: { pagination: { total: 2, page: 1, limit: 8, totalPages: 1 } },
    }));

    await TestBed.configureTestingModule({
      imports: [AdminLanguagesComponent],
      providers: [
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

  it('uses the same flag images as the static prototype', () => {
    expect(component.flagUrl('VN')).toBe('https://flagcdn.com/w40/vn.png');
    expect(component.flagUrl(null)).toBe('assets/images/lingora-mark.svg');
  });

  it('creates a language from the supported catalog', () => {
    const japanese: AdminLanguage = {
      ...vietnamese,
      id: 4,
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      flagCode: 'jp',
    };
    service.createLanguage.and.returnValue(of({ data: japanese }));
    component.openAddDialog();
    component.addForm.setValue({ code: 'ja' });

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
    service.updateLanguage.and.returnValue(of({ data: updated }));

    component.makeDefault(vietnamese);

    expect(service.updateLanguage).toHaveBeenCalledWith(vietnamese.id, { isDefault: true });
    expect(component.updatingLanguageId()).toBeNull();
    expect(toast.showSuccess).toHaveBeenCalled();
  });

  it('updates a language name, flag and active status', () => {
    const updated = { ...vietnamese, name: 'Vietnamese language', isActive: false };
    service.updateLanguage.and.returnValue(of({ data: updated }));
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

    const languageSelect = fixture.nativeElement.querySelector('#addLanguageCode') as HTMLSelectElement;
    const languageCode = fixture.nativeElement.querySelector('#generatedLanguageCode') as HTMLInputElement;
    const footerButtons = [...fixture.nativeElement.querySelectorAll('.dialog-footer .btn')] as HTMLButtonElement[];

    expect(languageSelect.getBoundingClientRect().height).toBeLessThanOrEqual(50);
    expect(languageCode.getBoundingClientRect().height).toBeLessThanOrEqual(50);
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
