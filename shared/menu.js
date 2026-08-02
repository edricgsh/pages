(function(){
  'use strict';

  // ─── State ───
  let open = false;
  const sidebar = document.createElement('div');
  const backdrop = document.createElement('div');
  const bar = document.createElement('div');
  const toggle = document.createElement('button');
  const homeLink = document.createElement('a');
  const BASE = '/pages/';

  // ─── Determine current slug from URL ───
  const path = window.location.pathname.replace(/\/+$/, '');
  const currentSlug = path.split('/').pop();

  // The catalogue lives at /pages/ — detect it so we don't show "back to catalogue" there
  const rel = path.replace(/^\/pages/, '');
  const isHome = rel === '' || rel === '/index.html';

  // On /pages/group/?g=<slug>, highlight that collection's heading instead —
  // no artifact slug matches there.
  const currentGroup = currentSlug === 'group'
    ? new URLSearchParams(window.location.search).get('g')
    : null;

  // ─── Build DOM elements ───

  // Top-left bar: hamburger + back-to-catalogue link
  bar.id = 'menu-bar';
  if (isHome) {
    bar.classList.add('at-home');
  } else {
    // Reserve space at the top so the bar never covers the page heading
    document.documentElement.classList.add('menu-bar-offset');
  }

  // Toggle button
  toggle.id = 'menu-toggle';
  toggle.setAttribute('aria-label', 'Toggle artifact menu');
  toggle.textContent = '☰';

  // Back to catalogue
  homeLink.id = 'menu-home';
  homeLink.href = BASE;
  homeLink.setAttribute('aria-label', 'Back to all artifacts');
  homeLink.innerHTML = '<span class="home-arrow">←</span><span class="home-label">All Artifacts</span>';

  bar.appendChild(toggle);
  bar.appendChild(homeLink);

  // Backdrop
  backdrop.id = 'menu-backdrop';

  // Sidebar
  sidebar.id = 'menu-sidebar';

  // Header
  const header = document.createElement('div');
  header.className = 'menu-header';
  header.innerHTML = '<h2>📚 Research Artifacts</h2>';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'menu-close';
  closeBtn.setAttribute('aria-label', 'Close menu');
  closeBtn.textContent = '✕';
  header.appendChild(closeBtn);
  sidebar.appendChild(header);

  // Home link inside the sidebar
  const sidebarHome = document.createElement('a');
  sidebarHome.className = 'menu-home-link';
  sidebarHome.href = BASE;
  sidebarHome.innerHTML = '<span>🏠</span><span>All Artifacts — Home</span>';
  if (!isHome) sidebar.appendChild(sidebarHome);

  // List container
  const list = document.createElement('div');
  list.className = 'menu-list';

  // Footer
  const footer = document.createElement('div');
  footer.className = 'menu-footer';
  footer.textContent = '🔒 password: recon2026';

  sidebar.appendChild(list);
  sidebar.appendChild(footer);

  // ─── Fetch manifest ───
  // The manifest is encrypted too — otherwise every artifact title and
  // description would still be sitting in the open for crawlers.
  async function loadManifest() {
    try {
      const res = await fetch(BASE + 'manifest.enc');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const enc = await res.text();

      const pw = window.PagesCrypto && window.PagesCrypto.getStoredPassword();
      if (!pw) throw new Error('locked');

      const json = await window.PagesCrypto.decrypt(enc, pw);
      if (!json) throw new Error('decrypt failed');

      renderList(JSON.parse(json));
    } catch (err) {
      list.innerHTML = '<div class="menu-empty" style="padding:20px;font-size:13px;">⚠️ Could not load artifacts list.</div>';
    }
  }

  // The sidebar mirrors the catalogue's grouping: a heading per collection
  // (itself a link to that collection's page), artifacts underneath in the
  // manifest's `order`, and anything without a group collected at the end.
  function renderList(data) {
    const pages = data.pages || [];
    const groups = data.groups || [];
    list.innerHTML = '';

    const byGroup = new Map(groups.map(g => [g.slug, []]));
    const ungrouped = [];
    pages.forEach(p => {
      const bucket = p.group && byGroup.get(p.group);
      (bucket || ungrouped).push(p);
    });
    byGroup.forEach(arr => arr.sort((a, b) => (a.order || 99) - (b.order || 99)));

    groups.forEach(g => {
      const members = byGroup.get(g.slug);
      if (!members.length) return;
      const label = document.createElement('a');
      label.className = 'menu-group-label';
      label.href = BASE + 'group/?g=' + encodeURIComponent(g.slug);
      label.textContent = (g.emoji ? g.emoji + ' ' : '') + g.title;
      if (g.slug === currentGroup) label.classList.add('active');
      list.appendChild(label);
      members.forEach(p => list.appendChild(itemEl(p)));
    });

    if (ungrouped.length) {
      if (groups.length) {
        const label = document.createElement('div');
        label.className = 'menu-group-label';
        label.textContent = 'Unfiled';
        list.appendChild(label);
      }
      ungrouped.forEach(p => list.appendChild(itemEl(p)));
    }
  }

  function itemEl(p) {
    const a = document.createElement('a');
    a.className = 'menu-item';
    a.href = BASE + p.slug + '/';
    if (p.slug === currentSlug) a.classList.add('active');

    a.innerHTML = `
        <span class="item-emoji">${p.emoji || '📄'}</span>
        <span class="item-text">
          <div class="item-title">${escapeHtml(p.title)}</div>
          <div class="item-desc">${escapeHtml(p.description)}</div>
        </span>
      `;
    return a;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ─── Open/close ───
  function openMenu() {
    open = true;
    sidebar.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    open = false;
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    open ? closeMenu() : openMenu();
  }

  // ─── Events ───
  toggle.addEventListener('click', toggleMenu);
  closeBtn.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && open) closeMenu();
  });

  // ─── Append to DOM ───
  document.body.appendChild(bar);
  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);

  // ─── Keep the bar hidden while the password gate is up ───
  // Two gate flavours in the wild: `#password-gate` (toggled via .hidden) and
  // `.pw-gate` (the React page, which unmounts the node entirely on unlock).
  const GATE_SELECTOR = '#password-gate, .pw-gate';

  function watchGate() {
    let queued = false;

    function sync() {
      queued = false;
      const gate = document.querySelector(GATE_SELECTOR);
      const locked = !!gate &&
                     !gate.classList.contains('hidden') &&
                     getComputedStyle(gate).display !== 'none';
      // Only write when it actually changes — the observer below watches us too
      const want = locked ? 'none' : '';
      if (bar.style.display !== want) bar.style.display = want;
      if (locked && open) closeMenu();
    }

    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(sync);
    }

    sync();
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  // ─── Init ───
  function init() {
    watchGate();
    loadManifest();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
