import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocaleService } from '../../core/locale/locale.service';

export type LocalizedDateStyle = 'date' | 'dateTime';

@Pipe({
  name: 'localizedDate',
  standalone: true,
  pure: false,
})
export class LocalizedDatePipe implements PipeTransform {
  private readonly locale = inject(LocaleService);

  transform(value: string | number | Date | null | undefined, style: LocalizedDateStyle = 'date'): string {
    if (value === null || value === undefined || value === '') return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat(
      this.locale.selectedLocale(),
      style === 'dateTime'
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' },
    ).format(date);
  }
}
