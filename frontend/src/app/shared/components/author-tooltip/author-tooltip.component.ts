import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, ElementRef, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionsService } from '../../../features/subscriptions/services/subscriptions.service';
import { AuthService } from '../../../core/auth/auth.service';
import { User } from '../../../features/users/models/user.model';
import { AuthModalService } from '../auth-modal/auth-modal.service';
import { AssetImageDirective } from '../../directives/asset-image.directive';

@Component({
  selector: 'app-author-tooltip',
  standalone: true,
  imports: [CommonModule, AssetImageDirective],
  templateUrl: './author-tooltip.component.html',
  styleUrl: './author-tooltip.component.scss'
})
export class AuthorTooltipComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  @Input() user?: User | any; // Accept different formats

  isSubscribed = false;
  loading = false;
  isFlipped = false;
  isSelf = false;

  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  private readonly authModalService = inject(AuthModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  private mouseEnterListener: (() => void) | null = null;
  private subChangeSub?: Subscription;

  ngOnInit(): void {
    this.updateSelfStatus();
    if (this.user?.id) {
      this.subChangeSub = this.subscriptionsService.isFollowingState(this.user.id).subscribe(isSub => {
        this.isSubscribed = isSub;
        this.cdr.markForCheck();
      });
    }
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



  toggleSubscribe(event: Event): void {
    event.stopPropagation(); // Prevent navigating to the post when clicking follow
    event.preventDefault();
    
    if (!this.user?.id) return;

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.loading = true;
    if (this.isSubscribed) {
      this.subscriptionsService.unsubscribe(this.user.id).subscribe({
        next: () => {
          this.isSubscribed = false;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      });
    } else {
      this.subscriptionsService.subscribe(this.user.id).subscribe({
        next: () => {
          this.isSubscribed = true;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      });
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
    return this.user?.avatarUrl || this.user?.avatar || 'assets/images/lingora-mark.svg';
  }

  ngOnDestroy(): void {
    const parent = this.el.nativeElement.parentElement;
    if (parent && this.mouseEnterListener) {
      parent.removeEventListener('mouseenter', this.mouseEnterListener);
    }
    if (this.subChangeSub) {
      this.subChangeSub.unsubscribe();
    }
  }

  private checkPosition(): void {
    const parentRect = this.el.nativeElement.parentElement.getBoundingClientRect();
    
    // Estimate card height since it might be hidden when calculating
    const estimatedCardHeight = 220; 
    const spaceBelow = window.innerHeight - parentRect.bottom;
    
    // If not enough space below, but enough space above, flip it up
    if (spaceBelow < estimatedCardHeight && parentRect.top > estimatedCardHeight) {
      this.isFlipped = true;
    } else {
      this.isFlipped = false;
    }
  }
}
