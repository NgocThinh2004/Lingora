import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { of } from 'rxjs';
import { LocaleService } from '../../../core/services/locale.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminLanguage } from '../languages/models/admin-language.model';
import { AdminLanguagesService } from '../languages/services/admin-languages.service';
import { AdminCategoriesComponent } from './admin-categories.component';
import { AdminCategory } from './models/admin-category.model';
import { AdminCategoriesService } from './services/admin-categories.service';

describe('AdminCategoriesComponent', () => {
  let fixture: ComponentFixture<AdminCategoriesComponent>;
  let component: AdminCategoriesComponent;
  let categoriesService: jasmine.SpyObj<AdminCategoriesService>;
  let toast: jasmine.SpyObj<ToastService>;

  const english: AdminLanguage = {
    id: 1, code: 'en', name: 'English', nativeName: 'English', flagCode: 'gb',
    isDefault: true, isActive: true,
    translationCoverage: { translatedPosts: 0, totalPosts: 0, percent: 0, available: false },
  };
  const vietnamese: AdminLanguage = {
    ...english, id: 2, code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flagCode: 'vn', isDefault: false,
  };
  const category: AdminCategory = {
    id: 9,
    slug: 'technology',
    isActive: true,
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    postCount: 3,
    translations: [
      { id: '91', languageId: 1, languageCode: 'en', languageName: 'English', languageNativeName: 'English', flagCode: 'gb', name: 'Technology', slug: 'technology' },
      { id: '92', languageId: 2, languageCode: 'vi', languageName: 'Vietnamese', languageNativeName: 'Tiếng Việt', flagCode: 'vn', name: 'Công nghệ', slug: 'cong-nghe' },
    ],
  };

  beforeEach(async () => {
    categoriesService = jasmine.createSpyObj<AdminCategoriesService>('AdminCategoriesService', [
      'getCategories', 'getCategoryPosts', 'createCategory', 'updateCategory', 'deleteCategory',
    ]);
    const languagesService = jasmine.createSpyObj<AdminLanguagesService>('AdminLanguagesService', ['getLanguages']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess', 'showError']);
    categoriesService.getCategories.and.returnValue(of({
      data: [category],
      meta: { pagination: { total: 1, page: 1, limit: 8, totalPages: 1 } },
    }));
    languagesService.getLanguages.and.returnValue(of({
      data: [english, vietnamese],
      meta: { pagination: { total: 2, page: 1, limit: 100, totalPages: 1 } },
    }));

    await TestBed.configureTestingModule({
      imports: [AdminCategoriesComponent],
      providers: [
        { provide: AdminCategoriesService, useValue: categoriesService },
        { provide: AdminLanguagesService, useValue: languagesService },
        { provide: ToastService, useValue: toast },
        { provide: LocaleService, useValue: { selectedLocale: signal('en') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the category directory and active languages', () => {
    expect(component.categories()).toEqual([category]);
    expect(component.activeLanguages()).toEqual([english, vietnamese]);
    expect(component.displayName(category)).toBe('Technology');
  });

  it('builds one required translation group per active language when creating', () => {
    component.openAddPanel();
    expect(component.translationForms.length).toBe(2);
    expect(component.translationForms.controls.every(group => group.controls.name.hasValidator(Validators.required))).toBeTrue();
  });

  it('generates editable slugs and submits all translations in one request', () => {
    categoriesService.createCategory.and.returnValue(of({ data: category }));
    component.openAddPanel();
    component.translationForms.at(0).controls.name.setValue('Technology');
    component.suggestSlug(0);
    component.translationForms.at(1).controls.name.setValue('Công nghệ');
    component.suggestSlug(1);

    component.saveCategory();

    expect(categoriesService.createCategory).toHaveBeenCalledWith({
      isActive: true,
      translations: [
        { languageId: 1, name: 'Technology', slug: 'technology' },
        { languageId: 2, name: 'Công nghệ', slug: 'cong-nghe' },
      ],
    });
    expect(toast.showSuccess).toHaveBeenCalled();
  });

  it('slides the editor from the right and closes through the close button', fakeAsync(() => {
    component.openEditPanel(category);
    tick(16);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.category-panel').classList).toContain('category-panel--visible');
    (fixture.nativeElement.querySelector('.panel-close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.panelMode()).toBeNull();
    expect(fixture.nativeElement.querySelector('.category-panel')).toBeNull();
  }));

  it('closes on the first click without waiting for the entrance animation', () => {
    component.openAddPanel();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.panel-close') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.panelMode()).toBeNull();
    expect(fixture.nativeElement.querySelector('.category-panel')).toBeNull();
  });

  it('shows one flagged language and puts the remaining languages in a tooltip', () => {
    const chips = fixture.nativeElement.querySelectorAll('.translation-chips span');
    const more = fixture.nativeElement.querySelector('.translation-more') as HTMLElement;

    expect(chips.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.translation-chips img').length).toBe(1);
    expect(more.textContent?.trim()).toBe('+1');
    expect(more.title).toContain('Vietnamese');
  });

  it('opens the category post list when the post count is clicked', () => {
    categoriesService.getCategoryPosts.and.returnValue(of({
      data: [{ id: '21', title: 'A post', slug: 'a-post', authorName: 'An', status: 'published', publishedAt: '2026-07-22T08:00:00.000Z' }],
      meta: { total: 1, shown: 1 },
    }));

    (fixture.nativeElement.querySelector('.post-count') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(categoriesService.getCategoryPosts).toHaveBeenCalledWith(category.id, 'en');
    expect(fixture.nativeElement.querySelector('.posts-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.category-post-item h3').textContent).toContain('A post');
  });

  it('asks for confirmation before deleting a category', () => {
    categoriesService.deleteCategory.and.returnValue(of(void 0));
    component.requestDelete(category);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.confirm-dialog')).not.toBeNull();
    expect(categoriesService.deleteCategory).not.toHaveBeenCalled();

    (fixture.nativeElement.querySelector('.confirm-dialog .confirm-delete') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(categoriesService.deleteCategory).toHaveBeenCalledOnceWith(category.id);
  });
});
