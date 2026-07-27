import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubscriptionsService } from '../../../features/subscriptions/services/subscriptions.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';
import { AuthModalService } from '../auth-modal/auth-modal.service';

@Component({
  selector: 'app-subscribe-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscribe-button.component.html',
  styleUrl: './subscribe-button.component.scss'
})
export class SubscribeButtonComponent implements OnInit {
  @Input({ required: true }) authorId!: number;
  
  isSubscribed = false;
  loading = false;

  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly authModalService = inject(AuthModalService);

  ngOnInit(): void {
    this.checkSubscriptionStatus();
  }

  private checkSubscriptionStatus(): void {
    if (!this.authorId || !this.authService.isAuthenticated()) return;
    
    this.subscriptionsService.checkSubscription(this.authorId).subscribe({
      next: (res) => {
        this.isSubscribed = res.subscribed;
      },
      error: () => {}
    });
  }

  toggleSubscribe(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.authorId) return;

    if (!this.authService.isAuthenticated()) {
      this.authModalService.open();
      return;
    }

    this.loading = true;
    if (this.isSubscribed) {
      this.subscriptionsService.unsubscribe(this.authorId).subscribe({
        next: () => {
          this.isSubscribed = false;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    } else {
      this.subscriptionsService.subscribe(this.authorId).subscribe({
        next: () => {
          this.isSubscribed = true;
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
    }
  }
}
