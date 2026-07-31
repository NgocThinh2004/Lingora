import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, ChangeDetectorRef, HostBinding } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { SubscriptionsService } from '../../services/subscriptions.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthModalService } from '../../../../core/auth/auth-modal.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-subscribe-button',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './subscribe-button.component.html',
  styleUrl: './subscribe-button.component.scss'
})
export class SubscribeButtonComponent implements OnChanges {
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
  
  private readonly authorId$ = new ReplaySubject<number | string>(1);

  constructor() {
    this.authorId$.pipe(
      switchMap(id => this.subscriptionsService.isFollowingState(id)),
      takeUntilDestroyed()
    ).subscribe(isSub => {
      this.isSubscribed = isSub;
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['authorId']) {
      this.authorId$.next(changes['authorId'].currentValue);
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
