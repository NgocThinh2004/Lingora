import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';

export interface LocaleOption {
  code: string;
  label: string;
  flagUrl: string;
}

@Component({
  selector: 'app-locale-selector',
  standalone: true,
  templateUrl: './locale-selector.component.html',
  styleUrl: './locale-selector.component.scss'
})
export class LocaleSelectorComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() value = 'en';
  @Input() compact = false;
  @Output() valueChange = new EventEmitter<string>();

  readonly menuOpen = signal(false);
  readonly options: LocaleOption[] = [
    { code: 'en', label: 'English', flagUrl: 'https://flagcdn.com/w40/gb.png' },
    { code: 'vi', label: 'Tiếng Việt', flagUrl: 'https://flagcdn.com/w40/vn.png' },
    { code: 'zh', label: '中文', flagUrl: 'https://flagcdn.com/w40/cn.png' }
  ];

  get selectedOption(): LocaleOption {
    return this.options.find(option => option.code === this.value) ?? this.options[0];
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  selectLocale(code: string): void {
    this.menuOpen.set(false);
    this.valueChange.emit(code);
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.menuOpen.set(false);
  }
}
