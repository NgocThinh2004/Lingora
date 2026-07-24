import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { authGuard } from './core/auth/auth.guard';
import { HomeComponent } from './features/home/home.component';
import { MainLayoutComponent } from './shared/layouts/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        title: 'Lingora',
        component: HomeComponent,
      },
      {
        path: 'home',
        title: 'Lingora',
        component: HomeComponent,
      },
      {
        path: 'settings',
        title: 'Settings - Lingora',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
        data: { showRightPanel: false, contentMaxWidth: '780px' },
      },
      {
        path: 'explore',
        title: 'Lingora - Explore',
        loadComponent: () => import('./features/explore/explore.component').then(m => m.ExploreComponent),
      },
      {
        path: 'subscriptions',
        title: 'Subscriptions - Lingora',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/subscriptions/subscriptions.component').then(m => m.SubscriptionsComponent),
      },
      {
        path: 'post-detail',
        title: 'Lingora',
        loadComponent: () => import('./features/posts/post-detail/post-detail.component').then(m => m.PostDetailComponent),
      },
      {
        path: 'post/:id',
        title: 'Lingora',
        loadComponent: () => import('./features/posts/post-detail/post-detail.component').then(m => m.PostDetailComponent),
      },
      {
        path: 'posts/:id',
        title: 'Lingora',
        loadComponent: () => import('./features/posts/post-detail/post-detail.component').then(m => m.PostDetailComponent),
      },
      {
        path: 'profile',
        title: 'Profile - Lingora',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
        data: { showRightPanel: false },
      },
      {
        path: 'profile/:id',
        title: 'Profile - Lingora',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
        data: { showRightPanel: false },
      },
    ],
  },
  {
    path: 'auth/login',
    title: 'Login - Lingora',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'auth/register',
    title: 'Register - Lingora',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'auth/forgot-password',
    title: 'Forgot Password - Lingora',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'auth/reset-password',
    title: 'Reset Password - Lingora',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'auth/change-password',
    title: 'Change password - Lingora',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent),
  },
  {
    path: 'workspace/create',
    title: 'Create Post - Lingora',
    canActivate: [authGuard],
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
    title: 'My Posts - Lingora',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/my-posts.component').then(m => m.MyPostsComponent),
  },
  {
    path: 'workspace/posts/:id/edit',
    title: 'Edit Post - Lingora',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/workspace/post-editor.component').then(m => m.PostEditorComponent),
  },
  {
    path: 'admin',
    title: 'Admin Panel - Lingora',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./shared/layouts/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        title: 'Admin Dashboard - Lingora',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        title: 'Manage Users - Lingora',
        loadComponent: () =>
          import('./features/admin/users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'languages',
        title: 'Manage Languages - Lingora',
        loadComponent: () =>
          import('./features/admin/languages/admin-languages.component').then(m => m.AdminLanguagesComponent),
      },
      {
        path: 'posts',
        title: 'Manage Posts - Lingora',
        loadComponent: () =>
          import('./features/admin/posts/admin-posts.component').then(m => m.AdminPostsComponent),
      },
      {
        path: 'categories',
        title: 'Manage Categories - Lingora',
        loadComponent: () =>
          import('./features/admin/categories/admin-categories.component').then(m => m.AdminCategoriesComponent),
      },
      {
        path: 'settings',
        title: 'Admin Settings - Lingora',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
        data: { settingsContext: 'admin' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
