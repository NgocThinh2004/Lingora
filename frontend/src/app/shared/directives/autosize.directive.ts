import { Directive, ElementRef, HostListener, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[appAutosize]',
  standalone: true
})
export class AutosizeDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLTextAreaElement>) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.adjust(), 0);
  }

  @HostListener('input')
  onInput(): void {
    this.adjust();
  }

  public adjust(): void {
    const textarea = this.el.nativeElement;
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  }
}
