document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('postBody');
  if (!editor) return;

  const toolbar = document.querySelector('.editor-toolbar');
  const imageInput = document.getElementById('editorImageInput');
  const audioInput = document.getElementById('editorAudioInput');
  const videoInput = document.getElementById('editorVideoInput');
  const titleInput = document.getElementById('postTitle');
  const titleLimit = document.getElementById('postTitleLimit');
  const bodyLimit = document.getElementById('postBodyLimit');
  const saveButton = document.getElementById('saveButton');
  const saveLabel = saveButton ? saveButton.querySelector('[data-save-label]') : null;
  const previewButtons = document.querySelectorAll('[data-preview-button]');
  const continueButton = document.querySelector('[data-publish-button]');
  const publishModal = document.querySelector('[data-publish-modal]');
  const originalLanguageSelect = publishModal ? publishModal.querySelector('#original_language') : null;
  const originalLanguageDisplay = publishModal ? publishModal.querySelector('[data-original-language-display]') : null;
  const draftConfirmModal = document.querySelector('[data-draft-modal]');
  const authorRow = document.querySelector('[data-author-row]');
  const previewModal = document.querySelector('[data-preview-modal]');
  const previewDevice = previewModal ? previewModal.querySelector('[data-preview-device]') : null;
  const previewModeButtons = previewModal ? previewModal.querySelectorAll('[data-preview-mode]') : [];
  const previewLanguageSelect = previewModal ? previewModal.querySelector('[data-preview-language]') : null;
  const previewTranslationStatus = previewModal ? previewModal.querySelector('[data-preview-translation-status]') : null;
  const previewTitle = previewModal ? previewModal.querySelector('[data-preview-title]') : null;
  const previewBody = previewModal ? previewModal.querySelector('[data-preview-body]') : null;
  const previewAuthor = previewModal ? previewModal.querySelector('[data-preview-author]') : null;
  const previewAvatar = previewModal ? previewModal.querySelector('[data-preview-avatar]') : null;
  const previewDate = previewModal ? previewModal.querySelector('[data-preview-date]') : null;
  const previewShareButton = previewModal ? previewModal.querySelector('[data-share-preview]') : null;
  const linkModal = document.querySelector('[data-link-modal]');
  const linkForm = linkModal ? linkModal.querySelector('[data-link-form]') : null;
  const linkTextInput = linkModal ? linkModal.querySelector('[data-link-text-input]') : null;
  const linkUrlInput = linkModal ? linkModal.querySelector('[data-link-url-input]') : null;
  const linkBubble = document.querySelector('[data-link-bubble]');
  const linkBubbleUrl = linkBubble ? linkBubble.querySelector('[data-link-bubble-url]') : null;
  const draftKey = 'mundiBlogCreatePostDraft';
  const previewLanguageKey = 'mundiBlogPreviewLanguage';
  const submittedPostsKey = 'mundiBlogSubmittedPosts';
  const pageParams = new URLSearchParams(window.location.search);
  const submittedPostId = pageParams.get('submitted');
  const backLink = document.querySelector('[data-back-link]');
  const inlineCodeClass = 'editor-inline-code-font';
  const zeroWidthSpace = '\u200B';
  const wordLimits = { title: 20, body: 3000 };
  const maxCharactersPerWordUnit = 30;
  const limitTranslations = {
    en: { words: 'words', bodyOver: 'The post exceeds the 3,000-word limit.' },
    vi: { words: 'từ', bodyOver: 'Bài viết đã vượt giới hạn 3.000 từ.' },
    zh: { words: '字词', bodyOver: '文章已超过 3,000 字词的限制。' }
  };

  let savedRange = null;
  let activeBaselineFormat = 'normal';
  let activePreviewDraft = null;
  let previewRenderToken = 0;
  let pendingLinkDraft = null;
  let activeLinkElement = null;
  const previewTranslationCache = new Map();
  const previewLanguages = new Set(['original', 'en', 'vi', 'zh']);
  const previewLanguageLabels = {
    original: 'Original',
    en: 'English',
    vi: 'Tiếng Việt',
    zh: '中文'
  };
  const previewFallbackText = {
    original: { untitled: 'Untitled post', empty: 'No content yet.', ready: 'Original' },
    en: { untitled: 'Untitled post', empty: 'No content yet.', ready: 'English' },
    vi: { untitled: 'Chưa có tiêu đề', empty: 'Chưa có nội dung.', ready: 'Tiếng Việt' },
    zh: { untitled: '未命名', empty: '暂无内容。', ready: '中文' }
  };

  if (previewLanguageSelect) {
    const savedPreviewLanguage = localStorage.getItem(previewLanguageKey);
    previewLanguageSelect.value = previewLanguages.has(savedPreviewLanguage) ? savedPreviewLanguage : 'original';
  }

  function getLimitCopy() {
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    return limitTranslations[lang] || limitTranslations.en;
  }

  function getWordSegments(text) {
    const value = String(text || '');
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
      return Array.from(segmenter.segment(value)).filter(part => part.isWordLike);
    }
    return Array.from(value.matchAll(/\S+/g), match => ({ index: match.index, segment: match[0] }));
  }

  function getCharacters(text) {
    const value = String(text || '');
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(lang, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(value), part => part.segment);
    }
    return Array.from(value);
  }

  function getWordUnitCount(segment) {
    return Math.max(1, Math.ceil(getCharacters(segment).length / maxCharactersPerWordUnit));
  }

  function countWords(text) {
    return getWordSegments(text).reduce((total, word) => total + getWordUnitCount(word.segment), 0);
  }

  function trimToWordLimit(text, limit) {
    const value = String(text || '');
    const words = getWordSegments(value);
    let usedUnits = 0;

    for (const word of words) {
      const wordUnits = getWordUnitCount(word.segment);
      if (usedUnits + wordUnits <= limit) {
        usedUnits += wordUnits;
        continue;
      }

      const remainingUnits = Math.max(0, limit - usedUnits);
      const allowedCharacters = remainingUnits * maxCharactersPerWordUnit;
      const allowedWordPart = getCharacters(word.segment).slice(0, allowedCharacters).join('');
      return value.slice(0, word.index + allowedWordPart.length).trimEnd();
    }

    return value;
  }

  function resizeWritingField(field) {
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }

  function paintLimit(element, count, limit) {
    if (!element) return;
    element.textContent = `${count} / ${limit} ${getLimitCopy().words}`;
    element.classList.toggle('is-near', count >= Math.ceil(limit * 0.9) && count <= limit);
    element.classList.toggle('is-over', count > limit);
  }

  function updateTextLimit(field, element, limit) {
    if (!field) return;
    const limitedValue = trimToWordLimit(field.value, limit);
    if (field.value !== limitedValue) {
      field.value = limitedValue;
      field.setSelectionRange(field.value.length, field.value.length);
    }
    resizeWritingField(field);
    paintLimit(element, countWords(field.value), limit);
  }

  function updateBodyLimit() {
    const count = countWords(editor.innerText);
    const isOver = count > wordLimits.body;
    paintLimit(bodyLimit, count, wordLimits.body);
    if (continueButton) {
      continueButton.disabled = isOver;
      continueButton.setAttribute('aria-disabled', String(isOver));
      continueButton.title = isOver ? getLimitCopy().bodyOver : '';
    }
  }

  function updateAllWritingLimits() {
    updateTextLimit(titleInput, titleLimit, wordLimits.title);
    updateBodyLimit();
  }

  function updateAllowedTranslationLanguages() {
    if (!originalLanguageSelect) return;
    const selectedLanguage = originalLanguageSelect.value;
    document.querySelectorAll('input[name="allow_translate"]').forEach(checkbox => {
      const wrapper = checkbox.closest('.d-flex.align-items-center.justify-content-between');
      const isOriginalLanguage = checkbox.value === selectedLanguage;
      if (wrapper) {
        wrapper.style.setProperty('display', isOriginalLanguage ? 'none' : 'flex', 'important');
      }
      if (isOriginalLanguage) {
        if (checkbox.checked) checkbox.dataset.restoreChecked = 'true';
        checkbox.checked = false;
      } else if (checkbox.dataset.restoreChecked === 'true') {
        checkbox.checked = true;
        delete checkbox.dataset.restoreChecked;
      }
    });
  }

  let postOriginalLanguageOverride = null;

  function syncOriginalLanguageWithSystem() {
    if (!originalLanguageSelect) return;
    const currentSystemLanguage = localStorage.getItem('preferredLanguage') || 'en';
    const languageToUse = postOriginalLanguageOverride || currentSystemLanguage;
    const supportedLanguage = ['en', 'vi', 'zh'].includes(languageToUse) ? languageToUse : 'en';
    originalLanguageSelect.value = supportedLanguage;
    if (originalLanguageDisplay) {
      const labels = {
        en: { en: 'English', vi: 'Vietnamese', zh: 'Chinese' },
        vi: { en: 'Tiếng Anh', vi: 'Tiếng Việt', zh: 'Tiếng Trung' },
        zh: { en: '英语', vi: '越南语', zh: '中文' }
      };
      originalLanguageDisplay.textContent = labels[currentSystemLanguage][supportedLanguage];
    }
    updateAllowedTranslationLanguages();
  }

  function syncAvailableCategoriesWithSystem(selectedValue = '', preserveUnavailable = false) {
    const categorySelect = document.getElementById('post_category');
    if (!categorySelect) return;

    let categories = [];
    try {
      const stored = JSON.parse(localStorage.getItem('admin_categories_v2') || '[]');
      categories = Array.isArray(stored) ? stored : [];
    } catch (error) {
      categories = [];
    }
    if (!categories.length) return;

    const language = localStorage.getItem('preferredLanguage') || 'en';
    const legacyCategoryMap = {
      technology: 'Technology',
      tech: 'Technology'
    };
    const normalizeCategoryValue = value => {
      const rawValue = String(value || '').trim();
      return legacyCategoryMap[rawValue.toLowerCase()] || rawValue;
    };
    const activeCategories = categories
      .map(category => ({ category, translation: category.translations?.[language] }))
      .filter(item => item.translation && item.translation.active !== false && item.translation.active !== 'false' && item.translation.active !== 0 && item.translation.active !== '0');
    const requestedValue = selectedValue || categorySelect.value;
    const normalizedRequestedValue = normalizeCategoryValue(requestedValue);
    const activeMatch = activeCategories.find(item => String(item.category.name || item.category.id).toLowerCase() === normalizedRequestedValue.toLowerCase());

    categorySelect.innerHTML = '';
    activeCategories.forEach(({ category, translation }) => {
      const option = document.createElement('option');
      option.value = category.name || category.id;
      option.textContent = translation.name || category.name || category.id;
      categorySelect.appendChild(option);
    });

    if (activeMatch) {
      categorySelect.value = activeMatch.category.name || activeMatch.category.id;
    } else if (preserveUnavailable && requestedValue) {
      const unavailableCategory = categories.find(category => String(category.name || category.id).toLowerCase() === normalizedRequestedValue.toLowerCase());
      const legacyCategoryIsActive = !unavailableCategory && (
        typeof window.isCategoryTranslationActive !== 'function' ||
        window.isCategoryTranslationActive(normalizedRequestedValue, language)
      );
      if (legacyCategoryIsActive) {
        const option = document.createElement('option');
        option.value = normalizedRequestedValue;
        option.textContent = typeof window.translateCategory === 'function'
          ? window.translateCategory(normalizedRequestedValue)
          : normalizedRequestedValue;
        option.selected = true;
        categorySelect.prepend(option);
        return;
      }
      const unavailableLabels = { en: 'Unavailable in this language', vi: 'Không khả dụng trong ngôn ngữ này', zh: '此语言不可用' };
      const option = document.createElement('option');
      option.value = normalizedRequestedValue;
      const unavailableCategoryName = unavailableCategory?.translations?.[language]?.name ||
        (typeof window.translateCategory === 'function' ? window.translateCategory(normalizedRequestedValue) : '') ||
        unavailableCategory?.name || requestedValue;
      option.textContent = `${unavailableCategoryName} — ${unavailableLabels[language] || unavailableLabels.en}`;
      option.disabled = true;
      option.selected = true;
      categorySelect.prepend(option);
    } else if (categorySelect.options.length) {
      categorySelect.selectedIndex = 0;
    } else {
      const emptyLabels = { en: 'No active categories', vi: 'Không có danh mục đang hoạt động', zh: '没有启用的分类' };
      const option = document.createElement('option');
      option.value = '';
      option.textContent = emptyLabels[language] || emptyLabels.en;
      option.disabled = true;
      option.selected = true;
      categorySelect.appendChild(option);
    }
  }

  function hasSelectableCategory() {
    const categorySelect = document.getElementById('post_category');
    return Boolean(categorySelect?.value && !categorySelect.selectedOptions[0]?.disabled);
  }

  function getGuestBackHref() {
    const params = new URLSearchParams(window.location.search);
    const from = params.get('from');
    const aliases = {
      home: 'index.html',
      profile: 'profile.html',
      settings: 'settings.html'
    };
    const isSafeGuestBackHref = value => (
      Boolean(value) &&
      /^[a-z0-9-]+\.html(?:[?#].*)?$/i.test(value) &&
      !/^create-post\.html(?:[?#].*)?$/i.test(value)
    );

    if (from && aliases[from]) return aliases[from];
    if (isSafeGuestBackHref(from)) return from;

    if (window.history.length > 1) {
      return 'javascript:history.back()';
    }

    return 'index.html';
  }

  if (backLink) {
    backLink.href = getGuestBackHref();
  }

  function selectionBelongsToEditor() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    return editor.contains(selection.anchorNode) && editor.contains(selection.focusNode);
  }

  function saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selectionBelongsToEditor()) return;
    savedRange = selection.getRangeAt(0).cloneRange();
  }

  function placeCaretAtEnd() {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }

  function restoreSelection() {
    editor.focus({ preventScroll: true });

    const selection = window.getSelection();
    selection.removeAllRanges();

    if (savedRange) {
      selection.addRange(savedRange);
    } else {
      placeCaretAtEnd();
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeAuthorName(name) {
    return String(name || '').trim().replace(/\s+/g, ' ');
  }

  function getAuthorNames() {
    if (!authorRow) return [];

    return Array.from(authorRow.querySelectorAll('[data-author-chip]'))
      .map(chip => chip.getAttribute('data-author-chip') || chip.querySelector('span')?.textContent || '')
      .map(normalizeAuthorName)
      .filter(Boolean);
  }

  function createAuthorChip(name) {
    const safeName = escapeHtml(name);
    return (
      `<span class="language-chip" data-author-chip="${safeName}">` +
      `<span>${safeName}</span>` +
      '<button class="chip-remove" type="button" aria-label="Remove author"></button>' +
      '</span>'
    );
  }

  function updateAuthorMenuState() {
    if (!authorRow) return;

    const selectedAuthors = new Set(getAuthorNames().map(name => name.toLowerCase()));
    authorRow.querySelectorAll('[data-author-name]').forEach(item => {
      const name = normalizeAuthorName(item.getAttribute('data-author-name')).toLowerCase();
      item.classList.toggle('is-disabled', selectedAuthors.has(name));
      item.toggleAttribute('aria-disabled', selectedAuthors.has(name));
    });
  }

  function closeAuthorMenu() {
    if (!authorRow) return;

    const addWrap = authorRow.querySelector('.author-add-wrap');
    const trigger = authorRow.querySelector('[data-author-menu-trigger]');
    if (addWrap) addWrap.classList.remove('is-open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function addAuthor(name) {
    if (!authorRow) return;

    const cleanName = normalizeAuthorName(name);
    if (!cleanName) return;

    const selectedAuthors = new Set(getAuthorNames().map(author => author.toLowerCase()));
    if (selectedAuthors.has(cleanName.toLowerCase())) return;

    const addWrap = authorRow.querySelector('.author-add-wrap');
    if (!addWrap) return;

    addWrap.insertAdjacentHTML('beforebegin', createAuthorChip(cleanName));
    updateAuthorMenuState();
    setSaveState(false);
  }

  function renderAuthors(authors) {
    if (!authorRow) return;

    const addWrap = authorRow.querySelector('.author-add-wrap');
    if (!addWrap) {
      // Fixed author mode: update the existing single chip
      const singleChip = authorRow.querySelector('[data-author-chip]');
      if (singleChip && authors.length > 0) {
        const name = normalizeAuthorName(authors[0]);
        if (name) {
          singleChip.setAttribute('data-author-chip', name);
          const span = singleChip.querySelector('span');
          if (span) span.textContent = name;
        }
      }
      return;
    }

    authorRow.querySelectorAll('[data-author-chip]').forEach(chip => chip.remove());
    authors
      .map(normalizeAuthorName)
      .filter(Boolean)
      .forEach(name => addWrap.insertAdjacentHTML('beforebegin', createAuthorChip(name)));

    updateAuthorMenuState();
  }

  function insertHtml(html) {
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    saveSelection();
    updateToolbarState();
    editor.focus({ preventScroll: true });
  }

  function runCommand(command, value = null) {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    updateToolbarState();
    editor.focus({ preventScroll: true });
  }

  function isCodeFontName(value) {
    return /cascadia|consolas|monospace/i.test(String(value || ''));
  }

  function unwrapNode(node) {
    const parent = node && node.parentNode;
    if (!parent) return;

    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }

    parent.removeChild(node);
  }

  function stripZeroWidthSpaces(root) {
    Array.from(root.childNodes || []).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        child.nodeValue = child.nodeValue.replaceAll(zeroWidthSpace, '');
      } else {
        stripZeroWidthSpaces(child);
      }
    });
  }

  function normalizeEditorFontMarkup(root = editor, options = {}) {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll('font[face]').forEach(fontNode => {
      const isCodeFont = isCodeFontName(fontNode.getAttribute('face'));

      if (!isCodeFont) {
        unwrapNode(fontNode);
        return;
      }

      const span = document.createElement('span');
      span.className = inlineCodeClass;
      while (fontNode.firstChild) {
        span.appendChild(fontNode.firstChild);
      }
      fontNode.replaceWith(span);
    });

    if (!options.cleanMarkers) return;

    root.querySelectorAll(`.${inlineCodeClass}`).forEach(span => {
      stripZeroWidthSpaces(span);

      if (!span.textContent && !span.querySelector('img, video, audio')) {
        span.remove();
      }
    });
  }

  function getElementFromNode(node) {
    if (!node) return null;
    return node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  }

  function getInlineCodeWrapper(node) {
    const element = getElementFromNode(node);
    const wrapper = element && element.closest ? element.closest(`code, .${inlineCodeClass}, font`) : null;
    if (!wrapper || !editor.contains(wrapper)) return null;
    if (wrapper.closest('pre')) return null;
    if (wrapper.matches(`code, .${inlineCodeClass}`)) return wrapper;
    return isCodeFontName(wrapper.getAttribute('face')) ? wrapper : null;
  }

  function isInsideCodeFont(node) {
    return Boolean(getInlineCodeWrapper(node));
  }

  function isInlineCodeActive() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && selectionBelongsToEditor()) {
      if (isInsideCodeFont(selection.anchorNode) || isInsideCodeFont(selection.focusNode)) return true;
    }

    return false;
  }

  function setSelectionRange(range) {
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }

  function placeCaretInside(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    setSelectionRange(range);
  }

  function placeCaretAfter(node) {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    setSelectionRange(range);
  }

  function wrapSelectionInInlineCode(selection) {
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = inlineCodeClass;

    if (range.collapsed) {
      span.textContent = zeroWidthSpace;
      range.insertNode(span);
      placeCaretInside(span);
      return;
    }

    span.appendChild(range.extractContents());
    range.insertNode(span);
    range.selectNodeContents(span);
    setSelectionRange(range);
  }

  function removeInlineCodeWrapper(wrapper) {
    if (!wrapper || !wrapper.parentNode) return;

    const marker = document.createTextNode('');
    wrapper.parentNode.insertBefore(marker, wrapper.nextSibling);
    stripZeroWidthSpaces(wrapper);
    unwrapNode(wrapper);

    const range = document.createRange();
    range.setStart(marker, 0);
    range.collapse(true);
    setSelectionRange(range);
  }

  function closeMenus() {
    document.querySelectorAll('.tool-menu.is-open').forEach(menu => {
      menu.classList.remove('is-open');
      const trigger = menu.querySelector('[data-menu-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function setSelectedInMenu(button, selector) {
    const panel = button.closest('.tool-menu-panel');
    if (!panel) return;
    panel.querySelectorAll(selector).forEach(item => item.classList.remove('is-selected'));
    button.classList.add('is-selected');
  }

  function setBaselineLabel(format) {
    const label = document.querySelector('[data-baseline-label]');
    if (!label) return;

    label.classList.toggle('is-script', format === 'superscript' || format === 'subscript');
    label.classList.toggle('is-superscript', format === 'superscript');
    label.classList.toggle('is-subscript', format === 'subscript');

    if (format === 'superscript') {
      label.innerHTML = 'x<span class="baseline-script">2</span>';
    } else if (format === 'subscript') {
      label.innerHTML = 'x<span class="baseline-script">2</span>';
    } else {
      label.textContent = 'A';
    }
  }

  function getBaselineFormat() {
    if (document.queryCommandState('superscript')) return 'superscript';
    if (document.queryCommandState('subscript')) return 'subscript';
    return 'normal';
  }

  function updateBaselineUi(format) {
    activeBaselineFormat = format;

    const baselineTrigger = toolbar ? toolbar.querySelector('.baseline-trigger') : null;
    if (baselineTrigger) {
      baselineTrigger.classList.remove('is-active');
    }

    setBaselineLabel(format);
    if (!toolbar) return;

    toolbar.querySelectorAll('[data-inline-format]').forEach(button => {
      button.classList.toggle('is-selected', button.dataset.inlineFormat === format);
    });
  }

  function setBaselineFormat(format) {
    restoreSelection();

    const isSuperscript = document.queryCommandState('superscript');
    const isSubscript = document.queryCommandState('subscript');

    if (format === 'normal') {
      if (isSuperscript) document.execCommand('superscript', false, null);
      if (isSubscript) document.execCommand('subscript', false, null);
    } else if (format === 'superscript') {
      if (isSubscript) document.execCommand('subscript', false, null);
      if (!document.queryCommandState('superscript')) {
        document.execCommand('superscript', false, null);
      }
    } else if (format === 'subscript') {
      if (isSuperscript) document.execCommand('superscript', false, null);
      if (!document.queryCommandState('subscript')) {
        document.execCommand('subscript', false, null);
      }
    }

    updateBaselineUi(format);
    saveSelection();
    updateToolbarState({ syncBaseline: false });
    editor.focus({ preventScroll: true });
  }

  function updateToolbarState(options = {}) {
    if (!toolbar) return;
    const syncBaseline = options.syncBaseline !== false;

    ['bold', 'italic', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'].forEach(command => {
      const button = toolbar.querySelector(`[data-command="${command}"]`);
      if (!button) return;
      button.classList.toggle('is-active', document.queryCommandState(command));
    });

    ['undo', 'redo'].forEach(command => {
      const button = toolbar.querySelector(`[data-command="${command}"]`);
      if (!button) return;
      button.classList.toggle('is-muted', !document.queryCommandEnabled(command));
    });
    
    let activeAlign = 'justifyLeft';
    ['justifyCenter', 'justifyRight', 'justifyFull'].forEach(command => {
      const button = toolbar.querySelector(`[data-align-command="${command}"]`);
      if (!button) return;
      const isActive = document.queryCommandState(command);
      button.classList.toggle('is-selected', isActive);
      if (isActive) activeAlign = command;
    });
    
    // Left align is default, so if nothing else is active, left is active.
    const leftBtn = toolbar.querySelector('[data-align-command="justifyLeft"]');
    if (leftBtn) {
      leftBtn.classList.toggle('is-selected', activeAlign === 'justifyLeft');
    }
    
    // Update the trigger icon
    const alignTrigger = toolbar.querySelector('.align-menu')?.previousElementSibling;
    if (alignTrigger) {
      const svgPaths = {
        justifyLeft: '<path d="M21 6H3"></path><path d="M15 12H3"></path><path d="M17 18H3"></path>',
        justifyCenter: '<path d="M21 6H3"></path><path d="M17 12H7"></path><path d="M19 18H5"></path>',
        justifyRight: '<path d="M21 6H3"></path><path d="M21 12H9"></path><path d="M21 18H7"></path>',
        justifyFull: '<path d="M21 6H3"></path><path d="M21 12H3"></path><path d="M21 18H3"></path>'
      };
      const svg = alignTrigger.querySelector('svg');
      if (svg && svgPaths[activeAlign]) {
        svg.innerHTML = svgPaths[activeAlign];
      }
    }

    const baselineFormat = syncBaseline ? getBaselineFormat() : activeBaselineFormat;
    updateBaselineUi(baselineFormat);

    const codeButton = toolbar.querySelector('[data-inline-code]');
    if (codeButton) codeButton.classList.toggle('is-active', isInlineCodeActive());
  }

  function setSaveState(isSaved) {
    if (!saveButton || !saveLabel) return;
    saveButton.classList.toggle('is-saved', isSaved);
    const lang = localStorage.getItem('preferredLanguage') || 'en';
    const dict = window.uiTranslations ? (window.uiTranslations[lang] || window.uiTranslations.en) : null;
    const txtSaved = dict ? (dict.btn_saved || 'Saved') : 'Saved';
    const txtSave = dict ? (dict.btn_save || 'Save') : 'Save';
    saveLabel.textContent = isSaved ? txtSaved : txtSave;
  }

  function prepareEditorLink(link) {
    if (!link || link.nodeType !== Node.ELEMENT_NODE) return null;
    if (!link.matches('a[href]')) return null;

    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
    link.setAttribute('contenteditable', 'false');
    link.dataset.editorLink = 'true';
    return link;
  }

  function normalizeEditorLinks(root = editor) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('a[href]').forEach(prepareEditorLink);
  }

  function getCleanEditorHtml() {
    const clone = editor.cloneNode(true);
    clone.querySelectorAll('a[data-editor-link]').forEach(link => {
      link.removeAttribute('contenteditable');
      link.removeAttribute('data-editor-link');
    });
    return clone.innerHTML;
  }

  function collectDraft() {
    normalizeEditorFontMarkup(editor, { cleanMarkers: true });
    normalizeEditorLinks(editor);

    const categorySelect = document.getElementById('post_category');

    return {
      title: titleInput ? titleInput.value : '',
      subtitle: '',
      authors: getAuthorNames(),
      body: getCleanEditorHtml(),
      editingId: submittedPostId || pageParams.get('edit') || null,
      category: categorySelect ? categorySelect.value : 'technology',
      originalLanguage: originalLanguageSelect ? originalLanguageSelect.value : (localStorage.getItem('preferredLanguage') || 'en'),
      allowedTranslations: Array.from(document.querySelectorAll('input[name="allow_translate"]:checked')).map(input => input.value),
      updatedAt: new Date().toISOString()
    };
  }

  async function buildStoredTranslations(post, originalLanguage, allowedTranslations) {
    const languages = [...new Set([originalLanguage, ...allowedTranslations].filter(Boolean))];
    const translations = {
      [originalLanguage]: {
        title: post.title,
        subtitle: '',
        body: post.body,
        content: post.body
      }
    };

    await Promise.all(languages.filter(language => language !== originalLanguage).map(async language => {
      const results = await Promise.allSettled([
        post.title ? translateText(post.title, language) : Promise.resolve(''),
        post.body ? translateHtml(post.body, language) : Promise.resolve('')
      ]);
      const title = results[0].status === 'fulfilled' ? results[0].value : post.title;
      const body = results[1].status === 'fulfilled' ? results[1].value : post.body;
      translations[language] = {
        title, subtitle: '', body, content: body,
        translationFailed: results.some(result => result.status === 'rejected')
      };
    }));

    return translations;
  }

  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify(collectDraft()));
      setSaveState(true);
    } catch (error) {
      alert('Could not save this draft in the browser.');
    }
  }

  async function submitForReview(sourceAction) {
    try {
      if (!hasSelectableCategory()) {
        const language = localStorage.getItem('preferredLanguage') || 'en';
        const messages = {
          en: 'Please choose an active category before submitting.',
          vi: 'Vui lòng chọn một danh mục đang hoạt động trước khi gửi bài.',
          zh: '提交前请选择一个已启用的分类。'
        };
        alert(messages[language] || messages.en);
        document.getElementById('post_category')?.focus();
        return;
      }
      const post = collectDraft();
      const categorySelect = document.getElementById('post_category');
      const originalLanguage = originalLanguageSelect ? originalLanguageSelect.value : (localStorage.getItem('preferredLanguage') || 'en');
      const allowedTranslations = Array.from(document.querySelectorAll('input[name="allow_translate"]:checked')).map(input => input.value);
      const storedPosts = JSON.parse(localStorage.getItem(submittedPostsKey) || '[]');
      const posts = Array.isArray(storedPosts) ? storedPosts : [];
      const language = localStorage.getItem('preferredLanguage') || 'en';
      const fallbackTitles = { en: 'Untitled post', vi: 'Bài viết chưa có tiêu đề', zh: '未命名文章' };
      const translations = await buildStoredTranslations(post, originalLanguage, allowedTranslations);
      const currentAuthor = typeof window.getLingoraCurrentUser === 'function' ? window.getLingoraCurrentUser() : null;

      const existingIndex = submittedPostId
        ? posts.findIndex(item => String(item.id) === String(submittedPostId))
        : -1;
      const existingPost = existingIndex >= 0 ? posts[existingIndex] : null;
      if (existingPost && [existingPost.status, existingPost.previousStatus]
        .some(status => ['approved', 'published'].includes(String(status || '').toLowerCase()))) {
        const lockedMessages = {
          en: 'Approved posts can no longer be edited.',
          vi: 'Bài viết đã được duyệt không thể chỉnh sửa nữa.',
          zh: '已审核的文章无法再编辑。'
        };
        alert(lockedMessages[language] || lockedMessages.en);
        window.location.href = 'my-posts.html?status=published';
        return;
      }

      const submittedPost = {
        id: submittedPostId || `pending-${Date.now()}`,
        title: post.title.trim() || fallbackTitles[language] || fallbackTitles.en,
        subtitle: '',
        body: post.body,
        authors: post.authors,
        authorName: currentAuthor?.name || post.authors?.[0] || 'Lingora Author',
        authorAvatar: currentAuthor?.avatar || '',
        category: categorySelect ? categorySelect.value : 'technology',
        categoryLabel: categorySelect && categorySelect.selectedOptions[0] ? categorySelect.selectedOptions[0].textContent.trim() : 'Technology',
        originalLanguage,
        allowedTranslations,
        translations,
        status: sourceAction === 'draft' ? 'draft' : 'pending',
        previousStatus: existingPost ? existingPost.status || 'pending' : null,
        revision: existingPost ? Number(existingPost.revision || 1) + 1 : 1,
        createdAt: existingPost?.createdAt || new Date().toISOString(),
        sourceAction,
        updatedAt: new Date().toISOString(),
        reads: 0
      };

      if (existingIndex >= 0) {
        submittedPost.reads = posts[existingIndex].reads || 0;
        posts.splice(existingIndex, 1, submittedPost);
      } else {
        posts.unshift(submittedPost);
      }

      localStorage.setItem(submittedPostsKey, JSON.stringify(posts.slice(0, 500)));
      localStorage.removeItem(draftKey);
      window.location.href = sourceAction === 'draft'
        ? 'my-posts.html?status=draft'
        : 'my-posts.html?status=pending';
    } catch (error) {
      const language = localStorage.getItem('preferredLanguage') || 'en';
      const messages = {
        en: 'Could not send this post for review.',
        vi: 'Không thể gửi bài viết này để chờ duyệt.',
        zh: '无法提交此文章进行审核。'
      };
      alert(messages[language] || messages.en);
    }
  }

  function loadDraft() {
    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (!rawDraft) {
        syncOriginalLanguageWithSystem();
        syncAvailableCategoriesWithSystem('', false);
        return null;
      }

      const draft = JSON.parse(rawDraft);
      if (titleInput && draft.title) titleInput.value = draft.title;
      if (Array.isArray(draft.authors)) renderAuthors(draft.authors);
      if (draft.body) {
        editor.innerHTML = draft.body;
        editor.querySelectorAll('img, video, audio').forEach(media => {
          if (!media.closest('.editor-media-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'editor-media-wrapper';
            wrapper.contentEditable = 'false';
            wrapper.innerHTML = `
              <button type="button" class="editor-media-delete" data-remove-media title="Delete media">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            `;
            media.parentNode.insertBefore(wrapper, media);
            wrapper.insertBefore(media, wrapper.firstChild);
          }
        });
        normalizeEditorFontMarkup();
        normalizeEditorLinks();
      }
      const categorySelect = document.getElementById('post_category');
      if (categorySelect && draft.category) categorySelect.value = draft.category;
      postOriginalLanguageOverride = draft.originalLanguage || localStorage.getItem('preferredLanguage') || 'en' || null;
      if (Array.isArray(draft.allowedTranslations)) {
        document.querySelectorAll('input[name="allow_translate"]').forEach(checkbox => {
          checkbox.checked = draft.allowedTranslations.includes(checkbox.value);
        });
      }
      syncOriginalLanguageWithSystem();
      syncAvailableCategoriesWithSystem(draft.category || '', Boolean(draft.category));
      return draft;
    } catch (error) {
      localStorage.removeItem(draftKey);
      syncOriginalLanguageWithSystem();
      syncAvailableCategoriesWithSystem('', false);
      return null;
    }
  }

  function formatPreviewDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return 'JUL 07, 2026';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    }).format(date).toUpperCase();
  }

  function getPreviewLanguage() {
    return previewLanguageSelect ? previewLanguageSelect.value : 'original';
  }

  function getPreviewFallback(kind, lang = getPreviewLanguage()) {
    const dictionary = previewFallbackText[lang] || previewFallbackText.original;
    return dictionary[kind] || previewFallbackText.original[kind] || '';
  }

  function setPreviewTranslationStatus(text, state = '') {
    if (!previewTranslationStatus) return;
    previewTranslationStatus.textContent = text;
    previewTranslationStatus.classList.toggle('is-loading', state === 'loading');
    previewTranslationStatus.classList.toggle('is-error', state === 'error');
  }

  function getTranslationTarget(lang) {
    return lang === 'zh' ? 'zh-CN' : lang;
  }

  function restoreTranslatedSpacing(source, translated) {
    const leading = source.match(/^\s*/)?.[0] || '';
    const trailing = source.match(/\s*$/)?.[0] || '';
    return `${leading}${String(translated || '').trim().normalize('NFC')}${trailing}`;
  }

  function isCodeLikeText(text) {
    const value = String(text || '').trim();
    if (!value || value.length > 280) return false;

    if (/^#?\s*include\s+[<"]?[\w./-]+[>"]?$/i.test(value)) return true;
    if (/^(import|from|using|namespace|const|let|var|function|class|return|if|else|for|while|switch|case|def|public|private|printf|scanf|console\.|echo\b|SELECT\b|INSERT\b|UPDATE\b|DELETE\b)/.test(value)) return true;
    if (/^[\w.-]+\.(h|c|cpp|hpp|js|ts|tsx|jsx|css|html|json|py|java|cs|go|rs|php|rb|sql|sh|xml|md)$/i.test(value)) return true;
    if (/[{}[\]();=<>]/.test(value) && /[a-z0-9_]/i.test(value)) return true;
    if (/^[\w.$/#-]+\s*[=:]\s*.+/.test(value)) return true;

    return false;
  }

  async function fetchTranslationChunk(text, lang) {
    const cacheKey = `${lang}:${text}`;
    if (previewTranslationCache.has(cacheKey)) return previewTranslationCache.get(cacheKey);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), 9000) : null;
    const endpoint = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(getTranslationTarget(lang))}&dt=t&q=${encodeURIComponent(text.trim())}`;

    try {
      const response = await fetch(endpoint, controller ? { signal: controller.signal } : undefined);
      if (!response.ok) throw new Error('Translation request failed');
      const data = await response.json();
      const translated = Array.isArray(data?.[0])
        ? data[0].map(part => Array.isArray(part) ? part[0] || '' : '').join('')
        : '';
      const result = translated ? restoreTranslatedSpacing(text, translated) : text;
      previewTranslationCache.set(cacheKey, result);
      return result;
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  }

  async function translateText(text, lang) {
    const source = String(text || '');
    if (lang === 'original' || !source.trim()) return source;
    const normalized = source.trim().toLocaleLowerCase();
    const untitledTranslations = { en: 'Untitled post', vi: 'Bài viết không tên', zh: '未命名文章' };
    if (['untitled post', 'bài viết chưa có tiêu đề', 'bài viết không tên', '未命名文章'].includes(normalized)) {
      return restoreTranslatedSpacing(source, untitledTranslations[lang] || untitledTranslations.en);
    }
    if (isCodeLikeText(source)) return source;

    const chunkLength = 900;
    if (source.length <= chunkLength) {
      return fetchTranslationChunk(source, lang);
    }

    const chunks = source.match(new RegExp(`[\\s\\S]{1,${chunkLength}}`, 'g')) || [source];
    const translatedChunks = await Promise.all(chunks.map(chunk => fetchTranslationChunk(chunk, lang)));
    return translatedChunks.join('');
  }

  async function translateHtml(html, lang) {
    if (lang === 'original' || !html) return html;

    const container = document.createElement('div');
    container.innerHTML = html;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest(`pre, code, .${inlineCodeClass}, script, style, svg, audio, video`)) return NodeFilter.FILTER_REJECT;
        if (isCodeLikeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;

        const codeFont = parent.closest('font');
        if (codeFont && isCodeFontName(codeFont.getAttribute('face'))) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    const translatedText = await Promise.all(textNodes.map(node => translateText(node.nodeValue, lang)));
    translatedText.forEach((text, index) => {
      textNodes[index].nodeValue = text;
    });

    return container.innerHTML;
  }

  function markCodeLikeTextNodes(root) {
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;

        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest(`pre, code, .${inlineCodeClass}, script, style, svg, audio, video`)) return NodeFilter.FILTER_REJECT;
        if (!isCodeLikeText(node.nodeValue)) return NodeFilter.FILTER_REJECT;

        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const codeTextNodes = [];
    while (walker.nextNode()) codeTextNodes.push(walker.currentNode);

    codeTextNodes.forEach(node => {
      const span = document.createElement('span');
      span.className = inlineCodeClass;
      span.textContent = node.nodeValue;
      node.replaceWith(span);
    });
  }

  function applyPreviewContent(content) {
    if (previewTitle) {
      previewTitle.textContent = content.title;
      previewTitle.classList.toggle('is-placeholder', Boolean(content.isTitlePlaceholder));
    }

    if (previewBody) {
      previewBody.innerHTML = content.bodyHtml;

      if (typeof window.numberLingoraCodeBlocks === 'function') {
        window.numberLingoraCodeBlocks(previewBody);
      }

      normalizeEditorFontMarkup(previewBody);
      markCodeLikeTextNodes(previewBody);
      previewBody.querySelectorAll('[contenteditable]').forEach(node => {
        node.removeAttribute('contenteditable');
      });
    }
  }

  async function buildPreviewContent(draft, lang) {
    const hasTitle = Boolean(draft.title && draft.title.trim());
    const hasBody = Boolean(draft.body && draft.body.trim());
    const emptyBody = `<p>${escapeHtml(getPreviewFallback('empty', lang))}</p>`;

    if (lang === 'original') {
      return {
        title: hasTitle ? draft.title : getPreviewFallback('untitled', 'original'),
        subtitle: '',
        bodyHtml: draft.body || emptyBody,
        isTitlePlaceholder: !hasTitle
      };
    }

    const [title, bodyHtml] = await Promise.all([
      hasTitle ? translateText(draft.title, lang) : Promise.resolve(getPreviewFallback('untitled', lang)),
      hasBody ? translateHtml(draft.body, lang) : Promise.resolve(emptyBody)
    ]);

    return { title, subtitle: '', bodyHtml, isTitlePlaceholder: !hasTitle };
  }

  function getInitials(name) {
    return String(name || 'A')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'A';
  }

  function setPreviewMode(mode) {
    if (!previewDevice) return;

    previewDevice.classList.toggle('is-mobile', mode === 'mobile');
    previewDevice.classList.toggle('is-desktop', mode !== 'mobile');
    previewModeButtons.forEach(button => {
      const isActive = button.dataset.previewMode === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });
  }

  async function renderPreview(draft) {
    activePreviewDraft = draft;
    const renderToken = ++previewRenderToken;
    const previewLanguage = getPreviewLanguage();
    const authors = Array.isArray(draft.authors) && draft.authors.length ? draft.authors : ['Alone'];
    const authorName = authors.join(', ');

    if (previewAuthor) previewAuthor.textContent = authorName;
    if (previewAvatar) previewAvatar.textContent = getInitials(authors[0]);
    if (previewDate) previewDate.textContent = formatPreviewDate(draft.updatedAt);

    if (previewLanguage === 'original') {
      const content = await buildPreviewContent(draft, 'original');
      if (renderToken !== previewRenderToken) return;
      applyPreviewContent(content);
      setPreviewTranslationStatus(getPreviewFallback('ready', 'original'));
      return;
    }

    setPreviewTranslationStatus('Translating...', 'loading');

    try {
      const content = await buildPreviewContent(draft, previewLanguage);
      if (renderToken !== previewRenderToken) return;
      applyPreviewContent(content);
      setPreviewTranslationStatus(previewLanguageLabels[previewLanguage] || 'Translated');
    } catch (error) {
      if (renderToken !== previewRenderToken) return;
      applyPreviewContent(await buildPreviewContent(draft, 'original'));
      setPreviewTranslationStatus('Could not translate', 'error');
    }
  }

  function closePreview() {
    if (!previewModal) return;
    previewModal.hidden = true;
    document.body.classList.remove('preview-modal-open');
  }

  function openPreview(event) {
    if (event) {
      event.preventDefault();
      // Reset to original language if triggered by a real user click on the Preview button
      if (event.isTrusted && previewLanguageSelect) {
        previewLanguageSelect.value = 'original';
        previewLanguageSelect.dispatchEvent(new Event('change'));
      }
    }
    if (!previewModal) return;

    saveDraft();
    renderPreview(collectDraft());
    setPreviewMode('desktop');
    previewModal.hidden = false;
    document.body.classList.add('preview-modal-open');

    const closeButton = previewModal.querySelector('.preview-topbar-actions [data-preview-close]');
    if (closeButton) closeButton.focus({ preventScroll: true });
  }

  function closePublishModal() {
    if (!publishModal) return;
    publishModal.hidden = true;
    document.body.classList.remove('publish-modal-open');
  }

  function openPublishModal(event) {
    if (event) event.preventDefault();
    if (!publishModal) return;

    syncOriginalLanguageWithSystem();
    syncAvailableCategoriesWithSystem(document.getElementById('post_category')?.value || '', true);
    publishModal.hidden = false;
    document.body.classList.add('publish-modal-open');
  }

  function closeDraftConfirmModal() {
    if (!draftConfirmModal) return;
    draftConfirmModal.hidden = true;
    document.body.classList.remove('draft-modal-open');
  }

  function openDraftConfirmModal() {
    if (!draftConfirmModal) return;
    draftConfirmModal.hidden = false;
    document.body.classList.add('draft-modal-open');
  }

  function normalizeUserUrl(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    if (/^(?:https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function isLikelyUrl(value) {
    return /^(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/?#][^\s]*)?$/i.test(String(value || '').trim());
  }

  function getDeepTextNode(node, direction) {
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) return node;

    const children = Array.from(node.childNodes || []);
    if (direction === 'last') children.reverse();

    for (const child of children) {
      const textNode = getDeepTextNode(child, direction);
      if (textNode) return textNode;
    }

    return null;
  }

  function getTextNodeNearRange(range) {
    if (!range) return null;
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      return { node: range.startContainer, offset: range.startOffset };
    }

    const container = range.startContainer;
    const childNodes = Array.from(container.childNodes || []);
    const previousText = range.startOffset > 0 ? getDeepTextNode(childNodes[range.startOffset - 1], 'last') : null;
    if (previousText) return { node: previousText, offset: previousText.nodeValue.length };

    const nextText = getDeepTextNode(childNodes[range.startOffset], 'first');
    if (nextText) return { node: nextText, offset: 0 };

    return null;
  }

  function getUrlRangeNearSelection(selection) {
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;

    const range = selection.getRangeAt(0);
    const textInfo = getTextNodeNearRange(range);
    if (!textInfo || !editor.contains(textInfo.node)) return null;

    const text = textInfo.node.nodeValue || '';
    const urlPattern = /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,})(?:[^\s<>"']*)?/gi;
    let match;

    while ((match = urlPattern.exec(text))) {
      const rawText = match[0].replace(/[),.;!?]+$/g, '');
      const start = match.index;
      const end = start + rawText.length;

      if (rawText && textInfo.offset >= start && textInfo.offset <= end) {
        const urlRange = document.createRange();
        urlRange.setStart(textInfo.node, start);
        urlRange.setEnd(textInfo.node, end);
        return { range: urlRange, text: rawText };
      }
    }

    return null;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getRangeAnchorRect(range) {
    if (!range) return editor.getBoundingClientRect();

    const rects = Array.from(range.getClientRects()).filter(rect => rect.width || rect.height);
    if (rects.length) return rects[0];

    const rect = range.getBoundingClientRect();
    if (rect && (rect.width || rect.height)) return rect;

    if (range.collapsed && editor.contains(range.startContainer)) {
      const marker = document.createElement('span');
      marker.textContent = zeroWidthSpace;
      marker.style.display = 'inline-block';
      marker.style.width = '0';
      marker.style.overflow = 'hidden';

      const markerRange = range.cloneRange();
      markerRange.insertNode(marker);
      const markerRect = marker.getBoundingClientRect();
      marker.remove();

      if (markerRect && (markerRect.width || markerRect.height)) return markerRect;
    }

    return editor.getBoundingClientRect();
  }

  function positionFloatingElement(element, anchorRect, gap = 12) {
    if (!element || !anchorRect) return;

    const margin = 12;
    const elementRect = element.getBoundingClientRect();
    const maxLeft = Math.max(margin, window.innerWidth - elementRect.width - margin);
    const anchorCenter = anchorRect.left + (anchorRect.width / 2);
    const preferredLeft = anchorRect.left;
    const left = clamp(preferredLeft, margin, maxLeft);
    const arrowLeft = clamp(anchorCenter - left, 18, Math.max(18, elementRect.width - 18));
    let top = anchorRect.bottom + gap;
    let isAbove = false;

    if (top + elementRect.height > window.innerHeight - margin && anchorRect.top - elementRect.height - gap > margin) {
      top = anchorRect.top - elementRect.height - gap;
      isAbove = true;
    }

    element.style.left = `${left}px`;
    element.style.top = `${Math.max(margin, top)}px`;
    element.style.setProperty('--link-arrow-left', `${arrowLeft}px`);
    element.classList.toggle('is-above', isAbove);
  }

  function getEditorLinkFromNode(node) {
    if (!node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const link = element ? element.closest('a[href]') : null;
    return link && editor.contains(link) ? link : null;
  }

  function getDeepLink(node, direction) {
    if (!node) return null;
    const directLink = getEditorLinkFromNode(node);
    if (directLink) return directLink;
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const children = Array.from(node.childNodes || []);
    if (direction === 'previous') children.reverse();

    for (const child of children) {
      const link = getDeepLink(child, direction);
      if (link) return link;
    }

    return null;
  }

  function getAdjacentNode(node, direction) {
    let current = node;

    while (current && current !== editor) {
      const sibling = direction === 'previous' ? current.previousSibling : current.nextSibling;
      if (sibling) return sibling;
      current = current.parentNode;
    }

    return null;
  }

  function getBoundaryLinkFromRange(range, key) {
    if (!range) return null;

    const currentLink = getEditorLinkFromNode(range.startContainer);
    if (currentLink) return currentLink;

    const direction = key === 'Backspace' ? 'previous' : 'next';
    let candidate = null;

    if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      const index = key === 'Backspace' ? range.startOffset - 1 : range.startOffset;
      candidate = range.startContainer.childNodes[index] || null;
    } else if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const textLength = (range.startContainer.nodeValue || '').length;
      const isBoundary = key === 'Backspace' ? range.startOffset === 0 : range.startOffset === textLength;
      if (isBoundary) candidate = getAdjacentNode(range.startContainer, direction);
    }

    return getDeepLink(candidate, direction);
  }

  function setCaretWhereNodeWas(parent, index) {
    const range = document.createRange();

    if (parent && parent.isConnected && editor.contains(parent)) {
      range.setStart(parent, Math.min(index, parent.childNodes.length));
    } else {
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    range.collapse(true);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }

  function removeEditorLink(link) {
    if (!link || !link.parentNode) return;

    const parent = link.parentNode;
    const index = Array.prototype.indexOf.call(parent.childNodes, link);
    link.remove();
    closeLinkBubble();
    closeLinkModal();

    if (!editor.textContent.trim() && !editor.querySelector('img, video, audio, hr, .editor-code-block')) {
      editor.innerHTML = '<p><br></p>';
      placeCaretAtEnd();
    } else {
      if (
        parent
        && parent.nodeType === Node.ELEMENT_NODE
        && parent !== editor
        && parent.isConnected
        && !parent.childNodes.length
      ) {
        parent.appendChild(document.createElement('br'));
      }
      setCaretWhereNodeWas(parent, index);
    }

    updateBodyLimit();
    setSaveState(false);
  }

  function placeCaretAfterNode(node) {
    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedRange = range.cloneRange();
  }

  function applyLinkToRange(range, url, displayText = null) {
    if (!range) return;

    const link = document.createElement('a');
    link.setAttribute('href', url);
    prepareEditorLink(link);

    if (displayText !== null) {
      if (!range.collapsed) range.deleteContents();
      link.textContent = displayText || url.replace(/^https?:\/\//i, '');
    } else if (range.collapsed) {
      link.textContent = url.replace(/^https?:\/\//i, '');
    } else {
      const fragment = range.extractContents();
      link.appendChild(fragment);
    }

    range.insertNode(link);
    placeCaretAfterNode(link);
    updateToolbarState();
    editor.focus({ preventScroll: true });
    return link;
  }

  function closeLinkModal() {
    if (!linkModal) return;
    linkModal.hidden = true;
    linkModal.classList.remove('is-above');
    linkModal.style.removeProperty('left');
    linkModal.style.removeProperty('top');
    linkModal.style.removeProperty('--link-arrow-left');
    document.body.classList.remove('link-modal-open');
    pendingLinkDraft = null;
  }

  function closeLinkBubble() {
    if (!linkBubble) return;
    linkBubble.hidden = true;
    linkBubble.classList.remove('is-above');
    linkBubble.style.removeProperty('left');
    linkBubble.style.removeProperty('top');
    linkBubble.style.removeProperty('--link-arrow-left');
    activeLinkElement = null;
  }

  function showLinkBubble(link) {
    if (!linkBubble || !linkBubbleUrl || !link) return;

    const preparedLink = prepareEditorLink(link);
    if (!preparedLink) return;

    const href = preparedLink.getAttribute('href') || '#';
    activeLinkElement = preparedLink;
    closeLinkModal();
    linkBubbleUrl.href = href;
    linkBubbleUrl.textContent = href;
    linkBubble.hidden = false;
    positionFloatingElement(linkBubble, preparedLink.getBoundingClientRect(), 12);
  }

  function openLinkModal(linkDraft) {
    if (!linkModal || !linkTextInput || !linkUrlInput) return false;

    closeLinkBubble();
    pendingLinkDraft = linkDraft;
    linkTextInput.value = linkDraft.text || '';
    linkUrlInput.value = linkDraft.url || '';
    linkModal.hidden = false;
    document.body.classList.add('link-modal-open');
    positionFloatingElement(
      linkModal,
      linkDraft.anchorRect || getRangeAnchorRect(linkDraft.range ? linkDraft.range.cloneRange() : null),
      12
    );

    window.setTimeout(() => {
      (linkTextInput.value ? linkUrlInput : linkTextInput).focus();
      if (!linkTextInput.value) linkTextInput.select();
      else linkUrlInput.select();
    }, 0);

    return true;
  }

  function createLinkDraftFromSelection() {
    restoreSelection();
    const selection = window.getSelection();
    const selectedText = selection && !selection.isCollapsed ? selection.toString().trim() : '';
    const detectedUrl = selectedText ? null : getUrlRangeNearSelection(selection);
    const defaultUrl = detectedUrl
      ? detectedUrl.text
      : (isLikelyUrl(selectedText) ? selectedText : '');

    const range = detectedUrl
      ? detectedUrl.range.cloneRange()
      : (selection && selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null);

    return {
      range,
      text: selectedText || (detectedUrl ? detectedUrl.text : ''),
      url: defaultUrl,
      anchorRect: getRangeAnchorRect(range ? range.cloneRange() : null)
    };
  }

  function createLinkDraftFromLink(link) {
    const range = document.createRange();
    range.selectNode(link);

    return {
      range,
      text: (link.textContent || '').trim(),
      url: link.getAttribute('href') || '',
      link,
      anchorRect: link.getBoundingClientRect()
    };
  }

  function handleLink() {
    const linkDraft = createLinkDraftFromSelection();
    if (!openLinkModal(linkDraft)) {
      const url = normalizeUserUrl(prompt('Enter the link URL:', linkDraft.url));
      if (!url) return;
      const displayText = prompt('Enter link text:', linkDraft.text || url.replace(/^https?:\/\//i, ''));
      if (!displayText) return;
      applyLinkToRange(linkDraft.range, url, displayText);
      saveSelection();
      setSaveState(false);
    }
  }

  function handleInlineCode() {
    restoreSelection();
    const selection = window.getSelection();
    const wrapper = selection && selection.rangeCount > 0
      ? getInlineCodeWrapper(selection.anchorNode) || getInlineCodeWrapper(selection.focusNode)
      : null;

    if (wrapper) {
      removeInlineCodeWrapper(wrapper);
    } else {
      wrapSelectionInInlineCode(selection);
    }

    saveSelection();
    updateToolbarState();
    setSaveState(false);
    editor.focus({ preventScroll: true });
  }

  function insertMediaWithWrapper(mediaHtml) {
    insertHtml(
      `<div class="editor-media-wrapper" contenteditable="false">
        ${mediaHtml}
        <button type="button" class="editor-media-delete" data-remove-media title="Delete media">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div><p><br></p>`
    );
  }

  function handleMedia(type) {
    const inputByType = {
      image: imageInput,
      audio: audioInput,
      video: videoInput
    };
    const fileInput = inputByType[type];

    if (fileInput) {
      restoreSelection();
      saveSelection();
      fileInput.click();
      return;
    }

    const url = normalizeUserUrl(prompt(`Enter ${type} URL:`));
    if (!url) return;

    if (type === 'audio') {
      insertMediaWithWrapper(`<audio controls src="${escapeHtml(url)}"></audio>`);
    } else if (type === 'video') {
      insertMediaWithWrapper(`<video controls src="${escapeHtml(url)}"></video>`);
    }
  }

  function getSelectedText(fallback) {
    const selection = window.getSelection();
    const selectedText = selection && selection.toString().trim();
    return escapeHtml(selectedText || fallback);
  }

  function handleQuoteInsert(type) {
    restoreSelection();

    if (type === 'pull') {
      insertHtml(`<blockquote class="editor-pull-quote">${getSelectedText('Pull quote')}</blockquote><p><br></p>`);
    } else if (type === 'callout') {
      insertHtml(`<div class="editor-callout">${getSelectedText('Callout block')}</div><p><br></p>`);
    } else {
      insertHtml(`<blockquote>${getSelectedText('Block quote')}</blockquote><p><br></p>`);
    }
  }

  function handleButtonInsert(style) {
    const buttonTypes = {
      subscribe: { label: 'Subscribe', className: 'editor-cta-accent' },
      'subscribe-caption': { label: 'Subscribe', className: 'editor-cta-accent', caption: 'Get every new post delivered to your inbox.' },
      'share-post': { label: 'Share post', className: 'editor-cta-outline' },
      'share-post-caption': { label: 'Share post', className: 'editor-cta-outline', caption: 'Send this post to someone who would enjoy it.' },
      'share-publication': { label: 'Share publication', className: 'editor-cta-outline' },
      'leave-comment': { label: 'Leave a comment', className: 'editor-cta-muted' },
      'send-message': { label: 'Send a message', className: 'editor-cta-muted' },
      custom: { label: 'Custom button', className: 'editor-cta-accent' },
      more: { label: 'More options', className: 'editor-cta-outline' }
    };

    const config = buttonTypes[style] || buttonTypes.custom;
    const caption = config.caption ? `<p class="editor-button-caption">${config.caption}</p>` : '';

    insertHtml(
      `<div class="editor-button-block">` +
      `<a class="editor-cta ${config.className}" href="#">${config.label}</a>` +
      caption +
      `</div><p><br></p>`
    );
  }

  function handleTemplateInsert(template) {
    const templates = {
      intro: '<p><strong>Opening thought:</strong> Start with the core idea, then explain why it matters.</p>',
      checklist: '<ul><li>Define the main point</li><li>Add supporting context</li><li>Close with a clear takeaway</li></ul>',
      note: '<div class="editor-callout"><strong>Editorial note:</strong> Add context, caveat, or update here.</div>',
      new: '<div class="editor-callout"><strong>New template</strong><br>Build a reusable section here.</div><p><br></p>'
    };

    insertHtml(templates[template] || '');
  }

  function handleTemplateAction(action) {
    if (action === 'help') {
      alert('Templates are reusable content blocks you can insert into a post.');
    }
  }

  function handleMoreInsert(action) {
    if (action === 'divider') {
      insertHtml('<hr class="editor-divider">');
    } else if (action === 'code-block') {
      insertHtml('<div class="editor-code-block"><div class="editor-code-toolbar"><span>Auto-detect <span aria-hidden="true">▼</span></span><span aria-hidden="true">⌫</span></div><pre class="editor-code-body"><code></code></pre></div><p><br></p>');
    } else if (action === 'financial-chart') {
      insertHtml('<div class="editor-widget"><strong>Financial chart</strong><p>Ticker: MNDI<br>Period: 1Y</p></div><p><br></p>');
    } else if (action === 'footnote') {
      insertHtml('<sup>1</sup><span>&nbsp;</span>');
    } else if (action === 'latex') {
      insertHtml('<div class="editor-widget"><strong>LaTeX</strong><code>E = mc^2</code></div><p><br></p>');
    } else if (action === 'poetry') {
      insertHtml('<blockquote class="editor-pull-quote editor-poetry">First line of a poem<br>Second line of a poem</blockquote><p><br></p>');
    } else if (action === 'poll') {
      insertHtml('<div class="editor-widget"><strong>Poll</strong><p>Question goes here</p><ul><li>Option one</li><li>Option two</li></ul></div><p><br></p>');
    } else if (action === 'prediction-market') {
      insertHtml('<div class="editor-widget"><strong>Prediction market</strong><p>Will this happen?</p><p>Yes / No</p></div><p><br></p>');
    } else if (action === 'recipe') {
      insertHtml('<div class="editor-widget"><strong>Recipe</strong><p>Ingredients</p><ul><li>Ingredient one</li><li>Ingredient two</li></ul><p>Steps</p><ol><li>Prepare.</li><li>Serve.</li></ol></div><p><br></p>');
    } else if (action === 'clear') {
      runCommand('removeFormat');
    }
  }

  function createCodeBlockHtml() {
    const languages = ['Auto-detect', 'Plain Text', 'JavaScript', 'TypeScript', 'JSX', 'TSX', 'Python', 'CSS', 'HTML', 'JSON', 'Bash'];
    const languageItems = languages.map((language, index) => (
      `<button class="editor-code-language-item ${index === 0 ? 'is-selected' : ''}" type="button" data-code-language="${escapeHtml(language)}">` +
      `<span>${escapeHtml(language)}</span><span class="editor-code-language-check" aria-hidden="true"></span></button>`
    )).join('');

    return (
      '<div class="editor-code-block" contenteditable="false">' +
      '<div class="editor-code-toolbar">' +
      '<div class="editor-code-language">' +
      '<button class="editor-code-language-trigger" type="button" data-code-language-trigger aria-expanded="false">' +
      '<span data-code-language-label>Auto-detect</span><span class="tool-caret editor-code-caret" aria-hidden="true"></span>' +
      '</button>' +
      `<div class="editor-code-language-menu">${languageItems}</div>` +
      '</div>' +
      '<button class="editor-code-delete" type="button" data-remove-code-block aria-label="Delete code block" title="Delete code block"><svg class="editor-code-delete-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg></button>' +
      '</div>' +
      '<pre class="editor-code-body" contenteditable="true" spellcheck="false"><code></code></pre>' +
      '</div><p><br></p>'
    );
  }

  function handleMoreInsert(action) {
    if (action === 'divider') {
      insertHtml('<hr class="editor-divider">');
    } else if (action === 'code-block') {
      insertHtml(createCodeBlockHtml());
    }
  }

  if (toolbar) {
    toolbar.addEventListener('mousedown', (event) => {
      if (event.target.closest('button')) event.preventDefault();
    });

    toolbar.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;

      const menu = button.closest('.tool-menu');

      if (button.matches('[data-menu-trigger]')) {
        const isOpening = menu && !menu.classList.contains('is-open');
        closeMenus();
        if (menu && isOpening) {
          menu.classList.add('is-open');
          button.setAttribute('aria-expanded', 'true');
        }
        return;
      }

      if (button.dataset.command) {
        if (button.dataset.command === 'createLink') {
          handleLink();
        } else {
          runCommand(button.dataset.command, button.dataset.value || null);
        }
      } else if (button.hasAttribute('data-inline-code')) {
        handleInlineCode();
      } else if (button.dataset.formatBlock) {
        runCommand('formatBlock', button.dataset.formatBlock);
        setSelectedInMenu(button, '[data-format-block]');
      } else if (button.dataset.applyColor !== undefined) {
        const color = button.dataset.color;
        
        // Update the trigger button underline color
        const menuPanel = button.closest('.tool-menu-panel');
        if (menuPanel) {
          const trigger = menuPanel.previousElementSibling;
          if (trigger && trigger.classList.contains('tool-btn')) {
            if (color) {
              trigger.style.setProperty('--underline-color', color);
            } else {
              trigger.style.removeProperty('--underline-color');
            }
          }
        }

        if (!color) {
          runCommand('removeFormat');
        } else if (button.dataset.applyColor === 'highlight') {
          runCommand('hiliteColor', color);
        } else {
          runCommand('foreColor', color);
        }
      } else if (button.dataset.inlineFormat) {
        setBaselineFormat(button.dataset.inlineFormat);
        setSelectedInMenu(button, '[data-inline-format]');
      } else if (button.dataset.insertMedia) {
        handleMedia(button.dataset.insertMedia);
      } else if (button.dataset.insertQuote) {
        handleQuoteInsert(button.dataset.insertQuote);
      } else if (button.dataset.alignCommand) {
        runCommand(button.dataset.alignCommand);
        setSelectedInMenu(button, '[data-align-command]');
      } else if (button.dataset.insertButton) {
        handleButtonInsert(button.dataset.insertButton);
      } else if (button.dataset.templateAction) {
        handleTemplateAction(button.dataset.templateAction);
      } else if (button.dataset.insertTemplate) {
        handleTemplateInsert(button.dataset.insertTemplate);
      } else if (button.dataset.insertMore) {
        handleMoreInsert(button.dataset.insertMore);
      }

      closeMenus();
    });
  }

  if (authorRow) {
    authorRow.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (!target) return;

      const removeButton = target.closest('.chip-remove');
      if (removeButton) {
        event.preventDefault();
        const chip = removeButton.closest('[data-author-chip]');
        if (chip) {
          chip.remove();
          updateAuthorMenuState();
          setSaveState(false);
        }
        return;
      }

      const trigger = target.closest('[data-author-menu-trigger]');
      if (trigger) {
        event.preventDefault();
        closeMenus();
        const addWrap = trigger.closest('.author-add-wrap');
        const isOpen = addWrap && addWrap.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', String(Boolean(isOpen)));
        updateAuthorMenuState();
        return;
      }

      const authorItem = target.closest('[data-author-name], [data-author-action]');
      if (!authorItem || authorItem.classList.contains('is-disabled')) return;

      event.preventDefault();

      if (authorItem.dataset.authorAction === 'custom') {
        const customName = prompt('Enter author name:');
        addAuthor(customName);
      } else {
        addAuthor(authorItem.dataset.authorName);
      }

      closeAuthorMenu();
    });
  }

  if (previewModal) {
    previewModal.addEventListener('click', async (event) => {
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (!target) return;

      const modeButton = target.closest('[data-preview-mode]');
      if (modeButton) {
        setPreviewMode(modeButton.dataset.previewMode || 'desktop');
        return;
      }

      if (target.closest('[data-preview-close]')) {
        closePreview();
        return;
      }

      if (target.closest('[data-share-preview]')) {
        const plainBody = previewBody ? previewBody.textContent.trim() : '';
        const shareText = [
          previewTitle ? previewTitle.textContent : 'Untitled post',
          plainBody
        ]
          .filter(Boolean)
          .join('\n\n');

        try {
          await navigator.clipboard.writeText(shareText);
          if (previewShareButton) {
            previewShareButton.textContent = 'Copied';
            window.setTimeout(() => {
              previewShareButton.textContent = 'Share';
            }, 1400);
          }
        } catch (error) {
          alert('Preview content is ready to share.');
        }
      }
    });
  }

  if (linkModal) {
    linkModal.addEventListener('click', (event) => {
      event.stopPropagation();
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (!target) return;

      if (target.closest('[data-link-close]')) {
        closeLinkModal();
      }
    });
  }

  if (linkForm) {
    linkForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!pendingLinkDraft) return;

      const url = normalizeUserUrl(linkUrlInput ? linkUrlInput.value : '');
      if (!url) {
        if (linkUrlInput) linkUrlInput.focus();
        return;
      }

      if (linkUrlInput && !linkUrlInput.checkValidity()) {
        linkUrlInput.reportValidity();
        return;
      }

      const displayText = String(linkTextInput ? linkTextInput.value : '').trim()
        || pendingLinkDraft.text
        || url.replace(/^https?:\/\//i, '');
      let link = null;
      if (pendingLinkDraft.link && pendingLinkDraft.link.isConnected) {
        link = pendingLinkDraft.link;
        link.setAttribute('href', url);
        link.textContent = displayText;
        prepareEditorLink(link);
      } else {
        link = applyLinkToRange(pendingLinkDraft.range, url, displayText);
      }
      closeLinkModal();
      if (link) showLinkBubble(link);
      saveSelection();
      setSaveState(false);
    });
  }

  if (linkBubble) {
    linkBubble.addEventListener('click', (event) => {
      event.stopPropagation();
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (!target) return;

      if (target.closest('[data-link-change]')) {
        event.preventDefault();
        if (activeLinkElement && activeLinkElement.isConnected) {
          openLinkModal(createLinkDraftFromLink(activeLinkElement));
        }
        return;
      }

      if (target.closest('[data-link-remove]')) {
        event.preventDefault();
        if (activeLinkElement && activeLinkElement.isConnected) {
          removeEditorLink(activeLinkElement);
        }
      }
    });
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!target) return;

    const isInsideLinkModal = Boolean(target.closest('[data-link-modal]'));
    const isLinkCommand = Boolean(target.closest('[data-command="createLink"]'));
    const isInsideLinkBubble = Boolean(target.closest('[data-link-bubble]'));
    const isEditorLink = Boolean(target.closest('.rich-editor a[href]'));

    if (linkModal && !linkModal.hidden && !isInsideLinkModal && !isLinkCommand) {
      closeLinkModal();
    }

    if (linkBubble && !linkBubble.hidden && !isInsideLinkBubble && !isEditorLink) {
      closeLinkBubble();
    }
  });

  if (publishModal) {
    publishModal.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (!target) return;

      if (target.closest('[data-publish-close]')) {
        closePublishModal();
        openDraftConfirmModal();
        return;
      }
      
      const actionButton = target.closest('[data-publish-action]');
      if (actionButton) {
        const action = actionButton.dataset.publishAction;
        if (action === 'publish') {
          submitForReview('publish');
        } else if (action === 'draft') {
          submitForReview('draft');
        }
      }
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.global-lang-select')) return;
    const previousCategory = document.getElementById('post_category')?.value || '';
    setTimeout(() => {
      syncOriginalLanguageWithSystem();
      syncAvailableCategoriesWithSystem(previousCategory, true);
    }, 0);
  });

  window.addEventListener('storage', event => {
    if (event.key === 'preferredLanguage') {
      const previousCategory = document.getElementById('post_category')?.value || '';
      syncOriginalLanguageWithSystem();
      syncAvailableCategoriesWithSystem(previousCategory, true);
    }
  });

  if (draftConfirmModal) {
    draftConfirmModal.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (!target) return;

      if (target.closest('[data-draft-close]')) {
        closeDraftConfirmModal();
        return;
      }

      const actionButton = target.closest('[data-draft-action]');
      if (actionButton) {
        const action = actionButton.dataset.draftAction;
        if (action === 'discard') {
          localStorage.removeItem(draftKey);
          closeDraftConfirmModal();
          localStorage.removeItem(draftKey);
          if (submittedPostId) {
            try {
              const storedPosts = JSON.parse(localStorage.getItem(submittedPostsKey) || '[]');
              if (Array.isArray(storedPosts)) {
                const nextPosts = storedPosts.filter(post => (
                  String(post.id) !== String(submittedPostId)
                  || !['draft'].includes(String(post.status || '').toLowerCase())
                ));
                localStorage.setItem(submittedPostsKey, JSON.stringify(nextPosts));
              }
            } catch (error) {
              // The local draft is already removed; continue back to the draft list.
            }
          }
          window.location.href = 'my-posts.html?status=draft';
        } else if (action === 'save') {
          submitForReview('draft');
        }
      }
    });
  }

  editor.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!target) return;

    const editorLink = target.closest('a[href]');
    if (editorLink && editor.contains(editorLink)) {
      event.preventDefault();
      showLinkBubble(editorLink);
      return;
    }

    closeLinkBubble();

    const languageTrigger = target.closest('[data-code-language-trigger]');
    if (languageTrigger) {
      event.preventDefault();
      const languageWrap = languageTrigger.closest('.editor-code-language');
      const isOpen = languageWrap.classList.toggle('is-open');
      languageTrigger.setAttribute('aria-expanded', String(isOpen));
      return;
    }

    const languageItem = target.closest('[data-code-language]');
    if (languageItem) {
      event.preventDefault();
      const languageWrap = languageItem.closest('.editor-code-language');
      const label = languageWrap.querySelector('[data-code-language-label]');
      const selectedLanguage = languageItem.getAttribute('data-code-language') || 'Auto-detect';
      if (label) label.textContent = selectedLanguage;
      languageWrap.querySelectorAll('.editor-code-language-item').forEach(item => item.classList.remove('is-selected'));
      languageItem.classList.add('is-selected');
      languageWrap.classList.remove('is-open');
      const trigger = languageWrap.querySelector('[data-code-language-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      return;
    }

    let deleteButton = target.closest('[data-remove-code-block]');
    const toolbar = target.closest('.editor-code-toolbar');
    if (!deleteButton && toolbar && target === toolbar.lastElementChild) {
      deleteButton = target;
    }
    
    if (deleteButton) {
      event.preventDefault();
      const codeBlock = deleteButton.closest('.editor-code-block');
      if (codeBlock) {
        const nextNode = codeBlock.nextElementSibling;
        codeBlock.remove();
        if (nextNode && nextNode.tagName === 'P' && !nextNode.textContent.trim()) {
          nextNode.remove();
        }
      }
      setSaveState(false);
      editor.focus({ preventScroll: true });
      return;
    }

    const mediaDeleteBtn = target.closest('[data-remove-media]');
    if (mediaDeleteBtn) {
      event.preventDefault();
      const mediaWrapper = mediaDeleteBtn.closest('.editor-media-wrapper');
      if (mediaWrapper) {
        const nextNode = mediaWrapper.nextElementSibling;
        mediaWrapper.remove();
        if (nextNode && nextNode.tagName === 'P' && !nextNode.textContent.trim()) {
          nextNode.remove();
        }
      }
      setSaveState(false);
      editor.focus({ preventScroll: true });
      return;
    }
  });

  function handleUploadedMedia(input, type) {
    if (!input) return;

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const source = escapeHtml(reader.result);
        const name = escapeHtml(file.name || '');

        if (type === 'image') {
          insertMediaWithWrapper(`<img src="${source}" alt="${name}">`);
        } else if (type === 'audio') {
          insertMediaWithWrapper(`<audio controls src="${source}" title="${name}"></audio>`);
        } else if (type === 'video') {
          insertMediaWithWrapper(`<video controls playsinline src="${source}" title="${name}"></video>`);
        }

        input.value = '';
        updateBodyLimit();
        setSaveState(false);
      });
      reader.readAsDataURL(file);
    });
  }

  handleUploadedMedia(imageInput, 'image');
  handleUploadedMedia(audioInput, 'audio');
  handleUploadedMedia(videoInput, 'video');

  if (previewLanguageSelect) {
    previewLanguageSelect.addEventListener('change', () => {
      localStorage.setItem(previewLanguageKey, previewLanguageSelect.value);
      previewTranslationCache.clear();
      renderPreview(activePreviewDraft || collectDraft());
    });
  }

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!target) return;

    if (!target.closest('.tool-menu')) closeMenus();
    if (!target.closest('[data-author-row]')) closeAuthorMenu();
    if (!target.closest('.editor-code-language')) {
      document.querySelectorAll('.editor-code-language.is-open').forEach(languageWrap => {
        languageWrap.classList.remove('is-open');
        const trigger = languageWrap.querySelector('[data-code-language-trigger]');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }

    const unsupportedBtn = target.closest('[data-unsupported-btn]');
    if (unsupportedBtn) {
      alert('Nút này chỉ mang tính chất minh họa trong chế độ xem trước (Preview) và chưa có chức năng thực tế.');
      return;
    }

    const actionBtn = target.closest('.preview-action-btn');
    if (actionBtn) {
      actionBtn.classList.toggle('is-active');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && linkModal && !linkModal.hidden) {
      closeLinkModal();
      return;
    }
    if (event.key === 'Escape' && linkBubble && !linkBubble.hidden) {
      closeLinkBubble();
      return;
    }
    if (event.key === 'Escape' && previewModal && !previewModal.hidden) {
      closePreview();
      return;
    }
    if (event.key === 'Escape' && publishModal && !publishModal.hidden) {
      closePublishModal();
      openDraftConfirmModal();
      return;
    }
    if (event.key === 'Escape' && draftConfirmModal && !draftConfirmModal.hidden) {
      closeDraftConfirmModal();
      return;
    }
  });

  document.addEventListener('selectionchange', saveSelection);
  editor.addEventListener('keyup', () => {
    saveSelection();
    updateToolbarState();
    setSaveState(false);
  });
  editor.addEventListener('mouseup', () => {
    saveSelection();
    updateToolbarState();
  });
  editor.addEventListener('input', () => {
    normalizeEditorLinks();
    setSaveState(false);
    updateBodyLimit();
  });
  editor.addEventListener('focus', saveSelection);

  editor.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount || !selection.isCollapsed) return;
      
      const range = selection.getRangeAt(0);
      let node = range.startContainer;
      if (node.nodeType === 3) node = node.parentElement;

      const linkToRemove = getBoundaryLinkFromRange(range, event.key);
      if (linkToRemove) {
        event.preventDefault();
        removeEditorLink(linkToRemove);
        return;
      }
      
      const block = node.closest('.editor-callout, .editor-pull-quote, .editor-button-block, .editor-widget, .editor-poetry');
      
      // If the block is essentially empty and user presses backspace/delete, remove the block
      if (block && block.textContent.trim() === '') {
        event.preventDefault();
        block.remove();
        
        // Ensure editor isn't completely empty
        if (!editor.innerHTML.trim() || editor.innerHTML === '<br>') {
          editor.innerHTML = '<p><br></p>';
        }
        
        // Place cursor at the end
        const newRange = document.createRange();
        newRange.selectNodeContents(editor);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        setSaveState(false);
      }
    }
  });

  [titleInput].forEach(input => {
    if (!input) return;
    input.addEventListener('input', () => {
      updateTextLimit(input, titleLimit, wordLimits.title);
      setSaveState(false);
    });
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      editor?.focus();
    });
  });

  if (saveButton) saveButton.addEventListener('click', () => submitForReview('draft'));
  if (previewButtons.length) previewButtons.forEach(btn => btn.addEventListener('click', openPreview));
  if (continueButton) {
    continueButton.addEventListener('click', (e) => {
      saveDraft();
      openPublishModal(e);
    });
  }

  const urlParams = pageParams;
  const editId = urlParams.get('edit');
  const submittedId = urlParams.get('submitted');
  const isNew = urlParams.get('new');

  if (isNew === '1') {
    localStorage.removeItem(draftKey);
    // Remove the query param from URL without reloading so subsequent refreshes don't wipe again?
    // Not strictly necessary for a mockup, but good practice
    window.history.replaceState({}, document.title, window.location.pathname);
    syncOriginalLanguageWithSystem();
    syncAvailableCategoriesWithSystem('', false);
  } else if (submittedId) {
    let submittedPost = null;
    try {
      const storedPosts = JSON.parse(localStorage.getItem(submittedPostsKey) || '[]');
      submittedPost = Array.isArray(storedPosts)
        ? storedPosts.find(item => String(item.id) === String(submittedId))
        : null;
    } catch (error) {
      submittedPost = null;
    }

    if (submittedPost) {
      if ([submittedPost.status, submittedPost.previousStatus]
        .some(status => ['approved', 'published'].includes(String(status || '').toLowerCase()))) {
        const language = localStorage.getItem('preferredLanguage') || 'en';
        const messages = {
          en: 'Approved posts can no longer be edited.',
          vi: 'Bài viết đã được duyệt không thể chỉnh sửa nữa.',
          zh: '已审核的文章无法再编辑。'
        };
        alert(messages[language] || messages.en);
        window.location.replace('my-posts.html?status=published');
        return;
      }
      if (titleInput) titleInput.value = submittedPost.title || '';
      if (Array.isArray(submittedPost.authors)) renderAuthors(submittedPost.authors);
      if (submittedPost.body) {
        editor.innerHTML = submittedPost.body;
        normalizeEditorFontMarkup();
        normalizeEditorLinks();
      }
      const categorySelect = document.getElementById('post_category');
      if (categorySelect && submittedPost.category) categorySelect.value = submittedPost.category;
      if (submittedPost.originalLanguage) {
        postOriginalLanguageOverride = submittedPost.originalLanguage;
      }
      document.querySelectorAll('input[name="allow_translate"]').forEach(checkbox => {
        checkbox.checked = Array.isArray(submittedPost.allowedTranslations)
          && submittedPost.allowedTranslations.includes(checkbox.value);
      });
      syncOriginalLanguageWithSystem();
      syncAvailableCategoriesWithSystem(submittedPost.category || '', Boolean(submittedPost.category));
      setSaveState(true);
    } else {
      loadDraft();
    }
  } else if (editId) {
    if (['1', '17'].includes(String(editId))) {
      const language = localStorage.getItem('preferredLanguage') || 'en';
      const messages = {
        en: 'Approved posts can no longer be edited.',
        vi: 'Bài viết đã được duyệt không thể chỉnh sửa nữa.',
        zh: '已审核的文章无法再编辑。'
      };
      alert(messages[language] || messages.en);
      window.location.replace('my-posts.html?status=published');
      return;
    }
    const mockPosts = {
      '1': {
        title: 'Building AI-assisted multilingual workflows',
        authors: ['Hồ Quốc Tuấn'],
        originalLanguage: 'en',
        body: '<p>Integrating AI into translation workflows completely transforms how we handle multilingual content. The traditional approach requires extensive manual effort, but with large language models, we can automate the bulk of this process while maintaining high quality.</p>'
      },
      '2': {
        title: 'Product notes for Lingora profiles',
        authors: ['Trần Thị Mai'],
        originalLanguage: 'en',
        body: '<p>When designing the new profile pages, our primary goal was to give creators a space that feels uniquely theirs. We introduced customizable headers, accent colors, and a clean typography scale that puts the content first.</p>'
      }
    };

    const postData = mockPosts[editId];
    if (postData) {
      if (titleInput) titleInput.value = postData.title;
      if (Array.isArray(postData.authors)) renderAuthors(postData.authors);
      if (postData.body) {
        editor.innerHTML = postData.body;
        normalizeEditorFontMarkup();
        normalizeEditorLinks();
      }
      postOriginalLanguageOverride = postData.originalLanguage || localStorage.getItem('preferredLanguage') || 'en' || null;
      syncOriginalLanguageWithSystem();
      syncAvailableCategoriesWithSystem(postData.category || '', Boolean(postData.category));
      setSaveState(true);
    } else {
      loadDraft();
    }
  } else {
    loadDraft();
  }
  
  // Force fixed author to current logged in user
  const currentUser = typeof window.getLingoraCurrentUser === 'function' ? window.getLingoraCurrentUser() : null;
  if (currentUser && currentUser.name) {
    renderAuthors([currentUser.name]);
  }

  updateAuthorMenuState();
  updateToolbarState();
  updateAllWritingLimits();
});
