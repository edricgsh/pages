(function(){
  'use strict';

  // ─── State ───
  let open = false;
  const sidebar = document.createElement('div');
  const backdrop = document.createElement('div');
  const toggle = document.createElement('button');
  const BASE = '/pages/';

  // ─── Determine current slug from URL ───
  const path = window.location.pathname.replace(/\/+$/, '');
  const currentSlug = path.split('/').pop();

  // ─── Build DOM elements ───

  // Toggle button
  toggle.id = 'menu-toggle';
  toggle.setAttribute('aria-label', 'Toggle artifact menu');
  toggle.textContent = '☰';

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
  async function loadManifest() {
    try {
      const res = await fetch(BASE + 'manifest.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      renderList(data.pages);
    } catch (err) {
      list.innerHTML = '<div style="padding:20px;color:#888;font-size:13px;">⚠️ Could not load artifacts list.</div>';
    }
  }

  function renderList(pages) {
    list.innerHTML = '';
    pages.forEach(p => {
      const a = document.createElement('a');
      a.className = 'menu-item';
      a.href = BASE + p.slug + '/';

      const isActive = p.slug === currentSlug;
      if (isActive) a.classList.add('active');

      const emoji = p.emoji || '📄';
      a.innerHTML = `
        <span class="item-emoji">${emoji}</span>
        <span class="item-text">
          <div class="item-title">${escapeHtml(p.title)}</div>
          <div class="item-desc">${escapeHtml(p.description)}</div>
        </span>
      `;
      list.appendChild(a);
    });
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
  document.body.appendChild(toggle);
  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);

  // ─── Init ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadManifest);
  } else {
    loadManifest();
  }
})();
