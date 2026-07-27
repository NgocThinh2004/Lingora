import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, Input, OnChanges, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

@Directive({
  selector: 'img[appAssetImage]',
  standalone: true,
})
export class AssetImageDirective implements OnChanges, AfterViewInit {
  private readonly image = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  private readonly staticBaseUrl = environment.apiUrl.replace(/\/api\/v1\/?$/, '');
  private fallbackApplied = false;

  @Input() appAssetImage: string | null | undefined;
  @Input() assetFallback = 'assets/images/default-avatar.svg';

  @HostBinding('style.aspect-ratio') readonly aspectRatio = '1 / 1';
  @HostBinding('style.object-fit') readonly objectFit = 'cover';
  @HostBinding('style.border-radius') readonly borderRadius = '50%';

  ngOnChanges(): void {
    this.fallbackApplied = false;
    this.image.src = this.resolveUrl(this.appAssetImage || this.assetFallback);
  }

  ngAfterViewInit(): void {
    const width = this.image.getAttribute('width');
    const height = this.image.getAttribute('height');
    if (width && height && /^\d+$/.test(width) && width === height) {
      this.image.style.width = `${width}px`;
      this.image.style.height = `${height}px`;
    }
  }

  @HostListener('error')
  handleError(): void {
    if (this.fallbackApplied) {
      return;
    }

    this.fallbackApplied = true;
    this.image.src = this.resolveUrl(this.assetFallback);
  }

  private resolveUrl(url: string): string {
    const normalized = url.trim();
    if (
      /^(?:https?:)?\/\//i.test(normalized)
      || /^(?:data|blob):/i.test(normalized)
      || normalized.startsWith('assets/')
      || normalized.startsWith('/assets/')
    ) {
      return normalized;
    }

    if (normalized.startsWith('/uploads/')) {
      return `${this.staticBaseUrl}${normalized}`;
    }

    if (normalized.startsWith('uploads/')) {
      return `${this.staticBaseUrl}/${normalized}`;
    }

    return normalized;
  }
}
