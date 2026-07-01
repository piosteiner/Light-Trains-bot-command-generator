/* js/data.js — FFXIV hunt zone & aetheryte data */

const WORLDS = [
  'Alpha', 'Lich', 'Odin', 'Phoenix',
  'Raiden', 'Shiva', 'Twintania', 'Zodiark',
];

const EXP_ORDER  = ['ARR', 'HW', 'SB', 'ShB', 'EW', 'DT'];

const EXP_LABELS = {
  ARR: 'A Realm Reborn',
  HW:  'Heavensward',
  SB:  'Stormblood',
  ShB: 'Shadowbringers',
  EW:  'Endwalker',
  DT:  'Dawntrail',
};

const EXP_NUMS = {
  ARR: 2, HW: 3, SB: 4, ShB: 5, EW: 6, DT: 7,
};

/* Quick visual marker per expansion, shown next to the label
   in the command preview so multiple expansions are easy to tell apart. */
const EXP_ICONS = {
  ARR: '🔥',
  HW:  '❄️',
  SB:  '⚡',
  ShB: '🌑',
  EW:  '🪐',
  DT:  '🌴',
};

const ZONES = {
  ARR: [
    { map: 'Middle La Noscea',            aeths: ['Summerford Farms'] },
    { map: 'Lower La Noscea',             aeths: ['Moraby Drydocks'] },
    { map: 'Eastern La Noscea',           aeths: ['Costa del Sol', 'Wineport'] },
    { map: 'Western La Noscea',           aeths: ['Swiftperch', 'Aleport'] },
    { map: 'Upper La Noscea',             aeths: ['Camp Bronze Lake'] },
    { map: 'Outer La Noscea',             aeths: ['Camp Overlook'] },
    { map: 'Central Shroud',              aeths: ['Bentbranch Meadows'] },
    { map: 'East Shroud',                 aeths: ['The Hawthorne Hut'] },
    { map: 'South Shroud',                aeths: ['Quarrymill', 'Camp Tranquil'] },
    { map: 'North Shroud',                aeths: ['Fallgourd Float'] },
    { map: 'Central Thanalan',            aeths: ['Black Brush Station'] },
    { map: 'Eastern Thanalan',            aeths: ['Camp Drybone'] },
    { map: 'Southern Thanalan',           aeths: ['Little Ala Mhigo', 'Forgotten Springs'] },
    { map: 'Northern Thanalan',           aeths: ['Camp Bluefog', 'Ceruleum Processing Plant'] },
    { map: 'Western Thanalan',            aeths: ['Horizon'] },
    { map: 'Coerthas Central Highlands',  aeths: ['Camp Dragonhead'] },
    { map: 'Mor Dhona',                   aeths: ["Revenant's Toll"] },
  ],
  HW: [
    { map: 'Coerthas Western Highlands',  aeths: ["Falcon's Nest"] },
    { map: 'The Sea of Clouds',           aeths: ['Camp Cloudtop', "Ok' Zundu"] },
    { map: 'Azys Lla',                    aeths: ['Helix'] },
    { map: 'The Dravanian Forelands',     aeths: ['Tailfeather', 'Anyx Trine'] },
    { map: 'The Dravanian Hinterlands',   aeths: ['Idyllshire'] },
    { map: 'The Churning Mists',          aeths: ['Moghome', 'Zenith'] },
  ],
  SB: [
    { map: 'The Fringes',                 aeths: ['Castrum Oriens', 'The Peering Stones'] },
    { map: 'The Peaks',                   aeths: ['Ala Gannha', 'Ala Ghiri'] },
    { map: 'The Lochs',                   aeths: ['Porta Praetoria', 'The Ala Mhigan Quarter'] },
    { map: 'The Ruby Sea',                aeths: ['Tamamizu', 'Onokoro'] },
    { map: 'Yanxia',                      aeths: ['Namai', 'The House of the Fierce'] },
    { map: 'The Azim Steppe',             aeths: ['Reunion', 'The Dawn Throne', 'Dhoro Iloh'] },
  ],
  ShB: [
    { map: 'Lakeland',                    aeths: ['Fort Jobb', 'The Ostall Imperative'] },
    { map: 'Kholusia',                    aeths: ['Stilltide', 'Wright', 'Tomra'] },
    { map: 'Amh Araeng',                  aeths: ['Mord Souq', "The Inn at Journey's Head", 'Twine'] },
    { map: 'Il Mheg',                     aeths: ['Lydha Lran', 'Pla Enni', 'Wolekdorf'] },
    { map: "The Rak'tika Greatwood",      aeths: ['Slitherbough', 'Fanow'] },
    { map: 'The Tempest',                 aeths: ['The Ondo Cups', 'The Macarenses Angle'] },
  ],
  EW: [
    { map: 'Labyrinthos',                 aeths: ['The Archeion', 'Sharlayan Hamlet', 'Aporia'] },
    { map: 'Thavnair',                    aeths: ['Yedlihmad', 'The Great Work', "Palaka's Stand"] },
    { map: 'Garlemald',                   aeths: ['Camp Broken Glass', 'Tertium'] },
    { map: 'Mare Lamentorum',             aeths: ['Sinus Lacrimarum', 'Bestways Burrow'] },
    { map: 'Elpis',                       aeths: ['Anagnorisis', 'The Twelve Wonders', 'Poieten Oikos'] },
    { map: 'Ultima Thule',                aeths: ['Reah Tahra', 'Abode of the Ea', 'Base Omicron'] },
  ],
  DT: [
    { map: 'Urqopacha',                   aeths: ['Wachunpelo', "Worlar's Echo"] },
    { map: "Kozama'uka",                  aeths: ["Ok'hanu", 'Many Fires', 'Earthenshire', 'Dock Poga'] },
    { map: "Yak T'el",                    aeths: ["Iq Br'aax", 'Mamook'] },
    { map: 'Shaaloani',                   aeths: ['Hhusatahwi', 'Sheshenewezi Springs', 'Mehwahhetsoan'] },
    { map: 'Heritage Found',              aeths: ['Yyasulani Station', 'The Outskirts', 'Electrope Strike'] },
    { map: 'Living Memory',               aeths: ['Leynode Mnemo', 'Leynode Pyro', 'Leynode Aero'] },
  ],
};

/* Rewards per A-rank kill, in display order (smallest to largest quantity) */
const EXP_REWARDS = {
  ARR: [
    { amount: 10, emoji: '<:mathematics:1355013812230553712>',  label: null },
    { amount: 30, emoji: '<:poetics:1355014355590320248>',      label: null },
    { amount: 20, emoji: null,                                  label: 'Centurio Seals' },
    { amount: 40, emoji: null,                                  label: 'Allied Seals' },
  ],
  HW: [
    { amount: 10, emoji: '<:mathematics:1355013812230553712>',  label: null },
    { amount: 30, emoji: '<:poetics:1355014355590320248>',      label: null },
    { amount: 40, emoji: null,                                  label: 'Centurio Seals' },
  ],
  SB: [
    { amount: 10, emoji: '<:mathematics:1355013812230553712>',  label: null },
    { amount: 30, emoji: '<:poetics:1355014355590320248>',      label: null },
    { amount: 40, emoji: null,                                  label: 'Centurio Seals' },
  ],
  ShB: [
    { amount: 10, emoji: '<:mathematics:1355013812230553712>',  label: null },
    { amount: 30, emoji: '<:poetics:1355014355590320248>',      label: null },
    { amount: 40, emoji: '<:sackofnuts:1117597415390846977>',   label: null },
  ],
  EW: [
    { amount: 10, emoji: '<:mathematics:1355013812230553712>',  label: null },
    { amount: 30, emoji: '<:poetics:1355014355590320248>',      label: null },
    { amount: 40, emoji: '<:sackofnuts:1117597415390846977>',   label: null },
  ],
  DT: [
    { amount: 10, emoji: '<:mnemonics:1450577101840187503>',    label: null },
    { amount: 20, emoji: '<:mathematics:1355013812230553712>',  label: null },
    { amount: 30, emoji: '<:poetics:1355014355590320248>',      label: null },
    { amount: 40, emoji: '<:sackofnuts:1117597415390846977>',   label: null },
  ],
};

/* GIF library — quick-pick options shown under World & Speed.
   Add or replace entries here; "label" is what shows on the pill. */
const GIF_LIBRARY = [
  { label: 'Train GIF 1', url: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXhzZGh2NmpjanpwenQzdWZvZng2c255ZDlkeTRnNGg2cXB0ZWY5YyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/fW6yzJe1ZM5bi/giphy.gif' },
  { label: 'Train GIF 2', url: '' },
  { label: 'Train GIF 3', url: '' },
  { label: 'Train GIF 4', url: '' },
];