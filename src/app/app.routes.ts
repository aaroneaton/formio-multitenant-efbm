import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { LoginComponent } from './features/login/login.component';

export const routes: Routes = [
  { path: '', redirectTo: 'forms', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'forms',
    loadChildren: () => import('./features/forms/forms.module').then(m => m.FormsModule),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'forms' },
];
