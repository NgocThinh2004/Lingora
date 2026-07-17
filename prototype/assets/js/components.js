// ========================================================
// Lingora Global Component Interactivity & Search Modal
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Lingora Component Interactivity Initialized.');
  initSharedSidebars();
  initGlobalSearchModal();
});

/**
 * Unifies Left Sidebar, Right Panel, and Mobile Offcanvas across all guest pages.
 * Dynamically renders standard Substack navigation and widget blocks for 100% UI consistency.
 */
function initSharedSidebars() {

  const path = window.location.pathname.toLowerCase();
  const activeLanguage = typeof window.getLingoraLanguage === 'function'
    ? window.getLingoraLanguage()
    : (localStorage.getItem('preferredLanguage') || 'en');
  const currentFlagCode = ({ en: 'gb', vi: 'vn', zh: 'cn' })[activeLanguage] || 'gb';
  const currentLanguageName = ({ en: 'English', vi: 'Tiếng Việt', zh: '中文' })[activeLanguage] || 'English';
  let activePage = '';
  if (path.includes('index.html') || path.endsWith('/guest/') || path.endsWith('/guest')) activePage = 'home';
  else if (path.includes('subscriptions.html')) activePage = 'subscriptions';

  else if (path.includes('explore.html')) activePage = 'explore';
  else if (path.includes('post-detail.html')) activePage = 'post-detail';
  else if (path.includes('settings.html')) activePage = 'settings';
  else if (path.includes('about.html')) activePage = 'about';
  else if (path.includes('my-posts.html')) activePage = 'my-posts';
  else if (path.includes('profile.html')) activePage = 'profile';

  // 1. Render Left Sidebar
  const leftSidebarEl = document.querySelector('aside.left-sidebar');
  if (leftSidebarEl) {
    leftSidebarEl.innerHTML = `
      <div>
        <!-- Substack Logo -->
        <div class="substack-logo-container">
          <a href="index.html" class="text-decoration-none d-flex align-items-center gap-2">
            <i class="bi bi-bookmark-fill substack-logo"></i>
            <span class="fs-5 fw-bold text-main" style="letter-spacing: -0.02em;">Lingora</span>
          </a>
        </div>
        
        <!-- Navigation menu -->
        <nav class="sidebar-nav">
          <a href="index.html" class="sidebar-nav-item ${activePage === 'home' ? 'active' : ''}">
            <i class="bi bi-house-door-fill"></i> <span data-i18n="home">Home</span>
          </a>
          <a href="subscriptions.html" class="sidebar-nav-item ${activePage === 'subscriptions' ? 'active' : ''}">
            <i class="bi bi-person-lines-fill"></i> <span data-i18n="subscriptions">Subscriptions</span>
          </a>

          <a href="explore.html" class="sidebar-nav-item ${activePage === 'explore' ? 'active' : ''}">
            <i class="bi bi-compass-fill"></i> <span data-i18n="explore">Explore</span>
          </a>
          <a href="my-posts.html" class="sidebar-nav-item ${activePage === 'my-posts' ? 'active' : ''}">
            <i class="bi bi-journal-text"></i> <span data-i18n="my_articles">My Articles</span>
          </a>
          <a href="profile.html" class="sidebar-nav-item ${activePage === 'profile' ? 'active' : ''}">
            <i class="bi bi-person"></i> <span data-i18n="profile">Profile</span>
          </a>
        </nav>
        
        <a href="create-post.html?new=1" class="sidebar-create-btn">
          <span data-i18n="create">Create</span> <i class="bi bi-plus-lg"></i>
        </a>
      </div>
      
      <!-- Bottom Section: More Dropdown -->
      <div class="sidebar-footer-menu">
        <div class="sidebar-controls mb-2">
            <!-- Theme Switch and Language -->
            <div class="d-flex align-items-center justify-content-start gap-2 ps-3 pe-2 mb-2">
              <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="width: 38px; height: 38px; border-radius: 8px; border-color: var(--border-color);">
                  <img src="https://flagcdn.com/w20/${currentFlagCode}.png" width="24" height="18" id="sidebarLangFlag" data-current-language="${activeLanguage}" style="border-radius:2px; object-fit: cover;" alt="${currentLanguageName}" title="${currentLanguageName}">
                </button>
                <ul class="dropdown-menu shadow border-light-subtle" style="min-width: 120px; border-radius: 12px; font-size: 14px;">
                  <li><a class="dropdown-item py-1.5 fw-medium global-lang-select" href="#" data-lang="en"><img src="https://flagcdn.com/w20/gb.png" width="18" alt="English" class="me-2" style="border-radius:2px;"> English</a></li>
                  <li><a class="dropdown-item py-1.5 fw-medium global-lang-select" href="#" data-lang="vi"><img src="https://flagcdn.com/w20/vn.png" width="18" alt="Tiếng Việt" class="me-2" style="border-radius:2px;"> Tiếng Việt</a></li>
                  <li><a class="dropdown-item py-1.5 fw-medium global-lang-select" href="#" data-lang="zh"><img src="https://flagcdn.com/w20/cn.png" width="18" alt="中文" class="me-2" style="border-radius:2px;"> 中文</a></li>
                </ul>
              </div>
              <button class="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-0" id="sidebarThemeToggle" style="width: 38px; height: 38px; border-radius: 8px; border-color: var(--border-color); color: var(--text-main);" aria-label="Toggle theme">
                <i class="bi bi-moon-fill" id="sidebarThemeIcon" style="font-size: 17px;"></i>
              </button>
            </div>
          </div>
        <div class="dropdown">
          <button class="btn btn-link text-decoration-none text-main d-flex align-items-center gap-2 p-1.5 w-100 border-0 text-start" type="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-list fs-5"></i>
            <span class="fw-medium" data-i18n="more">More</span>
          </button>
          <ul class="dropdown-menu shadow border-light-subtle">
            <li><a class="dropdown-item py-2 ${activePage === 'settings' ? 'active' : ''}" href="settings.html"><i class="bi bi-gear me-2"></i> <span data-i18n="settings">Settings</span></a></li>
            <li><a class="dropdown-item py-2" href="admin/index.html" id="adminPanelLink"><i class="bi bi-speedometer2 me-2"></i> <span data-i18n="admin_panel">Admin Panel</span></a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item py-2 text-danger" href="#" id="signOutBtn"><i class="bi bi-box-arrow-right me-2"></i> <span data-i18n="sign_out">Sign Out</span></a></li>
          </ul>
        </div>
      </div>
    `;
  }

  // 2. Render Mobile Offcanvas Sidebar
  const mobileSidebarEl = document.getElementById('mobileSidebar');
  if (mobileSidebarEl) {
    mobileSidebarEl.innerHTML = `
      <div class="offcanvas-header border-bottom">
        <a href="index.html" class="text-decoration-none d-flex align-items-center gap-2">
          <i class="bi bi-bookmark-fill text-primary fs-4"></i>
          <span class="fs-5 fw-bold text-main" style="letter-spacing: -0.02em;">Lingora</span>
        </a>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body d-flex flex-column p-3">
        <!-- Mobile Search inside Sidebar -->
        <div class="d-lg-none mb-3">
          <div class="right-search-box w-100">
            <i class="bi bi-search"></i>
            <input type="text" id="mobileFeedSearchInput" placeholder="Search Lingora..." data-i18n="search_placeholder">
          </div>
        </div>

        <nav class="sidebar-nav mb-auto">
          <a href="index.html" class="sidebar-nav-item ${activePage === 'home' ? 'active' : ''}"><i class="bi bi-house-door-fill"></i> <span data-i18n="home">Home</span></a>
          <a href="subscriptions.html" class="sidebar-nav-item ${activePage === 'subscriptions' ? 'active' : ''}"><i class="bi bi-person-lines-fill"></i> <span data-i18n="subscriptions">Subscriptions</span></a>

          <a href="explore.html" class="sidebar-nav-item ${activePage === 'explore' ? 'active' : ''}"><i class="bi bi-compass-fill"></i> <span data-i18n="explore">Explore</span></a>
          <a href="my-posts.html" class="sidebar-nav-item ${activePage === 'my-posts' ? 'active' : ''}"><i class="bi bi-journal-text"></i> <span data-i18n="my_articles">My Articles</span></a>
          <a href="profile.html" class="sidebar-nav-item ${activePage === 'profile' ? 'active' : ''}"><i class="bi bi-person"></i> <span data-i18n="profile">Profile</span></a>
        </nav>

        <div class="border-top pt-3 mt-3">
        <div class="sidebar-controls mb-3">
            <!-- Theme Switch and Language -->
            <div class="d-flex align-items-center justify-content-center gap-2 px-1 mb-2">
              <div class="dropdown">
                <button class="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="width: 34px; height: 34px; border-radius: 8px; border-color: var(--border-color);">
                  <img src="https://flagcdn.com/w20/${currentFlagCode}.png" width="20" height="15" id="mobileLangFlag" data-current-language="${activeLanguage}" style="border-radius:2px; object-fit: cover;" alt="${currentLanguageName}" title="${currentLanguageName}">
                </button>
                <ul class="dropdown-menu shadow border-light-subtle" style="min-width: 120px; border-radius: 12px; font-size: 14px;">
                  <li><a class="dropdown-item py-1.5 fw-medium global-lang-select" href="#" data-lang="en"><img src="https://flagcdn.com/w20/gb.png" width="18" alt="English" class="me-2" style="border-radius:2px;"> English</a></li>
                  <li><a class="dropdown-item py-1.5 fw-medium global-lang-select" href="#" data-lang="vi"><img src="https://flagcdn.com/w20/vn.png" width="18" alt="Tiếng Việt" class="me-2" style="border-radius:2px;"> Tiếng Việt</a></li>
                  <li><a class="dropdown-item py-1.5 fw-medium global-lang-select" href="#" data-lang="zh"><img src="https://flagcdn.com/w20/cn.png" width="18" alt="中文" class="me-2" style="border-radius:2px;"> 中文</a></li>
                </ul>
              </div>
              <button class="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center p-0" id="mobileThemeToggle" style="width: 34px; height: 34px; border-radius: 8px; border-color: var(--border-color); color: var(--text-main);" aria-label="Toggle theme">
                <i class="bi bi-moon-fill" id="mobileThemeIcon" style="font-size: 15px;"></i>
              </button>
            </div>
          </div>
          <a href="settings.html" class="sidebar-nav-item mb-2 ${activePage === 'settings' ? 'active' : ''}"><i class="bi bi-gear"></i> <span data-i18n="settings">Settings</span></a>
          <a href="admin/index.html" class="sidebar-nav-item mb-2"><i class="bi bi-speedometer2"></i> <span data-i18n="admin_panel">Admin Panel</span></a>
          <a href="#" class="sidebar-nav-item text-danger"><i class="bi bi-box-arrow-right"></i> <span data-i18n="sign_out">Sign Out</span></a>
        </div>
      </div>
    `;
  }

  // 3. Render Right Panel (Shared across home.html and explore.html)
  const rightPanelEl = document.querySelector('aside.right-panel');
  if (rightPanelEl) {
    const showSearchBox = (activePage !== 'explore');
    rightPanelEl.innerHTML = `
      ${showSearchBox ? `
      <!-- Rounded Search bar -->
      <div class="right-search-box mb-4">
        <i class="bi bi-search"></i>
        <input type="search" id="feedSearchInput" placeholder="Search Lingora..." oninput="if(typeof filterFeedPosts === 'function'){filterFeedPosts(this.value)}" data-i18n="search_placeholder">
      </div>
      ` : ''}


      <!-- Recommended Authors Widget -->
      <div class="featured-authors-widget mb-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="fw-bold text-main mb-0" style="font-size: 0.85rem;" data-i18n="recommended">Recommended for You</h6>
        </div>
        <div class="featured-author-item">
          <div class="featured-author-info">
            <div class="position-relative author-tooltip-container" style="cursor: pointer;" onclick="window.location.href='profile.html?id=102'">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80" alt="Tuấn" class="featured-author-avatar">
              ${typeof window.getAuthorTooltipHtml === 'function' ? window.getAuthorTooltipHtml('Hồ Quốc Tuấn', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80') : ''}
            </div>
            <div class="featured-author-meta" style="cursor: pointer;" onclick="window.location.href='profile.html?id=102'">
              <span class="featured-author-name hover-text-primary">Hồ Quốc Tuấn</span>
              <span class="featured-author-count">Economics Author</span>
            </div>
          </div>
          <button class="btn-profile-view" onclick="window.location.href='profile.html?id=102'" data-i18n="view_profile">View Profile</button>
        </div>
        <div class="featured-author-item">
          <div class="featured-author-info">
            <div class="position-relative author-tooltip-container" style="cursor: pointer;" onclick="window.location.href='profile.html?id=101'">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80" alt="Elena" class="featured-author-avatar">
              ${typeof window.getAuthorTooltipHtml === 'function' ? window.getAuthorTooltipHtml('Elena Rostova', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80') : ''}
            </div>
            <div class="featured-author-meta" style="cursor: pointer;" onclick="window.location.href='profile.html?id=101'">
              <span class="featured-author-name hover-text-primary">Elena Rostova</span>
              <span class="featured-author-count">Economics Lead</span>
            </div>
          </div>
          <button class="btn-profile-view" onclick="window.location.href='profile.html?id=101'" data-i18n="view_profile">View Profile</button>
        </div>
        <div class="featured-author-item">
          <div class="featured-author-info">
            <div class="position-relative author-tooltip-container" style="cursor: pointer;" onclick="window.location.href='profile.html?id=103'">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80&h=80" alt="Li Ming" class="featured-author-avatar">
              ${typeof window.getAuthorTooltipHtml === 'function' ? window.getAuthorTooltipHtml('李明 (Li Ming)', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80&h=80') : ''}
            </div>
            <div class="featured-author-meta" style="cursor: pointer;" onclick="window.location.href='profile.html?id=103'">
              <span class="featured-author-name hover-text-primary">李明 (Li Ming)</span>
              <span class="featured-author-count">Tech Lead</span>
            </div>
          </div>
          <button class="btn-profile-view" onclick="window.location.href='profile.html?id=103'" data-i18n="view_profile">View Profile</button>
        </div>
      </div>
    `;
  }

  // 4. Bind Enter-key navigation on sidebar search boxes
  const bindSearchEnter = (inputEl) => {
    if (!inputEl) return;
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = inputEl.value.trim();
        if (window.location.pathname.toLowerCase().includes('explore.html')) {
          const mainSearch = document.getElementById('explorePageSearchInput');
          if (mainSearch) {
            mainSearch.value = query;
            mainSearch.dispatchEvent(new Event('input'));
            const newUrl = window.location.pathname + (query ? `?q=${encodeURIComponent(query)}` : '');
            window.history.pushState({path: newUrl}, '', newUrl);
            if (typeof renderExploreResults === 'function') {
              renderExploreResults(query, document.querySelector('.explore-tab-btn.active')?.getAttribute('data-tab') || 'recent');
            }
          }
        } else {
          window.location.href = `explore.html?q=${encodeURIComponent(query)}`;
        }
      }
    });
  };
  bindSearchEnter(document.getElementById('feedSearchInput'));
  bindSearchEnter(document.getElementById('mobileFeedSearchInput'));

  // 5. Apply translations to newly injected elements
  if (typeof window.applyUiTranslations === 'function') {
    window.applyUiTranslations();
  }
  if (typeof window.applyUserUI === 'function') {
    window.applyUserUI();
  }
  if (typeof window.renderTrendingWidgets === 'function') {
    window.renderTrendingWidgets();
  }

  // The sidebars above are rendered dynamically, so restore the persisted
  // language after injection instead of leaving their flags at the EN default.
  if (typeof window.updateGlobalFlags === 'function') {
    window.updateGlobalFlags(typeof window.getLingoraLanguage === 'function' ? window.getLingoraLanguage() : (localStorage.getItem('preferredLanguage') || 'en'));
  }
}

/**
 * Initializes interactive events for the Explore page search bar, tabs, and clear button.
 * Can be called on initial DOMContentLoaded OR after SPA smooth navigation.
 */
function initExplorePageInteractivity() {
  const searchInput = document.getElementById('explorePageSearchInput');
  const clearBtn = document.getElementById('exploreClearBtn');
  const tabBtns = document.querySelectorAll('.explore-tab-btn');

  if (!searchInput) return; // Not currently on explore page

  // Avoid double-binding if already initialized
  if (searchInput.getAttribute('data-initialized') === 'true') return;
  searchInput.setAttribute('data-initialized', 'true');

  const urlParams = new URLSearchParams(window.location.search);
  let currentQuery = (urlParams.get('q') || '').trim();
  let currentTab = document.querySelector('.explore-tab-btn.active')?.getAttribute('data-tab') || 'recent';

  if (currentQuery) {
    searchInput.value = currentQuery;
    if (clearBtn) clearBtn.classList.remove('d-none');
  }

  // Initial render if renderExploreResults exists
  if (typeof renderExploreResults === 'function') {
    renderExploreResults(currentQuery, currentTab);
  }

  // Input events for instant search
  searchInput.addEventListener('input', () => {
    currentQuery = searchInput.value.trim();
    if (clearBtn) {
      if (currentQuery.length > 0) {
        clearBtn.classList.remove('d-none');
      } else {
        clearBtn.classList.add('d-none');
      }
    }
    if (typeof renderExploreResults === 'function') {
      renderExploreResults(currentQuery, currentTab);
    }
  });

  // Enter key navigation
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      currentQuery = searchInput.value.trim();
      const newUrl = window.location.pathname + (currentQuery ? `?q=${encodeURIComponent(currentQuery)}` : '');
      window.history.pushState({path: newUrl}, '', newUrl);
      if (typeof renderExploreResults === 'function') {
        renderExploreResults(currentQuery, currentTab);
      }
    }
  });

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentQuery = '';
      clearBtn.classList.add('d-none');
      const newUrl = window.location.pathname;
      window.history.pushState({path: newUrl}, '', newUrl);
      if (typeof renderExploreResults === 'function') {
        renderExploreResults('', currentTab);
      }
      searchInput.focus();
    });
  }

  // Tab click events
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-tab');
      if (typeof renderExploreResults === 'function') {
        renderExploreResults(currentQuery, currentTab);
      }
    });
  });
}

/**
 * Initializes the Substack-style Global Search Modal Overlay.
 * Automatically creates DOM elements, binds keyboard shortcuts (Ctrl+K, ESC),
 * triggers from existing search boxes, and handles live instant search.
 */
function initGlobalSearchModal() {
  if (document.getElementById('globalSearchModal')) return;

  // 1. Build Modal DOM Structure
  const modalDiv = document.createElement('div');
  modalDiv.id = 'globalSearchModal';
  modalDiv.className = 'search-modal-backdrop';
  modalDiv.setAttribute('role', 'dialog');
  modalDiv.setAttribute('aria-modal', 'true');

  modalDiv.innerHTML = `
    <div class="search-modal-box" id="searchModalBox">
      <div class="search-modal-header">
        <i class="bi bi-search"></i>
        <input type="text" id="modalSearchInput" class="search-modal-input" placeholder="Search people, publications, or topics..." autocomplete="off">
        <button type="button" class="search-modal-close" id="modalSearchClose" aria-label="Clear text" style="display: none;">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div class="search-modal-body">
        <!-- Horizontally Scrollable Avatars & Topics -->
        <div id="modalPeopleContainer">
          <div class="search-section-title" id="modalSectionPeople" data-i18n="recommended_people">People & Publications</div>
          <div class="search-avatar-scroll" id="modalAvatarScroll">
            <a href="profile.html?id=101" class="search-avatar-item">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80" class="search-avatar-img" alt="Elena">
              <span class="search-avatar-label">Elena R.</span>
            </a>
            <a href="profile.html?id=103" class="search-avatar-item">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=80&h=80" class="search-avatar-img" alt="Li Ming">
              <span class="search-avatar-label">Li Ming</span>
            </a>
            <a href="profile.html?id=102" class="search-avatar-item">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80" class="search-avatar-img" alt="Tuấn">
              <span class="search-avatar-label">Tuấn Hồ</span>
            </a>
            <a href="profile.html?id=104" class="search-avatar-item">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=80&h=80" class="search-avatar-img" alt="Sarah">
              <span class="search-avatar-label">Sarah C.</span>
            </a>
            <a href="profile.html?id=105" class="search-avatar-item">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=80&h=80" class="search-avatar-img" alt="Alex">
              <span class="search-avatar-label">Alex R.</span>
            </a>
            <a href="profile.html?id=106" class="search-avatar-item">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=80&h=80" class="search-avatar-img" alt="Maya">
              <span class="search-avatar-label">Maya Lin</span>
            </a>
          </div>
        </div>

        

        <!-- Live Search Results (Hidden until typing) -->
        <div id="modalResultsContainer" style="display: none;">
          <div class="search-section-title" id="modalSectionResults">Search Results</div>
          <div class="search-results-list" id="modalResultsList"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalDiv);

  const searchInput = document.getElementById('modalSearchInput');
  const closeBtn = document.getElementById('modalSearchClose');
  const peopleContainer = document.getElementById('modalPeopleContainer');
  const resultsContainer = document.getElementById('modalResultsContainer');
  const resultsList = document.getElementById('modalResultsList');

  // 2. Modal Open / Close Controllers
  function openSearchModal() {
    modalDiv.classList.add('show');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    updateModalLanguage();
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  }

  function closeSearchModal() {
    modalDiv.classList.remove('show');
    document.body.style.overflow = '';
  }

  // 3. Global Shortcuts (Ctrl+K / Cmd+K / ESC)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openSearchModal();
    }
    if (e.key === 'Escape' && modalDiv.classList.contains('show')) {
      closeSearchModal();
    }
  });

  // Close on backdrop click or close button
  modalDiv.addEventListener('click', (e) => {
    if (e.target === modalDiv) {
      closeSearchModal();
    }
  });
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.focus();
    });
  }

  // Pressing Enter in modal search redirects to Explore page
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value.trim();
      closeSearchModal();
      if (window.location.pathname.toLowerCase().includes('explore.html')) {
        const mainSearch = document.getElementById('explorePageSearchInput');
        if (mainSearch) {
          mainSearch.value = query;
          mainSearch.dispatchEvent(new Event('input'));
          const newUrl = window.location.pathname + (query ? `?q=${encodeURIComponent(query)}` : '');
          window.history.pushState({path: newUrl}, '', newUrl);
          if (typeof renderExploreResults === 'function') {
            renderExploreResults(query, document.querySelector('.explore-tab-btn.active')?.getAttribute('data-tab') || 'recent');
          }
        }
      } else {
        window.location.href = `explore.html?q=${encodeURIComponent(query)}`;
      }
    }
  });

  // 4. Connect existing Sidebar/Header Search boxes to trigger or filter
  function bindSearchTriggers() {
    const isExplorePage = window.location.pathname.toLowerCase().includes('explore.html');

    document.querySelectorAll('.explore-search-input, #feedSearchInput').forEach(inputEl => {
      // On the explore page, the explore-specific input uses its own dropdown — skip modal
      if (isExplorePage && inputEl.id === 'explorePageSearchInput') return;
      inputEl.addEventListener('focus', (e) => {
        e.preventDefault();
        inputEl.blur();
        openSearchModal();
      });
    });

    // Also allow clicking the search container box itself
    document.querySelectorAll('.right-search-box, .explore-search-input-box').forEach(boxEl => {
      // On the explore page, the main search box (#exploreSearchBox) uses its own dropdown — skip modal
      if (isExplorePage && boxEl.id === 'exploreSearchBox') return;
      if (boxEl.id === 'subscribersSearchWrap') return;
      
      boxEl.style.cursor = 'pointer';
      boxEl.addEventListener('click', (e) => {
        e.preventDefault();
        openSearchModal();
      });
    });
  }

  bindSearchTriggers();

  // 5. Live Instant Search Engine (Queries window.globalPostsData or postsData)
  searchInput.addEventListener('input', () => {
    const rawValue = searchInput.value;
    const query = rawValue.trim().toLowerCase();
    
    if (rawValue.length > 0) {
      closeBtn.style.display = 'flex';
    } else {
      closeBtn.style.display = 'none';
    }

    if (!query) {
      if (peopleContainer) peopleContainer.style.display = 'block';
      
      resultsContainer.style.display = 'none';
      return;
    }

    if (peopleContainer) peopleContainer.style.display = 'none';
    
    resultsContainer.style.display = 'block';
    resultsList.innerHTML = '';

    const dataObj = window.getLingoraPostsData ? window.getLingoraPostsData() : (window.globalPostsData || (typeof postsData !== 'undefined' ? postsData : null));
    if (!dataObj) {
      resultsList.innerHTML = `<div class="text-muted p-3 text-center">No post data available.</div>`;
      return;
    }

    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (window.uiTranslations && window.uiTranslations[currentLang]) || (window.uiTranslations && window.uiTranslations.en) || {};
    const noResultsText = dict.no_results || "No matching results found.";

    let matchedPosts = [];
    Object.keys(dataObj).forEach(id => {
      const post = dataObj[id];
      
      // 1. Chỉ tìm kiếm các bài viết hỗ trợ ngôn ngữ đang chọn trong Setting
      if (post.supported_langs && !post.supported_langs.split(',').includes(currentLang)) {
        return;
      }
      if (typeof window.isCategoryTranslationActive === 'function' && !window.isCategoryTranslationActive(post.category, currentLang)) {
        return;
      }

      // 2. Chỉ lấy tiêu đề và nội dung đúng ngôn ngữ hiện tại (không fallback sang tiếng Anh)
      const title = post[`title_${currentLang}`] || "";
      const content = post[`content_${currentLang}`] || "";
      const author = post.author_name || "";
      const category = post.category || "";

      // Nếu bài viết không có tiêu đề và nội dung ở ngôn ngữ này thì bỏ qua
      if (!title && !content) return;

      // Check if query matches title, author, category, or content
      if (
        title.toLowerCase().includes(query) ||
        author.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query) ||
        content.toLowerCase().includes(query)
      ) {
        matchedPosts.push({ id, post, title, content, author, category });
      }
    });

    // Sắp xếp bài viết hot nhất (dựa trên views) và giới hạn 3 kết quả
    matchedPosts.sort((a, b) => (b.post.views || 0) - (a.post.views || 0));
    matchedPosts = matchedPosts.slice(0, 3);

    matchedPosts.forEach(({ id, post, title, content, author, category }) => {
      const itemEl = document.createElement('a');
      itemEl.href = `post-detail.html?id=${id}`;
      itemEl.className = 'search-result-item';
      itemEl.innerHTML = `
        <img src="${post.author_avatar}" class="search-result-avatar" alt="${author}">
        <div class="search-result-content">
          <div class="search-result-title">${title}</div>
          <div class="search-result-meta">
            <span><i class="bi bi-person-fill"></i> ${author}</span> &bull; 
            <span class="badge bg-secondary-subtle text-secondary border px-2 py-0 category-label" data-original-cat="${category}">${typeof window.translateCategory === 'function' ? window.translateCategory(category) : category}</span> &bull; 
            <span class="post-timestamp">${typeof window.formatTimestampI18n === 'function' ? window.formatTimestampI18n(post.timestamp) : post.timestamp}</span> &bull;
            <span><i class="bi bi-eye"></i> ${post.views || 300}</span>
          </div>
          <div class="search-result-snippet">${content.substring(0, 130)}...</div>
        </div>
      `;
      itemEl.addEventListener('click', () => {
        closeSearchModal();
      });
      resultsList.appendChild(itemEl);
    });

    if (matchedPosts.length === 0) {
      resultsList.innerHTML = `
        <div class="text-center py-4 text-muted">
          <i class="bi bi-search fs-2 d-block mb-2"></i>
          <span>${noResultsText}</span>
        </div>
      `;
    }
  });

  // 6. Language Translation helper for Modal
  function updateModalLanguage() {
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (window.uiTranslations && window.uiTranslations[currentLang]) || (window.uiTranslations && window.uiTranslations.en) || {};
    
    if (dict.search_placeholder_modal) {
      searchInput.setAttribute('placeholder', dict.search_placeholder_modal);
    }
    const peopleTitle = document.getElementById('modalSectionPeople');
    if (peopleTitle && dict.recommended_people) peopleTitle.textContent = dict.recommended_people;
    }
}

/**
 * Dynamically renders Trending Topics across right sidebar widgets and the Global Search Modal
 * directly from window.globalPostsData in the user's selected UI language.
 */
window.renderTrendingWidgets = function() {
  const currentLang = localStorage.getItem('preferredLanguage') || 'en';
  
  // Trending Topics (broad subject areas/themes in the platform) mapped to real content and localized
  const trendingTopicsData = [
    {
      query: "Rust",
      topic_en: "Rust & gRPC Microservices",
      topic_vi: "Microservices với Rust & gRPC",
      topic_zh: "Rust与gRPC微服务",
      cat_en: "Backend Engineering",
      cat_vi: "Kỹ thuật Backend",
      cat_zh: "后端开发",
      reads_en: "14.2k reads",
      reads_vi: "14.2k lượt đọc",
      reads_zh: "14.2k 次阅读"
    },
    {
      query: "AI",
      topic_en: "AI Agentic Coding",
      topic_vi: "Lập trình Tự động hóa với AI",
      topic_zh: "AI代理编程",
      cat_en: "Artificial Intelligence",
      cat_vi: "Trí tuệ nhân tạo",
      cat_zh: "人工智能",
      reads_en: "12.8k reads",
      reads_vi: "12.8k lượt đọc",
      reads_zh: "12.8k 次阅读"
    },
    {
      query: "Glassmorphism",
      topic_en: "Glassmorphism UI Principles",
      topic_vi: "Nguyên tắc Giao diện Glassmorphism",
      topic_zh: "毛玻璃UI设计原则",
      cat_en: "Design",
      cat_vi: "Thiết kế UI/UX",
      cat_zh: "界面设计",
      reads_en: "9.8k reads",
      reads_vi: "9.8k lượt đọc",
      reads_zh: "9.8k 次阅读"
    },
    {
      query: "Render",
      topic_en: "Modern Web Rendering Architectures",
      topic_vi: "Kiến trúc Render Web Hiện đại",
      topic_zh: "现代Web渲染架构",
      cat_en: "Backend Engineering",
      cat_vi: "Kỹ thuật Backend",
      cat_zh: "后端开发",
      reads_en: "8.5k reads",
      reads_vi: "8.5k lượt đọc",
      reads_zh: "8.5k 次阅读"
    },
    {
      query: currentLang === 'vi' ? "Màu sắc" : (currentLang === 'zh' ? "色彩" : "Color"),
      topic_en: "Color Psychology in Web Apps",
      topic_vi: "Tâm lý học Màu sắc trong App",
      topic_zh: "Web应用色彩心理学",
      cat_en: "Design",
      cat_vi: "Thiết kế UI/UX",
      cat_zh: "界面设计",
      reads_en: "6.4k reads",
      reads_vi: "6.4k lượt đọc",
      reads_zh: "6.4k 次阅读"
    }
  ];

  // 1. Update Sidebar & Explore Trending Widgets
  const dynamicCatViews = {};
  const publicPosts = window.getLingoraPostsData ? window.getLingoraPostsData() : window.globalPostsData;
  if (publicPosts) {
    Object.values(publicPosts).forEach(post => {
      if (post.supported_langs && !post.supported_langs.split(',').includes(currentLang)) return;
      const c = post.category || "General";
      if (typeof window.isCategoryTranslationActive === 'function' && !window.isCategoryTranslationActive(c, currentLang)) return;
      dynamicCatViews[c] = (dynamicCatViews[c] || 0) + (post.views || 0);
    });
  }

  document.querySelectorAll('.trending-widget-list').forEach(container => {
    let html = '';
    trendingTopicsData
      .filter(item => typeof window.isCategoryTranslationActive !== 'function' || window.isCategoryTranslationActive(item.cat_en, currentLang))
      .slice(0, 3)
      .forEach((item, index) => {
      const numStr = (index + 1) < 10 ? `0${index + 1}` : `${index + 1}`;
      const topicVal = item[`topic_${currentLang}`] || item.topic_en;
      const catVal = item[`cat_${currentLang}`] || item.cat_en;
      
      let readsVal = item[`reads_${currentLang}`] || item.reads_en;
      const totalViews = dynamicCatViews[item.cat_en];
      if (totalViews && totalViews > 0) {
        const viewStr = totalViews >= 1000 ? (totalViews/1000).toFixed(1) + 'k' : totalViews;
        if (currentLang === 'vi') readsVal = `${viewStr} lượt xem`;
        else if (currentLang === 'zh') readsVal = `${viewStr} 次阅读`;
        else readsVal = `${viewStr} views`;
      }

      html += `
        <div class="trending-item">
          <span class="trending-number">${numStr}</span>
          <div class="trending-info">
            <a href="explore.html?q=${encodeURIComponent(item.cat_en)}" class="trending-title">${topicVal}</a>
            <span class="trending-meta">${catVal} &bull; ${readsVal}</span>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  });

  // 2. Update Global Search Modal Trending List
  const modalList = document.getElementById('modalTrendingList');
  if (modalList) {
    let html = '';
    trendingTopicsData.forEach(item => {
      const topicVal = item[`topic_${currentLang}`] || item.topic_en;
      html += `
        <div class="search-trending-item" data-query="${item.query}">
          <i class="bi bi-graph-up-arrow"></i> <span>${topicVal}</span>
        </div>
      `;
    });
    modalList.innerHTML = html;

    // Rebind click events for modal trending items
    const searchInput = document.getElementById('modalSearchInput');
    if (searchInput) {
      modalList.querySelectorAll('.search-trending-item').forEach(item => {
        item.addEventListener('click', () => {
          const q = item.getAttribute('data-query');
          if (q) {
            searchInput.value = q;
            searchInput.dispatchEvent(new Event('input'));
          }
        });
      });
    }
  }
};

// Auto run on load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    }, 100);
});

window.renderFeedPosts = function(containerId, dataObj, categoryFilter = 'all', options = {}) {
  const container = document.getElementById(containerId);
  if (!container || !dataObj) return;

  const currentLang = localStorage.getItem('preferredLanguage') || 'en';
  let html = '';

  Object.keys(dataObj).forEach(id => {
    const post = dataObj[id];
    const detailHref = post.detail_href || `post-detail.html?id=${encodeURIComponent(id)}`;
    const authorHref = post.profile_href
      || (typeof window.getAuthorProfileHref === 'function' ? window.getAuthorProfileHref(post.author_name, post.author_avatar) : '')
      || `profile.html?id=${encodeURIComponent(post.author_id || '')}`;
    const translatedCategory = typeof window.translateCategory === 'function' ? window.translateCategory(post.category) : post.category;
    const categoryDisplay = translatedCategory || post.categoryLabel || post.category || 'General';
    
    // Support languages check
    const supportedLangs = post.supported_langs ? post.supported_langs.split(',') : ['en', 'vi', 'zh'];
    if (!supportedLangs.includes(currentLang)) return;

    // A post must not expose a category translation that an admin disabled.
    if (!options.includeInactiveCategories && typeof window.isCategoryTranslationActive === 'function' && !window.isCategoryTranslationActive(post.category, currentLang)) return;

    // Category filter check
    if (categoryFilter !== 'all' && post.category !== categoryFilter) return;

    html += `
    <article class="substack-post" data-supported-langs="${post.supported_langs || 'en,vi,zh'}" data-category="${post.category || 'Artificial Intelligence'}"${options.includeInactiveCategories ? ' data-include-inactive-category="true"' : ''}>
      <div class="substack-post-header">
        <div class="author-badge-group position-relative author-tooltip-container" style="cursor: pointer; z-index: 2;" onclick="window.location.href='${authorHref}'">
          <img src="${post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=80&h=80'}" alt="${post.author_name}" class="author-avatar">
          <div class="author-meta-info">
            <span class="author-name hover-text-primary fw-bold" style="color: var(--text-main);">${post.author_name || 'Anonymous'}</span>
            <span class="post-timestamp" data-original-ts="${post.timestamp || 'Just now'}">${post.timestamp || 'Just now'}</span>
          </div>
          <!-- Author Hover Card Tooltip -->
          ${typeof window.getAuthorTooltipHtml === 'function' ? window.getAuthorTooltipHtml(post.author_name, post.author_avatar) : ''}
        </div>
      </div>
      <div class="mt-2 mb-1">
        <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2 py-1 category-label"
          data-original-cat="${post.category || categoryDisplay}"
          data-category-fallback="${categoryDisplay}">${categoryDisplay}</span>
      </div>
      <a href="${detailHref}" class="text-decoration-none text-reset d-block">
        <h2 class="post-title h4 fw-bold mt-2 mb-1" 
            data-translate-title-en="${(post.title_en || '').replace(/"/g, '&quot;')}"
            data-translate-title-vi="${(post.title_vi || post.title_en || '').replace(/"/g, '&quot;')}"
            data-translate-title-zh="${(post.title_zh || post.title_en || '').replace(/"/g, '&quot;')}">
          ${post.title_en || 'Untitled'}
        </h2>
        <div class="substack-post-content post-content"
             data-translate-content-en="${(post.content_en || '').replace(/"/g, '&quot;')}"
             data-translate-content-vi="${(post.content_vi || post.content_en || '').replace(/"/g, '&quot;')}"
             data-translate-content-zh="${(post.content_zh || post.content_en || '').replace(/"/g, '&quot;')}">
          ${post.content_en || ''}
        </div>
      </a>
      ${(post.video || post.image) ? (
        ((post.video || post.image).toLowerCase().endsWith('.mp4') || (post.video || post.image).toLowerCase().includes('.mp4') || (post.video || post.image).toLowerCase().includes('/video/upload/'))
        ? `<div class="post-image-embed" style="background-color: #000000; display: flex; align-items: center; justify-content: center; max-height: 360px; height: 360px; overflow: hidden;"><video src="${post.video || post.image}" muted playsinline ${localStorage.getItem('autoPlayMedia') !== 'false' ? 'autoplay' : ''} loop controls style="width: 100%; height: 100%; object-fit: contain; background-color: #000000;"></video></div>`
        : `<a href="${detailHref}" class="text-decoration-none text-reset d-block"><div class="post-image-embed"><img src="${post.image}" alt="Post cover"></div></a>`
      ) : ''}
      <div class="substack-post-footer">
        <button class="footer-action-item" onclick="if(typeof toggleLike==='function'){toggleLike(this, ${post.likes || 0})}"><i class="bi bi-heart"></i> <span class="like-count">${post.likes || 0}</span></button>
        <button class="footer-action-item" onclick="window.location.href='${detailHref}#comments'"><i class="bi bi-chat"></i> <span>${post.comments || 0}</span></button>
        <span class="footer-action-item"><i class="bi bi-eye"></i> <span>${post.views || 0}</span></span>
      </div>
    </article>`;
  });

  if (!html) {
    // If no posts match the category
    const currentLang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = (window.uiTranslations && window.uiTranslations[currentLang]) || {};
    html = `<div class="text-center text-muted p-4"><i class="bi bi-inbox fs-1"></i><p class="mt-2">${dict.no_results || 'No posts available in this category.'}</p></div>`;
  }

  container.innerHTML = html;

  // Apply translations to the newly generated HTML
  if (typeof applyUiTranslations === 'function') {
    applyUiTranslations(currentLang);
  }

  // Ensure all videos autoplay and are muted properly
  if (typeof window.playAllVideosGlobal === 'function') {
    window.playAllVideosGlobal();
  } else {
    const isAutoPlay = localStorage.getItem('autoPlayMedia') !== 'false';
    container.querySelectorAll('video').forEach(video => {
      video.muted = true;
      if (isAutoPlay) {
        video.play().catch(err => console.log('Autoplay play() error:', err));
      }
    });
  }
};

/**
 * Global function to handle Subscribe button interactions.
 * This simulates subscribing to an author.
 */
window.toggleSubscribe = function(btn, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  if (typeof window.checkAuthOrSimulate === 'function' && !window.checkAuthOrSimulate()) return;

  const isSubscribed = btn.classList.toggle('subscribed');
  const authorName = String(btn.dataset.authorName || btn.closest('[data-author-name]')?.dataset.authorName || '').trim();
  if (authorName) {
    const list = typeof window.getLingoraSubscribedAuthors === 'function'
      ? window.getLingoraSubscribedAuthors()
      : (() => { try { return JSON.parse(localStorage.getItem('lingoraSubscribedAuthors') || '[]'); } catch (_) { return []; } })();
    const next = Array.isArray(list) ? list.filter(name => name !== authorName) : [];
    if (isSubscribed) next.push(authorName);
    localStorage.setItem('lingoraSubscribedAuthors', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('lingora:subscriptionschange', { detail: { authors: next } }));
  }
  const currentLang = localStorage.getItem('preferredLanguage') || 'en';
  const dict = (window.uiTranslations && window.uiTranslations[currentLang]) || {};
  const unfollowLabels = { en: 'Unfollow', vi: 'Bỏ theo dõi', zh: '取消关注' };

  if (isSubscribed) {
    const followingText = dict.btn_following || dict.following || 'Following';
    btn.innerHTML = `<span class="btn-subscribe-label">${followingText}</span>`;
    btn.setAttribute('data-unfollow-label', unfollowLabels[currentLang] || unfollowLabels.en);
  } else {
    const isAuthorCard = btn.classList.contains('px-5') || btn.getAttribute('data-btn-type') === 'author';
    const followText = isAuthorCard
      ? (dict.subscribe_author || dict.btn_follow || 'Follow')
      : (dict.btn_follow || dict.subscribe || 'Follow');
    btn.innerHTML = `<span class="btn-subscribe-label">${followText}</span>`;
  }
};

// Global Unified Autoplay & Mute Recovery Manager
(function() {
  function playAllVideos() {
    const isAutoPlay = localStorage.getItem('autoPlayMedia') !== 'false';
    document.querySelectorAll('video').forEach(video => {
      // Force muted, playsinline, and attempt play
      video.muted = true;
      if (isAutoPlay && video.hasAttribute('autoplay')) {
        if (video.paused && !video.dataset.userPaused) {
          video.play().catch(e => {
            // Silent catch to prevent console spam from browser policy blocks
          });
        }
      }
    });
  }

  // Track manual user pauses to prevent scrolling from overwriting their choice
  document.addEventListener('pause', (e) => {
    if (e.target.tagName === 'VIDEO') {
      e.target.dataset.userPaused = "true";
    }
  }, true);

  document.addEventListener('play', (e) => {
    if (e.target.tagName === 'VIDEO') {
      e.target.dataset.userPaused = "false";
    }
  }, true);

  // Expose it globally so other scripts/pages can force play
  window.playAllVideosGlobal = playAllVideos;

  // Use capture phase (true) on window to run before any event.stopPropagation() is called
  window.addEventListener('click', playAllVideos, { capture: true, passive: true });
  window.addEventListener('touchstart', playAllVideos, { capture: true, passive: true });
  window.addEventListener('scroll', playAllVideos, { capture: true, passive: true });
  window.addEventListener('keydown', playAllVideos, { capture: true, passive: true });

  // Fallbacks for load and pageshow
  window.addEventListener('load', playAllVideos);
  window.addEventListener('pageshow', playAllVideos);
})();
