import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageShellService } from '../../core/ui/page-shell.service';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { Subject, Subscription } from 'rxjs';

interface ExploreResult {
  type: 'posts' | 'people';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  item: any;
}

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [SidebarComponent, CommonModule, RouterLink, PostCardComponent],
  templateUrl: './explore.component.html',
})
export class ExploreComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('stickyHeader') stickyHeaderRef!: ElementRef<HTMLElement>;
  private observer?: IntersectionObserver;

  private readonly pageShell = inject(PageShellService);
  private readonly feedService = inject(FeedPostsService);

  query = '';
  tab: 'top' | 'posts' | 'publications' | 'people' = 'top';

  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  loading = false;
  results: ExploreResult[] = [];
  
  get visibleResults() {
    if (this.tab === 'top') return this.results;
    return this.results.filter((r) => r.type === this.tab);
  }

  ngOnInit() {
    this.pageShell.setTitle('Khám phá');
    
    this.searchSubscription = this.searchSubject.subscribe((q) => {
      this.fetchResults(q);
    });
    
    this.fetchResults('');
  }

  ngAfterViewInit() {
    this.setupStickyHeaderObserver();
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupStickyHeaderObserver() {
    if (!this.stickyHeaderRef) return;
    
    this.observer = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio < 1) {
          e.target.classList.add('is-pinned');
        } else {
          e.target.classList.remove('is-pinned');
        }
      },
      { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
    );
    this.observer.observe(this.stickyHeaderRef.nativeElement);
  }

  updateQuery(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.query = val;
    this.searchSubject.next(val);
  }

  clearQuery() {
    this.query = '';
    this.searchSubject.next('');
  }

  setTab(t: typeof this.tab) {
    this.tab = t;
  }

  private fetchResults(q: string) {
    this.loading = true;
    this.feedService.list({ search: q, limit: 20 }).subscribe({
      next: (response) => {
        const postResults: ExploreResult[] = response.items.map((post) => ({
          type: 'posts',
          id: post.id.toString(),
          title: post.title,
          subtitle: `Bài viết của ${post.author?.name || 'Ẩn danh'}`,
          href: `/post/${post.id}`,
          icon: 'bi-file-text',
          item: post,
        }));
        this.results = postResults;
        this.loading = false;
      },
      error: () => {
        this.results = [];
        this.loading = false;
      },
    });
  }

  translateCategoryName(pub: any): string {
    return pub.name || 'Không xác định';
  }
}
