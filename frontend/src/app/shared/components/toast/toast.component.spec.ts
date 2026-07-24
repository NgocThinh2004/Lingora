import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastService } from '../../../core/notifications/toast.service';
import { ToastComponent } from './toast.component';

describe('ToastComponent', () => {
  it('removes an expired toast so it cannot intercept later clicks', fakeAsync(() => {
    const fixture = TestBed.createComponent(ToastComponent);
    const component = fixture.componentInstance;
    const toastService = TestBed.inject(ToastService);

    fixture.detectChanges();
    toastService.showSuccess('Published');

    expect(component.isVisible).toBe(true);
    expect(component.toastData?.message).toBe('Published');

    tick(4000);
    expect(component.isVisible).toBe(false);

    tick(200);
    expect(component.toastData).toBeNull();

    fixture.destroy();
  }));
});
