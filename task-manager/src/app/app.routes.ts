import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

// Each feature is lazy-loaded: its code is fetched only when the route is visited.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'tasks',
    canActivate: [authGuard],
    loadComponent: () => import('./tasks/task-list.component').then((m) => m.TaskListComponent),
  },
  { path: '**', redirectTo: 'tasks' },
];
