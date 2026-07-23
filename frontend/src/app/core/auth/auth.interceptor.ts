import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const isPublicAuthRequest = (url: string): boolean =>
  [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
    '/auth/forgot-password',
    '/auth/reset-password',
  ].some(path => url.endsWith(path));

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const accessToken = authService.getToken();
  const authenticatedRequest = accessToken && !isPublicAuthRequest(request.url)
    ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      const canRefresh =
        error.status === 401 &&
        !isPublicAuthRequest(request.url) &&
        Boolean(authService.getRefreshToken());

      if (!canRefresh) {
        return throwError(() => error);
      }

      return authService.refreshSession().pipe(
        switchMap(session =>
          next(request.clone({
            setHeaders: { Authorization: `Bearer ${session.accessToken}` },
          })),
        ),
        catchError(refreshError => {
          authService.expireSession();
          void router.navigate(['/auth/login'], {
            queryParams: { sessionExpired: 'true' },
          });
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
