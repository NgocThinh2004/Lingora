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

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toastState$.subscribe(toast => {
      this.toastData = toast;
      this.isVisible = true;
      clearTimeout(this.dismissTimer);
      this.dismissTimer = setTimeout(() => this.dismiss(), 4000);
    });
  }

  dismiss(): void {
    this.isVisible = false;
    setTimeout(() => {
      if (!this.isVisible) {
        this.toastData = null;
      }
    }, 200);
  }

  ngOnDestroy() {
    clearTimeout(this.dismissTimer);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
