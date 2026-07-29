import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CurrentUser } from '../../../core/auth/current-user.model';
import { LocaleService } from '../../../core/locale/locale.service';
import { ThemeService } from '../../../core/theme/theme.service';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent authentication menu', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let token: string | null;
  const currentUser = signal<CurrentUser | null>(null);

  beforeEach(async () => {
    token = null;
    currentUser.set(null);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: currentUser.asReadonly(),
            getToken: () => token,
            logout: () => of(void 0),
          },
        },
        {
          provide: LocaleService,
          useValue: {
            options: signal([]),
            selectedLocale: signal('en'),
            load: () => undefined,
            translate: (key: string) => key,
            selectLocale: () => undefined,
          },
        },
        {
          provide: ThemeService,
          useValue: {
            resolvedTheme: () => 'light',
            toggle: () => undefined,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    fixture.componentInstance.moreMenuOpen.set(true);
    fixture.detectChanges();
  });

  it('shows sign in and hides sign out for a guest', () => {
    expect(fixture.nativeElement.querySelector('#signInBtn')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#signOutBtn')).toBeNull();
  });

  it('reacts to session changes and only shows the admin panel to admins', () => {
    token = 'access-token';
    currentUser.set({
      id: '1',
      email: 'admin@example.com',
      username: 'admin',
      displayName: 'Administrator',
      role: 'admin',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#signInBtn')).toBeNull();
    expect(fixture.nativeElement.querySelector('#signOutBtn')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).not.toBeNull();

    currentUser.set(null);
    token = null;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#signInBtn')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#signOutBtn')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/admin"]')).toBeNull();
  });
});
