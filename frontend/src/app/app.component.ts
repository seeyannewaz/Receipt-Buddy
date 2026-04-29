import { Component, inject, computed, viewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd, ActivatedRoute, NavigationStart } from '@angular/router';
import { NgIf, CommonModule } from '@angular/common';

import { filter, map } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { LoadingService } from './core/ui/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, RouterLink, RouterLinkActive, NgIf,
    MatToolbarModule, MatSidenavModule, MatIconModule, MatListModule, MatButtonModule,
    MatProgressBarModule, MatSnackBarModule,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  loading = inject(LoadingService);
  private snackBar = inject(MatSnackBar);

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private breakpoint = inject(BreakpointObserver);

  sidenav = viewChild<MatSidenav>('sidenav');

  private layout$ = this.router.events.pipe(
    filter((e): e is NavigationEnd => e instanceof NavigationEnd),
    map(() => {
      let r: ActivatedRoute | null = this.route;
      while (r?.firstChild) r = r.firstChild;
      return (r?.snapshot.data?.['layout'] as string) ?? 'main';
    })
  );

  layout = toSignal(this.layout$, { initialValue: 'main' });
  isBlank = computed(() => this.layout() === 'blank');

  // Treat tablets/phones (<= 959.98px) as "mobile" — sidenav becomes an overlay drawer.
  private isHandset$ = this.breakpoint
    .observe(['(max-width: 959.98px)'])
    .pipe(map((s) => s.matches));

  isHandset = toSignal(this.isHandset$, { initialValue: false });

  constructor() {
    // Auto-close the drawer whenever the user navigates on mobile.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => {
        if (this.isHandset()) {
          this.sidenav()?.close();
        }
      });
  }

  snack(msg: string) {
    this.snackBar.open(msg, 'OK', { duration: 3500 });
  }
}
