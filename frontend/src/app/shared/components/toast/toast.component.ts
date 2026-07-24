import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastMessage, ToastService } from '../../../core/notifications/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent implements OnInit, OnDestroy {
  toastData: ToastMessage | null = null;
  isVisible = false;
  private subscription!: Subscription;
  private dismissTimer?: ReturnType<typeof setTimeout>;
  private removalTimer?: ReturnType<typeof setTimeout>;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toastState$.subscribe(toast => {
      this.toastData = toast;
      this.isVisible = true;
      clearTimeout(this.dismissTimer);
      clearTimeout(this.removalTimer);
      this.dismissTimer = setTimeout(() => this.dismiss(), 4000);
    });
  }

  dismiss(): void {
    this.isVisible = false;
    clearTimeout(this.removalTimer);
    this.removalTimer = setTimeout(() => {
      if (!this.isVisible) {
        this.toastData = null;
      }
    }, 200);
  }

  ngOnDestroy() {
    clearTimeout(this.dismissTimer);
    clearTimeout(this.removalTimer);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
