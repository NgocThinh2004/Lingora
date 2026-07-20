import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (!user) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: '/admin' },
    });
  }

  return user.role === 'admin'
    ? true
    : router.createUrlTree(['/']);
};
