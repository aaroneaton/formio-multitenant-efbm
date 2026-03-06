import { Injectable, signal } from '@angular/core';
import { Formio, FormioAppConfig } from '@formio/angular';
import { FormioAuthService } from '@formio/angular/auth';
import { TenantConfig } from '../../shared/models/tenant.model';
import { TENANTS } from './tenant.config';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'formioActiveTenant';

@Injectable({ providedIn: 'root' })
export class TenantService {
  activeTenant = signal<TenantConfig | null>(null);

  constructor(
    private authService: FormioAuthService,
    private appConfig: FormioAppConfig,
  ) {
    this.restoreFromStorage();
  }

  select(tenant: TenantConfig): void {
    this.configureForTenant(tenant);
    localStorage.setItem(STORAGE_KEY, tenant.id);
    this.activeTenant.set(tenant);
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.activeTenant.set(null);
  }

  private configureForTenant(tenant: TenantConfig): void {
    Formio.setBaseUrl(environment.formioBaseUrl);
    Formio.setProjectUrl(tenant.projectUrl);
    // Update appConfig so FormioComponent constructor uses the correct tenant URL
    // (not the placeholder), and so EnterpriseBuilderService gets the correct
    // projectUrl when it is first created (it spreads appConfig at construction time).
    this.appConfig.appUrl = tenant.projectUrl;
    this.appConfig.apiUrl = environment.formioBaseUrl;
    (this.appConfig as any).projectUrl = tenant.projectUrl;
    (this.appConfig as any).baseUrl = environment.formioBaseUrl;
    this.authService.loginForm = `${tenant.projectUrl}/user/login`;
  }

  private restoreFromStorage(): void {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) return;
    const tenant = TENANTS.find(t => t.id === storedId);
    if (tenant) {
      this.configureForTenant(tenant);
      this.activeTenant.set(tenant);
    }
  }
}
