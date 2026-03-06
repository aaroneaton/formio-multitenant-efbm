import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormioModule } from '@formio/angular';
import { FormioAuthService } from '@formio/angular/auth';
import { Subscription } from 'rxjs';
import { TenantService } from '../../core/tenant/tenant.service';
import { TENANTS } from '../../core/tenant/tenant.config';
import { TenantConfig } from '../../shared/models/tenant.model';

@Component({
  selector: 'app-login',
  imports: [FormioModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  auth = inject(FormioAuthService);
  tenantService = inject(TenantService);
  private router = inject(Router);
  private loginSub?: Subscription;

  readonly tenants: TenantConfig[] = TENANTS;

  ngOnInit(): void {
    // If already authenticated, skip straight to dashboard
    if (localStorage.getItem('formioToken')) {
      this.router.navigate(['/forms']);
      return;
    }
    // Always require explicit tenant selection on the login page
    this.tenantService.activeTenant.set(null);
    this.loginSub = this.auth.onLogin.subscribe(() => {
      this.router.navigate(['/forms']);
    });
  }

  ngOnDestroy(): void {
    this.loginSub?.unsubscribe();
  }

  get activeTenant() {
    return this.tenantService.activeTenant;
  }

  onTenantChange(tenantId: string): void {
    const tenant = this.tenants.find(t => t.id === tenantId);
    if (tenant) {
      this.tenantService.select(tenant);
    } else {
      this.tenantService.activeTenant.set(null);
    }
  }

  onLoginSubmit(submission: object): void {
    this.auth.onLoginSubmit(submission);
  }
}
