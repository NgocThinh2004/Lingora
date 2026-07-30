import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService, UiTranslationKey } from '../../core/locale/locale.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(key: UiTranslationKey, params?: Record<string, string | number>): string {
    return typeof this.locale.translate === 'function'
      ? this.locale.translate(key, params)
      : key;
  }
}
