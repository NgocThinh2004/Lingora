import { Component, OnDestroy, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PostsService } from '../../core/services/posts.service';
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
  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(PostsService);

  commentDraft = '';
  liked = false;
  likes = 0;
  comments: Array<{ author: string; text: string; time: string }> = [];
  loading = true;
  error = '';
  post: DetailPost = {
    author: '', avatar: '/assets/images/lingora-mark.svg', category: '', title: '', summary: '', content: '', date: '', views: 0,
  };

  ngOnInit(): void {
    this.ui.mount('Lingora - Post Details');
    const postId = this.route.snapshot.queryParamMap.get('id');
    if (!postId) {
      this.error = 'Post id is missing.';
      this.loading = false;
      return;
    }
    this.postsService.getPublicPost(postId).subscribe({
      next: post => {
        const source = post.translations.find(item => item.languageId === post.originalLanguageId) ?? post.translations[0];
        this.post = {
          author: post.author.displayName || post.author.username,
          avatar: post.author.avatarUrl || '/assets/images/lingora-mark.svg',
          category: post.categoryId ? `Category ${post.categoryId}` : 'Uncategorized',
          title: source?.title || 'Untitled',
          summary: source?.summary || '',
          content: source?.content || '',
          date: new Date(post.publishedAt || post.updatedAt).toLocaleDateString(),
          views: post.viewCount,
        };
        this.likes = post.likeCount;
        this.loading = false;
      },
      error: () => {
        this.error = 'The requested post could not be loaded.';
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void { this.ui.unmount(); }
  updateComment(event: Event): void { this.commentDraft = (event.target as HTMLTextAreaElement).value; }
  submitComment(): void { this.error = 'Comments are not available until the comments API is connected.'; }
  toggleLike(): void { this.liked = !this.liked; }
}

interface DetailPost {
  author: string;
  avatar: string;
  category: string;
  title: string;
  summary: string;
  content: string;
  date: string;
  views: number;
}
