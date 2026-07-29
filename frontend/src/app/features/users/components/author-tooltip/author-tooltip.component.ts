import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { SubscribeButtonComponent } from '../../../subscriptions/components/subscribe-button/subscribe-button.component';
import { AssetImageDirective } from '../../../../shared/directives/asset-image.directive';

interface AuthorTooltipUser {
  id: number | string;
  name?: string;
  displayName?: string;
  username?: string;
  handle?: string;
  avatarUrl?: string | null;
  avatar?: string | null;
  bio?: string | null;
}

@Component({
  selector: 'app-author-tooltip',
  standalone: true,
  imports: [CommonModule, AssetImageDirective, SubscribeButtonComponent],
  templateUrl: './author-tooltip.component.html',
  styleUrl: './author-tooltip.component.scss'
})
export class AuthorTooltipComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() user?: AuthorTooltipUser;

  isFlipped = false;
  isSelf = false;
  cardTop = 0;
  cardLeft = 0;

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  
  private mouseEnterListener: (() => void) | null = null;

  ngOnInit(): void {
    this.updateSelfStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) {
      this.updateSelfStatus();
    }
  }

  private updateSelfStatus(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser && this.user?.id && String(currentUser.id) === String(this.user.id)) {
      this.isSelf = true;
    } else {
      this.isSelf = false;
    }
  }
  goToAuthor(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.user?.id) {
      this.router.navigate(['/profile', this.user.id]);
    }
  }

  editProfile(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(['/profile']);
  }

  ngAfterViewInit(): void {
    const parent = this.el.nativeElement.parentElement;
    if (parent) {
      this.mouseEnterListener = () => this.checkPosition();
      parent.addEventListener('mouseenter', this.mouseEnterListener);
    }
  }

  get avatarUrl(): string {
    return this.user?.avatarUrl || this.user?.avatar || 'assets/images/default-avatar.svg';
  }

  ngOnDestroy(): void {
    const parent = this.el.nativeElement.parentElement;
    if (parent && this.mouseEnterListener) {
      parent.removeEventListener('mouseenter', this.mouseEnterListener);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.checkPosition();
  }

  private checkPosition(): void {
    const parent = this.el.nativeElement.parentElement as HTMLElement | null;
    if (!parent) {
      return;
    }

    const parentRect = parent.getBoundingClientRect();
    const card = this.el.nativeElement.querySelector<HTMLElement>('.author-hover-card');
    const cardRect = card?.getBoundingClientRect();
    const estimatedCardWidth = cardRect?.width || 300;
    const estimatedCardHeight = cardRect?.height || 220;
    const viewportGap = 12;
    const spaceBelow = window.innerHeight - parentRect.bottom;

    if (spaceBelow < estimatedCardHeight && parentRect.top > estimatedCardHeight) {
      this.isFlipped = true;
      this.cardTop = Math.max(viewportGap, parentRect.top - estimatedCardHeight - viewportGap);
    } else {
      this.isFlipped = false;
      this.cardTop = parentRect.bottom + viewportGap;
    }

    this.cardLeft = Math.min(
      Math.max(viewportGap, parentRect.left),
      Math.max(viewportGap, window.innerWidth - estimatedCardWidth - viewportGap),
    );
  }
}
