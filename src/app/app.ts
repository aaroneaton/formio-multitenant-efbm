import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { toSignal } from '@angular/core/rxjs-interop';
import { TopNavComponent } from './shared/components/top-nav/top-nav.component';
import { TenantService } from './core/tenant/tenant.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TopNavComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private router = inject(Router);
  // Injected eagerly so restoreFromStorage() runs before any route resolver
  private tenantService = inject(TenantService);

  // Show nav on all routes except /login
  showNav = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => !(e as NavigationEnd).urlAfterRedirects.includes('/login')),
      startWith(!this.router.url.includes('/login'))
    ),
    { initialValue: false }
  );
}
