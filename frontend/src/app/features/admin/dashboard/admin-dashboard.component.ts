import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent {
  readonly stats = [
    { label: 'Total Users', icon: 'bi-people-fill' },
    { label: 'Total Articles', icon: 'bi-journal-text' },
    { label: 'Total Comments', icon: 'bi-chat-dots-fill' },
    { label: 'Total Likes', icon: 'bi-heart-fill' }
  ];

  readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly viewsChart = [30, 45, 60, 40, 80, 65, 90];
  readonly growthChart = [10, 30, 20, 60, 40, 80, 100];
  readonly categories = [
    { name: 'AI & Automation', percentage: 40, opacity: 1 },
    { name: 'Web Development', percentage: 35, opacity: 0.8 },
    { name: 'UI/UX Design', percentage: 25, opacity: 0.5 }
  ];
}
