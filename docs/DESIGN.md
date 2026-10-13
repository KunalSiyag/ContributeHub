# Orion design system

Orion is a workspace for open source contributors: find an issue that fits your
stack, track it until the PR merges, and never miss a program deadline. This file
is the source of truth for every screen. If a choice is not covered here, follow
the closest rule; do not invent a new color, size, radius or shadow.

## Brief

- **What:** marketing home + product app (discover, track, programs, bounties).
- **Who:** contributors from first PR (students, GSoC/GSSoC applicants) to
  experienced developers hunting bounties.
- **Goal:** go from "good first issue" to merged PR without losing track.
- **Tone:** precise, technical, calm. A premium dark product: light is used
  sparingly and always means something (live data, the next deadline).
- **Main risk:** looking like one more aggregator of stale links. Every list is a
  live GitHub query, so show freshness and real numbers, never invented ones.
- **Remember:** the pipeline (Saved → Working → PR open → Merged) and live
  program deadlines.

## Research (Refero styles)

Styles reviewed on styles.refero.design, plus ossium.in as the brief's reference:

| Source | Took from it |
|---|---|
| **Graphite** — dark developer tool | **Primary.** #0a0a0a canvas and neutral ladder, #262626 hairlines, pale primary button with an inset edge, 8–12px radii, luminous art as the one ornament, product shot in a demo frame. |
| **ossium.in** | Dashed blueprint frames with + corner markers, centered pill section labels with side rules, pill CTAs, framed product shot, feature tab switcher, FAQ grid, closing CTA band, framed footer. |
| **Dovetail** | Faint blueprint grid (1px lines every 48px) and mono eyebrows. |
| **Resend** | Status dot + mono label for data states. Status colors live only in data. |
| **Linear** | Dense list rows for issues. |
| Vercel (previous primary) | Kept: Geist Sans + Geist Mono, the GitHub query panel, tabular numbers. Its paper-first canvas is now the light theme. |
| **GitHub** (style c3ceca5c) | For the forum and profiles: long-form body text never below 16px, mono uppercase micro-labels, flat hairline-separated threads, no card shadows. Not taken: its 24px card radius and purple halos (Graphite caps cards at 12px). |
| **Linear** (style 90ce5883) | For the repository report and comparison: compact property rows (muted 13px label, value at 14px/500, tabular), mono 12px for repository names, no weights above 600, card radius at most 12px. |
| **Perplexity AI** (style 81afaa5c) | For the assistant: a centred composer with a 12px radius and 16px input text, starter prompts as a two-column grid of 12px-radius cards with 12px gaps, 16px/1.5 answers. Not taken: its parchment canvas and teal accent, which would add a second chromatic accent to Graphite. |
| **Linear** (style 90ce5883, re-fetched 2026-10-12) | For alerts: compact density on a 4px base with 8px gaps; status tags at a 4px radius with a faint neutral fill and grey 12px text; inputs whose border brightens on focus; one chromatic primary action per view; mono only for IDs, shortcuts and technical metadata; chromatic colors are not decoration. Not taken: its acid-lime button and Berkeley Mono (Graphite's pale primary and Geist Mono stay). |
| **GitHub** (style c3ceca5c, re-fetched 2026-10-12) | For the repo bot: code on a pure black surface in dark mode, mono at 12–14px with a 1.5 line height, a hairline edge and no shadow; one primary call to action per screen; uppercase mono micro-labels. Not taken: its 24px glass panels and purple halo. |
| **Refero skill** (referodesign/refero_skill, master a9b54a3, read 2026-10-12) | `craft-details.md`: labels on every field, inline errors announced with `role="alert"`, submit buttons that disable and say what they are doing, `aria-live` for async results, confirmation or undo for destructive actions. `copywriting.md`: buttons name action and object, empty states teach with one call to action, product headings describe. `motion.md`: a row that is added fades in and slides 4–8px over 200ms, a row that is removed fades and collapses over 180ms, and reduced motion is honoured. |

## Reference lock

- **Primary:** Graphite.
- **Preserve:** near-black canvas with a quiet neutral ladder; hairline rings,
  not drop shadows, on panels; pale primary button; Geist Sans reads, Geist Mono
  stamps (eyebrows, counts, metadata, code); the Orion constellation as the only
  illustration.
- **Borrow only:** Ossium frames, section labels and pill CTAs (marketing only);
  Dovetail grid; Resend status dots; Linear dense rows.
- **Role rules:**
  - `--accent` (terminal green) = success, merged/completed, "live", positive
    deltas, ✓ marks, the hero's accent phrase. Never a button fill.
  - Glow and beam mark one thing per view that is live or next (the next
    deadline, the hero). They never decorate static content.
  - Status colors = dots, small mono labels and chart marks only.
  - GitHub language colors = 8px language dots only; label colors = a 6px dot
    inside a neutral tag, never a filled tag.
  - Overlay shadow = floating layers (menus, dialogs, toasts) only.
- **Media:** code-native product evidence: live data in real components, the
  GitHub query panel, countdowns, official program logos. No stock photos or 3D.
- **Reject:** indigo/violet, glass cards (the frosted top nav is the one
  exception), fake metrics, typewriter effects, emoji icons, scroll-jacking,
  card grids as default containers.

## Decision ledger

| Decision | Source | Why |
|---|---|---|
| Theme follows the system until the visitor picks one; both themes are designed | Graphite + Refero `anti-ai-slop.md` (#3: no dark-by-default unless the brief asks) | Changed 2026-10-12 from dark-by-default after the visual QA below. Graphite's dark theme stays the identity for everyone whose system is dark; the Theme switch still offers light, dark and system. |
| Geist Sans / Geist Mono only | Vercel | Mono carries the developer identity without a third font. |
| Pale primary, hairline secondary, pills on marketing | Graphite + Ossium | One clear action per view; color stays reserved for data. |
| Terminal green accent | GitHub contribution graph | Green already means "contributed/merged" to this audience. |
| Dashed frames around marketing blocks | Ossium | Structure without heavy cards; the + markers read as a blueprint. |
| Spotlight wash on rows, ring + wash on cards | Graphite | Hover feedback that follows the pointer, so long lists feel alive without motion at rest. |
| Beam + glow on the next deadline | Brief | Deadlines are the most time-sensitive thing we show. |
| Status dots with mono labels | Resend | Pipeline and program phases read at a glance without colored chrome. |
| Dense issue rows (not cards) | Linear | Contributors scan dozens of issues; rows beat cards. |
| Official dates and logos where a program publishes them | Brief | GSoC, LFX and Outreachy dates come from the programs; the rest are labelled as a usual schedule. |
| Forum threads are flat, hairline-separated posts with a 20px avatar author line | GitHub (Refero) | Discussion reads like a document; boxes around every reply add noise. |
| Report and comparison as label/value rows, not cards | Linear (Refero) | Dense numbers scan faster in aligned rows. |
| Assistant composer and starter grid | Perplexity AI (Refero) | One obvious place to type; starters show what the assistant is good at. |
| GSAP for scroll, reveal and layout motion; CSS for loops and the hero entrance | Refero motion guide + measurements | GSAP sequences one-shot motion well; CSS loops run on the compositor, and a CSS entrance doesn't hold the headline back until the script loads. Holds 60fps at 390px with 4× CPU throttling. |
| Alerts are dense rule rows: a neutral mono count of new issues, plus an accent dot only while something new is waiting | Linear (Refero, 2026-10-12) + role rules | The count is data, so it stays neutral; the dot is the one "live" mark, as `--accent` is defined. |
| The alert form is one panel of labelled fields; errors sit under the field with `role="alert"`; the button reads "Create alert", then "Creating…" | Refero `craft-details.md`, `copywriting.md` | People fix a field where it is, and the button says what is happening. |
| Deleting an alert removes it at once and offers Undo in a toast | Refero `craft-details.md` (undo window) | No confirm dialog for a cheap, reversible action. |
| A new rule row fades in and slides 6px over 200ms; a deleted one fades and collapses over 180ms (GSAP); both skipped under reduced motion | Refero `motion.md` (lists) | Layout continuity: the list doesn't jump. |
| The repo bot's workflow preview sits on a black code surface (13px mono, 1.5 line height, hairline edge, no shadow), with "Copy workflow" as the one primary button | GitHub (Refero, 2026-10-12) | Reads as the file it is, and copying it is the only action that matters. |
| The support page says plainly that every feature is free; sponsoring is a secondary link that shows only once it is set up | Brief + Refero `copywriting.md` (no hype) | Orion keeps no paywall; the page orients rather than sells. |
| The current page in the sidebar is marked with a neutral edge and fill, not green | Refero `anti-ai-slop.md` (#6 side stripes only for meaning, #8 token roles) | Selection is not success or "live"; keeping `--accent` for those keeps its meaning. |
| Tags for attributes (program names, "Paid", a project's starter label) are neutral; green tags only for open or live states ("Accepting applications", "Hiring") | Role rules + Refero #8 | Same reason: green means something is happening now. |
| Forum reactions are small pill toggles with a mono count, pressed = neutral fill; Share uses the system share sheet or copies the link | Linear (Refero) density + role rules | A reaction is a personal state, not a status color. |
| Forward links ("View all →", "View query on GitHub ↗") and their arrows use Signal Orange; prose links stay neutral and underlined | Graphite (Refero, re-fetched 2026-10-13) | Graphite reserves orange for exactly this role; it brings back a primary-reference trait the earlier build had dropped. |
| Panels, cards, lists, inputs and code surfaces at 10px; buttons at 8px | Graphite | Graphite's do/don't rules: 10px for cards, inputs and frames, 8px for rectangular buttons, nothing above 10px. |
| Selected controls (current page, chosen banner) get the Steel Border, not a color or a side bar | Graphite | Graphite marks selection with #464646 edges. |
| Pill filter rows wrap above 640px; on phones they stay one line that scrolls, with an edge fade | Refero visual QA (2026-10-13, P2) | A row clipped mid-word hid six perk categories on desktop and gave no sign it scrolled. |
| Assistant web results are cited inline as bracketed numbers that link to the result, with a numbered source list under the answer | Perplexity AI (Refero, 81afaa5c) | The reader sees which sentence rests on which page; numbers in the text match the list. |
| Quotes in posts and answers sit behind a 2px steel rule in muted text | GitHub (Refero, c3ceca5c) | A quote reads as someone else's words without a box around it. |

## Visual QA (Refero visual workflow, 2026-10-12)

Run after this round's build, following `references/visual-workflow.md` and the checklist in
`references/anti-ai-slop.md` of the Refero skill (referodesign/refero_skill, master a9b54a3).

```text
Source truth: the reference lock and decision ledger above; Refero styles Graphite (primary), Linear and GitHub (re-fetched 2026-10-12)
Implementation evidence: production-build screenshots (headless Chrome) of home, discover, alerts, repo bot, support, community list/thread/new, leaderboard, companies, bounties, resources, repo report
Viewport/state: 1440x900 and 390x844 (2x), dark and light, signed in and signed out, empty and filled states
Final result: passed (no open P0–P2)
```

| Severity | Finding | Fix |
|---|---|---|
| P2 | Dark was the default with no brief asking for it (anti-slop #3) | Theme follows the system until the visitor chooses |
| P2 | The current page in the sidebar used the green accent and glow: selection drawn as "live" (token role drift, #8) | Neutral edge and fill |
| P2 | Alert names were `h3` with no `h2` above them, and the unsubscribe pages had no `h1` (axe) | Headings added |
| P3 | Program, "Paid" and starter-label tags were green though they are attributes | Neutral tags |
| P3 | Assistant suggestion icons were green as decoration | Neutral icons |
| P3 | Reaction clicks during a request were dropped silently | Buttons show a busy state while saving |
| P3 | Long lines in the repo bot's workflow preview scroll sideways | Kept: it is the file, and wrapping would change what people copy |

Checklist: accent is green, not indigo/violet; lists are rows, and panels hold forms or grouped steps only;
no emoji icons; side stripes only for selection and thread lines; serif none; earth tones none; Graphite's
near-black canvas, hairline rings and pale primary are intact; ALL-CAPS labels carry 0.07em tracking;
the one green headline phrase ("merged pull request") means merged, the accent's own role; product
evidence is live data, never fake screenshots. axe: clean on every page checked, in both themes.

## Visual QA against Graphite (style fd36bae9, re-fetched 2026-10-13)

The reference lock names Graphite as primary, so its Refero write-up was fetched again and compared token by
token with Orion's dark theme (the theme Graphite describes).

| Graphite token or rule | Graphite | Orion before | Result |
|---|---|---|---|
| Canvas (Obsidian) | #0a0a0a | #0a0a0a | Match |
| Deepest surface (True Black) | #000000, media backdrops | #000000 for code surfaces | Match |
| Elevated surface (Charcoal) | #171717 | #171717 (`--surface-2`); panels on #111111 | Kept: one extra ladder step lifts dense app panels; noted as a deviation |
| Hairline (Graphite Edge) | #262626 | #262626 | Match |
| Steel Border, selected controls | #464646 | #3a3a3a; current page drawn with an edge bar | **Fixed:** `--line-strong` #464646; the current page and chosen banner use it |
| Cloud White / Fog / Ash text | #fafafa / #a1a1a1 / #737373 | #fafafa / #a1a1a1 / #808080 | Ash kept at #808080 for 4.5:1 on the canvas (accessibility over the source) |
| Pale primary button | #e5e5e5 fill, #171717 text, inset highlight | #e5e5e5, #0a0a0a text, inset edge | **Fixed** text to #171717 |
| Signal Orange | #ff8833, inline links and directional arrows only | unused (links neutral) | **Fixed:** `--link-accent` on forward links and their arrows only |
| Radius | buttons 8, cards/inputs/frames 10, never above 10 | buttons 8, panels 8, cards 12, inputs 8 | **Fixed:** panels, cards, lists, inputs and code surfaces at 10 |
| Type | matterFont/Inter, display 60/500/1/-1.5px, nav 14/500/1.43 | Geist, display 42–76/600/1.02, ui 14/1.43 | Kept (ledger: Geist from Vercel); display weight stays ≤ 600 as Graphite's don't-rule asks |
| Spacing | 8px base, max width 1152 | 4px grid, max width 1200 | Compatible (every Graphite step is on the 4px grid) |
| Depth | 1px #262626 borders, few soft shadows | hairline rings, overlay shadow only | Match in spirit |
| Spectrum gradient | linework and graphic borders | hero linework, profile banner line | Match (never a surface fill) |

Result after fixes: passed. Screenshots in light and dark, desktop and phone, and axe on every changed page.

## Full visual pass (Refero visual workflow, 2026-10-13)

Every route in both themes, on desktop and phone, signed out and signed in, checked against captured
source truth. It follows `references/visual-workflow.md` of the Refero skill (referodesign/refero_skill,
master a9b54a3) and the pre-ship checklists in `craft-details.md` and `motion.md`.

```text
Source truth: URL captures (headless Chrome, 2026-10-13) of Refero's Graphite style page (styles.refero.design/style/fd36bae9-dbf4-4b0f-a48b-e8c6f92edca3) and of graphite.dev at 1440x900 (viewport and full page) and 390x844, plus the reference lock and decision ledger above
Implementation evidence: production-build screenshots of 31 routes x dark/light x 1440x900 and 390x844 (124 captures), six full-page captures, 28 signed-in captures against a local Supabase stack with test members, and re-shoots of every fixed page. Contact sheets are in docs/qa/2026-10-13/ (sweep sheets show the state before fixes; fixes-*.jpg show after)
Viewport/state: 1440x900 and 390x844; dark and light; signed out and signed in (four tracked issues across the board, two alerts with new issues, preferences, a thread with a reply, a reaction and a quote); empty, filled and error states (404, sign-in error, empty leaderboard and forum)
Final result: passed (no open P0–P2)
```

| Severity | Where | Finding | Fix |
|---|---|---|---|
| P1 | `/collections` | OSS Insight's v1 collections API answered 500 (an upstream 401), so the page said "Collections are unavailable" and every collection was empty | Falls back to OSS Insight's older endpoints, which still answer: 138 public collections again. Tests cover both paths |
| P2 | `/perks`, `/companies`, `/trending`, `/starter` | Scrolling pill rows were clipped at the right edge on desktop ("Infrastru…") with no sign they scroll; six perk categories were out of sight | Rows wrap above 640px; on phones they scroll with an edge fade |
| P2 | `/repos/compare` | Both repository inputs were 280px tall: the lookup field's flex basis became a height inside the column | The field keeps input height in the compare form |
| P2 | `/assistant` on phones | The welcome opened scrolled to its end, hiding the title: the scroll that follows new answers also ran with no conversation | Scrolls to the top when there is no conversation |
| P2 | `/discover` on phones | "1,000+ open issues" wrapped onto three lines beside its links | The count gets its own line, links below; the preset row fades at the edge |
| P3 | `/events/:slug`, program rows | "Paid" and "Official dates" tags were green, though they are attributes | Neutral tags (role rules) |
| P3 | `/community` with no threads | Two primary "Start a discussion" buttons in one view | The empty state's button is secondary |
| P3 | `/perks` on phones | The external-link arrow sat alone on a line under each perk | Icon-only asides stay beside the text |
| P3 | `/u` on phones | Placeholder cut off ("…profile lin") | Shorter placeholder |
| P3 | Assistant answers, forum posts | A Markdown quote printed a literal ">" | Quotes render (ledger row above) |
| P3 | Signed-out `/issues` and `/dashboard` vs `/alerts` | Two signed-out patterns: a panel with a lock, and a centred empty state | Kept: both explain the page and offer sign-in; candidate for a later pass |
| – | Full-page captures | Sidebar, top bar and skip link drawn mid-page | Capture artefact (sticky and fixed elements are painted at the last scroll position); not what people see |

Graphite, captured, against Orion:

| Graphite (graphite.dev, 2026-10-13) | Orion | Result |
|---|---|---|
| Near-black canvas, off-white type, hairline borders | #0a0a0a canvas, #fafafa type, #262626 hairlines | Match |
| Pale primary next to a charcoal secondary; conversion controls monochrome | Pale primary pill and a dark hairline secondary; no colored button fills | Match. Graphite's site adds a faint spectral edge to its primary; Refero's write-up calls conversion controls monochrome, so Orion keeps the spectrum for linework |
| Product shown in a hairline frame at a 10px radius | Live tracker demo in a framed panel; panels at 10px | Match (Ossium's dashed frame and + markers on marketing, per the lock) |
| Small arrow links in Signal Orange | Forward links and arrows in `--link-accent` | Match |
| Left-aligned 500-weight hero beside a glowing hexagon | Centred 600-weight hero with the constellation | Deviation, recorded in the ledger (Ossium hero, Geist) |
| Footer with link columns and a green "All systems operational" dot | Framed footer with link columns and a green "Live data from GitHub" dot | Match |

Checks run alongside the screenshots:

- **Layout:** no page scrolls sideways at 390px (all 62 signed-out and 12 signed-in phone views measured).
- **axe:** clean on 78 page and theme combinations (31 routes in both themes signed out, 8 in both themes signed in).
- **Focus (`craft-details.md`):** every `outline: none` is on a control whose wrapper draws the ring with `:focus-within`, or that draws its own (`:has(input:focus-visible)` for banner radios, the dropzone for the file input). The command palette input is the exception: a modal whose caret shows focus.
- **Motion (`motion.md` pre-ship list):** no `transition: all`. Linear easing appears only on continuous loops (spinners, marquee, beam) and the scroll-scrubbed tilt, where constant speed is the point. Product UI uses the 120–320ms tokens. Durations above 500ms appear only on the marketing home page (hero entrance 900ms, constellation 0.7–1.4s, section reveals 0.9–1s), which `motion.md` allows for marketing. Every GSAP timeline runs inside the `(prefers-reduced-motion: no-preference)` query, and CSS durations drop to 0 under reduced motion.
- **Tokens:** raw colors appear only where documented (white tiles behind official logos, black in mask gradients). No radius is above Graphite's 10px except pills.

## Tokens

All tokens live in `src/app/globals.css`. Components use tokens, never hex.
The theme script sets `data-theme` before paint: stored `light` → light,
`system` → the OS, anything else → dark.

### Color

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | #fafafa | #0a0a0a | Page canvas |
| `--surface` | #ffffff | #111111 | Panels, inputs, rows |
| `--surface-2` | #f5f5f5 | #171717 | Hover, inset wells, skeletons |
| `--surface-3` | #ededed | #202020 | Pressed, nested wells |
| `--line` | #ebebeb | #262626 | Hairlines, dividers |
| `--line-strong` | #d9d9d9 | #464646 | Input borders, selected controls (Graphite's Steel Border) |
| `--code-bg` | #f5f5f5 | #000000 | Whole files shown as code (the repo bot's workflow), after GitHub's code surface |
| `--link-accent` | #c2410c | #ff8833 | Forward links and their arrows only ("View all →", "View query on GitHub ↗"): Graphite's Signal Orange, darkened in light for 4.5:1 |
| `--fg` | #171717 | #fafafa | Headings, primary text |
| `--fg-2` | #4d4d4d | #d4d4d4 | Body, descriptions |
| `--fg-3` | #5e5e5e | #a1a1a1 | Captions, metadata |
| `--fg-4` | #737373 | #808080 | Placeholders, separators, icons at rest (≥ 4.5:1 on canvas and cards) |
| `--primary` | #171717 | #e5e5e5 | Filled primary button |
| `--on-primary` | #ffffff | #171717 | Text on primary |
| `--accent` | #297a3a | #3fb950 | Success / merged / live (see role rules) |

Status (data only): `--status-saved` grey, `--status-working` amber,
`--status-review` blue, `--status-done` green, `--status-danger` red.

Heatmap (contribution calendar only): `--heat-0` … `--heat-4`, one green hue,
light→dark in light mode and dark→bright in dark mode. Validated with the
dataviz ordinal checks (monotone lightness, ΔL ≥ 0.06, light end ≥ 2:1).

Effect tokens (per theme): `--grid-line`, `--frame-line` (dashed frames),
`--spot-wash` / `--spot-edge` (spotlight), `--glow` / `--glow-2` (green and
blue atmosphere), `--spectrum`, `--btn-primary-edge`, `--btn-secondary-bg`,
`--nav-bg` (frosted nav).

### Type

Geist Sans for reading, Geist Mono for stamping. Weights 400 and 500 in the app;
600 for marketing headlines and 13px-and-below labels when 500 is too light.

| Role | Size / line | Weight | Tracking |
|---|---|---|---|
| eyebrow (mono, uppercase) | 11 / 1.5 | 500 | 0.07em |
| meta (mono) | 12 / 1.5 | 400 | 0 |
| caption | 13 / 1.5 | 400 | 0 |
| ui | 14 / 1.43 | 400–500 | 0 |
| body | 16 / 1.5 | 400 | 0 |
| subheading | 20 / 1.3 | 500 | -0.02em |
| title | 30 / 1.1 | 500 | -0.04em |
| heading (marketing) | 32–48 / 1.08 | 600 | -0.035em |
| display (marketing) | 42–76 / 1.02 | 600 | -0.045em |

Numbers in tables, stats and countdowns use `font-variant-numeric: tabular-nums`.

Reading surfaces (forum posts and replies, assistant answers) set their body at
16px/1.6 through `components/Markdown`; code inside them is 13px mono. UI text
around them (meta lines, buttons) stays at the 13–14px scale above.

### Space, radius, depth

- 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96, 128.
- Radius: `--r` 8px buttons; `--r-lg` 10px panels, cards, lists, inputs,
  code surfaces and frames (Graphite: never above 10px); `--r-sm` 4px tags and kbd;
  `--r-full` pills, avatars.
- Depth: `--ring` (1px hairline ring) on panels. No shadows except
  `--shadow-overlay`, and `.fx-glow` on the one highlighted card.
- Marketing sections are 88–136px apart with no background shifts.
- App content max width 1200px; marketing 1200px with 24px gutters (16px on phones).

## Frames

Marketing blocks sit in a `Frame`: a 1px dashed `--frame-line` border with +
markers on the corners. Cells inside a frame are divided by the same dashed
line. Use `plain` when frames tile edge to edge. Frames are for the marketing
layout; the app uses panels and rows.

Sections open with a `SectionLabel` (a centered pill with fading side rules),
then a heading and one lead sentence, all centered.

## Effects

Opt-in layers, defined in `globals.css` → Effects and `components/fx`. None of
them carries information on its own.

| Effect | Use | How |
|---|---|---|
| Hero entrance | Home hero: pill, headline, lead, actions, product shot | CSS `.intro` with a stagger index; starts on first paint |
| Grid | Hero and the workspace header only | `.grid-bg`, faded toward the edges by a mask |
| Spotlight | Cards (`data-spotlight`): edge ring + wash. List rows (`data-spotlight="wash"`): wash only | `SpotlightProvider` (mounted once in `AppChrome`) writes `--mx`/`--my`; touch devices skip it |
| Glow + beam | The single highlighted card: the next deadline | `.fx-glow` on the card, `<Beam />` inside it |
| Reveal | Below-the-fold marketing blocks; stagger with `delay`; headings marked `data-split` rise line by line | `<Reveal>` (GSAP ScrollTrigger + SplitText); only content that starts below the fold is hidden, so nothing flashes and everything shows without JS |
| Scroll tilt | The product shot | `<ScrollTilt>`: tipped back in CSS, scrubbed upright by GSAP as it scrolls in |
| Card moves | Tracker board status changes | `useBoardFlip` (GSAP Flip): cards travel to their new column |
| Count-up | Live stats, once, when they scroll into view | `<CountUp value>`; the server renders the final number |
| Marquee | Official program logos | `<Marquee label>`; pauses on hover and focus; the copy is `inert` |
| Star field / constellation | Hero sides and the closing CTA | `OrionGlow` (`starfield` for the hero); the constellation draws itself in on first view (GSAP DrawSVG) |

Motion rules:

- 120ms hover/press, 200ms state changes, 320ms overlays. ease-out to enter,
  ease-in to exit.
- GSAP (`@/lib/gsap`, which registers ScrollTrigger, SplitText and DrawSVG)
  drives one-shot, scroll-linked and layout motion only. Endless loops stay
  in CSS on the compositor. Every GSAP animation sits in a
  `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`, and the hero
  entrance stays CSS so the headline paints without waiting for JavaScript.
- Loops animate only `opacity` and `transform`, which run on the compositor.
  Never loop an animation on SVG children, a custom property or a filter: each
  frame repaints the whole layer. Twinkle comes from HTML glints over static
  SVG; the beam is a rotating bar, not an animated angle.
- Keep animated elements out of masked or translucent ancestors, which force
  the ancestor to be composited again every frame.
- Decorative loops rest while off screen (`usePauseOffscreen`).
- Everything respects `prefers-reduced-motion`: loops stop, reveals show at once.
- Budget: 60fps at 390px with 4× CPU throttling, idle and while scrolling.

Toolchain rules (both guarded by `src/stylesheets.test.ts`):

- CSS Modules rename animation names, so a module can't name a keyframe from
  `globals.css`. Use `animation: var(--kf-spin) 700ms linear infinite`
  (`--kf-pulse`, `--kf-spin`, `--kf-fade-in`, `--kf-rise-in`). Keyframes used by
  one module live in that module.
- Write `-webkit-` prefixed declarations before the standard property. In the
  other order the build keeps only the prefixed copy, which Chrome and Firefox
  ignore.

## Components

- **Button:** 32px (sm 28, lg 40), `--r` radius, 14/500. `primary` filled with
  its inset edge, `secondary` hairline, `ghost` text-only. `pill` for marketing
  CTAs. One primary per view.
- **Panel:** `--surface` + `--ring`, `--r` radius, 16–24px padding. Only for
  groups the user interacts with (lists, forms, boards).
- **Row:** list item with hairline separator, 12px 16px padding, spotlight wash
  on hover.
- **Tag:** mono 12px, 4px radius, hairline border, optional 6px color dot.
- **Pill:** 9999px filter chips and toggles; active = filled `--primary`.
- **Status dot:** 6px dot + mono label, colors from status tokens.
- **Eyebrow:** mono 11px uppercase above section titles.
- **Query panel:** mono 13px on `--surface`, `›` prompt in `--fg-4`, ✓ in `--accent`.
- **Empty state:** one line of what will appear, one action. No illustration.

## Copy

Clarity over character. Headings describe (`Tracked issues`, not
`Your journey`). Buttons are verb + object (`Track issue`, `Open on GitHub`).
Loading text ends with `…`. Never invent numbers; if data is unavailable, say so.
Program dates say where they come from: "Official dates" when synced, the usual
schedule otherwise.

## Component inventory

Use these before writing anything new. Import paths are from `src/`.

| Need | Use |
|---|---|
| Buttons and button-styled links | `components/ui/Button` — `Button`, `ButtonLink` (internal), `ButtonAnchor` (external, new tab), `buttonClass()` |
| Tags, status, language, kbd | `components/ui/primitives` — `Tag`, `StatusDot`, `LanguageDot`, `Kbd` |
| Page and section headings | `components/ui/primitives` — `PageHeader`, `SectionHead` |
| Containers and states | `components/ui/primitives` — `Panel`, `EmptyState`, `Notice`, `Skeleton`, `Spinner`, `Avatar` |
| Tabs, segmented control, filter chips | `components/ui/Tabs` — `Tabs`, `Segmented`, `Pill`, `Pills` |
| Dropdown menu | `components/ui/Menu` |
| Modal | `components/ui/Dialog` (native `<dialog>`) |
| Feedback after an action | `components/ui/Toast` — `useToast().toast(message, { tone, action })` |
| Form controls | `components/ui/Field` — `Field`, `Input`, `SearchInput`, `Select`, `Textarea`, `Checkbox`, `ChipInput`, `Toolbar` |
| Marketing structure and effects | `components/fx` — `Frame`, `SectionLabel`, `Reveal`, `ScrollTilt`, `CountUp`, `Marquee`, `Beam`; GSAP from `lib/gsap` |
| Home sections | `components/home` — `OrionGlow`, `ProductPreview`, `FeatureTabs`, `Faq`, `OrgMarquee`, `HeroActions` |
| Lists of GitHub things | `components/rows.module.css` list + `IssueRow`, `RepoRow`, `BountyRow`, `ProgramRow`, `OrgRow` (+ `IssueRowSkeleton`, `RepoRowSkeleton`) inside `<ul className={rows.list}>` |
| Track / save actions | `components/TrackControl`, `components/SaveRepoButton` |
| Sign-in | `components/auth/SignIn` — `useSignIn().openSignIn(next)`, `SignInOptions` |
| Starter projects, collections, companies (server only) | `lib/starter-projects` (Up For Grabs, goodfirstissue.dev, Awesome for Beginners, For Good First Issue), `lib/collections` (OSS Insight), `lib/yc` (yc-oss); live figures with `fetchLiveRepos` in `lib/github` |
| Community forum | `lib/community` (categories, `readRelated`), `lib/community.server` (reads, `getMyReaction`; reports "not set up" until migration 07 runs); pages in `app/community`, reactions in `app/community/[id]/Reactions` (hidden until migration 09); images through `components/Markdown` with `images` |
| Program sites (server only) | `lib/program-sites` — Social Winter of Code, GirlScript Summer of Code and MLH Fellowship dates from their own sites |
| Leaderboard (server only) | `lib/leaderboard.server` — `getLeaderboard()` over migration 07's `leaderboard_members()` (opted-in members only), `rankEntries`; opt-in switch in `app/preferences/LeaderboardOptIn` |
| MCP server for agents | `lib/mcp` (JSON-RPC handling, no network), `lib/mcp-tools.server` (read-only tools); route `app/api/mcp`, card `app/.well-known/mcp.json`; `components/WebMcp` registers the same tools in browsers with `navigator.modelContext` |
| Alerts | `lib/alerts` (rules, queries, feed params; browser-safe), `lib/alerts.server` (checks), `contexts/AlertsContext` (`useAlerts()`: polling, sidebar total, browser notifications), `lib/alert-digest.server` + `lib/alert-email` (daily email, signed unsubscribe links); pages in `app/alerts`, feed `app/feed/alerts.xml`, cron `app/api/cron/alert-digest` |
| GitHub search builders (browser-safe) | `lib/issue-query` — `buildIssueQuery`, `buildRepoQuery`, presets; re-exported by `lib/github` |
| Repo bot | `lib/repo-bot` (`buildRepoBotWorkflow`, `repoBotProblems`); page `app/repo-bot` |
| Rows that come and go | `components/fx/rowMotion` — `enterRow`, `leaveRow` (GSAP, Refero list timings, skipped under reduced motion) |
| Community writing | `lib/articles` — `getCommunityArticles()` from DEV, shown on `/resources` |
| Time | `components/Countdown` (deadline text), `components/RelativeTime` ("3 days ago") |
| Workspace data | `contexts/WorkspaceContext` — `useWorkspace()` |
| Auth | `contexts/AuthContext` — `useAuth()`; provider-aware user fields in `lib/identity` |
| The user's skills | `hooks/useSkills` — `useSkills()` |
| Pausing decorative motion off screen | `hooks/usePauseOffscreen` |
| Matching | `lib/matching` — `scoreIssue`, `scoreRepository`, `POPULAR_LANGUAGES`, `INTEREST_AREAS` |
| GitHub (server only) | `lib/github`, `lib/bounties.server`, `lib/organizations`, `lib/contributions` |
| Official program data (server only) | `lib/programs.server` — `getOfficialSchedules()` over `lib/gsoc` (Google's API, history since 2016), `lib/lfx` (LFX project index), `lib/outreachy` (published round schedule) |
| Program directory (server only) | `lib/program-directory` — `getProgramDirectory()` from the community list |
| Repository and contributor reports (server only) | `lib/repo-health` — `getRepoHealth`, `healthChecks`, `healthScore`; `lib/profile` — `getPublicProfile` |
| Assistant | `lib/assistant` (grounding context), `lib/gemini` — `generateText`; replies render with `components/Markdown` (React elements only, safe links) |
| Feeds | `lib/ics` — `icsCalendar()`; `lib/watchlist` — issue watchlist queries for the tracker and `/feed/issues.xml` |
| Live rows | `MentorshipRow` (LFX projects), `IssueRow`, `RepoRow` (links to the repository report) |
