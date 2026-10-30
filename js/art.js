/* js/art.js — faint background art for each expansion's form section and
   command preview. Official artwork where an image is listed, otherwise an
   original line drawing inspired by the expansion's setting, drawn in
   currentColor so it takes the expansion's --exp-color-*. style.css sets
   size and fade. */

/* Official artwork (FINAL FANTASY XIV © SQUARE ENIX, used under the FFXIV
   Materials Usage License; the notice is in the page footer). An expansion
   listed here shows its image instead of the line drawing below. Put the
   images in img/art/ as ~720px-wide WebP; they're shown faintly. */
const EXP_ART_IMAGES = {
  HW: 'img/art/HW.webp',
};

const EXP_ART = {
  /* A Realm Reborn — Dalamud falling over the flames of the Calamity */
  ARR: `
<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="132" cy="58" r="36" fill="currentColor" fill-opacity=".14"/>
  <circle cx="132" cy="58" r="46" stroke-dasharray="2 7" opacity=".7"/>
  <path d="M112 36l9 13-5 11 11 7M142 27l-3 15 10 9M160 66l-13-3-7 13M118 76l8-7"/>
  <path d="M104 84L56 132M114 92L80 140M96 74L36 114" opacity=".55"/>
  <path d="M48 100l-6 2M66 118l-5 4M88 128l-3 5" opacity=".55"/>
  <path d="M24 196c-14-22 0-40 12-54 1 14 9 18 12 10 9 14 20 26 12 44"/>
  <path d="M62 196c-10-20 2-36 14-50 2 15 12 18 14 8 11 16 16 30 8 42"/>
  <path d="M104 196c-8-16 2-30 12-40 2 12 10 14 12 6 8 12 10 24 4 34"/>
  <path d="M146 196c-6-12 2-22 9-30 2 9 7 10 9 5 6 9 7 17 3 25"/>
  <path d="M40 196c-4-10 1-17 6-22 2 7 6 8 6 3 4 7 4 13 2 19M82 196c-3-8 1-14 5-18 2 6 5 6 5 2 3 6 3 11 1 16" opacity=".6"/>
</svg>`,

  /* Heavensward — the spires of Ishgard in falling snow */
  HW: `
<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M100 26v-10"/><circle cx="100" cy="14" r="2" fill="currentColor"/>
  <path d="M100 26l-14 40v120h28V66z" fill="currentColor" fill-opacity=".12"/>
  <path d="M92 186v-30a8 8 0 0116 0v30M94 96a6 6 0 0112 0v18H94z"/>
  <path d="M62 64l-11 32v90h22V96z" fill="currentColor" fill-opacity=".08"/>
  <path d="M138 64l11 32v90h-22V96z" fill="currentColor" fill-opacity=".08"/>
  <path d="M57 128a5 5 0 0110 0v14H57zM133 128a5 5 0 0110 0v14h-10z"/>
  <path d="M34 112l-8 24v50h16v-50zM166 112l8 24v50h-16v-50z" opacity=".7"/>
  <path d="M16 186h168"/>
  <g opacity=".75">
    <path d="M166 34v20M157 39l18 10M157 49l18-10"/>
    <path d="M30 48v14M24 51l12 8M24 59l12-8"/>
  </g>
  <g fill="currentColor" stroke="none" opacity=".7">
    <circle cx="44" cy="22" r="1.6"/><circle cx="140" cy="20" r="1.4"/><circle cx="182" cy="80" r="1.6"/>
    <circle cx="18" cy="86" r="1.4"/><circle cx="122" cy="44" r="1.2"/><circle cx="74" cy="34" r="1.4"/>
    <circle cx="186" cy="130" r="1.2"/><circle cx="12" cy="150" r="1.6"/><circle cx="152" cy="100" r="1.2"/>
  </g>
</svg>`,

  /* Stormblood — a rising sun over the curling waves of the Far East */
  SB: `
<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="124" cy="62" r="30" fill="currentColor" fill-opacity=".14"/>
  <path d="M124 20V10M78 62H66M182 62h-12M91 29l-7-7M164 22l-7 7M91 95l-7 7M157 95l7 7" opacity=".7"/>
  <path d="M8 150c20-6 30-28 52-28 18 0 26 14 16 22-7 5-16 0-12-7"/>
  <path d="M60 150c22-10 38-40 66-40 22 0 32 18 20 28-9 7-20 1-15-8"/>
  <path d="M8 170c26-4 40-18 62-18s32 12 54 12 40-14 68-14"/>
  <path d="M8 188c22-2 34-10 54-10s34 10 56 10 40-8 74-8" opacity=".7"/>
  <path d="M76 128c-6-6-4-14 2-16M146 116c-4-6-2-12 3-14" opacity=".6"/>
</svg>`,

  /* Shadowbringers — a crystal tower under the stars of the First */
  ShB: `
<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <path d="M110 14l14 30-6 142H102L96 44z" fill="currentColor" fill-opacity=".14"/>
  <path d="M110 14v172M96 44h28" opacity=".6"/>
  <path d="M80 70l10 22-4 94h-12l-4-94z" fill="currentColor" fill-opacity=".08"/>
  <path d="M140 60l11 24-4 102h-13l-4-102z" fill="currentColor" fill-opacity=".08"/>
  <path d="M58 118l7 16-3 52h-9l-3-52zM164 110l7 16-3 60h-9l-3-60z" opacity=".75"/>
  <path d="M30 186h150"/>
  <circle cx="110" cy="100" r="56" stroke-dasharray="1 6" opacity=".6"/>
  <path d="M40 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM172 40l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z"/>
  <g fill="currentColor" stroke="none" opacity=".7">
    <circle cx="160" cy="16" r="1.4"/><circle cx="20" cy="72" r="1.4"/><circle cx="66" cy="18" r="1.2"/>
    <circle cx="186" cy="88" r="1.2"/><circle cx="28" cy="130" r="1.2"/>
  </g>
</svg>`,

  /* Endwalker — a ringed planet, the moon, and a constellation */
  EW: `
<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="112" cy="104" r="40" fill="currentColor" fill-opacity=".14"/>
  <path d="M80 92c14 6 50 8 64 4M78 112c18 6 52 6 68 0" opacity=".5"/>
  <ellipse cx="112" cy="104" rx="76" ry="18" transform="rotate(-16 112 104)"/>
  <path d="M174 30a22 22 0 1 0 6 30 18 18 0 1 1-6-30z" fill="currentColor" fill-opacity=".14"/>
  <path d="M18 40l22 14 18-8 16 20M58 46l-6 22" opacity=".7"/>
  <g fill="currentColor" stroke="none">
    <circle cx="18" cy="40" r="2.4"/><circle cx="40" cy="54" r="2"/><circle cx="58" cy="46" r="2.4"/>
    <circle cx="74" cy="66" r="2"/><circle cx="52" cy="68" r="1.8"/>
  </g>
  <g fill="currentColor" stroke="none" opacity=".7">
    <circle cx="186" cy="150" r="1.4"/><circle cx="30" cy="160" r="1.4"/><circle cx="150" cy="186" r="1.2"/>
    <circle cx="96" cy="20" r="1.2"/><circle cx="60" cy="186" r="1.2"/>
  </g>
</svg>`,

  /* Dawntrail — a stepped pyramid of Tural among palm fronds */
  DT: `
<svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="162" cy="44" r="20" fill="currentColor" fill-opacity=".14"/>
  <path d="M162 14V8M162 80v-6M126 44h-6M204 44h-6M137 19l-5-5M187 19l5-5M137 69l-5 5M187 69l5 5" opacity=".7"/>
  <path d="M60 186l10-22h112l10 22z M74 164l10-20h84l10 20z M88 144l10-20h56l10 20z M102 124l8-16h32l8 16z" fill="currentColor" fill-opacity=".1"/>
  <path d="M120 108v-10h12v10M118 186v-16h16v16"/>
  <path d="M120 186v-24M132 186v-24" opacity=".5"/>
  <path d="M30 186c4-40 6-70 18-98"/>
  <path d="M48 88c-14-6-30-2-40 8M48 88c-6-14-18-22-32-22M48 88c4-16 16-26 30-26M48 88c14-4 28 2 34 14M48 88c4 14 0 28-8 36"/>
  <path d="M22 92l-3 6M30 78l-5 2M62 70l4 4M70 92l5 2" opacity=".6"/>
  <path d="M8 186h184"/>
</svg>`,
};
