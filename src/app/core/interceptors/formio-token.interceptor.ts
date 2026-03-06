import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

export const formioTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('formioToken');
  if (token) {
    req = req.clone({ setHeaders: { 'x-jwt-token': token } });
  }
  return next(req).pipe(
    tap({
      error: (err) => {
        if (err.status === 401) {
          localStorage.removeItem('formioToken');
          inject(Router).navigate(['/login']);
        }
      },
    })
  );
};
