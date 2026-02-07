import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LoadingService } from '../ui/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const ui = inject(LoadingService);

  return next(req).pipe(
    catchError((err) => {
      ui.toast(`Request failed: ${err?.status ?? ''} ${err?.message ?? ''}`.trim());
      return throwError(() => err);
    })
  );
};
