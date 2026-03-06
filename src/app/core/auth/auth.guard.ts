import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  // Check the token directly — FormioAuthService.authenticated requires init()
  // to be called first (async), so we rely on the token in localStorage instead.
  return !!localStorage.getItem('formioToken')
    ? true
    : router.createUrlTree(['/login']);
};
