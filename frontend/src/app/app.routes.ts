import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { createPostGuard } from './features/workspace/create-post.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    loadComponent: () => import('./features/feed/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'explore',
    loadComponent: () => import('./features/explore/explore.component').then(m => m.ExploreComponent)
  },
  {
    path: 'subscriptions',
    canActivate: [createPostGuard],
    loadComponent: () => import('./features/subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent)
  },
  {
    path: 'post-detail',
    loadComponent: () => import('./features/posts/post-detail.component').then(m => m.PostDetailComponent)
  },
  {
    path: 'settings',
    canActivate: [createPostGuard],
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'auth/reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: 'workspace/create',
    canActivate: [createPostGuard],
    loadComponent: () =>
      import('./features/workspace/post-editor.component').then(m => m.PostEditorComponent),
  },
  {
    path: 'workspace/posts',
    canActivate: [createPostGuard],
    loadComponent: () =>
      import('./features/workspace/my-posts.component').then(m => m.MyPostsComponent),
  },
  {
    path: 'workspace/posts/:id/edit',
    canActivate: [createPostGuard],
    loadComponent: () =>
      import('./features/workspace/post-editor.component').then(m => m.PostEditorComponent),
  },
  {
    path: 'profile',
    canActivate: [createPostGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./shared/layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent)
      },
      {
        path: 'languages',
        loadComponent: () => import('./features/admin/languages/admin-languages.component').then(m => m.AdminLanguagesComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
