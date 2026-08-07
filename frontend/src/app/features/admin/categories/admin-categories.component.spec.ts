import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Validators } from '@angular/forms';
import { of } from 'rxjs';
import { LocaleService } from '../../../core/locale/locale.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { AdminLanguage } from '../languages/models/admin-language.model';
import { AdminLanguagesService } from '../languages/services/admin-languages.service';
import { AdminPostsService } from '../posts/services/admin-posts.service';
import { AdminCategoriesComponent } from './admin-categories.component';
import { AdminCategory } from './models/admin-category.model';
import { AdminCategoriesService } from './services/admin-categories.service';

describe('AdminCategoriesComponent', () => {
  let fixture: ComponentFixture<AdminCategoriesComponent>;
  let component: AdminCategoriesComponent;
  let categoriesService: jasmine.SpyObj<AdminCategoriesService>;
  let toast: jasmine.SpyObj<ToastService>;
  let postsService: jasmine.SpyObj<AdminPostsService>;

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
    isSystem: false,
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
    postsService = jasmine.createSpyObj<AdminPostsService>('AdminPostsService', ['getPost']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['showSuccess', 'showError']);
    categoriesService.getCategories.and.returnValue(of({
      success: true, status: 200, message: 'ok',
      data: [category],
      meta: { total: 1, page: 1, limit: 8, totalPages: 1 },
    }));
    languagesService.getLanguages.and.returnValue(of({
      success: true, status: 200, message: 'ok',
      data: [english, vietnamese],
      meta: { total: 2, page: 1, limit: 100, totalPages: 1 },
    }));
    postsService.getPost.and.returnValue(of({
      success: true, status: 200, message: 'ok',
      data: {
        id: '21', title: 'A translated post', content: '<p>Translated content</p>',
        author: { id: '3', name: 'An', avatarUrl: null },
        category: { id: 9, name: 'Technology', status: 'inactive' },
        submittedAt: '2026-07-22T08:00:00.000Z',
        originalLanguage: { languageId: 2, code: 'vi', name: 'Vietnamese', nativeName: 'Vietnamese', flagCode: 'vn' },
        translations: [], status: 'approved', workflowStatus: 'published', reviewNote: null,
      },
    }));

    await TestBed.configureTestingModule({
      imports: [AdminCategoriesComponent],
      providers: [
        provideRouter([]),
        { provide: AdminCategoriesService, useValue: categoriesService },
        { provide: AdminLanguagesService, useValue: languagesService },
        { provide: AdminPostsService, useValue: postsService },
        { provide: ToastService, useValue: toast },
        { provide: LocaleService, useValue: { selectedLocale: signal('en'), translate: (key: string) => key } },
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

  it('builds one required translation group for the current system language', () => {
    component.openAddPanel();
    expect(component.translationForms.length).toBe(1);
    expect(component.translationForms.at(0).controls.languageId.value).toBe(english.id);
    expect(component.translationForms.controls.every(group => group.controls.name.hasValidator(Validators.required))).toBeTrue();
  });

  it('edits only the current system language', () => {
    component.openEditPanel(category);

    expect(component.translationForms.length).toBe(1);
    expect(component.translationForms.at(0).controls.name.value).toBe('Technology');
    expect(component.translationForms.at(0).controls.name.hasValidator(Validators.required)).toBeTrue();
  });

  it('submits one source translation for automatic backend translation', () => {
    categoriesService.createCategory.and.returnValue(of({ success: true, status: 200, message: 'ok', data: category }));
    component.openAddPanel();
    component.translationForms.at(0).controls.name.setValue('Technology');
    component.suggestSlug(0);

    component.saveCategory();

    expect(categoriesService.createCategory).toHaveBeenCalledWith({
      isActive: true,
      translations: [{ languageId: 1, name: 'Technology', slug: 'technology' }],
    });
    expect(toast.showSuccess).toHaveBeenCalled();
  });

  it('does not request automatic translation when the source text is unchanged', () => {
    categoriesService.updateCategory.and.returnValue(of({ success: true, status: 200, message: 'ok', data: category }));
    component.openEditPanel(category);

    component.saveCategory();

    expect(categoriesService.updateCategory).toHaveBeenCalledWith(category.id, {
      isActive: true,
    });
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
      success: true, status: 200, message: 'ok',
      data: [{ id: '21', title: 'A post', slug: 'a-post', authorName: 'An', status: 'published', publishedAt: '2026-07-22T08:00:00.000Z' }],
      meta: { total: 1, shown: 1, page: 1, limit: 100, totalPages: 1 },
    }));

    (fixture.nativeElement.querySelector('.post-count') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(categoriesService.getCategoryPosts).toHaveBeenCalledWith(category.id, 'en');
    expect(fixture.nativeElement.querySelector('.posts-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.category-post-item h3').textContent).toContain('A post');
    (fixture.nativeElement.querySelector('.category-post-item') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(postsService.getPost).toHaveBeenCalledWith('21', 'en', true);
    expect(fixture.nativeElement.querySelector('.category-post-preview h3').textContent).toContain('A translated post');
    expect(fixture.nativeElement.querySelector('.preview-content').textContent).toContain('Translated content');
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

  it('allows editing the system category but keeps status and deletion locked', () => {
    const systemCategory: AdminCategory = { ...category, id: 1, isSystem: true };

    component.openCategory(systemCategory);
    component.requestDelete(systemCategory);

    expect(component.panelMode()).toBe('edit');
    expect(component.categoryForm.controls.isActive.disabled).toBeTrue();
    expect(component.pendingDelete()).toBeNull();
  });
});
