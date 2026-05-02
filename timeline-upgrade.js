/* ============================================================
   HISTORY TIMELINE — DROP-IN UPGRADE SCRIPT
   ------------------------------------------------------------
   Add this just before </body>:
       <script src="timeline-upgrade.js" defer></script>

   It reads your existing markup — <nav class="main-nav">, every
   <section id="...">, and every <table> — and wires up:
     • A new sticky topbar with live search
     • A side-drawer nav rebuilt from your existing menu
     • A filter chip bar (toggle which sections are visible)
     • Collapsible sections (click any section heading)
     • Back-to-top button
     • Cmd/Ctrl-K to focus search, Esc to clear

   No HTML changes required.
   ============================================================ */

(function () {
  'use strict';

  // -----------------------------------------------------------
  // 1. INJECT TOPBAR + SIDE NAV + FILTER BAR + BACK-TO-TOP
  // -----------------------------------------------------------
  function buildChrome() {
    // Build side nav by cloning the original .menu structure.
    // This way we automatically get every section the user added,
    // even ones I haven't seen.
    const originalMenu = document.querySelector('nav.main-nav .menu');
    let sideNavHTML = '';

    if (originalMenu) {
      sideNavHTML = '<button class="tu-sidenav-close" aria-label="Close">&times;</button>';
      originalMenu.querySelectorAll(':scope > li').forEach(li => {
        const dropdown = li.querySelector(':scope > .dropdown-menu');
        const topLink = li.querySelector(':scope > a');
        if (dropdown) {
          // Category with children
          const label = topLink ? topLink.textContent.trim() : '';
          sideNavHTML += `<h3>${escapeHTML(label)}</h3><ul>`;
          dropdown.querySelectorAll('a').forEach(a => {
            sideNavHTML += `<li><a href="${a.getAttribute('href')}">${escapeHTML(a.textContent.trim())}</a></li>`;
          });
          sideNavHTML += '</ul>';
        } else if (topLink) {
          // Standalone link — group into "Other"
          sideNavHTML += `<ul><li><a href="${topLink.getAttribute('href')}">${escapeHTML(topLink.textContent.trim())}</a></li></ul>`;
        }
      });
    } else {
      // Fallback: build from sections
      sideNavHTML = '<button class="tu-sidenav-close" aria-label="Close">&times;</button><h3>Sections</h3><ul>';
      document.querySelectorAll('section[id]').forEach(s => {
        const heading = s.querySelector('h2');
        if (heading) {
          sideNavHTML += `<li><a href="#${s.id}">${escapeHTML(heading.textContent.trim())}</a></li>`;
        }
      });
      sideNavHTML += '</ul>';
    }

    const topbar = document.createElement('header');
    topbar.className = 'tu-topbar';
    topbar.innerHTML = `
      <div class="tu-topbar-inner">
        <a href="#tu-top" class="tu-brand">
          <span class="tu-brand-mark">⌘</span><span class="tu-brand-text-long">History Timeline</span>
        </a>
        <div class="tu-search-wrap">
          <span class="tu-search-icon">⌕</span>
          <input type="search" id="tuSearch" class="tu-search"
                 placeholder="Search events, civilizations, rulers…"
                 aria-label="Search timeline">
          <span class="tu-search-count" id="tuSearchCount"></span>
        </div>
        <button class="tu-filter-toggle" id="tuFilterToggle" aria-label="Filter sections">⚑ Filter</button>
        <button class="tu-nav-toggle" id="tuNavToggle" aria-label="Open navigation">☰ Sections</button>
      </div>
      <div class="tu-filterbar" id="tuFilterbar">
        <div class="tu-filterbar-inner">
          <span class="tu-filterbar-label">Show only:</span>
          <div id="tuChips" style="display:flex;flex-wrap:wrap;gap:0.5rem;"></div>
          <button class="tu-chip-clear" id="tuChipClear">Show all</button>
        </div>
      </div>
    `;

    const scrim = document.createElement('div');
    scrim.className = 'tu-scrim';
    scrim.id = 'tuScrim';

    const sidenav = document.createElement('aside');
    sidenav.className = 'tu-sidenav';
    sidenav.id = 'tuSidenav';
    sidenav.setAttribute('aria-label', 'Section navigation');
    sidenav.innerHTML = sideNavHTML;

    const toTop = document.createElement('button');
    toTop.className = 'tu-to-top';
    toTop.id = 'tuToTop';
    toTop.setAttribute('aria-label', 'Back to top');
    toTop.textContent = '↑';

    // Insert at the very top so the topbar is sticky from the start
    document.body.insertBefore(topbar, document.body.firstChild);
    document.body.appendChild(scrim);
    document.body.appendChild(sidenav);
    document.body.appendChild(toTop);

    // Anchor for the brand "back to top"
    const anchor = document.createElement('div');
    anchor.id = 'tu-top';
    topbar.parentNode.insertBefore(anchor, topbar);
  }

  // -----------------------------------------------------------
  // 2. WRAP EXISTING SECTIONS so they get the new layout & collapse
  // -----------------------------------------------------------
  function enhanceSections() {
    document.querySelectorAll('section[id]').forEach(section => {
      section.classList.add('tu-section');

      // Find this section's heading and make it a collapse trigger.
      // The original markup uses h2 with the same id as the section,
      // sometimes with class="collapsible". We hook click on it.
      const heading = section.querySelector(':scope > h2[id], :scope > h2.collapsible, :scope > h2');
      if (heading) {
        heading.style.cursor = 'pointer';
        heading.addEventListener('click', () => {
          section.classList.toggle('collapsed');
        });
      }
    });

    // Wrap every table in a horizontal-scroll container so wide tables
    // don't break mobile layout.
    document.querySelectorAll('section table').forEach(t => {
      if (t.parentElement.classList.contains('tu-table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'tu-table-wrap';
      t.parentNode.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
  }

  // -----------------------------------------------------------
  // 3. FILTER CHIPS — toggle which sections are visible
  // -----------------------------------------------------------
  // Group sections into themes the user can filter by.
  // The keys are display labels; the values are the section IDs
  // (taken from your existing nav).
  const FILTER_GROUPS = {
    'Civilizations': [
      'Sumerians','Akkadians','Elamites','Babylonians','Assyrians','Hittites',
      'Canaanites','Phoenicians','Israel','Judah','Moabites','Edomites','Ammonites',
      'Persians','SeaPeoples','Egyptians','Nubian_Kingdoms','Minoans','Mycenaeans',
      'Greeks','Carthaginians','Romans','indus_valley','shang_zhou'
    ],
    'Religions': [
      'Judaism','JewishApocrypha','Mithraism','Gnosticism','Christianity',
      'Orthodoxy','Catholics','Protestants','Islam','Bahai','Esoteric','Philosophy'
    ],
    'Wars & Conflict': ['Wars','IronAgeWars'],
    'Texts': ['Texts','Bibles'],
    'Science & Tech': ['technology','Science','AncientWonders','HeroicLegendsComparison'],
    'Rulers': ['Rulers'],
    'Linguistics': ['Linguistics'],
  };

  function buildFilterChips() {
    const chipsBox = document.getElementById('tuChips');
    if (!chipsBox) return;
    Object.keys(FILTER_GROUPS).forEach(label => {
      // Only show a chip if at least one of its sections actually exists
      const hasAny = FILTER_GROUPS[label].some(id => document.getElementById(id));
      if (!hasAny) return;
      const btn = document.createElement('button');
      btn.className = 'tu-chip';
      btn.textContent = label;
      btn.dataset.group = label;
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        applyFilters();
      });
      chipsBox.appendChild(btn);
    });
    document.getElementById('tuChipClear').addEventListener('click', () => {
      chipsBox.querySelectorAll('.tu-chip.active').forEach(c => c.classList.remove('active'));
      applyFilters();
    });
  }

  function applyFilters() {
    const active = Array.from(document.querySelectorAll('#tuChips .tu-chip.active'))
      .map(c => c.dataset.group);

    if (active.length === 0) {
      // No filter → show everything
      document.querySelectorAll('section[id]').forEach(s => s.classList.remove('tu-hidden'));
      return;
    }

    // Collect all section IDs that should be visible
    const visibleIds = new Set();
    active.forEach(group => {
      FILTER_GROUPS[group].forEach(id => visibleIds.add(id));
    });

    document.querySelectorAll('section[id]').forEach(s => {
      if (visibleIds.has(s.id)) {
        s.classList.remove('tu-hidden');
      } else {
        s.classList.add('tu-hidden');
      }
    });
  }

  // -----------------------------------------------------------
  // 4. SIDE NAV OPEN/CLOSE
  // -----------------------------------------------------------
  function wireSideNav() {
    const sidenav = document.getElementById('tuSidenav');
    const scrim = document.getElementById('tuScrim');
    const toggle = document.getElementById('tuNavToggle');
    const closeBtn = sidenav.querySelector('.tu-sidenav-close');

    function open()  { sidenav.classList.add('open');    scrim.classList.add('show'); }
    function close() { sidenav.classList.remove('open'); scrim.classList.remove('show'); }

    toggle.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    scrim.addEventListener('click', close);
    sidenav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  // -----------------------------------------------------------
  // 5. FILTER BAR TOGGLE
  // -----------------------------------------------------------
  function wireFilterBar() {
    const btn = document.getElementById('tuFilterToggle');
    const bar = document.getElementById('tuFilterbar');
    btn.addEventListener('click', () => {
      bar.classList.toggle('open');
      btn.classList.toggle('active');
    });
  }

  // -----------------------------------------------------------
  // 6. LIVE SEARCH
  // -----------------------------------------------------------
  // We snapshot the original innerHTML of every searchable element
  // ONCE so we can cleanly strip <mark> tags between keystrokes
  // without losing nested HTML (links, spans, etc.).
  let searchables = [];
  function indexSearchables() {
    searchables = [];
    // Search at the granularity of table rows + paragraphs.
    document.querySelectorAll('section table tbody tr').forEach(tr => {
      searchables.push({ el: tr, original: tr.innerHTML, text: tr.textContent.toLowerCase() });
    });
    document.querySelectorAll('section .content > p').forEach(p => {
      searchables.push({ el: p, original: p.innerHTML, text: p.textContent.toLowerCase() });
    });
  }

  function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function runSearch(q) {
    q = q.trim().toLowerCase();
    const countEl = document.getElementById('tuSearchCount');

    if (!q) {
      searchables.forEach(item => {
        item.el.innerHTML = item.original;
        item.el.classList.remove('tu-dimmed');
      });
      countEl.textContent = '';
      return;
    }

    let hits = 0;
    // The regex (?![^<]*>) skips matches that fall inside an HTML tag's
    // attributes — important because we're replacing inside innerHTML.
    const highlightRE = new RegExp('(?![^<]*>)' + escapeRegex(q), 'gi');

    searchables.forEach(item => {
      if (item.text.includes(q)) {
        item.el.innerHTML = item.original.replace(
          highlightRE,
          m => `<mark class="tu-hit">${m}</mark>`
        );
        item.el.classList.remove('tu-dimmed');
        hits++;
      } else {
        item.el.innerHTML = item.original;
        item.el.classList.add('tu-dimmed');
      }
    });

    countEl.textContent = hits + ' match' + (hits === 1 ? '' : 'es');

    // Auto-expand any section that contains a hit
    document.querySelectorAll('section.tu-section.collapsed').forEach(sec => {
      const hasHit = sec.querySelector('tr:not(.tu-dimmed), p:not(.tu-dimmed)');
      if (hasHit) sec.classList.remove('collapsed');
    });
  }

  function wireSearch() {
    const search = document.getElementById('tuSearch');
    let timer;
    search.addEventListener('input', e => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch(e.target.value), 120);
    });
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        search.focus();
        search.select();
      }
      if (e.key === 'Escape' && document.activeElement === search) {
        search.value = '';
        runSearch('');
        search.blur();
      }
    });
  }

  // -----------------------------------------------------------
  // 7. BACK TO TOP
  // -----------------------------------------------------------
  function wireBackToTop() {
    const btn = document.getElementById('tuToTop');
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // -----------------------------------------------------------
  // INIT
  // -----------------------------------------------------------
  function init() {
    buildChrome();
    enhanceSections();
    buildFilterChips();
    wireSideNav();
    wireFilterBar();
    indexSearchables();
    wireSearch();
    wireBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
