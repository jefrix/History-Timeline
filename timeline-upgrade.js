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
  // 0. HISTORICAL DATE PARSER
  // -----------------------------------------------------------
  // Parses every date format I observed in the original file
  // (e.g. "200,000 BCE", "c. 115,000-11,700 BCE", "circa 1230-1200 BCE",
  // "1184 BCE (approx.)", "10th-8th centuries BCE", "c. 100 CE - 940 CE")
  // and returns {start, end} in signed years (BCE = negative, CE = positive),
  // or null if no parseable date is found.
  function parseHistoricalDate(text) {
    if (!text) return null;
    let s = text
      .replace(/\u00a0/g, ' ')
      .replace(/[\u2013\u2014]/g, '-')        // en/em dash -> hyphen
      .replace(/\(approx\.?\)/gi, '')
      .replace(/\bcirca\b/gi, '')
      .replace(/\bc\.\s*/gi, '')
      .replace(/[~]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Centuries: "10th century BCE" / "10th-8th centuries BCE"
    const cent = s.match(/(\d+)(?:st|nd|rd|th)\s*(?:-\s*(\d+)(?:st|nd|rd|th))?\s*centur(?:y|ies)\s*(BCE|CE|BC|AD)/i);
    if (cent) {
      const era = /BCE|BC/i.test(cent[3]) ? -1 : 1;
      const c1 = parseInt(cent[1], 10);
      const c2 = cent[2] ? parseInt(cent[2], 10) : c1;
      if (era < 0) {
        const startYear = -(Math.max(c1, c2)) * 100;
        const endYear   = -((Math.min(c1, c2) - 1) * 100 + 1);
        return { start: startYear, end: endYear };
      } else {
        const startYear = (Math.min(c1, c2) - 1) * 100 + 1;
        const endYear   = Math.max(c1, c2) * 100;
        return { start: startYear, end: endYear };
      }
    }

    // Pull out all "<number> [BCE|CE]" tokens in order
    const tokens = [];
    const re = /(\d[\d,]*)\s*(BCE|BC|CE|AD)?/gi;
    let m;
    while ((m = re.exec(s)) !== null) {
      const n = parseInt(m[1].replace(/,/g, ''), 10);
      if (isNaN(n)) continue;
      tokens.push({ n, era: m[2] ? m[2].toUpperCase() : null });
    }
    if (tokens.length === 0) return null;

    // Find rightmost era marker — that's the default era
    let lastEra = null;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i].era) { lastEra = tokens[i].era; break; }
    }
    if (!lastEra) return null;

    // Each token inherits the era of the next-rightward marker
    let inherited = lastEra;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i].era) inherited = tokens[i].era;
      tokens[i].resolvedEra = inherited;
    }
    function toYear(t) {
      const sign = (t.resolvedEra === 'BCE' || t.resolvedEra === 'BC') ? -1 : 1;
      return sign * t.n;
    }

    if (tokens.length === 1) {
      const y = toYear(tokens[0]);
      return { start: y, end: y };
    }
    const a = toYear(tokens[0]);
    const b = toYear(tokens[1]);
    return { start: Math.min(a, b), end: Math.max(a, b) };
  }

  // -----------------------------------------------------------
  // SLIDER STATE
  // -----------------------------------------------------------
  // We use a non-linear (logarithmic) scale because dates span
  // 200,000 BCE to 2025 CE — far too wide for a linear slider.
  // Pre-history compresses, the historical era expands.
  const SLIDER_MIN_YEAR = -200000;   // 200,000 BCE
  const SLIDER_MAX_YEAR = 2025;
  const SLIDER_STEPS = 1000;          // 0..1000 maps to year range

  // Era markers shown on the slider track
  const ERAS = [
    { label: 'Stone Age',     start: -200000, end: -3300 },
    { label: 'Bronze Age',    start: -3300,   end: -1200 },
    { label: 'Iron Age',      start: -1200,   end: 500   },
    { label: 'Middle Ages',   start: 500,     end: 1500  },
    { label: 'Early Modern',  start: 1500,    end: 1800  },
    { label: 'Modern',        start: 1800,    end: 2025  },
  ];

  // Map slider step (0..1000) -> year, using a piecewise scale that
  // gives each major era roughly proportional space:
  //   0%     -> 200,000 BCE
  //   25%    -> 10,000 BCE   (deep prehistory compressed)
  //   55%    -> 1 CE         (antiquity gets the most room)
  //   75%    -> 1500 CE      (medieval / early modern)
  //   100%   -> 2025 CE
  function stepToYear(step) {
    const t = step / SLIDER_STEPS;
    if (t <= 0.25) {
      // 200,000 BCE -> 10,000 BCE, log-warped so deep past compresses
      const lt = t / 0.25;
      const yMax = 200000, yMin = 10000;
      const logY = Math.log(yMax) - lt * (Math.log(yMax) - Math.log(yMin));
      return Math.round(-Math.exp(logY));
    } else if (t <= 0.55) {
      // 10,000 BCE -> 1 CE (linear, antiquity)
      const lt = (t - 0.25) / 0.30;
      return Math.round(-10000 + lt * 10001);
    } else if (t <= 0.75) {
      // 1 CE -> 1500 CE (linear)
      const lt = (t - 0.55) / 0.20;
      return Math.round(1 + lt * 1499);
    } else {
      // 1500 CE -> 2025 CE (linear)
      const lt = (t - 0.75) / 0.25;
      return Math.round(1500 + lt * 525);
    }
  }
  function yearToStep(year) {
    if (year <= -10000) {
      const yMax = 200000, yMin = 10000;
      const lt = (Math.log(yMax) - Math.log(-year)) / (Math.log(yMax) - Math.log(yMin));
      return Math.round(lt * 0.25 * SLIDER_STEPS);
    } else if (year <= 0) {
      // -10000 .. 0
      const lt = (year + 10000) / 10000;
      return Math.round((0.25 + lt * 0.30) * SLIDER_STEPS);
    } else if (year <= 1500) {
      const lt = (year - 1) / 1499;
      return Math.round((0.55 + lt * 0.20) * SLIDER_STEPS);
    } else {
      const lt = (year - 1500) / 525;
      return Math.round((0.75 + lt * 0.25) * SLIDER_STEPS);
    }
  }
  function formatYear(year) {
    if (year < 0) {
      return Math.abs(year).toLocaleString() + ' BCE';
    }
    return year.toLocaleString() + ' CE';
  }

  // Index of every dated row on the page: its date range + element
  let datedRows = [];
  let currentYear = null;   // null = slider inactive (show everything)


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
        <button class="tu-time-toggle" id="tuTimeToggle" aria-label="Time slider">⏱ Time</button>
        <button class="tu-filter-toggle" id="tuFilterToggle" aria-label="Filter sections">⚑ Filter</button>
        <button class="tu-nav-toggle" id="tuNavToggle" aria-label="Open navigation">☰ Sections</button>
      </div>
      <div class="tu-timebar" id="tuTimebar">
        <div class="tu-timebar-inner">
          <button class="tu-time-clear" id="tuTimeClear" title="Show all dates">✕</button>
          <span class="tu-time-readout" id="tuTimeReadout">200,000 BCE</span>
          <input type="range" min="0" max="${SLIDER_STEPS}" value="0" step="1"
                 class="tu-time-slider" id="tuTimeSlider"
                 aria-label="Year slider">
          <span class="tu-time-count" id="tuTimeCount"></span>
        </div>
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
  // 1b. INJECT TIME EXPLORER PANEL
  // A standalone widget at the top of the content with a wider
  // slider, era band markers, and a count of visible items.
  // -----------------------------------------------------------
  function buildTimeExplorer() {
    const panel = document.createElement('section');
    panel.className = 'tu-explorer';
    panel.id = 'tuExplorer';

    // Build era band markers (Stone Age, Bronze Age, etc.) positioned
    // on the slider track using the same log scale as the slider.
    let eraBands = '';
    ERAS.forEach(era => {
      const startPct = (yearToStep(era.start) / SLIDER_STEPS) * 100;
      const endPct = (yearToStep(era.end) / SLIDER_STEPS) * 100;
      const width = endPct - startPct;
      eraBands += `
        <div class="tu-era-band" style="left:${startPct}%; width:${width}%;">
          <span class="tu-era-label">${era.label}</span>
        </div>`;
    });

    panel.innerHTML = `
      <div class="tu-explorer-header">
        <h2 style="cursor:default;border:none;padding:0;margin:0;">Time Explorer</h2>
        <p class="tu-explorer-help">Drag the slider to a year. The matching event from the master timeline will appear below. The scale gives more room to recent millennia than to the deep past.</p>
      </div>
      <div class="tu-explorer-readout">
        <button class="tu-explorer-step" data-dir="-1" aria-label="Earlier">‹</button>
        <span class="tu-explorer-year" id="tuExplorerYear">All time</span>
        <button class="tu-explorer-step" data-dir="1" aria-label="Later">›</button>
        <button class="tu-explorer-reset" id="tuExplorerReset" title="Show all dates">Reset</button>
      </div>
      <div class="tu-explorer-track-wrap">
        <div class="tu-era-bands">${eraBands}</div>
        <input type="range" min="0" max="${SLIDER_STEPS}" value="0" step="1"
               class="tu-explorer-slider" id="tuExplorerSlider"
               aria-label="Year slider">
        <div class="tu-explorer-ticks">
          <span>200K BCE</span>
          <span>10K BCE</span>
          <span>3000 BCE</span>
          <span>1000 BCE</span>
          <span>1 CE</span>
          <span>1500 CE</span>
          <span>2025 CE</span>
        </div>
      </div>
      <div class="tu-explorer-stats" id="tuExplorerStats">
        Loading dated events…
      </div>
      <div class="tu-matches" id="tuMatches"></div>
    `;

    // Insert after the very first <h1>/<h2>/<h4> intro headings,
    // before the first <section>.
    const firstSection = document.querySelector('section[id]');
    if (firstSection) {
      firstSection.parentNode.insertBefore(panel, firstSection);
    } else {
      document.body.appendChild(panel);
    }
  }

  // -----------------------------------------------------------
  // INDEX dated rows from the MAIN cultural-change table only.
  // The per-civilization tables are too detailed to be useful
  // here — the user wants a curated "what was happening then"
  // view, which is exactly what the first table already provides.
  //
  // Strategy: find the first <table> in the document that has at
  // least 5 rows whose first cell parses as a date. That's almost
  // certainly the main "Timeline of Ancient Human Cultural Change"
  // table regardless of where it appears or what id its section has.
  // -----------------------------------------------------------
  function indexDatedRows() {
    datedRows = [];
    const tables = document.querySelectorAll('section table');
    let mainTable = null;
    for (const t of tables) {
      let dateCount = 0;
      t.querySelectorAll('tr').forEach(tr => {
        if (tr.querySelector('th')) return;
        const td = tr.querySelector('td');
        if (td && parseHistoricalDate(td.textContent)) dateCount++;
      });
      if (dateCount >= 5) { mainTable = t; break; }
    }
    if (!mainTable) return;

    mainTable.querySelectorAll('tr').forEach(tr => {
      if (tr.querySelector('th')) return;
      const firstCell = tr.querySelector('td');
      if (!firstCell) return;
      const range = parseHistoricalDate(firstCell.textContent);
      if (range) {
        datedRows.push({
          tr,
          range,
          dateText: firstCell.textContent.trim(),
          // Snapshot the event cell once so we can re-display it
          // without disturbing the original row (no <mark> tags etc.)
          eventHTML: tr.querySelectorAll('td')[1]?.innerHTML || ''
        });
      }
    });
  }

  // -----------------------------------------------------------
  // APPLY the slider: instead of dimming/highlighting rows in
  // the table (which forced the user to scroll to find matches),
  // we render the matching rows in a card directly under the slider.
  // The original table rows stay visible and unchanged.
  // null currentYear = slider inactive, hide the matches card.
  // -----------------------------------------------------------
  function applyTimeFilter() {
    const total = datedRows.length;
    const matchesBox = document.getElementById('tuMatches');
    const statsEl = document.getElementById('tuExplorerStats');

    if (currentYear === null) {
      matchesBox.innerHTML = '';
      matchesBox.classList.remove('has-matches');
      document.getElementById('tuTimeCount').textContent = '';
      statsEl.innerHTML =
        `Drag the slider to surface events from the master timeline (${total} dated entries).`;
      return;
    }

    // Find every dated row whose range includes currentYear
    const hits = datedRows.filter(({ range }) =>
      currentYear >= range.start && currentYear <= range.end
    );

    document.getElementById('tuTimeCount').textContent =
      hits.length + ' / ' + total;

    if (hits.length === 0) {
      // Find the nearest row(s) before and after, so the user gets
      // helpful context instead of "nothing happened"
      let nearestBefore = null, nearestAfter = null;
      datedRows.forEach(r => {
        if (r.range.end < currentYear) {
          if (!nearestBefore || r.range.end > nearestBefore.range.end) nearestBefore = r;
        } else if (r.range.start > currentYear) {
          if (!nearestAfter || r.range.start < nearestAfter.range.start) nearestAfter = r;
        }
      });
      statsEl.innerHTML =
        `<strong>0</strong> events recorded at exactly ${formatYear(currentYear)}.`;
      let html = '<div class="tu-matches-empty">Nothing in the master timeline overlaps this exact year.</div>';
      if (nearestBefore || nearestAfter) {
        html += '<div class="tu-matches-context">Nearest entries:</div>';
        html += '<div class="tu-matches-list">';
        if (nearestBefore) html += renderMatchCard(nearestBefore, 'before');
        if (nearestAfter)  html += renderMatchCard(nearestAfter, 'after');
        html += '</div>';
      }
      matchesBox.innerHTML = html;
      matchesBox.classList.add('has-matches');
      return;
    }

    statsEl.innerHTML =
      `<strong>${hits.length}</strong> ` +
      (hits.length === 1 ? 'event overlaps' : 'events overlap') +
      ` ${formatYear(currentYear)}.`;
    matchesBox.innerHTML =
      '<div class="tu-matches-list">' +
      hits.map(h => renderMatchCard(h, 'hit')).join('') +
      '</div>';
    matchesBox.classList.add('has-matches');
  }

  function renderMatchCard(item, kind) {
    return `
      <div class="tu-match tu-match-${kind}">
        <div class="tu-match-date">${escapeHTML(item.dateText)}</div>
        <div class="tu-match-event">${item.eventHTML}</div>
      </div>`;
  }

  // -----------------------------------------------------------
  // WIRE up the topbar slider + explorer panel slider so they stay
  // in sync, and the time-toggle button shows/hides the bar.
  // -----------------------------------------------------------
  function wireTimeSlider() {
    const topbarSlider = document.getElementById('tuTimeSlider');
    const explorerSlider = document.getElementById('tuExplorerSlider');
    const readout = document.getElementById('tuTimeReadout');
    const explorerYear = document.getElementById('tuExplorerYear');
    const timebar = document.getElementById('tuTimebar');
    const timeToggle = document.getElementById('tuTimeToggle');
    const timeClear = document.getElementById('tuTimeClear');

    function setStep(step, sourceEl) {
      currentYear = stepToYear(step);
      readout.textContent = formatYear(currentYear);
      explorerYear.textContent = formatYear(currentYear);
      if (topbarSlider !== sourceEl) topbarSlider.value = step;
      if (explorerSlider !== sourceEl) explorerSlider.value = step;
      applyTimeFilter();
    }

    function clearSlider() {
      currentYear = null;
      readout.textContent = 'All time';
      explorerYear.textContent = 'All time';
      topbarSlider.value = 0;
      explorerSlider.value = 0;
      applyTimeFilter();
    }

    topbarSlider.addEventListener('input', e => setStep(parseInt(e.target.value, 10), e.target));
    explorerSlider.addEventListener('input', e => setStep(parseInt(e.target.value, 10), e.target));
    timeClear.addEventListener('click', clearSlider);
    document.getElementById('tuExplorerReset').addEventListener('click', clearSlider);

    // Step buttons in the explorer panel
    document.querySelectorAll('.tu-explorer-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = parseInt(btn.dataset.dir, 10);
        const cur = parseInt(explorerSlider.value, 10);
        const next = Math.max(0, Math.min(SLIDER_STEPS, cur + dir * 10));
        setStep(next, null);
      });
    });

    // Toggle the topbar timebar
    timeToggle.addEventListener('click', () => {
      timebar.classList.toggle('open');
      timeToggle.classList.toggle('active');
    });

    // Initialize readout
    clearSlider();
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
    buildTimeExplorer();
    enhanceSections();
    buildFilterChips();
    wireSideNav();
    wireFilterBar();
    indexSearchables();
    indexDatedRows();
    wireSearch();
    wireTimeSlider();
    wireBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
