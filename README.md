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

1. *(Optional)* Use the **Trains** tabs at the top to prepare several trains at once — see [Trains & links](#trains--links).
2. Pick a **World** and **Speed** (searchable dropdown + preset pills, or type a custom speed label).
3. Optionally attach a **GIF** — pick from your saved library or paste a URL.
4. Tick one or more **Expansions**. Each ticked expansion gets its own section below with Map, Aetheryte, Targets, Scouts, etc.
5. Click any generated message box to copy it — every box shows a "Click to copy" hint and flashes green on success.
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
- There's still one countdown timer; its header shows which train it was started for.

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

Tenor pages give Discord identical information whether or not they have a language part, and all of it points to a failing `media1.tenor.com` file. Confirmed by testing the same GIF both ways: the plain `tenor.com/view/…` link works, the `/en-GB/` one doesn't. Most likely Discord recognises that exact format itself (Tenor is its built-in GIF provider) and doesn't recognise the language variant.

So every GIF link goes through `normalizeGifUrl` first: whatever sits between `tenor.com/` and `/view/` (`en-GB`, `pt-BR`, …) is removed, wherever the link comes from: pasted, a saved GIF, or a train link. The hint says what was removed.

**For Tenor:** paste the page link (any language version), or right-click the GIF → *Copy image address* and click **Use the working link** to get the `c.tenor.com` link. A saved GIF keeps its name when its link is fixed this way.

Previews need no third-party service: Giphy page links are previewed from their GIF id, Tenor page links with Tenor's own embedded player, and file links directly. Tenor short links get no preview, since Tenor doesn't let other sites follow them.

A matching ✅ format plus a preview that loads (so the GIF exists) is as close to certain as it gets; Discord can still change its behaviour, so add a rule whenever a result surprises you.

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
| `hunt-train-timer-voice` | Chosen text-to-speech voice |
| `hunt-train-trains-v1` | Prepared trains: `{ trains: [encoded, …], active }`, each entry in the link format above |

The form itself is restored from the active train (and the `#` link). Use **Clear** for a fresh form.

---

## Editing game data

All FFXIV-specific data — worlds, expansion labels/command numbers/icons/colors, zone→aetheryte maps, and reward tables — lives in **`js/data.js`**. This is the only file you should need to touch when a new expansion or patch changes zones, aetherytes, or reward currencies. `js/app.js` contains no hardcoded game data.
