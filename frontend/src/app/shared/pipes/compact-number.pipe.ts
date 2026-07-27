import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'compactNumber',
  standalone: true
})
export class CompactNumberPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null) return '0';
    if (value < 1000) return value.toString();
    
    return Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }
}
