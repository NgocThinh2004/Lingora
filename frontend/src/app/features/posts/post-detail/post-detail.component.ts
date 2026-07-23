import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PostService } from '../services/post.service';
import { Post, getPostTranslation } from '../models/post.model';
import { LocaleService } from '../../../core/services/locale.service';
import { Title } from '@angular/platform-browser';
import { CommentSectionComponent } from '../components/comment-section/comment-section.component';
import { LikeService } from '../services/like.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, CommentSectionComponent],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss']
})
export class PostDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private postService = inject(PostService);
  private localeService = inject(LocaleService);
  private titleService = inject(Title);
  private likeService = inject(LikeService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  post = signal<Post | null>(null);
  relatedPosts = signal<Post[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Computed signal to automatically update translation when language changes
  displayedTranslation = computed(() => {
    const currentPost = this.post();
    if (!currentPost) return null;
    return getPostTranslation(currentPost, this.localeService.selectedLocale());
  });

  isVideo = computed(() => {
    const currentPost = this.post();
    if (!currentPost) return false;
    const url = currentPost.videoUrl || currentPost.imageUrl || '';
    return /\.mp4(\?|$)/i.test(url) || url.includes('/video/upload/');
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadPost(Number(id));
      }
    });
  }

  private loadPost(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.postService.getById(id).subscribe({
      next: (data) => {
        this.post.set(data);
        this.loading.set(false);
        const title = this.displayedTranslation()?.title;
        if (title) this.titleService.setTitle(`${title} - Lingora`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Fetch related posts
        this.postService.getRelated(id).subscribe({
          next: (relatedData) => {
            this.relatedPosts.set(relatedData);
          },
          error: (err) => {
            console.error('Error loading related posts:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error loading post:', err);
        this.error.set('Could not load post details. Please try again later.');
        this.loading.set(false);
      }
    });
  }

  toggleLike(): void {
    const p = this.post();
    if (!p) return;
    
    if (!this.authService.isAuthenticated()) {
      this.toast.show('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    this.likeService.togglePostLike(p.id).subscribe((status) => {
      this.post.set({ ...p, liked: status.liked, likeCount: status.likeCount });
    });
  }

  getPostTranslationByLocale(p: Post): any {
    return getPostTranslation(p, this.localeService.selectedLocale());
  }
}
