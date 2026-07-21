# Remy

A hands-free cooking assistant. Bring in a recipe — paste a link, snap the
cookbook page, or search by name — then talk to Remy while you shop for it or
cook it, so your hands never leave the food.

Live: https://remy-amber.vercel.app

## How it works

Three pieces:

1. **Getting a recipe in.** URL and photo extraction run through Claude
   (`claude-haiku-4-5-20251001`) with forced tool use, so it always returns
   structured `{ title, ingredients, steps }`. URLs are stripped to article
   text with Readability first; photos go to the vision API (up to 6 pages at
   once, for recipes spanning a spread). Search hits Spoonacular instead and
   skips the model entirely.
2. **Picking a mode.** Shopping and Cooking are separate sessions, not a
   toggle inside one. The choice re-themes the whole screen — sage for
   Shopping, terracotta for Cooking — and changes the agent's greeting and
   framing.
3. **The voice session.** ElevenLabs Conversational AI, with four client-side
   tools the agent calls to read and mutate React state. Shopping renders a
   live ingredient checklist; Cooking renders the current step plus a
   transcript.

Sessions can be paused and resumed at the exact step. Recipes are saved to
`localStorage` (`remy:savedRecipes`); there are no accounts yet.

## Running it

```bash
npm install
npx vercel dev        # http://localhost:3000
```

Use `vercel dev`, not `npm run dev` — plain Vite won't serve the `/api`
routes, so extraction and search will 404. `npm run dev` is fine for
UI-only work.

Environment (`.env.local`):

```
VITE_ELEVENLABS_AGENT_ID=   # public agent id, safe in the client bundle
ANTHROPIC_API_KEY=          # server-only
SPOONACULAR_API_KEY=        # server-only
```

**Gotcha:** `vercel dev`'s function runtime reads `.env`, not `.env.local`.
Keep the two server keys in both, or the API routes will report a missing key
while the app itself looks fine.

## The ElevenLabs agent

Most of the voice behaviour lives in the ElevenLabs dashboard, not in this
repo. Cloning this alone won't give you a working agent. It needs:

**Four client tools** (names must match [`VoiceSession.jsx`](src/components/VoiceSession.jsx)):

| Tool | Parameters |
| --- | --- |
| `get_shopping_list` | — |
| `confirm_ingredient` | `ingredient`, `status`, `note` |
| `get_next_step` | — |
| `log_observation` | `observation` |

`status` is an enum: `confirmed`, `partial`, `substituted`, `missing`.
`partial` covers "needs 5, has 4" — close enough to carry on. The system
prompt asks the agent to offer a substitute before writing anything off as
`missing`.

**Security tab:** "First message" and "System prompt" overrides must be
enabled, or the per-mode greetings are silently ignored.

**Publish after editing.** Tool and prompt edits only change the draft. An
unpublished agent connects but behaves like a default one — it greets you
generically and can't see the recipe.

## Design

`design_handoff_remy_redesign/` holds the design handoff: the token files,
the prototype, and 26 rendered screens.

The prototype (`.dc.html`) depends on a design-tool runtime we don't have.
To render it locally for side-by-side comparison:

```bash
python3 design_handoff_remy_redesign/flatten-prototype.py
# then http://localhost:3000/prototype-flat.html
# in the console: __show('SESSION · SHOPPING (LISTENING)')
```

Delete `public/prototype-flat.html` before committing.

Two deliberate departures from the handoff, both commented at the source:

- **No dark mode.** The handoff's dark block was marked "WIP — tune before
  shipping" and had never been designed against real screens; it rendered as
  an undesigned brown with sub-AA text. The app is pinned light until dark
  gets a proper pass.
- **`--faint` darkened** from `#9C9284` to `#766C5C` (2.68:1 → 4.51:1) for
  the small label text it's used on. `--decor` keeps the original value for
  non-text decoration, where contrast minimums don't apply.

## Where things stand

Working end to end: URL / photo / search / sample intake, the mode fork,
both voice sessions, pause-resume, and the saved-recipe library.

Known gaps, roughly in priority order:

- **No accounts.** Recipes are per-device. Real auth means picking a
  provider, adding a database, and migrating `localStorage` to per-user
  storage. `AuthScreen` exists as UI only and is wired to nothing — reachable
  at `/#auth` for demos.
- **URL-extracted recipes have no image.** Only Spoonacular supplies one.
  Most recipe pages expose `og:image`, and `/api/extract-recipe` already has
  the HTML in hand, so this is a small addition. Until then those recipes use
  the striped placeholder, which is the design's own no-image treatment.
- **Design fidelity is partially verified.** Landing, both confirm and
  session modes, library, search, loading, wrap-up and welcome 1–2 have been
  compared against the rendered prototype. Auth, camera, connecting,
  recovery, resume, welcome 3–5 and the desktop layouts have not.
- **No editing a bad extraction.** You can accept it or discard and retry.
- **The agent has no allowlist**, so any host can connect to it.
