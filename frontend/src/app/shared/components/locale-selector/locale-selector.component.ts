import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { LocaleOption } from '../../../core/locale/locale.model';

export type LocaleMenuPosition = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

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
  @Input() small = false;
  @Input() menuPosition: LocaleMenuPosition = 'bottom-start';
  @Input({ required: true }) options: readonly LocaleOption[] = [];
  @Output() valueChange = new EventEmitter<string>();

  readonly menuOpen = signal(false);

  get selectedOption(): LocaleOption {
    return this.options.find(option => option.code === this.value)
      ?? this.options.find(option => option.isDefault)
      ?? this.options[0]
      ?? { code: this.value, label: this.value.toUpperCase(), flagUrl: 'assets/images/lingora-mark.svg', isDefault: false };
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
