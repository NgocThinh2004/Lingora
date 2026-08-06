import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LocaleService } from '../../../core/locale/locale.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { AdminUser } from './models/admin-user.model';
import { AdminUsersComponent } from './admin-users.component';
import { AdminUsersService } from './services/admin-users.service';

describe('AdminUsersComponent', () => {
  let fixture: ComponentFixture<AdminUsersComponent>;
  let component: AdminUsersComponent;
  let adminUsersService: jasmine.SpyObj<AdminUsersService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const member: AdminUser = {
    id: 'user-1',
    email: 'member@example.com',
    username: 'member',
    displayName: 'Member One',
    avatarUrl: null,
    bio: null,
    role: 'member',
    status: 'active',
    createdAt: '2026-07-20T00:00:00.000Z',
    updatedAt: '2026-07-20T00:00:00.000Z',
  };

  beforeEach(async () => {
    adminUsersService = jasmine.createSpyObj<AdminUsersService>('AdminUsersService', [
      'getUsers',
      'getUser',
      'updateUser',
    ]);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', [
      'showSuccess',
      'showError',
    ]);

    adminUsersService.getUsers.and.returnValue(of({
      success: true, status: 200, message: 'ok',
      data: [member],
      meta: { total: 1, page: 1, limit: 8, totalPages: 1 },
    }));

    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent],
      providers: [
        provideRouter([]),
        { provide: AdminUsersService, useValue: adminUsersService },
        { provide: ToastService, useValue: toastService },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'admin-1' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads the first page when initialized', () => {
    expect(adminUsersService.getUsers).toHaveBeenCalledWith({
      search: undefined,
      role: undefined,
      status: undefined,
      page: 1,
      limit: 8,
    });
    expect(component.users()).toEqual([member]);
    expect(component.pagination().total).toBe(1);
  });

  it('restores filters and pagination from the URL after a reload', fakeAsync(() => {
    const router = TestBed.inject(Router);
    void router.navigateByUrl('/?search=member&role=member&status=inactive&page=2');
    tick();

    fixture.destroy();
    adminUsersService.getUsers.calls.reset();
    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.filterForm.getRawValue()).toEqual({
      search: 'member',
      role: 'member',
      status: 'inactive',
    });
    expect(adminUsersService.getUsers).toHaveBeenCalledWith({
      search: 'member',
      role: 'member',
      status: 'inactive',
      page: 2,
      limit: 8,
    });
  }));

  it('opens a user and saves access changes', () => {
    const updatedUser: AdminUser = { ...member, role: 'admin', status: 'active' };
    adminUsersService.getUser.and.returnValue(of({ success: true, status: 200, message: 'ok', data: member }));
    adminUsersService.updateUser.and.returnValue(of({ success: true, status: 200, message: 'ok', data: updatedUser }));

    component.openUser(member);
    component.editForm.setValue({
      displayName: 'Member One',
      bio: '',
      role: 'admin',
      active: true,
    });
    component.saveUser();

    expect(adminUsersService.getUser).toHaveBeenCalledWith(member.id);
    expect(adminUsersService.updateUser).toHaveBeenCalledWith(member.id, {
      displayName: 'Member One',
      bio: '',
      role: 'admin',
      status: 'active',
    });
    expect(component.selectedUser()).toBeNull();
    expect(component.users()).toEqual([updatedUser]);
    expect(toastService.showSuccess).toHaveBeenCalled();
  });

  it('updates a member status from the table switch', () => {
    const inactiveUser: AdminUser = { ...member, status: 'inactive' };
    const translate = spyOn(TestBed.inject(LocaleService), 'translate').and.callFake((key, params) => {
      if (key === 'inactive') return 'Localized inactive';
      if (key === 'user_status_changed' && params) {
        return `${params['name']} -> ${params['status']}`;
      }
      return key;
    });
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = false;
    adminUsersService.updateUser.and.returnValue(of({ success: true, status: 200, message: 'ok', data: inactiveUser }));

    component.toggleUserStatus(member, input);

    expect(adminUsersService.updateUser).toHaveBeenCalledWith(member.id, { status: 'inactive' });
    expect(component.users()).toEqual([inactiveUser]);
    expect(translate).toHaveBeenCalledWith('inactive');
    expect(toastService.showSuccess).toHaveBeenCalledWith('Member One -> Localized inactive');
  });

  it('closes the details drawer from the close button', () => {
    adminUsersService.getUser.and.returnValue(of({ success: true, status: 200, message: 'ok', data: member }));
    component.openUser(member);
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(component.drawerOpen()).toBeFalse();
    expect(component.selectedUser()).toBeNull();
    expect(fixture.nativeElement.querySelector('.user-offcanvas')).toBeNull();
  });

  it('allows the details drawer to close while a save request is pending', () => {
    adminUsersService.getUser.and.returnValue(of({ success: true, status: 200, message: 'ok', data: member }));
    component.openUser(member);
    component.saving.set(true);
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(component.drawerOpen()).toBeFalse();
    expect(component.selectedUser()).toBeNull();
    expect(fixture.nativeElement.querySelector('.user-offcanvas')).toBeNull();
  });
});
