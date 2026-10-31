# Hunt Train Command Builder

DISCLAIMER: This tool was created with Antrophic's Claude AI.

A static, browser-only tool for generating FFXIV A-rank hunt train relay bot commands for the Light Trains Discord Server. No backend, no build step — open `index.html` (or the GitHub Pages URL) and it works.


---

## File structure

```
hunt-train/
├── index.html        Markup only — no logic
├── css/
│   └── style.css      All styling & CSS variables (theme lives at the top)
└── js/
    ├── data.js         Static data: worlds, expansions, zones/aetherytes, rewards, GIF library
    ├── art.js          Faint background art per expansion: official images list + fallback SVG line drawings
    ├── combo.js         Reusable searchable combobox component (type-to-filter dropdowns)
    ├── timer.js         Sticky countdown timer with sound cues (self-contained IIFE)
    └── app.js           All application logic: state, rendering, command building, validation
img/                  Expansion art (img/art/) and the browser-tab icon (favicon.svg)
tests/                Browser tests, for development only (see Testing)
```

Nothing here needs a server. `data.js` is the file you edit to add new patch content (zones, worlds, rewards) without touching logic.

---

## Basic workflow

1. *(Optional)* Use the **Trains** tabs at the top to prepare several trains at once — see [Trains & links](#trains--links).
2. Pick a **World** and **Speed** (searchable dropdown + preset pills, or type a custom speed label).
3. Optionally attach a **GIF** — pick from your saved library or paste a URL.
4. Tick one or more **Expansions**. Each ticked expansion gets its own section below with Map, Aetheryte, Targets, Scouts, etc.
5. Click any generated message box to copy it — every box shows a "Click to copy" hint and flashes green on success. Everything clickable also works from the keyboard: Tab to a box, pill or train tab, then Enter or Space.
6. Copying the *main* command (`.sh` or `.msh`) automatically starts the sticky countdown timer.

---

## Trains & links

### A link per train

Every change to the form is mirrored into the page address after the `#`, e.g.

```
index.html#w=Phoenix&sp=fast&e=ShB.DT&ShB.m=Lakeland&ShB.a=Fort+Jobb&ShB.t=8&ShB.sc=Ceri&DT.m=Urqopacha&DT.a=Wachunpelo&DT.t=12
```

So the address bar is always a stable link to exactly the train on screen: bookmark it, or send it to another conductor with **Copy link**. Opening it fills the form back in. A link holds **one** train — the tab you're on.

- The part after `#` is never sent to the server, and the address is updated in place, so typing doesn't flood the browser's Back button.
- Values left at their default are omitted, so links stay short and a blank form has no `#` at all.
- Everything from a link goes through the same clamps as typed input (targets ≤ max, minutes 0–180, …); unknown expansions or keys are ignored.
- ARR/HW/SB start times stay correct: the `<t:…:R>` timestamp is computed when you copy, not stored in the link.

| Key | Meaning |
|---|---|
| `w` | World |
| `sp` / `cs` | Speed (`slow`/`fast`/`custom`; omitted = relaxed) / custom speed label |
| `gif` | GIF URL |
| `e` | Selected expansions, dot-separated (`ShB.DT`) |
| `nb`, `nbp=0`, `nbr` | No breaks; progression message off; consolidated rewards |
| `<EXP>.m` / `.a` | Map / Aetheryte |
| `<EXP>.t` / `.max` | Targets / max targets (omitted = 12) |
| `<EXP>.i` | Instance number (only when max > 12) |
| `<EXP>.st` | Starts in minutes, ARR/HW/SB only (omitted = 5) |
| `<EXP>.msg` / `.sc` | Custom message / scouts |
| `<EXP>.p`, `<EXP>.r` | Progression message on; currency rewards on |

### Several trains at once

The **Trains** card holds one tab per prepared train, labelled `World · ShB > DT`:

- **+** opens a blank train, **Duplicate** opens a copy of the current one (e.g. same setup, other world), **Clear** empties the current one, **✕** closes a tab (asks first if it has entries).
- Switching tabs swaps the whole form and the address-bar link.
- All tabs are kept in `localStorage`, so they survive a reload.
- Opening a train link reuses a tab already holding exactly that train, fills the current tab if it's blank, and otherwise opens a new tab.
- Each train has its own countdown (see [Countdown timers](#countdown-timers)); a tab with a running timer shows its remaining time.

---

## Per-expansion fields

Each ticked expansion renders its own card containing:

| Field | Notes |
|---|---|
| **Map / Aetheryte** | Searchable dropdowns, sourced from `ZONES` in `data.js`. Picking a map resets the aetheryte list to that zone's options. |
| **Starts in (minutes)** | *Only shown for ARR / HW / SB.* Defaults to `5`. Used to compute a Discord relative timestamp (see below). Clamped 0–180. |
| **Custom message** | Optional. Appears on its own line, right after the starting point line, in both the main command and (for merged trains) the `.msh` follow-up messages. |
| **Targets** | `X/12`, clamped automatically as you type (typing "15" becomes "12"). |
| **Include currency rewards** | Checkbox. When ticked, computes total Poetics/Mathematics/Mnemonics/Sacks of Nuts/Seals based on target count × per-kill reward table in `data.js`, inserted as its own line. Hidden when *No breaks* mode is active (see below — rewards move to a single consolidated toggle instead). |
| **Scouts** | Free text. Feeds the main command, the Scouts macro, and (if multiple expansions with different scouts) the combined no-breaks scouts line. |
| **Show progression message** | *Only shown when 2+ expansions are selected and No breaks is off.* Generates e.g. `~~ShB~~ > EW > DT triple train with breaks in between!`, with expansions already run struck through. Grammar: "with a break in between!" for exactly 2 expansions, "with breaks in between!" for 3+. |

Every expansion section also generates three separate copy boxes: the main command, the **CWLS message** (a `/cwl1` announcement), and the **Scouts macro** (`/sh` or `/msh` + `/p` lines crediting the scout(s)).

---

## Pre-Shadowbringers expansions (ARR / HW / SB)

These three expansions use a **different command format** from ShB/EW/DT, because their hunt trains are scheduled rather than announced as already-running:

- Main command is `.msh` instead of `.sh`.
- First line reads `On **World** at Map - **Aetheryte** in <t:UNIXTIME:R>` instead of just `Map - **Aetheryte**`.
- The CWLS message says `in {X}min` (plain text) instead of the fixed `10mins` used by ShB+.
- The Scouts macro uses `/msh` instead of `/sh`.
- They **never** get `.start` / `.end` train-control messages — those are ShB+ only (see below).

### How the timestamp stays accurate

`<t:UNIXTIME:R>` is Discord's relative-timestamp markdown — it renders client-side as "in 5 minutes", "in 2 minutes", etc., and keeps updating live in everyone's Discord client without you needing to edit the message.

The Unix timestamp embedded in the tag is **calculated fresh at the moment you click the copy box**, not when you first typed the "Starts in" value. Concretely: `copyCmd()` → `buildRawCmd()` → `buildParts()` → `buildRelativeTimestamp()` runs synchronously inside the click handler and reads `Date.now()` at that exact instant. So even if you spend ten minutes filling in scouts and picking a GIF before finally copying, the timestamp reflects "starts in 5 minutes from *right now*" — not from whenever you first opened the form.

The timestamp in the on-screen preview is refreshed every second (`refreshLiveTimestamps`), so it always matches what a copy would give right now.

---

## No breaks (merged multi-expansion trains)

When 2+ expansions are selected, a **"No breaks"** checkbox appears above the expansion list. Enabling it merges everything into a single announcement instead of separate per-expansion commands:

- **One merged command**, using the **first** selected expansion's world/map/aetheryte/command number/custom message as the base. If that first expansion is ARR/HW/SB, the merged command, CWLS message and scouts macro use its scheduled format (`.msh` with `<t:…:R>`, "in {X}min", `/msh`); otherwise `.sh`.
- `:book: Expansions:` line lists all expansion names joined with `&`.
- `:dart: Targets:` lists each expansion's target count joined with `&` (e.g. `8/12 & 5/12 & 3/12`).
- **Scouts** are combined: if every expansion has the *same* scout text, it's shown once; if they differ, it reads like `Ceri (ShB), Aphelia (EW) and Gromp (DT)`.
- **Progression message** checkbox (ticked by default in this mode) shows no strikethrough and uses "no break(s)" grammar: `ShB > EW > DT triple train with no breaks in between!`
- **Consolidated currency rewards** checkbox (separate from the per-expansion ones, which are hidden while merged) sums rewards across *all* selected expansions into one line.
- A `.msh` **mid-train starting-location message** is generated for every expansion *after* the first — `.msh "Map - **Aetheryte** will be the starting location for the "Expansion" expansion. [custom message]" number` — so people can jump in when the train reaches that leg.
- **One** merged CWLS message and **one** merged Scouts macro cover the whole train.

---

## Train control (`.start` / `.end`)

Only Shadowbringers, Endwalker, and Dawntrail support `.start` / `.end` bot commands (ARR/HW/SB never generate these, in either mode):

- **Normal mode**: each qualifying expansion section gets its own `.end World Number` box.
- **Merged mode**: the *first* selected expansion (whichever it is) gets only `.end`; every following qualifying expansion gets both `.start` and `.end`. If none of the selected expansions qualify (e.g. an all-ARR/HW/SB merged train), the whole "Train control" section is omitted.

---

## Currency rewards

Per-kill reward amounts live in `EXP_REWARDS` in `data.js`, one entry per currency per expansion (Discord custom emoji codes, e.g. `<:poetics:1355014355590320248>`). The reward line multiplies each currency's per-kill amount by the target count and joins them with ` | `. Editing `data.js` is the only thing needed to update these if a patch changes hunt rewards.

---

## GIF library

- **Static entries** come from `GIF_LIBRARY` in `data.js` — edit that array to add permanent presets.
- **Saved entries** are stored in `localStorage` (`hunt-train-gif-library-v2`), sorted alphabetically, each with a rename (✏️) and delete (✕) button on its pill.
- Pasting a URL checks it against **`GIF_LINK_RULES`** in `data.js` (see below) and shows a preview below the field.
- The GIF, once set, is appended directly after the speed bracket with no space: `Speed: [relaxed](https://...)`.

### Will the GIF show in Discord?

Discord decides on its own servers whether a link becomes a GIF, and it goes by the link's **format** (site and path), not the file: the very same Tenor GIF shows from `c.tenor.com/<id>/tenor.gif` but not from `media1.tenor.com/m/<id>/<name>.gif`. So `GIF_LINK_RULES` lists link formats tested on the server, each with its verdict and example links, and the tool labels a pasted link:

| Label | Meaning |
|---|---|
| ✅ Shows as a GIF | Matches a format that worked (`tested: false` → "probably") |
| ⚠️ Won't show as a GIF | Matches a format that failed (`tested: false` → "probably", predicted but not yet tried) |
| ❓ Untested link format | Matches nothing yet — try it once in Discord and add the result as a rule |

Current findings:

| Format | Result |
|---|---|
| `giphy.com/gifs/…` | Works |
| `media*.giphy.com/media/…/giphy.gif` | Works |
| `c.tenor.com/<id>/tenor.gif` | Works |
| `media*.tenor.com/…` | Fails — **Use the working link** rewrites it to `c.tenor.com` |
| `tenor.com/view/…` | Works — the format Discord's own GIF picker posts |
| `tenor.com/en-GB/view/…` (any language part) | Fails — the tool **removes the language part automatically** (`normalizeGifUrl`) |
| `tenor.com/<code>.gif` short link | Predicted to work — it redirects to a plain `tenor.com/view` page |
| `i.imgur.com/<id>.gif` / `.gifv` | Predicted to work |
| `imgur.com/…` page | Predicted to fail (still preview only) — use the `i.imgur.com` image address |
| `cdn.discordapp.com/attachments/…` | Predicted to work, but Discord file links expire after about a day |
| Any other link ending in `.gif` | Predicted to work, unless the site blocks it (catch-all, keep it last) |

Predicted rows are `tested: false`; once you've tried one in Discord, set `tested: true` (or flip its verdict) and put the link in its `examples`.

Tenor pages give Discord identical information whether or not they have a language part, and all of it points to a failing `media1.tenor.com` file. Confirmed by testing the same GIF both ways: the plain `tenor.com/view/…` link works, the `/en-GB/` one doesn't. Most likely Discord recognises that exact format itself (Tenor is its built-in GIF provider) and doesn't recognise the language variant.

So every GIF link goes through `normalizeGifUrl` first: whatever sits between `tenor.com/` and `/view/` (`en-GB`, `pt-BR`, …) is removed, wherever the link comes from: pasted, a saved GIF, or a train link. The hint says what was removed.

**For Tenor:** paste the page link (any language version), or right-click the GIF → *Copy image address* and click **Use the working link** to get the `c.tenor.com` link. A saved GIF keeps its name when its link is fixed this way.

Previews need no third-party service: Giphy page links are previewed from their GIF id, Tenor page links with Tenor's own embedded player, and file links directly. Tenor short links get no preview, since Tenor doesn't let other sites follow them.

A matching ✅ format plus a preview that loads (so the GIF exists) is as close to certain as it gets; Discord can still change its behaviour, so add a rule whenever a result surprises you.

---

## Field validation

Clicking a copy box that's missing required data (World, Map, Aetheryte, Targets, Scouts, and — for ARR/HW/SB — Starts-in-minutes) doesn't copy anything. Instead the offending inputs get a red outline and the box flashes red with "Fill required fields" for ~1.8s. The outline clears automatically as soon as you fill the field in.

---

## Countdown timers

Every train tab has its own countdown, so several trains can be timed at once. Timers sit in a dock pinned to the bottom-right of the screen (always visible). On phones the dock is a compact bar of chips (train and time) along the bottom; the ^ button expands it to the full cards and settings.

- **A card per running timer**, named after its train, with pause/resume, reset (back to full time, stopped) and dismiss (✕). Clicking the card's name switches to that train's tab; the card of the train on screen is highlighted.
- **Tab badges**: a tab whose train has a timer shows its remaining time (dimmed while paused, orange in overtime).
- **Auto-starts** when you copy a main command (normal or merged) — the timer of the train you're on. If the browser blocks the clipboard, the box turns red with "Copy failed" and no timer starts.
  - Defaults to **10:30** for ShB/EW/DT.
  - For ARR/HW/SB, starts at whatever you set in "Starts in (minutes)" (default 5:00), keeping the timer in sync with the Discord `<t:...:R>` tag you just copied.
  - Copying again restarts that train's timer; other trains' timers keep running.
- **Settings panel** below the cards, titled with the current train: a duration field (accepts `mm:ss`, a raw second count, or a plain number of minutes) with ▶ to start or restart the current train's timer, plus the sound settings. Its ✕ hides it until the next timer starts.
- **Sound cues** fire as each timer counts down: at start, and at 10:00, 2:10, 1:10, 0:15, and 0:00 remaining (any threshold above the starting duration is skipped, so a 5-minute timer won't announce "10 minutes"). While more than one timer exists, each cue starts with the train's world — "Phoenix: 2 minutes 10" — and cues from two trains at once are queued, not cut off.
- **Sound mode** — Voice (browser text-to-speech), Beeps (generated tones, no audio files needed), or Muted — remembered in `localStorage`. A "test sound" button previews the current mode.
- After **0:00** a timer plays "Train starts now" and keeps counting **up** (`+00:42`, orange) until you dismiss it. A timer more than 2 hours over is dismissed automatically.
- **Timers survive a reload**: they're saved with their start time and keep counting; cues that were due while the page was closed aren't replayed. Closing a train's tab removes its timer.

---

## LocalStorage keys

| Key | Purpose |
|---|---|
| `hunt-train-gif-library-v2` | Saved GIF pills (`[{url, label}]`) |
| `hunt-train-timer-sound` | Sound mode: `voice` / `beep` / `mute` |
| `hunt-train-timer-duration` | Last-used timer duration in seconds, pre-filled in the settings panel |
| `hunt-train-timers-v1` | Running train timers: train id, name, duration, elapsed time and start time, so they survive a reload |
| `hunt-train-timer-voice` | Chosen text-to-speech voice |
| `hunt-train-trains-v1` | Prepared trains: `{ trains: [{ id, state }, …], active }`, each `state` in the link format above |

The form itself is restored from the active train (and the `#` link). Use **Clear** for a fresh form.

---

## Expansion art

Each expansion's form section and command preview carry faint background art, and are tinted in the expansion's colour (`--exp-color-*` in `style.css`).

- **Official artwork**: list the image in `EXP_ART_IMAGES` in `js/art.js` and put the file in `img/art/` — a ~720px-wide WebP is plenty, (each is 30–90 KB). Images fill a square; for a wide or tall one, `focus` (a CSS `object-position` like `'30% 50%'`) picks the part that shows, e.g. the faces in the Dawntrail art. Crop off any watermark from where you found the image. It's shown in its own colours at 55% strength (`--art-opacity` in `style.css`), filling the top-right and fading out toward the left and bottom; a soft text shadow keeps labels readable over bright paintings.
- **Expansions without an image** show an original line drawing from `EXP_ART` in the same file.

Official art is FINAL FANTASY XIV © SQUARE ENIX, used under the FINAL FANTASY XIV Materials Usage License (published by Square Enix on the Lodestone), which allows non-commercial fan use with a copyright notice. That notice is in the page footer; keep it there, and keep the tool free.

---

## Editing game data

All FFXIV-specific data — worlds, expansion labels/command numbers/icons/colors, zone→aetheryte maps, and reward tables — lives in **`js/data.js`**. This is the only file you should need to touch when a new expansion or patch changes zones, aetherytes, or reward currencies. `js/app.js` contains no hardcoded game data.

---

## Testing

`tests/` holds browser tests that click through the real page: train tabs and links, merged mode, GIF rules and previews, timers, copy failures, the phone layout, keyboard use and the command boxes. They're for development only; the site itself still needs no install or build.

```
cd tests
npm install          # once: installs playwright-core, which drives your installed browser
node run.js          # all suites
node run.js timers   # only suites whose file name starts with "timers"
```

It uses Microsoft Edge by default; `BROWSER=chrome node run.js` uses Chrome. The GIF suite loads real GIFs from Giphy and Tenor, so it needs internet. Each suite is a `*.test.js` file exporting `async ({ browser, BASE, check }) => { … }`; add a file to add a suite.
