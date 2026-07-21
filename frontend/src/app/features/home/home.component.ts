import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="d-flex flex-column justify-content-center align-items-center vh-100 bg-body">
      <div class="text-center p-5 rounded-4 shadow-sm" style="background: var(--bg-panel); border: 1px solid var(--border-color);">
        <img src="assets/images/lingora-mark.svg" alt="Lingora Logo" width="60" class="mb-4">
        <h1 class="fw-bold mb-3">Welcome to Lingora Dashboard!</h1>
        <p class="text-muted mb-4">You have successfully logged in.</p>
        <button class="btn btn-outline-danger px-4 rounded-pill fw-semibold" (click)="logout()">Logout</button>
      </div>
    </div>
  `,
  styles: ``
})
export class HomeComponent {
  constructor(
    public authService: AuthService,
    private readonly router: Router,
  ) {}

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => void this.router.navigate(['/auth/login']),
    });
  }
}
