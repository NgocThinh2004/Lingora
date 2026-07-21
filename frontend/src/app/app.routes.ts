import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    loadComponent: () => import('./features/feed/home.component').then((module) => module.HomeComponent),
  },
  {
    path: 'explore',
    loadComponent: () => import('./features/explore/explore.component').then((module) => module.ExploreComponent),
  },
  {
    path: 'post-detail',
    loadComponent: () => import('./features/posts/post-detail.component').then((module) => module.PostDetailComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then((module) => module.ProfileComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then((module) => module.SettingsComponent),
  },
  {
    path: 'subscriptions',
    loadComponent: () =>
      import('./features/subscriptions/subscriptions.component').then((module) => module.SubscriptionsComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((module) => module.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register.component').then((module) => module.RegisterComponent),
  },
  {
    path: 'auth/change-password',
    loadComponent: () =>
      import('./features/auth/change-password.component').then((module) => module.ChangePasswordComponent),
  },
  {
    path: 'workspace/create',
    loadComponent: () =>
      import('./features/workspace/post-editor.component').then((module) => module.PostEditorComponent),
  },
  {
    path: 'workspace/posts',
    loadComponent: () => import('./features/workspace/my-posts.component').then((module) => module.MyPostsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
