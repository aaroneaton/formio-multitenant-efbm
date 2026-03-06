# Form.io Multi-Tenant Form Builder — PoC Specification

**Version:** 0.2  
**Date:** 2026-03-03  
**Status:** Draft  
**Scope:** Builder/management only. No submission handling.

---

## 1. Overview

A single-page Angular 21 application that authenticates users against a self-hosted Form.io instance (`localhost:3000`), presents a tenant selector at login, and provides a full Form.io Enterprise Form Builder experience scoped to the selected tenant. All users are treated as tenant admins for this PoC.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Angular 21 | Standalone components; Signal Forms where applicable |
| Form.io SDK | `@formio/angular` (latest) | Provides `<form-builder>`, `<formio>`, `FormioAuthService` |
| Auth | `FormioAuthService` from `@formio/angular/auth` | See §6 |
| Login UI | Form.io `user/login` form rendered via `<formio>` | Default Form.io login form; no custom HTML form needed |
| Styling | SCSS + CSS custom properties | Bespoke design (see §9); no component library |
| HTTP | Angular `HttpClient` | Used only for form list/delete calls outside the SDK |
| Routing | Angular Router (hash-based) | Hash routing avoids local dev server config |
| State | Angular Signals | No NgRx needed for PoC |
| Build | Angular CLI | Default setup |
| Form.io Server | Self-hosted at `http://localhost:3000` | Enterprise tier required for builder module |

---

## 3. Form.io Server Assumptions

- Enterprise license active; Form.io server running at `http://localhost:3000`
- Each tenant is a **separate Form.io project** on that server
- Each tenant project has a `user` resource with a `user/login` form and pre-provisioned accounts
- Resource-based authentication is enabled per tenant project
- The Angular app authenticates directly against the **selected tenant's project**

---

## 4. Application Structure

```
src/
├── app/
│   ├── core/
│   │   ├── tenant/
│   │   │   ├── tenant.service.ts        # Active tenant Signal; configures Formio URLs
│   │   │   └── tenant.config.ts         # Static tenant registry
│   │   └── auth/
│   │       └── auth.guard.ts            # Protects routes via FormioAuthService.authenticated
│   ├── features/
│   │   ├── login/
│   │   │   ├── login.component.ts       # Tenant selector + <formio> login form
│   │   │   └── login.component.scss
│   │   ├── dashboard/
│   │   │   ├── dashboard.component.ts   # Form list and management
│   │   │   └── dashboard.component.scss
│   │   └── builder/
│   │       ├── builder.component.ts     # Wraps <form-builder>
│   │       └── builder.component.scss
│   ├── shared/
│   │   ├── components/
│   │   │   ├── top-nav/
│   │   │   └── confirm-dialog/
│   │   └── models/
│   │       ├── tenant.model.ts
│   │       └── form.model.ts
│   ├── app.routes.ts
│   └── app.config.ts
├── styles/
│   ├── _variables.scss
│   ├── _typography.scss
│   └── _reset.scss
└── environments/
    └── environment.ts
```

---

## 5. Tenant Configuration

Tenants are registered statically for the PoC. No dynamic discovery required.

```typescript
// src/app/core/tenant/tenant.config.ts
export interface TenantConfig {
  id: string;
  displayName: string;
  projectUrl: string;   // e.g. http://localhost:3000/tenant-alpha
}

export const TENANTS: TenantConfig[] = [
  {
    id: 'tenant-alpha',
    displayName: 'Tenant Alpha',
    projectUrl: 'http://localhost:3000/tenant-alpha',
  },
  {
    id: 'tenant-beta',
    displayName: 'Tenant Beta',
    projectUrl: 'http://localhost:3000/tenant-beta',
  },
];
```

---

## 6. Authentication

### 6.1 Approach

`FormioAuthService` (from `@formio/angular/auth`) is used as the primary auth mechanism. It manages the JWT lifecycle, stores the token in `localStorage` under `formioToken`, and exposes `authenticated`, `user`, `onLogin`, and `onLogout` that the rest of the app binds to.

The **default Form.io `user/login` form** is rendered via the `<formio>` component. This eliminates the need for a custom HTML login form entirely. The `FormioAuthService` exposes a `loginForm` property (a URL string pointing to `{projectUrl}/user/login`) and an `onLoginSubmit()` handler that the `<formio>` component calls on submission.

### 6.2 The Multi-Tenancy Problem

`FormioAuthService` calls `Formio.setBaseUrl()` and `Formio.setProjectUrl()` on instantiation using the values from `FormioAppConfig`. Since the tenant isn't known until the user selects it on the login screen, `FormioAppConfig` **cannot be provided statically at bootstrap**.

### 6.3 Solution: Dynamic Configuration Before Auth Init

`TenantService` holds the selected tenant as a Signal. When the user selects a tenant on the login screen (before submitting credentials), `TenantService.select(tenant)` is called, which:

1. Calls `Formio.setBaseUrl('http://localhost:3000')`
2. Calls `Formio.setProjectUrl(tenant.projectUrl)`
3. Calls `authService.init()` (or equivalent re-initialization)

`FormioAuthConfig` is provided with empty/placeholder values at bootstrap and overridden at runtime via direct `Formio.*` calls. This is supported because `FormioAuthService` delegates to the global `Formio` singleton, which can be reconfigured at any point.

```typescript
// app.config.ts — provide auth service with placeholder config
providers: [
  FormioAuthService,
  {
    provide: FormioAuthConfig,
    useValue: {
      login: { form: 'user/login' },
    }
  }
]
```

```typescript
// tenant.service.ts
export class TenantService {
  activeTenant = signal<TenantConfig | null>(null);

  select(tenant: TenantConfig): void {
    Formio.setBaseUrl('http://localhost:3000');
    Formio.setProjectUrl(tenant.projectUrl);
    this.activeTenant.set(tenant);
    // FormioAuthService.loginForm will now resolve against the correct project
  }
}
```

### 6.4 Login Flow

```
1. User opens app → auth guard redirects to /login
2. User selects tenant from dropdown
   → TenantService.select() fires; Formio URLs updated
3. <formio> component renders the user/login form from the tenant project
   src bound to: authService.loginForm  (resolves to {projectUrl}/user/login)
4. User submits credentials
   → (submit) bound to authService.onLoginSubmit($event)
   → FormioAuthService handles token receipt and storage
5. authService.onLogin emits
   → LoginComponent subscribes and navigates to /dashboard
6. Token stored in localStorage as 'formioToken'
   → All subsequent @formio/angular calls include it automatically
```

### 6.5 Logout

```typescript
auth.logout();
// FormioAuthService clears formioToken from localStorage
// authService.onLogout emits → navigate to /login
```

### 6.6 Auth Guard

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(FormioAuthService);
  const router = inject(Router);
  return auth.authenticated ? true : router.createUrlTree(['/login']);
};
```

Note: `FormioAuthService.authenticated` is synchronously true if `formioToken` exists in `localStorage` and the token has not expired. On 401 responses from the Form.io API, the SDK clears the token automatically; a global HTTP interceptor should catch this and redirect to `/login`.

---

## 7. Routing

```typescript
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'forms/new',
    component: BuilderComponent,
    canActivate: [authGuard]
  },
  {
    path: 'forms/:formId/edit',
    component: BuilderComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'dashboard' }
];
```

Hash-based routing (`useHash: true`) enabled in `app.config.ts`.

---

## 8. Feature Specifications

### 8.1 Login Page

**Layout:** Centered card on a light neutral background.

**Elements:**
- App wordmark (top of card)
- Tenant `<select>` dropdown populated from `TENANTS` config
- The default Form.io `user/login` form rendered via `<formio [src]="auth.loginForm" (submit)="auth.onLoginSubmit($event)">`
- Error state handled natively by the Form.io renderer; no custom error markup needed

**Behavior:**
- Tenant selector defaults to the first entry
- On tenant change, `TenantService.select()` is called immediately — this updates `authService.loginForm` so the `<formio>` component re-renders against the correct project
- On successful login, `authService.onLogin` subscription navigates to `/dashboard`
- No registration or password reset flows in PoC

**Note on Form.io login form styling:** The rendered `user/login` form uses Form.io's default HTML structure. Custom CSS will be needed to align it with the app's design system (see §9). Target `.formio-form`, `.form-group`, `.btn-primary` etc. in the login component's SCSS.

---

### 8.2 Top Navigation

Persistent across all authenticated routes.

**Left:** App wordmark + tenant name badge  
**Right:** `auth.user?.data?.email` display + Sign Out button calling `auth.logout()`

---

### 8.3 Dashboard (Form Management)

The primary post-login view. Displays all forms in the active tenant project.

**Data source:** `GET {projectUrl}/form?type=form&limit=100`  
Called via Angular `HttpClient` with the `x-jwt-token` header injected by the interceptor (the SDK stores the token in `localStorage`; the interceptor reads `localStorage.getItem('formioToken')`).

**Layout:** Full-width list. Each row:

| Element | Detail |
|---|---|
| Form title | Primary label; links to `/forms/:formId/edit` |
| Form path | Subdued monospace text, e.g. `/my-form` |
| Modified date | Human-readable, e.g. "Feb 28, 2026" |
| Actions | Edit button, Delete button with confirmation modal |

**Toolbar:**
- Page title: "Forms — [Tenant Name]"
- "+ New Form" button → `/forms/new`
- Client-side search input filtering on form title

**Empty state:** Centered message with "+ Create your first form" CTA.

**Delete:** `DELETE {projectUrl}/form/{formId}` with confirmation modal before execution.

---

### 8.4 Form Builder

Wraps `<form-builder>` from `@formio/angular`.

**Routes:**
- `/forms/new` — empty schema `{ components: [] }`
- `/forms/:formId/edit` — `GET {projectUrl}/form/{formId}` to load schema before rendering

**Layout:**
- Slim header: back arrow + inline-editable form title input + Save button
- Builder fills remaining viewport height

**Save:**
- New: `POST {projectUrl}/form`
- Existing: `PUT {projectUrl}/form/{formId}`
- Success → navigate to `/dashboard`

**Integration:**
```typescript
// builder.component.ts
ngOnInit() {
  // Formio URLs are already set by TenantService at login time
  // No additional Formio.set* calls needed here
  this.loadForm(); // fetches existing schema if editing
}
```

```html
<form-builder [form]="form" (change)="onBuilderChange($event)"></form-builder>
```

The `change` event carries the updated form schema in `$event.form`. Store this locally and POST/PUT on Save.

---

## 9. HTTP Interceptor

`FormioAuthService` stores the JWT in `localStorage.formioToken`. API calls made via `HttpClient` (form list, delete, save) need this token attached manually since they bypass the SDK.

```typescript
export const formioTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('formioToken');
  if (token) {
    req = req.clone({ setHeaders: { 'x-jwt-token': token } });
  }
  return next(req).pipe(
    tap({ error: (err) => {
      if (err.status === 401) {
        localStorage.removeItem('formioToken');
        inject(Router).navigate(['/login']);
      }
    }})
  );
};
```

---

## 10. API Error Handling

| HTTP Status | Handling |
|---|---|
| 401 | Interceptor clears token, redirects to `/login` |
| 403 | Inline message: "You do not have permission to perform this action" |
| 404 | Dashboard: treat as empty list. Builder: navigate to dashboard. |
| 5xx | Inline message: "Server error. Please try again." |
| Network failure | Inline message: "Cannot connect to Form.io server." |

---

## 11. Design System

Inspired by The Verge's typographic density and editorial structure, adapted to a light scheme.

### Color Tokens

```scss
// src/styles/_variables.scss
--color-bg:             #FFFFFF;
--color-bg-secondary:   #F7F7F5;
--color-bg-tertiary:    #EFEFEC;
--color-border:         #E0E0DB;

--color-text-primary:   #111111;
--color-text-secondary: #555550;
--color-text-muted:     #99998F;

--color-accent:         #FF2D20;   // Use sparingly; CTAs and active states only
--color-accent-hover:   #D9200F;

--color-success:        #1A7F4B;
--color-error:          #CC2200;
```

### Typography

```scss
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: "JetBrains Mono", "Fira Code", "Courier New", monospace;

--text-xs:   0.75rem;    // metadata, labels
--text-sm:   0.875rem;   // secondary content, table cells
--text-base: 1rem;       // body
--text-lg:   1.125rem;   // subheadings
--text-xl:   1.5rem;     // page titles
--text-2xl:  2rem;       // display
```

### Layout Principles

- **Thick top border** on nav and section headers (3–4px `--color-text-primary`) — primary editorial device
- **Near-black text** (`#111111`); not softened gray
- **Tight heading line-height** (1.1–1.2); relaxed body (1.6)
- **No rounded corners** on major containers; 2px radius on buttons only
- **Uppercase tracking** on badge labels and metadata

### Component Patterns

```scss
// Primary button
background: var(--color-text-primary);
color: var(--color-bg);
padding: 0.625rem 1.25rem;
font-weight: 600;
border-radius: 2px;

// Destructive button
background: var(--color-error);
color: white;

// Ghost button
background: transparent;
border: 1.5px solid var(--color-border);
color: var(--color-text-primary);

// Nav bar
border-top: 4px solid var(--color-text-primary);
background: var(--color-bg);
border-bottom: 1px solid var(--color-border);
height: 56px;
padding: 0 1.5rem;

// Form list rows (no card — renders on page background)
border-bottom: 1px solid var(--color-border);
padding: 1rem 0;

// Tenant badge
font-size: var(--text-xs);
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.08em;
border: 1.5px solid var(--color-border);
padding: 0.2rem 0.5rem;
border-radius: 2px;
```

---

## 12. Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  formioBaseUrl: 'http://localhost:3000',
};
```

---

## 13. Out of Scope (PoC)

- Form submission handling, viewer, or data export
- Role-based access control within tenants
- Tenant provisioning or user registration
- Dynamic tenant discovery
- Form versioning or publish/draft workflow
- Pagination beyond `limit=100`
- Production deployment, HTTPS, CORS configuration
- Automated tests

---

## 14. Open Questions

1. **`@formio/angular` version compatibility with Angular 21:** The SDK's peer dependency requirements should be confirmed before scaffolding. If the current release doesn't declare Angular 21 support, `--legacy-peer-deps` may be needed and should be noted.

2. **`FormioAuthService` re-initialization behavior:** The dynamic tenant-switching approach (§6.3) relies on `Formio.setProjectUrl()` being respected by `FormioAuthService` after instantiation. This should be validated early with a minimal proof-of-concept before building the full login flow around it.

3. **Default `user/login` form existence:** Each tenant project must have a `user/login` form provisioned. If any tenant project was created without one, the `<formio>` component will fail to render. Confirm this is present on all configured tenant projects.

4. **Enterprise builder module activation:** The Form.io Enterprise builder must be licensed and enabled on the self-hosted instance. This is a hard gate for §8.4 and should be confirmed before starting builder integration work.

5. **Token expiry for long demo sessions:** Form.io JWTs default to 24-hour expiry. Acceptable for PoC, but worth noting if demos are expected to span multiple days without re-login.
