import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { AppSidebarComponent } from '../../shared/components/app-sidebar.component';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [AppSidebarComponent],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class PostDetailComponent implements OnInit, OnDestroy {
  private readonly ui = inject(UiPreferencesService);

  commentDraft = '';
  liked = false;
  likes = 128;
  comments: Array<{ author: string; text: string; time: string }> = [];
  readonly post = {
    author: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80',
    category: 'Artificial Intelligence',
    title: 'How AI is changing the way we build software',
    summary: 'A practical look at modern AI-assisted workflows and what they mean for product teams.',
    date: 'July 21, 2026',
    views: 1840,
  };

  ngOnInit(): void {
    this.ui.mount('Lingora - Post Details');
  }

  ngOnDestroy(): void {
    this.ui.unmount();
  }

  updateComment(event: Event): void {
    this.commentDraft = (event.target as HTMLTextAreaElement).value;
  }

  submitComment(): void {
    const text = this.commentDraft.trim();
    if (!text) return;
    this.comments.unshift({ author: 'Alone', text, time: 'Just now' });
    this.commentDraft = '';
  }

  toggleLike(): void {
    this.liked = !this.liked;
    this.likes += this.liked ? 1 : -1;
  }
}
