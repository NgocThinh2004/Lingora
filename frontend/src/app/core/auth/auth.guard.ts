
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthModalService } from './auth-modal.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const authModalService = inject(AuthModalService);

  if (authService.currentUser() && authService.getToken()) {
    return true;
  }

  // User is not authenticated
  authModalService.open(state.url);

  // If this is the very first page load (e.g., user directly visited /subscriptions)
  // we redirect them to home so they don't see a blank screen under the modal.
  if (!router.navigated) {
    return router.createUrlTree(['/']);
  }

  // If they clicked a link from within the app, just cancel navigation and stay on current page.
  return false;
};
