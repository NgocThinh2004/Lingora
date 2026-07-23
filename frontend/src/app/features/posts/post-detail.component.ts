import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageShellService } from '../../core/ui/page-shell.service';
import { FeedPostsService } from './services/feed-posts.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './post-detail.component.html',
})
export class PostDetailComponent implements OnInit, OnDestroy {
  private readonly ui = inject(PageShellService);
  private readonly route = inject(ActivatedRoute);
  private readonly postsService = inject(FeedPostsService);

  commentDraft = '';
  liked = false;
  likes = 0;
  comments: Array<{ author: string; text: string; time: string }> = [];
  loading = true;
  error = '';
  post: DetailPost = {
    author: '', avatar: '/assets/images/lingora-mark.svg', category: '', title: '', content: '', date: '', views: 0,
  };

  ngOnInit(): void {
    this.ui.mount('Lingora - Post Details');
    const postId = this.route.snapshot.paramMap.get('id')
      || this.route.snapshot.queryParamMap.get('id');
    if (!postId) {
      this.error = 'Post id is missing.';
      this.loading = false;
      return;
    }
    const numericPostId = Number(postId);
    if (!Number.isInteger(numericPostId) || numericPostId <= 0) {
      this.error = 'Post id is invalid.';
      this.loading = false;
      return;
    }
    this.postsService.getById(numericPostId).subscribe({
      next: post => {
        const source = post.translations.find(item => item.languageCode === post.originalLanguage) ?? post.translations[0];
        this.post = {
          author: post.author.name || post.author.handle,
          avatar: post.author.avatarUrl || '/assets/images/lingora-mark.svg',
          category: post.category?.translations[0]?.name || post.category?.slug || 'Uncategorized',
          title: source?.title || 'Untitled',
          content: source?.contentHtml || '',
          date: new Date(post.createdAt).toLocaleDateString(),
          views: post.viewCount,
        };
        this.likes = post.likeCount || 0;
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
  content: string;
  date: string;
  views: number;
}
