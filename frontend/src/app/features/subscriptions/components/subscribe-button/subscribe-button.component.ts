import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, ChangeDetectorRef, HostBinding } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SubscriptionsService } from '../../services/subscriptions.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';

@Component({
  selector: 'app-subscribe-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscribe-button.component.html',
  styleUrl: './subscribe-button.component.scss'
})
export class SubscribeButtonComponent implements OnInit, OnDestroy, OnChanges {
  @Input({ required: true }) authorId!: number | string;
  @Input() fullWidth = false;
  @Output() followChange = new EventEmitter<boolean>();

  @HostBinding('style.width') get hostWidth() { return this.fullWidth ? '100%' : null; }
  @HostBinding('style.display') get hostDisplay() { return this.fullWidth ? 'block' : null; }
  
  isSubscribed = false;
  loading = false;

  private readonly subscriptionsService = inject(SubscriptionsService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  private subChangeSub?: Subscription;

  ngOnInit(): void {
    if (!this.authorId) return;
    
    // Use the robust global state for instant sync
    this.subChangeSub = this.subscriptionsService.isFollowingState(this.authorId).subscribe(isSub => {
      this.isSubscribed = isSub;
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['authorId'] && !changes['authorId'].firstChange) {
      if (this.subChangeSub) {
        this.subChangeSub.unsubscribe();
      }
      this.subChangeSub = this.subscriptionsService.isFollowingState(this.authorId).subscribe(isSub => {
        this.isSubscribed = isSub;
        this.cdr.markForCheck();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.subChangeSub) {
      this.subChangeSub.unsubscribe();
    }
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
          this.followChange.emit(false);
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      });
    } else {
      this.subscriptionsService.subscribe(this.authorId).subscribe({
        next: () => {
          this.isSubscribed = true;
          this.loading = false;
          this.followChange.emit(true);
          this.cdr.markForCheck();
        },
        error: () => { this.loading = false; this.cdr.markForCheck(); }
      });
    }
  }
}
