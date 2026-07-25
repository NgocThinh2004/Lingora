import { Component, Input, OnInit, inject, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionsService } from '../../../features/subscriptions/services/subscriptions.service';
import { AuthService } from '../../../core/auth/auth.service';
import { User } from '../../../features/users/models/user.model';

@Component({
  selector: 'app-author-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './author-tooltip.component.html',
  styleUrl: './author-tooltip.component.scss'
})
export class AuthorTooltipComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() user?: User | any; // Accept different formats

  isSubscribed = false;
  loading = false;
  isFlipped = false;

  @ViewChild('hoverCard') hoverCard!: ElementRef<HTMLDivElement>;

  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly el = inject(ElementRef);
  
  private mouseEnterListener: (() => void) | null = null;

  ngOnInit(): void {
    this.checkSubscriptionStatus();
  }

  checkSubscriptionStatus(): void {
    if (!this.user?.id || !this.authService.isAuthenticated()) return;
    
    this.subscriptionsService.checkSubscription(this.user.id).subscribe({
      next: (res) => {
        this.isSubscribed = res.subscribed;
      },
      error: () => {}
    });
  }

  toggleSubscribe(event: Event): void {
    event.stopPropagation(); // Prevent navigating to the post when clicking follow
    event.preventDefault();
    
    if (!this.user?.id) return;

    if (!this.authService.isAuthenticated()) {
      // Need login
      return;
    }

    this.loading = true;
    if (this.isSubscribed) {
      this.subscriptionsService.unsubscribe(this.user.id).subscribe({
        next: () => {
          this.isSubscribed = false;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    } else {
      this.subscriptionsService.subscribe(this.user.id).subscribe({
        next: () => {
          this.isSubscribed = true;
          this.loading = false;
        },
        error: () => { this.loading = false; }
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

  ngAfterViewInit(): void {
    const parent = this.el.nativeElement.parentElement;
    if (parent) {
      this.mouseEnterListener = () => this.checkPosition();
      parent.addEventListener('mouseenter', this.mouseEnterListener);
    }
  }

  ngOnDestroy(): void {
    const parent = this.el.nativeElement.parentElement;
    if (parent && this.mouseEnterListener) {
      parent.removeEventListener('mouseenter', this.mouseEnterListener);
    }
  }

  private checkPosition(): void {
    if (!this.hoverCard) return;
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
