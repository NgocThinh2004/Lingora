import { Component, OnDestroy, OnInit, AfterViewInit, ElementRef, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, Subscription, forkJoin, map } from 'rxjs';
import { FeedPostsService } from '../posts/services/feed-posts.service';
import { UsersService } from '../users/services/users.service';
import { CategoriesService } from '../categories/services/categories.service';
import { translateCategory, Category } from '../categories/models/category.model';
import { PageShellService } from '../../core/ui/page-shell.service';
import { CommonModule } from '@angular/common';
import { PostCardComponent } from '../posts/components/post-card/post-card.component';
import { User } from '../users/models/user.model';
import { Post } from '../posts/models/post.model';
import { FormsModule } from '@angular/forms';
import { AuthorTooltipComponent } from '../../shared/components/author-tooltip/author-tooltip.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink, PostCardComponent, FormsModule, AuthorTooltipComponent],
  templateUrl: './explore.component.html',
  styleUrl: './explore.component.scss'
})
export class ExploreComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('stickyHeader') stickyHeaderRef!: ElementRef<HTMLElement>;
  private observer?: IntersectionObserver;
  
  private readonly ui = inject(PageShellService);
  private readonly postsService = inject(FeedPostsService);
  private readonly userService = inject(UsersService);
  private readonly categoryService = inject(CategoriesService);

  query = '';
  tab: 'top' | 'posts' | 'publications' | 'people' = 'top';
  
  // Results
  topPosts: Post[] = [];
  featuredPeople: User[] = [];
  featuredPublications: Category[] = [];
  
  posts: Post[] = [];
  people: User[] = [];
  publications: Category[] = [];

  loading = false;
  error = '';

  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  ngAfterViewInit() {
    if (this.stickyHeaderRef) {
      const sentinel = document.createElement('div');
      this.stickyHeaderRef.nativeElement.parentElement?.insertBefore(
        sentinel, this.stickyHeaderRef.nativeElement
      );
      this.observer = new IntersectionObserver(
        ([entry]) => {
          this.stickyHeaderRef.nativeElement.classList.toggle('is-stuck', !entry.isIntersecting);
        },
        { threshold: 1 }
      );
      this.observer.observe(sentinel);
    }
  }

  ngOnInit(): void {
    this.ui.mount('Lingora - Explore');
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.executeSearch();
    });
    
    this.executeSearch();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.ui.unmount();
    this.searchSubscription?.unsubscribe();
  }

  updateQuery(event: Event): void {
    this.query = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.query);
  }

  clearQuery(): void {
    this.query = '';
    this.searchSubject.next(this.query);
  }

  setTab(tab: 'top' | 'posts' | 'publications' | 'people'): void {
    if (this.tab !== tab) {
      this.tab = tab;
      this.executeSearch();
    }
  }

  executeSearch(): void {
    this.loading = true;
    this.error = '';
    const q = this.query.trim().toLowerCase();

    if (this.tab === 'top') {
      const postsReq = this.postsService.list({ q: q, limit: 10 }).pipe(map(res => res.items));
      
      // Fallback search logic since UsersService in develop doesn't have search() endpoint yet
      const peopleReq = this.userService.getRecommended().pipe(
        map(users => q ? users.filter(u => u.name?.toLowerCase().includes(q) || u.handle?.toLowerCase().includes(q)) : users)
      );
      
      const pubsReq = this.categoryService.findAll();

      forkJoin({ posts: postsReq, people: peopleReq, pubs: pubsReq }).subscribe({
        next: (res) => {
          this.topPosts = res.posts;
          this.featuredPeople = res.people.slice(0, 2);
          
          let filteredPubs = res.pubs;
          if (q) {
            filteredPubs = filteredPubs.filter(c => 
              translateCategory(c, 'vi').toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
            );
          }
          this.featuredPublications = filteredPubs.slice(0, 2);
          this.loading = false;
        },
        error: () => this.handleError()
      });
    } else if (this.tab === 'posts') {
      this.postsService.list({ q: q, limit: 20 }).subscribe({
        next: (res) => {
          this.posts = res.items;
          this.loading = false;
        },
        error: () => this.handleError()
      });
    } else if (this.tab === 'people') {
      const peopleReq = this.userService.getRecommended().pipe(
        map(users => q ? users.filter(u => u.name?.toLowerCase().includes(q) || u.handle?.toLowerCase().includes(q)) : users)
      );
      
      peopleReq.subscribe({
        next: (users) => {
          this.people = users;
          this.loading = false;
        },
        error: () => this.handleError()
      });
    } else if (this.tab === 'publications') {
      this.categoryService.findAll().subscribe({
        next: (categories) => {
          this.publications = q ? categories.filter(c => 
            translateCategory(c, 'vi').toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
          ) : categories;
          this.loading = false;
        },
        error: () => this.handleError()
      });
    }
  }
  
  translateCategoryName(cat: Category): string {
    return translateCategory(cat, 'vi');
  }

  private handleError(): void {
    this.error = 'Unable to load explore data.';
    this.loading = false;
  }
}
