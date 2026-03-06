# Multi-Tenant Form Management with Angular and Form.io Enterprise Builder

This project demonstrates how to build a multi-tenant form management application using Angular 21 and the Form.io Enterprise Builder. Tenants are backed a multi-tenant-enabled, self-hosted Form.io instance. In this example, users select their tenant at login, and the Enterprise Builder provides the complete form management UI. Applications could be modified to enable a unique subdomain per tenant.

---

## Architecture Overview

The application has three main responsibilities:

1. **Tenant selection** — the user picks their tenant at login; the app points all Form.io SDK calls at that tenant's project URL for the duration of the session.
2. **Authentication** — standard Form.io JWT auth scoped to the selected tenant.
3. **Form management UI** — provided entirely by `@formio/enterprise-builder`, loaded as a Angular module.

### Key architectural decisions

**`TenantService` owns runtime Formio configuration.** When a tenant is selected, `TenantService` updates both the Formio SDK globals (`Formio.setProjectUrl`) and the injected `FormioAppConfig` instance. Updating `FormioAppConfig` is necessary because `FormioComponent` reads from it each time it renders, and because `EnterpriseBuilderService` spreads the config object at construction time.

**Enterprise Builder provides all form routes.** `FormRoutes()` from `@formio/enterprise-builder/angular` generates the complete route tree for form listing, building, editing, and data management. There are no custom form-related components in this app.

**Hash routing.** `RouterModule.forRoot(routes, { useHash: true })` is used to avoid server-side routing configuration.

## Prerequisites

- Node.js 20+
- Angular CLI 21
- Form.io Enterprise Form Builder license key
- A self-hosted Form.io server with tenants enabled

---

## 1. Clone and Install

```bash
git clone <repo-url>
cd multi-tenant-efbm
npm install --legacy-peer-deps
```

---

## 2. Environment Configuration

Fill in your server URL and license key. Do not commit the license key to source control — use environment-specific files or CI/CD secrets to inject it at build time.

`src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  formioBaseUrl: 'https://your-formio-server.com',
  enterpriseBuilderLicense: 'YOUR_LICENSE_KEY_HERE',
};
```

---

## 3. Tenant Registry

Define each tenant with a unique `id`, a display name shown in the login UI, and the full URL of its Form.io project.

`src/app/core/tenant/tenant.config.ts`:

```typescript
import { TenantConfig } from '../../shared/models/tenant.model';

export const TENANTS: TenantConfig[] = [
  {
    id: 'tenant-a',
    displayName: 'Tenant A',
    projectUrl: 'https://your-formio-server.com/tenant-a-project',
  },
  {
    id: 'tenant-b',
    displayName: 'Tenant B',
    projectUrl: 'https://your-formio-server.com/tenant-b-project',
  },
];
```

The `TenantConfig` interface is:

```typescript
export interface TenantConfig {
  id: string;
  displayName: string;
  projectUrl: string;
}
```

---

## Running the App

```bash
npm start    # http://localhost:4200/#/login
npm run build
```

**Expected flow:**

1. Navigate to `/#/login` — select a tenant, enter credentials
2. On success → redirected to `/#/forms`
3. Enterprise Builder form management UI loads, scoped to the selected tenant's project
4. Page refresh on `/#/forms` restores the session automatically

---

## Adding a New Tenant

1. Create a new tenant on your Form.io server
2. Add an entry to `TENANTS` in `src/app/core/tenant/tenant.config.ts`:

```typescript
{
	id: 'new-tenant',
	displayName: 'New Tenant',
	projectUrl: 'https://your-server.com/new-tenant'
}
```

---

## Form.io Server Requirements

Each tenant must have:

- A `user` resource with `email` and `password` fields (the standard Form.io user resource)
- A `user/login` action configured on the default user login form
- At least one user account for testing

The application does not create or manage Form.io projects — it assumes each tenant is already provisioned on the server.

---

## How Tenant Switching Works

All tenant switching flows through two methods in `src/app/core/tenant/tenant.service.ts`.

**`select(tenant)`** is called when the user picks a tenant on the login page. It delegates to `configureForTenant`, persists the selection to localStorage, and updates the `activeTenant` signal (which the login template watches to show/hide the login form).

**`configureForTenant(tenant)`** is where the runtime wiring happens:

```typescript
private configureForTenant(tenant: TenantConfig): void {
  Formio.setBaseUrl(environment.formioBaseUrl);
  Formio.setProjectUrl(tenant.projectUrl);
  this.appConfig.appUrl = tenant.projectUrl;
  this.appConfig.apiUrl = environment.formioBaseUrl;
  (this.appConfig as any).projectUrl = tenant.projectUrl;
  (this.appConfig as any).baseUrl = environment.formioBaseUrl;
  this.authService.loginForm = `${tenant.projectUrl}/user/login`;
}
```

It does three things at once:

1. **Updates the Formio SDK globals** (`Formio.setBaseUrl` / `Formio.setProjectUrl`) — these are the globals that `@formio/js` uses for all API calls.
2. **Patches the injected `FormioAppConfig`** — `FormioComponent` reads `appConfig.appUrl` in its constructor to reset the SDK globals, so the config must be up to date before any `<formio>` element renders. `EnterpriseBuilderService` also spreads this config at construction time, so it must be correct before the lazy `/forms` module loads.
3. **Updates `authService.loginForm`** — points the login form `<formio>` at the tenant's own `/user/login` endpoint.

`restoreFromStorage()` calls the same `configureForTenant` on startup, which is what allows a page refresh on `/#/forms` to restore the correct tenant context before the Enterprise Builder's route resolver runs.
