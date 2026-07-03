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
    ├── combo.js         Reusable searchable combobox component (type-to-filter dropdowns)
    ├── timer.js         Sticky countdown timer with sound cues (self-contained IIFE)
    └── app.js           All application logic: state, rendering, command building, validation
```

Nothing here needs a server. `data.js` is the file you edit to add new patch content (zones, worlds, rewards) without touching logic.

---

## Basic workflow

1. Pick a **World** and **Speed** (searchable dropdown + preset pills, or type a custom speed label).
2. Optionally attach a **GIF** — pick from your saved library or paste a URL.
3. Tick one or more **Expansions**. Each ticked expansion gets its own section below with Map, Aetheryte, Targets, Scouts, etc.
4. Click any generated message box to copy it — every box shows a "Click to copy" hint and flashes green on success.
5. Copying the *main* command (`.sh` or `.msh`) automatically starts the sticky countdown timer.

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

The on-screen preview box only re-renders when you edit a field, so it can visually look "stale" if you haven't touched anything in a while — that's cosmetic only. What lands in your clipboard is always freshly computed.

---

## No breaks (merged multi-expansion trains)

When 2+ expansions are selected, a **"No breaks"** checkbox appears above the expansion list. Enabling it merges everything into a single announcement instead of separate per-expansion commands:

- **One merged `.sh`/`.msh` command**, using the **first** selected expansion's world/map/aetheryte/command number/custom message as the base.
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
- Pasting a URL shows a live preview below the field. Tenor/Giphy share-page URLs (`tenor.com/view/...`, `giphy.com/gifs/...`, or short `tenor.com/xxxxx.gif` links) can't be fetched for a local preview due to browser CORS restrictions, but **are valid to paste into the command** — Discord renders them natively. Raw `media.tenor.com/...` URLs preview fine locally but are flagged with a warning because they **don't** embed properly through the relay bot; use the short Tenor link instead.
- The GIF, once set, is appended directly after the speed bracket with no space: `Speed: [relaxed](https://...)`.

---

## Field validation

Clicking a copy box that's missing required data (World, Map, Aetheryte, Targets, Scouts, and — for ARR/HW/SB — Starts-in-minutes) doesn't copy anything. Instead the offending inputs get a red outline and the box flashes red with "Fill required fields" for ~1.8s. The outline clears automatically as soon as you fill the field in.

---

## Countdown timer

A sticky panel pinned to the bottom-right of the screen (scrolls with you, always visible):

- **Auto-starts** when you click to copy any main command (normal or merged).
  - Defaults to **10:30** for ShB/EW/DT.
  - For ARR/HW/SB, starts at whatever you set in "Starts in (minutes)" (default 5:00), keeping the timer in sync with the Discord `<t:...:R>` tag you just copied.
- **Only one timer runs at a time** — copying another command restarts it from that command's duration.
- **Sound cues** fire automatically as the timer counts down: at start, and at 10:00, 2:10, 1:10, 0:15, and 0:00 remaining (any threshold above the starting duration is skipped, so a 5-minute timer won't try to announce "10 minutes remaining").
- **Sound mode** — Voice (browser text-to-speech), Beeps (generated tones, no audio files needed), or Muted — selectable from a dropdown and remembered in `localStorage` (`hunt-train-timer-sound`). A "test sound" button lets you preview the current mode without starting a real countdown.
- At **0:00** it plays a final cue ("Train starts now") and stays pinned at `00:00` with a green highlight until you dismiss it — it does not disappear on its own.
- **Manual controls**: a text field (accepts `mm:ss`, a raw second count, or a plain number of minutes) plus Set/Restart, Reset (restarts at the last-used duration), and a close (✕) button to cancel outright.

---

## LocalStorage keys

| Key | Purpose |
|---|---|
| `hunt-train-gif-library-v2` | Saved GIF pills (`[{url, label}]`) |
| `hunt-train-timer-sound` | Sound mode: `voice` / `beep` / `mute` |
| `hunt-train-timer-duration` | Last-used timer duration in seconds, used by Reset |

Nothing else is persisted — form field values (world, expansions, map/aetheryte selections, targets, scouts, etc.) reset on page reload by design, since each train's details are one-off.

---

## Editing game data

All FFXIV-specific data — worlds, expansion labels/command numbers/icons/colors, zone→aetheryte maps, and reward tables — lives in **`js/data.js`**. This is the only file you should need to touch when a new expansion or patch changes zones, aetherytes, or reward currencies. `js/app.js` contains no hardcoded game data.
