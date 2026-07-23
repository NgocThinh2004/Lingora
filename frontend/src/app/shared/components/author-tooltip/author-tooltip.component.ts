import { Component, Input, OnInit, inject } from '@angular/core';
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
export class AuthorTooltipComponent implements OnInit {
  @Input() user?: User | any; // Accept different formats

  isSubscribed = false;
  loading = false;

  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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
}
