import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormioAuthService } from '@formio/angular/auth';
import { TenantService } from '../../../core/tenant/tenant.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-top-nav',
  imports: [RouterLink],
  templateUrl: './top-nav.component.html',
  styleUrl: './top-nav.component.scss',
})
export class TopNavComponent implements OnInit, OnDestroy {
  tenantService = inject(TenantService);
  auth = inject(FormioAuthService);
  private router = inject(Router);
  private logoutSub?: Subscription;

  ngOnInit(): void {
    this.logoutSub = this.auth.onLogout.subscribe(() => {
      this.tenantService.clear();
      this.router.navigate(['/login']);
    });
  }

  ngOnDestroy(): void {
    this.logoutSub?.unsubscribe();
  }

  signOut(): void {
    this.auth.logout();
  }

  get tenantName(): string {
    return this.tenantService.activeTenant()?.displayName ?? '';
  }

  get userEmail(): string {
    return this.auth.user?.data?.email ?? this.auth.user?.data?.name ?? '';
  }
}
