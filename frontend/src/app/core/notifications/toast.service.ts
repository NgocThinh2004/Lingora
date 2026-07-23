import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toastState$ = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'error' = 'error') {
    this.toastSubject.next({ message, type });
  }

  showSuccess(message: string) {
    this.toastSubject.next({ message, type: 'success' });
  }

  showError(message: string) {
    this.toastSubject.next({ message, type: 'error' });
  }
}
