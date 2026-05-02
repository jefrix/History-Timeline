# History Timeline — Drop-in Upgrade

Three files that bolt onto your existing `index.html` and add:

- A sticky topbar with **live search** across every event (Cmd/Ctrl-K to focus, Esc to clear)
- A **side-drawer navigation** rebuilt automatically from your existing `<nav class="main-nav">` menu
- A **filter chip bar** that lets readers show only Civilizations, Religions, Wars, Texts, etc.
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
- Fix the unclosed `<section>` tags (several sections in the original file are nested inside each other rather than as siblings — search for `<section id="SeaPeoples"` etc. and check that each one is closed with `</section>` before the next opens).

---

## Files in this bundle

| File | What it is |
|---|---|
| `timeline-upgrade.css` | Stylesheet that overrides the original look. ~16 KB. |
| `timeline-upgrade.js` | Script that builds the topbar, side-nav, search, filter, collapse, and back-to-top behaviors. ~10 KB. |
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
