# Handoff: Remy — hands-free cooking assistant redesign

## Overview
A full visual + hierarchy redesign of **Remy**, a voice-first cooking/shopping assistant (React + Vite web app). The redesign takes the app from its flat dark placeholder styling to a calm, warm-neutral "Scandinavian restaurant" system, mobile-first but built to scale to desktop browsers. Voice/API logic is unchanged — this is a **styling, layout, and information-hierarchy pass** plus several new screens (auth, first-run welcome).

The two highest-leverage moments, treated with extra care:
1. **The Shopping / Cooking mode fork** — picking a mode now tints the *entire screen* in that mode's colour (committed direction "1b"): sage for Shopping (calm / gathering), terracotta for Cooking (warm / active).
2. **Pause / resume** — resuming a paused recipe is a warm "welcome back", never an error state.

## About the design files
The files in this bundle are **design references authored in HTML/CSS** — a prototype showing the intended look, hierarchy, and behaviour. They are **not** meant to ship as-is. The task is to **recreate these designs inside the existing React + Vite codebase**, using its existing component structure (`src/App.jsx`, `src/components/*.jsx`) and its plain-CSS-with-custom-properties approach.

Two of the files, however, ARE production-ready and meant to be pasted in directly:
- `src/index.css` — design tokens, fonts, base resets, mode-theme classes, keyframes.
- `src/App.css` — every component's styling, rewritten to the new system, with desktop responsive rules.

So the workflow is: **(a) drop in the two CSS files, (b) make small structural/className changes in the JSX per the notes below, (c) add the two new screens (Auth, Welcome).**

## Fidelity
**High-fidelity.** Final colours, typography, spacing, and interactions. Recreate pixel-accurately. All exact values live in `src/index.css` / `src/App.css` (CSS custom properties) — prefer referencing the tokens over hard-coding.

---

## Design tokens
All defined as CSS custom properties in `src/index.css`. Key values:

**Warm neutrals**
- `--paper` `#F4EFE7` (app background) · `--surface` `#FBF8F3` (cards/inputs) · `--surface-2` `#F1ECE2`
- `--ink` `#23201A` (primary text + neutral CTA) · `--ink-soft` `#3A352C`
- `--muted` `#6E6559` (secondary) · `--faint` `#9C9284` (labels/tertiary)
- `--hairline` `#E7DFD1` · `--hairline-strong` `#D8CDBB`

**Shopping mode (sage / calm)**
- `--sage` `#5C7563` · `--sage-deep` `#3F5748` · `--sage-ink` `#26302A` · `--sage-soft` `#E8EEE7`
- screen tint: `linear-gradient(180deg,#E9EFE7,#DFE9DD)` + top radial glow `#F2F6F0`

**Cooking mode (terracotta / warm)**
- `--clay` `#B65B3C` · `--clay-deep` `#7C3A22` · `--clay-ink` `#3A2317` · `--clay-soft` `#F3E4DB`
- screen tint: `linear-gradient(180deg,#F4E3D8,#EDD6C7)` + top radial glow `#F9EDE5`

**Status**
- `--amber` `#B4862F` / `--amber-soft` `#FBF6EC` (not-enough) · `--danger` `#B0503C` / `--danger-soft` `#F3E1DB` (errors, cooking-paused chip)

**Type** — via Google Fonts (imported at top of index.css):
- `--serif` **Newsreader** (wordmark, recipe titles, mode names, screen headings, welcome headlines) — weight 400–500.
- `--sans` **Hanken Grotesk** (all UI, body, buttons, labels) — weight 400–700.
- `--mono` system mono (tool-log chips only).

**Radii** — cards `18px`, buttons `13–14px`, pills `999px`.
**Shadows** — `--shadow-card` `0 8px 22px rgba(60,50,40,.08)`, mode CTAs `0 8px 20px rgba(<mode-deep>,.26)`.

**Motion / keyframes** (in index.css): `remy-pulse` (listening dot), `remy-bar` (speaking waveform, `scaleY`), `remy-ring` (connecting orb), `remy-shimmer` (loading skeletons), `remy-drift` (slow 26s background drift on mode tints — `background-size:140% 160%`, gentle position sweep; keep it subtle/low-cost).

**Theming mechanism:** put a mode class on the screen wrapper so children inherit the palette:
```jsx
<main className={`app-screen theme-${mode}`}>  // theme-shopping | theme-cooking
```
`.theme-shopping` / `.theme-cooking` set `--mode`, `--mode-deep`, `--mode-ink`, `--mode-soft`, and the tint vars. Mode-neutral screens (landing, search, library, auth, welcome) use `.app-screen` with **no** theme class and stay on `--paper`.

---

## Screens / views

### 1. Auth — Log in  *(new screen, `src/components/AuthScreen.jsx` or similar)*
- **Purpose:** web-app entry. Mobile: single centred column; desktop: two-pane (warm brand panel left with logo + rings, form right).
- **Layout (mobile):** `.auth` full-height paper column, `padding:40px 26px`. Centred brand block (logo mark 64px + "Remy" serif 28 + eyebrow "INVISIBLE SOUS-CHEF"), then "Welcome back" (serif 26) + sub, then a `flex-column gap:10px` method stack.
- **Components:**
  - **Continue with Apple** — `.btn-oauth--apple`: ink `#23201A` bg, paper text, Apple glyph (inline SVG), radius 13, padding 15.
  - **Continue with Google** — `.btn-oauth--google`: surface bg, hairline-strong border, 4-colour Google "G" SVG.
  - **OR divider** — hairline lines + faint 11px letter-spaced label.
  - **Email** + **Password** inputs — `.recipe-input__field` style (surface bg, hairline-strong border; focus = sage ring `0 0 0 3px rgba(92,117,99,.14)`).
  - **Log in** — `.btn-primary` (ink).
  - **Email me a magic link instead** — sage text button.
  - **Footer** — "New to Remy? [Create account]" — 15px, `color:--ink-soft`, top hairline separator, link sage bold underlined.
- **Desktop:** left panel 480px, `linear-gradient(160deg,#EFE9DE,#E9E1D3)`, centred logo-in-rings + "Remy" 36 + tagline "Your invisible sous-chef. Cook and shop entirely hands-free." Right panel paper, form max-width 360, vertically centred.

### 2. Auth — Sign up  *(new, minimal)*
- Same system, fewer elements, more air (`padding-top:96px` mobile). Logo mark 56 + "Create your account" (serif 27) + sub. Apple/Google (labelled "Sign up with…"), OR, Email + "Choose a password", **Create account** (ink). Small legal line ("By continuing you agree to our Terms & Privacy Policy."). Footer "Already have an account? [Log in]" — same prominent treatment as login footer.

### 3. First-run welcome  *(new screen — 5-card carousel, shown once after first login)*
Paper background, each card: optional **Skip** top-right (back arrow on last), centred abstract diagram, serif headline (29), muted body (15, max-width ~296), bottom row = progress dots (5; active = 22×7 ink pill, rest 7×7 `--hairline-strong`) + **Next** (ink) / **Get started** (sage on last).
1. **Meet Remy** — "Cook with your hands full." Diagram: logo mark inside two concentric sage rings. Body: invisible sous-chef, talk out loud, never needs a tap.
2. **Bring in any recipe** — Diagram: three source tokens (link/photo/search) → arrow → recipe card. Body: paste a link, snap the page, or search.
3. **Pick a mode** — Diagram: two panels side by side — sage "SHOPPING" (check-circle rows) + clay "COOKING" (numbered rows). Body: Shopping gathers ingredients; Cooking guides step by step; the whole app takes the mode's colour.
4. **Then just talk** *(the core message)* — Diagram: a sage waveform bubble (Remy) + a clay reply bubble (you). Body: "It's a conversation — completely hands-free. As you shop or cook, talk to Remy the way you would a friend in the kitchen: what you're doing, what you're swapping, what you can't find. It listens and keeps everything on track, so your hands never leave the food."
5. **Pause whenever** — Diagram: mixed sage/clay waveform + clay progress bar at 42% with a pause glyph + "Paused at step 3". Body: step away and come back; Remy remembers the exact step. CTA **Get started** (sage).

### 4. Landing / input  *(`src/App.jsx` input screen + `components/RecipeInput.jsx`)*
- **Layout:** `.landing` paper column, `padding:32px 24px`. Top brand row: logo lockup (mark 36 + "Remy" serif 26) left; **My recipes** pill right (`.landing__saved-link`: surface, hairline-strong border, bookmark SVG + label + sage count badge). Hero h1 "What are we making today?" (Newsreader 400, ~34px mobile / 44–46 desktop, `line-height:1.18`).
- **RecipeInput components:** URL input (`.recipe-input__field`) + **Get the recipe** (ink, `.recipe-input__submit`); "OR" divider (`.recipe-input__divider`, `::before/::after` rules); **Snap pages** (camera SVG icon) + **Upload** (photo-square SVG icon) side by side (`.recipe-input__photo`); **Search by name** row. "Try a sample recipe" faint underlined link at bottom.
- **Desktop:** full-width header bar (wordmark left, My recipes right); hero column max-width 520 centred; URL input + button on one row; the three source buttons in a row.
- **Icons:** use the two inline SVGs from the prototype (camera = rounded body + lens circle; upload/photo = rounded square + small circle + mountain line). Replace the old `◎`/`⌸` glyphs.

### 5. Extraction loading  *(RecipeInput loading state)*
Replaces "Extracting…" button text. Centred: pulsing concentric rings (`remy-ring`) with sage dot core; "Reading the recipe…" (serif 23) + sub; then a card with **shimmer skeleton** lines (`.skeleton`, `remy-shimmer`) under "Ingredients" and "Steps" labels. "Cancel" link.

### 6. Recipe search  *(`components/RecipeSearch.jsx`)*
Back button + "Search" (serif 22). Search field + **Go** (ink). "N results" label. Result rows (`.recipe-search__result`): 56px striped thumbnail placeholder (or real `image`), title (600/15.5) + meta ("45 min · serves 4"). Loading row: dimmed with "Fetching details…".

### 7. Camera capture  *(`components/CameraCapture.jsx`)*
Full-bleed dark (`#141210`). Top scrim + bar: blurred round **×** close, centred **"Snap each page"** blurred pill. Corner framing guides (4 L-shaped corners). Bottom scrim dock: horizontal thumbnail strip (54px, white border, remove ×), then controls row — **counter "2 / 6"** (left, 64px), **shutter** (72px white ring + fill, centre), **confirm** (right): a **round 50px terracotta button with a ✓ checkmark** (was the confusing "Use N" text). All hit targets ≥44px.

### 8. Mode fork / confirm  *(`src/App.jsx` confirm screen + `components/ModeToggle.jsx`)*  ⭐ high-leverage
- Screen wrapper gets `theme-shopping` or `theme-cooking` → **entire background tints** (mode gradient + gentle `remy-drift`).
- Back + "Remy" (mode-ink) top bar. **Segmented ModeToggle** (`.mode-toggle`): two options, active = solid `--mode` fill + white text + shadow; inactive = translucent mode-ink. Selecting a mode re-themes the whole screen.
- Centred head: eyebrow "SHOPPING/COOKING MODE" + recipe title (serif 30) + meta "6 ingredients · 6 steps".
- **Pitch card** (`.confirm__pitch`): an open **block-quote** — 3px `--mode` left rule, no fill, serif quote in `--mode-ink` (“Let's cook. I'll read you each step.” / “Let's gather your six ingredients.”) + supporting line. Deliberately NOT a filled card, so it reads as Remy's voice and never competes with the Start button.
- **First-step/first-item preview** (`.confirm__first`): translucent white card, "First up: bring a large pot of salted water to a boil." (bold value).
- **Start cooking / Start shopping** — `.btn-mode` (`--mode-deep` bg). Foot: "Save recipe" · "Try another".
- Layout must stay stable across long recipe titles and variable counts (title wraps; status/labels never reflow siblings).

### 9. Resume / welcome back  *(App.jsx confirm screen, progress present)*  ⭐ high-leverage
Mode-themed like the fork. Head: eyebrow "WELCOME BACK" + title + meta. **Resume card** (`.resume__card`, warm white-mixed-with-mode-soft): tag row (mode dot + "PAUSED IN COOKING"), serif headline "You left off at step 3.", excerpt quoting the step + "Everything's saved — pick up right where you were.", then a 6-segment **progress bar** (done segments = `--mode`, rest translucent). CTAs: **Resume at step 3** (`.btn-mode`) + **Start over from the top** (`.btn-mode-outline`). Reassuring tone — not an error.

### 10. Voice session — Cooking  *(`components/VoiceSession.jsx`, mode==='cooking')*
Mode-themed (clay). Top bar: back (= change mode), recipe title (serif 18, `line-height:1`, ellipsis, centred with button), **Save** pill. **Hero current step** (`.step-hero`): "STEP 3 OF 6" label (mode, `white-space:nowrap`) + 6 progress dots + the step text large (**Newsreader 25** mobile / 34 desktop). Then **Conversation** log: agent bubbles (mode-soft, radius `14 14 14 4`), user bubbles (solid `--mode`, `14 14 4 14`), and **tool-call chips** shown as *soft, italic app-notes* (Hanken italic, small mode dot) — e.g. “Moved on to step 3”, deliberately NOT raw function names or mono/backend styling. Bottom **live bar** (`.live-bar`, `--mode-deep`): animated speaking waveform (`remy-bar` ×4 staggered) OR listening pulse dot (`remy-pulse`), status label ("Remy is speaking…" / "Listening…"), **Wrap up** pill.
- **Desktop (≥1100px):** two-pane — left = step hero + live bar, right = conversation panel. See `.voice-session.is-cooking .session-panes` grid.

### 11. Voice session — Shopping  *(VoiceSession.jsx, mode==='shopping')*
Mode-themed (sage). Same top bar. **Hero progress** (`.shop-progress`): "4 of 6 sorted" (serif count) + "2 to go" + progress bar. **Ingredient checklist** (`.check-list` / `.check-row`) with distinct states — this is important, build all five:
  - **have** (`.is-have`) — sage filled ✓, name sage-ink.
  - **not enough** (`.is-partial`) — amber ring "!", amber sub-note "Only 2 of 4 tbsp — grab more", amber-soft card.
  - **swapped** (`.is-swap`) — sage ⇄, original name struck-through + "→ Pecorino" bold, "Swapped" sub.
  - **missing / skipped** (`.is-skip`) — muted ✕, struck-through name, "Couldn't find — skipped" sub, **Undo** action.
  - **pending** — empty ring; optional **Skip** pill action (the "ignore" affordance).
  These map to the `confirm_ingredient({ ingredient, status, note })` tool — status drives the row class. Bottom live bar as above.

### 12. Voice session — Connecting
Mode-themed. Back + title. Centred **orb** (`.connecting__orb`): two `remy-ring` rings + solid `--mode` core containing an **abstract 3-bar waveform** (not a literal mic emoji). "Waking up Remy…" (serif 24) + "Connecting your microphone. Allow access if your browser asks — then just start talking." "Cancel" link.

### 13. Voice session — Wrap-up sheet
Dimmed session behind + scrim (`.wrap-up__scrim`). Bottom sheet (`.wrap-up`, mobile) / centred modal (desktop ≥768): handle, "Wrap up?" (serif 24) + "You're on step 3 of 6. Nothing's lost either way." Three option rows (`.wrap-up__opt`): **Pause & resume later** = primary (clay border + clay icon, "I'll remember you're at step 3"); **Save recipe & end**; **Finish — all done**. "Keep going" text button. Maps to `onPause` / `onSaveAndEnd` / `onFinish`.

### 14. Voice session — Recovery / error
Neutral paper. Danger-soft circle icon "!", "Couldn't reach Remy" (serif 24) + mic-permission message. **Try again** (clay, `.voice-session__retry`) + **Back to recipe** (`.voice-session__back`).

### 15. Saved library  *(`components/RecipeLibrary.jsx`)*
Mode-agnostic → paper. Back + "Saved recipes" (serif 22) + count label. Recipe rows (`.recipe-library__item`): 52px striped thumbnail, serif title (19), meta ("6 ingredients · 6 steps"), and a **paused chip** where applicable — `.is-cooking` (danger-soft, pause-bars icon + "Step 3") or `.is-shopping` (sage-soft, pause-bars + "Shopping"). Remove ×. **Desktop:** 2-column grid, max-width 860, centred.

---

## Interactions & behaviour
- **Mode fork:** tapping a ModeToggle segment re-themes the whole screen (swap the wrapper's `theme-*` class); CTA + pitch + tints all follow. Transition colours ~200ms.
- **Backgrounds:** mode tints run `remy-drift` (26s, ease-in-out, infinite) — a gentle vertical breathing of the radial glow. Keep amplitude low; respect `prefers-reduced-motion` (disable the animation).
- **Live bar:** waveform bars animate only while `agentMode==='speaking'`; show the pulse dot while listening. Status text is its own row so its changing length never reflows the title (a real bug we're avoiding).
- **Loading:** shimmer skeletons during extraction; search rows show inline "Fetching details…" on the selected item.
- **Camera:** continuous multi-shot; shutter disabled at max; confirm ✓ appears once ≥1 shot.
- **Responsive:** mobile-first. `@media (min-width:768px)` centres columns (max ~560) and turns the wrap-up sheet into a modal; `@media (min-width:1100px)` splits the cooking session into two panes. Backgrounds use `background-attachment:fixed` + `min-height:100dvh` so the tint always covers the viewport and never "ends at an edge" on scroll.
- **Layout stability:** all dynamic content (titles, counts, status) must not shift neighbours — titles ellipsize/wrap, labels are `nowrap`, status lives on its own line.

## State management
Unchanged from current app — this is a styling pass. Existing state in `App.jsx` (`screen`, `recipe`, `mode`, `cookingStepIndex`, `shoppingConfirmations`, `savedRecipes`, `sessionKey`) and `VoiceSession.jsx` (`status`, `agentMode`, `log`, `error`, `showWrapUp`) all map directly onto these screens. New: an `authed`/first-run flag to gate the Auth + Welcome screens (welcome shown once after first login — persist a `hasSeenWelcome` flag). Auth provider wiring (Apple/Google/email/magic-link) is a backend concern not covered here; the screens are UI only.

## Assets
- `assets/remy-mark.png` — the Remy logo (fountain-pen rat + toque), recoloured to warm ink `#23201A` on transparency. Provided by the user; use in the wordmark lockup, welcome slide 1, auth, and as favicon.
- `assets/remy-mark-light.png` — same mark in paper `#F4EFE7` for use on dark/tinted surfaces.
- All other "images" in the prototype are **striped placeholders** (`repeating-linear-gradient`) standing in for recipe photography/thumbnails — swap in real images where available; layouts work with and without imagery.
- Icons (camera, photo, bookmark, Apple, Google, chevrons, pause bars, ✓/⇄/✕/!) are inline SVGs / simple shapes in the prototype — copy them or substitute the codebase's icon set.

## Files in this bundle
- `src/index.css` — **drop-in** design tokens, fonts, base, mode themes, keyframes.
- `src/App.css` — **drop-in** full component styling + responsive rules. Class names match the app's existing BEM-ish names (`.landing`, `.recipe-input__*`, `.voice-session__*`, `.mode-toggle`, `.recipe-library__*`, `.camera-capture__*`, `.recipe-search__*`) plus new ones for the new patterns (`.app-screen`, `.theme-*`, `.step-hero`, `.shop-progress`, `.check-row.is-*`, `.live-bar`, `.wrap-up`, `.auth`, `.btn-*`, welcome/connecting/resume).
- `prototype/Remy Redesign.dc.html` — the full visual reference (all screens, mobile + desktop). Note: authored in a design tool and depends on that tool's runtime + the two `.jsx` frame files; treat it as a **visual spec**, best viewed as the screenshots. `ios-frame.jsx` / `browser-window.jsx` are just device/browser chrome for presentation — not part of the app.

## Fonts
```
Newsreader (400,500,600 + italics) — https://fonts.google.com/specimen/Newsreader
Hanken Grotesk (400,500,600,700)  — https://fonts.google.com/specimen/Hanken+Grotesk
```
Imported at the top of `index.css`; ensure the `<link>`/import loads before first paint.
