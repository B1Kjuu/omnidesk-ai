---
name: OmniDesk AI
description: Customer support run like a railway information program: every answer leaves with its source, or goes to staff.
colors:
  signal-red: "#d0261d"
  signal-red-deep: "#a81d16"
  signal-wash: "#fbe9e8"
  notice-yellow: "#ffcc00"
  notice-wash: "#fff6d1"
  notice-edge: "#e6b800"
  on-time-green: "#0f7b3f"
  on-time-wash: "#e5f3ea"
  on-time-bright: "#4ade80"
  paper: "#ffffff"
  platform-grey: "#f1f2f4"
  rule: "#d9dce1"
  rule-strong: "#b9bec6"
  ink: "#15171a"
  ink-secondary: "#4a515b"
  ink-tertiary: "#5f6670"
  board-black: "#15171a"
  board-raised: "#22252a"
  board-rule: "#33373e"
  board-ink: "#f4f5f6"
  board-ink-secondary: "#a9afb8"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "5rem"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.625
  body-small:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  caption:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  hint:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.025em"
  data:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 700
    fontFeature: "tnum"
rounded:
  sign: "2px"
  stop: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "40px"
  row: "16px"
  section: "112px"
components:
  button-primary:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sign}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.signal-red-deep}"
  button-primary-disabled:
    backgroundColor: "{colors.rule}"
    textColor: "{colors.ink-tertiary}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.platform-grey}"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "10px 12px"
  status-notice:
    backgroundColor: "{colors.notice-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
    padding: "2px 8px"
  status-go:
    backgroundColor: "{colors.on-time-wash}"
    textColor: "{colors.on-time-green}"
    rounded: "{rounded.sign}"
    padding: "2px 8px"
  identity-bar:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.paper}"
    padding: "12px 40px"
---

# Design System: OmniDesk AI

## Overview

**Creative North Star: "The Departure Board"**

OmniDesk is designed like a national railway information program: a strict red, white and black identity, departure boards, platform signs and printed timetables. The metaphor carries the product's one rule. A question either departs on time, printed with the source it came from, or is visibly routed to staff. Nothing on screen pretends to know more than the knowledge does.

Surfaces are flat signage: solid fields of colour, hairline rules and bold, highly legible type. There are no gradients, glass, glows or decorative illustration. The landing page commits fully to the world (a black board as its first viewport). The product screens (dashboard, chat, sign-in) take the same materials at operating density, with red reserved for identity and the primary action.

**Key Characteristics:**
- A red identity bar opens every surface, like a station sign.
- The black departure board is the signature component: time, question, source, status.
- Every status in the product comes from one state table (`lib/status.ts`).
- Provenance is always printed: an answer is never shown without its source or a staff notice.
- A single typeface family, Atkinson Hyperlegible, chosen for signage-grade legibility.

## Colors

A restrained signage palette: neutral paper and ink, one identity red, and two state colours that each mean exactly one thing.

### Primary
- **Signal Red** (signal-red): the identity field (top bars, closing call to action) and the primary action. Never used for decoration or for inactive states.
- **Deep Signal Red** (signal-red-deep): primary-action hover, error text on paper.

### Secondary
- **Notice Yellow** (notice-yellow): staff handoffs only, plus alert counts that need a person. It is the colour of "a human has to act".

### Tertiary
- **On-Time Green** (on-time-green, on-time-bright on the board): a grounded answer or a completed delivery.

### Neutral
- **Paper** (paper): primary content ground.
- **Platform Grey** (platform-grey): the second layer for page grounds behind panels, sidebars and the engineering timetable.
- **Rule / Strong Rule** (rule, rule-strong): hairline dividers and field borders.
- **Ink, Secondary Ink, Tertiary Ink** (ink, ink-secondary, ink-tertiary): text hierarchy. Secondary ink is the default for supporting copy and stays above 7:1 on paper.
- **Board Black family** (board-black, board-raised, board-rule, board-ink, board-ink-secondary): the departure board's own ground, input well, row rules and text.

### Named Rules
**The One Meaning Rule.** Yellow means staff, green means grounded, red means identity or action. A colour never borrows another's meaning.

**The One Table Rule.** Status labels and tones are read from the shared state table; no component hand-writes a status colour.

## Typography

**Display Font:** Atkinson Hyperlegible Next (with system-ui, sans-serif)
**Body Font:** Atkinson Hyperlegible Next
**Label/Mono Font:** Atkinson Hyperlegible Mono, for data only

**Character:** One legibility-first family does every job, the way a wayfinding system uses one sign face. Weight and size carry the hierarchy; the mono cut appears only where a board would print figures.

### Hierarchy
- **Display** (700, 3rem mobile to 5rem desktop, 0.98): the board title on the landing page only.
- **Headline** (700, 2.25rem to 3.75rem, about 1.25): landing section headings and the closing call to action.
- **Title** (700, 1.25 to 1.5rem): product section headings and panel titles.
- **Body** (400, 1rem to 1.125rem, 1.625): copy, capped at 60 to 75ch.
- **Body small** (400, 0.9375rem, 1.625): secondary copy in product rows, panel text, replies and buttons.
- **Caption** (400 or 700, 0.875rem): metadata lines, alerts, field labels and status text.
- **Hint** (400, 0.8125rem): helper text under form fields.
- **Label** (700, 0.75rem, 0.025em tracking, uppercase): board and table column headers only.
- **Data** (Mono 700, tabular figures): times, the board clock, IDs and counts.

### Named Rules
**The Figures-Only Mono Rule.** Mono is for times, identifiers and counts. Names, sources and technology lists are set in the sans.

**The No Kicker Rule.** Headings carry their own weight; no eyebrow labels above them.

## Layout

Content sits in a centred container (72rem on marketing surfaces, 80rem on the dashboard) with 16px gutters on phones and 40px from the small breakpoint. Landing sections breathe at roughly 80 to 112px of vertical padding; product sections are separated by 56px. Board rows use a fixed column grid (time 4.5rem, question, source 11rem, status 9.5rem) that collapses on phones to time plus a stacked question, source and status. The dashboard uses a 13rem sticky sidebar from the large breakpoint, becoming a horizontally scrolling tab row on phones. Section anchors use scroll margin so headings never hide under the edge.

**The Urgency Breaks the Grid Rule.** Only a staff handoff may leave the grid: on the board its yellow notice extends past the column edge into the margin.

## Elevation & Depth

The system is flat. Depth comes from tonal layering (paper on platform grey, board-raised inside the board) and from rules. The one shadow is a soft ambient lift on the sign-in panel and the sign-out error popover.

### Shadow Vocabulary
- **Panel lift** (`box-shadow: 0 1px 2px rgba(21,23,26,0.06), 0 8px 24px rgba(21,23,26,0.06)`): a standalone panel floating on platform grey.

## Shapes

Signs have almost square corners (2px) everywhere: buttons, fields, tags and panels. The only round form is the route stop, a full circle marking a station on the route line, connected by a 2px ink line.

## Components

### Buttons
- **Shape:** near-square sign corners (2px).
- **Primary:** signal red with white bold label; hover deepens to signal-red-deep; disabled turns rule grey with tertiary ink, never a faded red.
- **Secondary:** paper with a 1px ink border; hover fills platform grey.
- **Quiet / Danger:** text-weight buttons for row actions (Edit, Copy link, Delete), filling platform grey or signal wash on hover.
- **On red:** white outline buttons that invert to white on hover.

### Status Tags
- **Style:** bold 0.75rem label on a flat fill from the state table (green wash, notice yellow, signal red, ink, platform grey).
- **State:** one tag per status; on the board the same tones render as text, with the staff notice as a full yellow band.

### Inputs / Fields
- **Style:** 1px strong-rule border on paper, 2px corners, 10px by 12px padding, bold label above, hint below in secondary ink.
- **Focus:** border turns ink with a red ring and a red wash halo.
- **Error / Disabled:** errors appear as a red-bordered wash block naming the problem and the recovery; disabled fields fill platform grey.

### Navigation
- **Identity bar:** red field with the wordmark (a white platform square carrying the letter) and white bold links.
- **Dashboard sidebar:** one page per job (Overview, Inbox, Escalations, Knowledge, Automation, Organizations). Bold labels with stroke icons and mono counts; the current page is an ink sign with white text; counts needing a person turn notice yellow. On phones it becomes a horizontally scrolling row.

### Departure Board (signature)
A black board whose title is the page headline, with a live clock in mono, column labels, rows of time, question, source and status, and a closing input row. Times, sources and statuses settle like split-flap characters (about 28ms per character, staggered 90ms per row). While the board is on screen, a new example departure arrives at the top every few seconds with a 420ms clip-path drop from the top hinge, and the oldest leaves. Rotation pauses off screen, in a hidden tab, while the visitor types, and is off under reduced motion. Only the topmost staff row hangs its yellow notice into the margin.

### Route Map (signature)
Stations on a 4px track with 40px ringed stops. The trunk is ink; it splits into a green "answered" branch and a yellow "staff" branch joined by a horizontal switch. Where scroll-driven animation is supported, each track draws as the section scrolls past; otherwise, and under reduced motion, it is fully drawn. The dashboard setup checklist uses the same stop language at small scale.

### Motion
Landing motion is built with GSAP (ScrollTrigger, SplitText, DrawSVG, MotionPath), registered once in `lib/gsap.ts` and always gated by `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`; content is fully visible without it.
- **Hero:** headline letters flip down from a top hinge like split-flap tiles; board rows cascade in; the board recedes slightly as the visitor scrolls away.
- **Ticker:** a red band of example departures loops and leans with scroll velocity; it pauses off screen.
- **Route journey (desktop):** a pinned, scroll-scrubbed rail map where a question ticket rides to the knowledge stop and down the green line, then a second ticket rides the yellow staff line to a ticket and an email. Phones and reduced motion get the static route map.
- **Platforms and timetable:** signs and rows flip in once as they enter view.
Product screens have no entrance choreography: 150ms colour transitions on controls and a 3px arrow lean on button hover (the button itself never moves).

### shadcn/ui
shadcn/ui components (`components/ui/*.tsx` in lowercase) are themed through the semantic variables in `globals.css`, mapped onto this palette: primary is signal red, borders are rule greys, ring is signal red, radius is the 2px sign corner, and `.dark` is the departure board. Use them for complex primitives (accordion, sheet, tooltip); the house `.btn` and `.field` classes remain the default for simple controls.

## Do's and Don'ts

### Do:
- **Do** print the source beside every AI answer, or a yellow staff notice when there is none.
- **Do** take every status label and colour from the shared state table.
- **Do** keep red for the identity bar and the primary action.
- **Do** theme the browser's own surfaces: yellow text selection, red caret and focus outline, tabular figures in data.

### Don't:
- **Don't** use notice yellow for anything except work that needs a person.
- **Don't** set names or sources in mono.
- **Don't** add gradients, glass, glows or decorative cards; the world is flat signage.
- **Don't** add eyebrow labels above headings.
