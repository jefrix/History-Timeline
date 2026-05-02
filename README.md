# History Timeline — Drop-in Upgrade

Three files that bolt onto your existing `index.html` and add:

- A sticky topbar with **live search** across every event (Cmd/Ctrl-K to focus, Esc to clear)
- A **side-drawer navigation** rebuilt automatically from your existing `<nav class="main-nav">` menu
- A **filter chip bar** that lets readers show only Civilizations, Religions, Wars, Texts, etc.
- A **Time Explorer slider** — drag a handle along a timeline from 200,000 BCE to 2025 CE, and the matching event(s) from the master timeline appear in a card directly below the slider
- **Collapsible sections** — click any section heading to expand/collapse
- A **back-to-top** button
- The new dark-ink + parchment + gold aesthetic, applied automatically to every existing `<table>` and `<section>`

No HTML restructuring required. The script reads your existing markup at load time.

---

## Installation (3 steps)

### 1. Drop the two files into your repo root

Place `timeline-upgrade.css` and `timeline-upgrade.js` next to your `index.html`.

### 2. Add two lines to `index.html`

In the `<head>`, after your existing `<style>` block, add:

```html
<link rel="stylesheet" href="timeline-upgrade.css">
```

Just before `</body>`, add:

```html
<script src="timeline-upgrade.js" defer></script>
```

That's it. Open the page — the upgrade runs automatically.

### 3. (Optional) Tidy a few things later

These aren't required, but will improve the result:

- Strip inline `style="..."` attributes from individual table rows and cells where you can. The CSS overrides them, but cleaner HTML loads faster and is easier to maintain.
- Remove the hidden `<img alt="Visitor Counter">` if it isn't actually counting anything useful.
- Fix the unclosed `<section>` tags — several sections in the original file are nested inside each other rather than as siblings, which used to cause the "narrowing border" bug. The CSS now compensates, but cleaner markup is still better.

---

## How the Time Explorer works

The slider draws its results from a single source table — the **first table in the document with at least 5 dated rows**, which on your site is "Timeline of Ancient Human Cultural Change". Every other table on the page is left alone (no dimming, no filtering — just the unchanged content).

When you drag the slider:

- The matching row(s) for the current year appear as a card directly below the slider, with the date in mono-gold and the event text preserved exactly as written (chips, bold, links, everything).
- If a year falls between recorded events, the panel shows the nearest entry before and the nearest entry after, so the reader gets context instead of a blank screen.
- Reset (or the ✕ in the topbar) clears the card and returns the panel to its idle state.

The parser handles every date format I observed in your file:

- `200,000 BCE`, `c. 164,000 BCE`, `~1600 BCE`, `1184 BCE (approx.)`
- Ranges: `1208-1176 BCE`, `c. 115,000-11,700 BCE`, `c. 2000 BCE-1540 CE`
- Centuries: `10th-8th centuries BCE`
- Both eras: `4 BCE`, `45 BCE`, `100 CE`, `c. 1070 BCE – 350 CE`

A row matches the current year if that year falls within its date range (so a row dated `c. 115,000-11,700 BCE` matches any slider position from 115,000 BCE to 11,700 BCE).

The slider uses a **piecewise scale** that gives each major era roughly proportional space:
- 0–25% covers 200,000 BCE to 10,000 BCE (deep prehistory, log-warped)
- 25–55% covers 10,000 BCE to 1 CE (antiquity, where most of your content lives)
- 55–75% covers 1 CE to 1500 CE (medieval)
- 75–100% covers 1500 CE to 2025 CE (early modern + modern)

Two ways to use it:
- **Time Explorer panel** at the top of the page — the dedicated widget with the big year display, era markers, and step buttons
- **Compact slider** in the topbar — click "⏱ Time" to open it and drag without scrolling back to the top

Both stay in sync. Press the **Reset** button (or the ✕ in the topbar) to clear the slider and show everything again.

To use a different source table, change the selector logic in `indexDatedRows()` near line 350 of `timeline-upgrade.js` — it currently picks the first table with 5+ parseable date rows.

---

## Files in this bundle

| File | What it is |
|---|---|
| `timeline-upgrade.css` | Stylesheet that overrides the original look. ~21 KB. |
| `timeline-upgrade.js` | Script that builds the topbar, side-nav, search, filter, time slider, collapse, and back-to-top behaviors. ~17 KB. |
| `index.html` | A working demo page showing the upgrade applied to a representative slice of your original markup. Open this in a browser to see the result before you touch your real file. |

---

## How the filter groups map to your section IDs

The filter chips are pre-wired to the section IDs in your existing nav. Each chip toggles visibility for a group of sections:

- **Civilizations** → Sumerians, Akkadians, Elamites, Babylonians, Assyrians, Hittites, Canaanites, Phoenicians, Israel, Judah, Moabites, Edomites, Ammonites, Persians, SeaPeoples, Egyptians, Nubian_Kingdoms, Minoans, Mycenaeans, Greeks, Carthaginians, Romans, indus_valley, shang_zhou
- **Religions** → Judaism, JewishApocrypha, Mithraism, Gnosticism, Christianity, Orthodoxy, Catholics, Protestants, Islam, Bahai, Esoteric, Philosophy
- **Wars & Conflict** → Wars, IronAgeWars
- **Texts** → Texts, Bibles
- **Science & Tech** → technology, Science, AncientWonders, HeroicLegendsComparison
- **Rulers** → Rulers
- **Linguistics** → Linguistics

A chip only appears if at least one of its section IDs exists in the page, so you don't need to worry about chips appearing for things you haven't built yet.

To add a new group or move sections between groups, edit the `FILTER_GROUPS` object near the top of `timeline-upgrade.js`.

---

## Customizing the look

All colors live as CSS variables at the top of `timeline-upgrade.css`. The most common tweaks:

```css
:root {
  --bg:           #0e1420;   /* page background */
  --bg-elev:      #161e2e;   /* card/table background */
  --text:         #e8e6df;   /* body text */
  --accent:       #d4a64a;   /* gold — used for headings, dates, highlights */
  --danger:       #c97064;   /* extinction / fall events */
  --cool:         #6da3c4;   /* climate / glacial events */
  --serif:        'Cormorant Garamond', Georgia, serif;  /* heading font */
}
```

If you want to use the heading font that ships with Cormorant Garamond (instead of falling back to Georgia), add this to your `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

---

## Keyboard shortcuts

- `Cmd/Ctrl + K` — focus the search box
- `Esc` (while search is focused) — clear the search and unfocus

---

## What the script does NOT change

- Your section IDs stay exactly the same, so all your in-page anchor links still work.
- Your original `<nav class="main-nav">` is hidden (not removed), so if JavaScript fails to load for any reason, the menu still exists in the DOM as a fallback.
- Your favicon, meta tags, and content remain untouched.

---

## If something looks off

The most likely cause is an inline `style="..."` attribute on an element that the override didn't anticipate. The CSS uses `!important` aggressively for table cells and headings precisely because the original file has many inline styles, but a few unusual ones might slip through. If you spot one, paste me the markup and I'll add a targeted override.

For the time slider specifically: if a row that should match the current year isn't appearing in the matches card, check that its first `<td>` cell contains a date in one of the recognized formats listed above. Rows with non-date first columns are skipped (which is correct — they're never shown as matches).

