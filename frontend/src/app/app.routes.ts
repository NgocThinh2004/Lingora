import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { createPostGuard } from './features/workspace/create-post.guard';
import { HomeComponent } from './features/home/home.component';
import { MainLayoutComponent } from './shared/layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        component: HomeComponent,
      },
      {
        path: 'home',
        component: HomeComponent,
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
        data: { showRightPanel: false, contentMaxWidth: '780px' },
      },
    ],
  },
  {
    path: 'explore',
    loadComponent: () => import('./features/explore/explore.component').then(m => m.ExploreComponent),
  },
  {
    path: 'subscriptions',
    canActivate: [createPostGuard],
    loadComponent: () =>
      import('./features/subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent),
  },
  {
    path: 'post-detail',
    loadComponent: () => import('./features/posts/post-detail.component').then(m => m.PostDetailComponent),
  },
  {
    path: 'post/:id',
    loadComponent: () => import('./features/posts/post-detail.component').then(m => m.PostDetailComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'auth/change-password',
    canActivate: [createPostGuard],
    loadComponent: () =>
      import('./features/auth/change-password.component').then(m => m.ChangePasswordComponent),
  },
  {
    path: 'workspace/create',
    canActivate: [createPostGuard],
    loadComponent: () =>
      import('./features/workspace/post-editor.component').then(m => m.PostEditorComponent),
  },
  {
    path: 'create-post',
    redirectTo: 'workspace/create',
    pathMatch: 'full',
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
    path: 'profile/:id',
    canActivate: [createPostGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./shared/layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'languages',
        loadComponent: () =>
          import('./features/admin/languages/admin-languages.component').then(m => m.AdminLanguagesComponent),
      },
      {
        path: 'posts',
        loadComponent: () =>
          import('./features/admin/posts/admin-posts.component').then(m => m.AdminPostsComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/admin/categories/admin-categories.component').then(m => m.AdminCategoriesComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
        data: { settingsContext: 'admin' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
