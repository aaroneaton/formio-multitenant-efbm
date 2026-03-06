import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormioAuthService } from '@formio/angular/auth';
import { TenantService } from '../../../core/tenant/tenant.service';

@Component({
  selector: 'app-top-nav',
  imports: [RouterLink],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
})
export class TopNavComponent {
  tenantService = inject(TenantService);
  auth = inject(FormioAuthService);

  signOut(): void {
    this.tenantService.clear();
    this.auth.logout(); // synchronously clears formioToken; async server call cancelled by reload
    localStorage.removeItem('formioUser');
    localStorage.removeItem('formioAppUser');
    // Full page reload — destroys all Angular singletons (including EnterpriseBuilderService,
    // which snapshots the project URL at construction time) so they reinitialize fresh.
    // NOTE: window.location.href = '/#/login' does NOT reload with hash routing — only the
    // fragment changes, so the browser fires hashchange (SPA nav) instead of reloading.
    window.location.reload();
  }

  get tenantName(): string {
    return this.tenantService.activeTenant()?.displayName ?? '';
  }

  get userEmail(): string {
    return this.auth.user?.data?.email ?? this.auth.user?.data?.name ?? '';
  }
}
