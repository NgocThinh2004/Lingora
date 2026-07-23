import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../http/api-response.model';
import { LocaleOption, PublicLanguage } from './locale.model';

const FALLBACK_OPTIONS: readonly LocaleOption[] = [
  { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w40/gb.png', isDefault: true },
  { code: 'vi', label: 'Tiếng Việt', flagUrl: 'https://flagcdn.com/w40/vn.png', isDefault: false },
  { code: 'zh', label: '中文', flagUrl: 'https://flagcdn.com/w40/cn.png', isDefault: false },
];

const UI_TRANSLATIONS = {
  en: {
    home: 'Home',
    explore: 'Explore',
    subscriptions: 'Subscriptions',
    my_articles: 'My Articles',
    profile: 'Profile',
    create: 'Create',
    more: 'More',
    settings: 'Settings',
    admin_panel: 'Admin Panel',
    sign_out: 'Sign Out',
    my_posts_title: 'My Articles',
    all_posts_tab: 'All',
    drafts: 'Drafts',
    published: 'Published',
    trash: 'Trash',
    search_posts: 'Search your posts...',
    all_languages: 'All languages',
    english: 'English',
    vietnamese: 'Vietnamese',
    chinese: 'Chinese',
    all_dates: 'All dates',
    all_categories: 'All categories',
    select_all: 'Select all',
    selected: 'selected',
    delete_selected: 'Delete Selected',
    restore_selected: 'Restore Selected',
    title_label: 'Title',
    status_label: 'Status',
    original_language: 'Original language',
    translated_language: 'Translated language',
    updated: 'Updated',
    reads: 'Reads',
    actions: 'Actions',
    status_draft: 'Draft',
    status_published: 'Published',
    status_pending: 'Pending',
    status_trash: 'Trash',
    no_posts_found: 'No posts match your filters.',
    loading_articles: 'Loading articles...',
    untitled: 'Untitled',
    items: 'items',
    item: 'item',
    confirm_trash: 'Do you want to move this post to trash?',
    confirm_delete_permanent: 'Are you sure you want to permanently delete this post?',
    trash_confirm_title: 'Move to trash',
    trash_confirm_warning: 'You can restore this item later from the trash.',
    trash_confirm_action: 'Move to trash',
    delete_confirm_title: 'Confirm deletion',
    delete_confirm_warning: 'This action cannot be undone.',
    delete_confirm_action: 'Delete permanently',
    cancel_action: 'Cancel',
  },
  vi: {
    home: 'Trang chủ',
    explore: 'Khám phá',
    subscriptions: 'Đang theo dõi',
    my_articles: 'Bài viết của tôi',
    profile: 'Hồ sơ',
    create: 'Viết bài',
    more: 'Thêm',
    settings: 'Cài đặt',
    admin_panel: 'Quản trị viên',
    sign_out: 'Đăng xuất',
    my_posts_title: 'Bài viết của tôi',
    all_posts_tab: 'Tất cả',
    drafts: 'Bài nháp',
    published: 'Đã đăng',
    trash: 'Thùng rác',
    search_posts: 'Tìm bài viết của bạn...',
    all_languages: 'Tất cả ngôn ngữ',
    english: 'Tiếng Anh',
    vietnamese: 'Tiếng Việt',
    chinese: 'Tiếng Trung',
    all_dates: 'Tất cả ngày',
    all_categories: 'Tất cả danh mục',
    select_all: 'Chọn tất cả',
    selected: 'đã chọn',
    delete_selected: 'Xóa mục đã chọn',
    restore_selected: 'Khôi phục mục đã chọn',
    title_label: 'Tiêu đề',
    status_label: 'Trạng thái',
    original_language: 'Ngôn ngữ gốc',
    translated_language: 'Ngôn ngữ dịch',
    updated: 'Cập nhật',
    reads: 'Lượt đọc',
    actions: 'Thao tác',
    status_draft: 'Nháp',
    status_published: 'Đã đăng',
    status_pending: 'Chờ duyệt',
    status_trash: 'Thùng rác',
    no_posts_found: 'Không có bài viết nào phù hợp với bộ lọc của bạn.',
    loading_articles: 'Đang tải bài viết...',
    untitled: 'Bài viết chưa có tiêu đề',
    items: 'bài viết',
    item: 'bài viết',
    confirm_trash: 'Bạn có muốn chuyển bài viết này vào thùng rác?',
    confirm_delete_permanent: 'Bạn có chắc chắn muốn xóa vĩnh viễn bài viết này?',
    trash_confirm_title: 'Chuyển vào thùng rác',
    trash_confirm_warning: 'Bạn có thể khôi phục lại mục này từ thùng rác.',
    trash_confirm_action: 'Chuyển vào thùng rác',
    delete_confirm_title: 'Xác nhận xóa',
    delete_confirm_warning: 'Hành động này không thể hoàn tác.',
    delete_confirm_action: 'Xóa vĩnh viễn',
    cancel_action: 'Hủy bỏ',
  },
  zh: {
    home: '首页',
    explore: '探索',
    subscriptions: '关注作者',
    my_articles: '我的文章',
    profile: '个人资料',
    create: '发布',
    more: '更多',
    settings: '设置',
    admin_panel: '管理后台',
    sign_out: '退出登录',
    my_posts_title: '我的文章',
    all_posts_tab: '全部',
    drafts: '草稿',
    published: '已发布',
    trash: '回收站',
    search_posts: '搜索你的文章...',
    all_languages: '所有语言',
    english: '英语',
    vietnamese: '越南语',
    chinese: '中文',
    all_dates: '所有日期',
    all_categories: '所有类别',
    select_all: '全选',
    selected: '已选择',
    delete_selected: '删除所选',
    restore_selected: '恢复所选',
    title_label: '标题',
    status_label: '状态',
    original_language: '原始语言',
    translated_language: '翻译语言',
    updated: '更新于',
    reads: '阅读量',
    actions: '操作',
    status_draft: '草稿',
    status_published: '已发布',
    status_pending: '待审核',
    status_trash: '回收站',
    no_posts_found: '没有符合您筛选条件的文章。',
    loading_articles: '正在加载文章...',
    untitled: '无标题文章',
    items: '篇文章',
    item: '篇文章',
    confirm_trash: '您要将此文章移到垃圾箱吗？',
    confirm_delete_permanent: '您确定要永久删除此文章吗？',
    trash_confirm_title: '移至回收站',
    trash_confirm_warning: '稍后可以从回收站恢复此项目。',
    trash_confirm_action: '移至回收站',
    delete_confirm_title: '确认删除',
    delete_confirm_warning: '此操作无法撤销。',
    delete_confirm_action: '永久删除',
    cancel_action: '取消',
  },
} as const;

export type UiTranslationKey = keyof typeof UI_TRANSLATIONS.en;

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/languages`;
  private loaded = false;
  private requestInProgress = false;

  readonly options = signal<readonly LocaleOption[]>(FALLBACK_OPTIONS);
  readonly selectedLocale = signal(this.initialLocale());
  readonly current = this.selectedLocale.asReadonly();

  constructor() {
    this.applyDocumentLanguage(this.selectedLocale());
  }

  load(force = false): void {
    if (this.requestInProgress || (this.loaded && !force)) {
      return;
    }

    this.requestInProgress = true;
    this.http.get<ApiResponse<PublicLanguage[]>>(this.apiUrl).subscribe({
      next: response => {
        const options = response.data.map(language => this.toLocaleOption(language));
        this.options.set(options.length ? options : FALLBACK_OPTIONS);
        this.loaded = true;
        this.requestInProgress = false;
        this.ensureValidSelection();
      },
      error: () => {
        this.requestInProgress = false;
        this.ensureValidSelection();
      },
    });
  }

  refresh(): void {
    this.load(true);
  }

  findAll(): Observable<PublicLanguage[]> {
    return this.http.get<ApiResponse<PublicLanguage[]>>(this.apiUrl).pipe(
      map(response => response.data),
      tap(languages => {
        const options = languages.map(language => this.toLocaleOption(language));
        this.options.set(options.length ? options : FALLBACK_OPTIONS);
        this.loaded = true;
        this.ensureValidSelection();
      }),
    );
  }

  setLanguage(code: string): void {
    this.storeSelection(code.trim().toLowerCase());
  }

  selectLocale(code: string): void {
    const normalizedCode = code.trim().toLowerCase();
    if (!this.options().some(option => option.code === normalizedCode)) {
      return;
    }
    this.storeSelection(normalizedCode);
  }

  translate(key: UiTranslationKey): string {
    const locale = this.selectedLocale();
    const dictionary = UI_TRANSLATIONS[locale as keyof typeof UI_TRANSLATIONS] ?? UI_TRANSLATIONS.en;
    return dictionary[key] ?? UI_TRANSLATIONS.en[key];
  }

  private initialLocale(): string {
    const savedLocale = (
      localStorage.getItem('preferredLanguage') ??
      localStorage.getItem('lingora-locale')
    )?.trim().toLowerCase();
    return FALLBACK_OPTIONS.some(option => option.code === savedLocale) ? savedLocale! : 'en';
  }

  private ensureValidSelection(): void {
    const options = this.options();
    if (options.some(option => option.code === this.selectedLocale())) {
      return;
    }

    const fallback = options.find(option => option.isDefault) ?? options[0];
    if (fallback) {
      this.storeSelection(fallback.code);
    }
  }

  private storeSelection(code: string): void {
    this.selectedLocale.set(code);
    localStorage.setItem('lingora-locale', code);
    localStorage.setItem('preferredLanguage', code);
    this.applyDocumentLanguage(code);
    window.dispatchEvent(new CustomEvent('lingora:languagechange', {
      detail: { language: code },
    }));
  }

  private applyDocumentLanguage(code: string): void {
    document.documentElement.lang = code === 'zh' ? 'zh-CN' : code;
  }

  private toLocaleOption(language: PublicLanguage): LocaleOption {
    const flagCode = language.flagCode?.trim().toLowerCase();
    return {
      code: language.code.trim().toLowerCase(),
      label: language.nativeName || language.name,
      flagUrl: flagCode && /^[a-z]{2}$/.test(flagCode)
        ? `https://flagcdn.com/w40/${flagCode}.png`
        : 'assets/images/lingora-mark.svg',
      isDefault: language.isDefault,
    };
  }
}
