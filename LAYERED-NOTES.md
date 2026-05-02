# The Reality Latency Project — Layered Timeline

This is a substantial revision of `history-timeline.html` that turns the page
from "a nice timeline visualization" into the visual instrument for your
*Reality Latency* / Fieldnotes thesis.

## Drop-in

Replace `history-timeline.html` in your repo with the file in this bundle.
No other files need to change. The page is self-contained — one HTML file
with embedded CSS and JS, no external dependencies.

## What's new

### 1. The Stress Index row

A bar chart at the bottom of the timeline computes how many distinct layers
register events in each time-window bucket. Where the bar is short and gold,
one or two layers are active — routine history. Where the bar is tall and
red, several layers are stressing simultaneously — coupled failure.

The Bronze Age cluster (Megadrought + 4.2k event + Thera + Bronze Collapse +
Sea Peoples) shows up as the largest red spike on the chart, labeled with
the dominant shock. This is the visual proof of the thesis the Ugarit
Warning argues in prose: collapse isn't a single villain, it's a coincidence
of stressors hitting a hollowed buffer.

### 2. The modern era is on the timeline

The original page ended at 4 BCE. The thesis depends on placing the present
moment on the same axis as Ugarit. So the timeline now extends to 2026 CE
with the events that show up in your dispatches:

- COVID-19 Pandemic (system shock)
- Generative AI Goes Mainstream (technology)
- The Liar's Dividend (information)
- Memetic Statecraft (civilization)
- Hormuz Energy Shock (system shock)
- AI Labor Displacement (system shock)
- Immune System Gap (biology)

A handful of bridge events fill in the gap — Black Death, Printing Press,
Newton, Steam, Darwin, Nuclear Age, ARPANET — so the curve from antiquity
to the present is continuous, not just a jump.

### 3. Fieldnotes integration

Events that have a corresponding Fieldnotes dispatch get a gold ring around
their node. Clicking such an event shows a "Read №XX — [Title]" pill at the
bottom of the detail card that opens the dispatch in a new tab. Currently
linked:

- Bronze Age Collapse → The Ugarit Warning
- Ugarit Falls → The Ugarit Warning
- COVID-19 → (could link to Immune Response if you want)
- Generative AI / AI Labor → The 5,000-Day Gap
- The Liar's Dividend → The Liar's Dividend dispatch
- Memetic Statecraft → The 280-Character Cabinet
- Hormuz Energy Shock → The Dual Blockade
- Immune System Gap → The Immune Response

Adding more is easy — find the event in the `events` array and add a
`link: { url, label }` property.

### 4. Latency Mode

A toggle button next to the filter chips. When active, gold dashed arcs
connect each shock back to its preceding stressor with the gap labeled in
years. This makes the central concept of *Reality Latency* visible:

- Megadrought → Bronze Collapse · ~50 yr
- Collapse → Ugarit falls · ~15 yr
- Black Death → Printing · ~93 yr
- Generative AI → Labor shock · ~4 yr
- COVID → Immune Gap · ~6 yr

These are curated edges in the `latencyEdges` array near the top of the JS.
Add or remove freely.

### 5. Suite navigation

A persistent header at the top with four links:

- Reference Almanac (`index.html`)
- Layered Timeline (this page)
- Cinematic Essay (`cinematic-history-timeline.html`)
- Fieldnotes ↗ (external)

Worth adding the same `<nav class="suite-nav">` block to `index.html` and
`cinematic-history-timeline.html` so the three pages cross-link properly.
The CSS for it is in this file's `<style>` block — copy the `.suite-nav`
rules and adjust the `.active` link accordingly.

### 6. System Shocks become a real layer

The original page rendered shocks both as a bottom layer (clickable) AND as
red vertical lines piercing through (with their own labels). That was
visually redundant. Now the shocks live in a single thin row at the top,
just under the time axis, and the vertical lines remain unlabeled visual
indicators. Clicking a shock node selects it the same way any other event
does.

### 7. Era bands

Faint dashed verticals divide the timeline into Stone Age, Neolithic,
Bronze Age, Iron Age / Antiquity, Medieval, Early Modern, and Modern.
Helps the eye locate where you are without reading the date axis.

### 8. Time scale upgrade

The original page used a two-segment scale (200,000 BCE → 20,000 BCE
linear, 20,000 BCE → 4 BCE linear). With deep prehistory dominating, the
recent millennia got crushed. The new scale is piecewise:

- 0–28%   → 200,000 BCE → 20,000 BCE (log-warped)
- 28–55%  → 20,000 BCE → 1 CE (linear, antiquity gets the most space)
- 55–78%  → 1 CE → 1500 CE (linear)
- 78–100% → 1500 CE → 2026 CE (linear)

The ticks are denser and the modern era now has room to breathe.

### 9. Label staggering

Event labels and shock labels that would collide horizontally get bumped to
different vertical positions automatically. The civilization layer around
the Bronze Age (Indus, Uruk, Minoans, Stonehenge, Akkad, Phoenicians, all
clustering) used to stack on top of each other. Now they alternate.

## What I deliberately didn't change

- The hero and visual identity (gold + dark blue) stays the same — it
  matches the Fieldnotes aesthetic.
- The climate gradient band stays. Even though it's a stylistic choice
  rather than a literal data viz, it communicates the right intuition:
  cold deep past, warm Holocene.
- The layer ontology (Biology, Climate, Technology, Civilization,
  Information, plus Shock) is unchanged. It's the right ontology — it's
  the ontology your essays use.

## Suggested next steps

1. **Add the suite nav to the other two pages** so the three form a real
   suite. The CSS rules are at the top of `<style>` (search for `.suite-nav`).
2. **Cross-link more events to dispatches** as you write more Fieldnotes.
   Each new dispatch should add a `link:` entry to the relevant event
   in the timeline.
3. **Audit the latency edges** — I picked them based on what's in the
   essays I've read. You'll want to revise the list with edges that match
   how you'd actually argue the cases.
4. **Consider a "Reality Latency" hover annotation** on each shock node:
   a small calculated badge showing "stress was building for X years" so
   users see latency without needing to toggle the mode.
