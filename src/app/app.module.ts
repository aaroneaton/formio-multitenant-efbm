import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { FormioModule, FormioAppConfig } from '@formio/angular';
import { FormioAuthService, FormioAuthConfig } from '@formio/angular/auth';
import {
  EnterpriseBuilderModule,
  ENTERPRISE_BUILDER_CONFIG,
  EnterpriseBuilderAppConfig,
} from '@formio/enterprise-builder/angular';
import { EnterpriseBuilderConfig } from '@formio/enterprise-builder-core';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { formioTokenInterceptor } from './core/interceptors/formio-token.interceptor';

// Standalone components imported into the root NgModule
import { App } from './app';
import { LoginComponent } from './features/login/login.component';
import { TopNavComponent } from './shared/components/top-nav/top-nav.component';

const enterpriseConfig: EnterpriseBuilderConfig = {
  license: environment.enterpriseBuilderLicense,
  baseUrl: environment.formioBaseUrl,
  projectUrl: `${environment.formioBaseUrl}/placeholder`,
  // projectUrl is overridden at runtime by TenantService via Formio.setProjectUrl()
};

@NgModule({
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes, { useHash: true }),
    FormioModule,
    EnterpriseBuilderModule,
    // Standalone components are imported (not declared) in NgModules in Angular 21
    App,
    LoginComponent,
    TopNavComponent,
  ],
  providers: [
    provideHttpClient(withInterceptors([formioTokenInterceptor])),
    provideAnimations(),
    provideToastr(),
    FormioAuthService,
    { provide: FormioAppConfig, useClass: EnterpriseBuilderAppConfig },
    { provide: ENTERPRISE_BUILDER_CONFIG, useValue: enterpriseConfig },
    { provide: FormioAuthConfig, useValue: { login: { form: 'user/login' }, delayAuth: true } },
  ],
  bootstrap: [App],
})
export class AppModule {}
