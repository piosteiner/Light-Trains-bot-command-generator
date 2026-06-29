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

const ZONES = {
  ARR: [
    { map: 'Middle La Noscea',            aeths: ['Summerford Farms'] },
    { map: 'Lower La Noscea',             aeths: ['Moraby Drydocks', 'Cedarwood'] },
    { map: 'Eastern La Noscea',           aeths: ['Costa del Sol', 'Wineport'] },
    { map: 'Western La Noscea',           aeths: ['Aleport', 'Swiftperch'] },
    { map: 'Upper La Noscea',             aeths: ['Camp Bronze Lake'] },
    { map: 'Outer La Noscea',             aeths: ['Camp Overlook'] },
    { map: 'Central Shroud',              aeths: ["Bentbranch Meadows", "Galvanth's Spire"] },
    { map: 'East Shroud',                 aeths: ['The Hawthorne Hut', 'Sylphlands Sentinel'] },
    { map: 'South Shroud',                aeths: ['Quarrymill', 'Camp Tranquil'] },
    { map: 'North Shroud',                aeths: ['Fallgourd Float'] },
    { map: 'Central Thanalan',            aeths: ['Black Brush Station'] },
    { map: 'Eastern Thanalan',            aeths: ['Camp Drybone', 'Highbridge'] },
    { map: 'Southern Thanalan',           aeths: ['Little Ala Mhigo', 'Forgotten Springs'] },
    { map: 'Northern Thanalan',           aeths: ['Ceruleum Processing Plant', 'Bluefog'] },
    { map: 'Western Thanalan',            aeths: ['Horizon', 'Vesper Bay'] },
    { map: 'Coerthas Central Highlands',  aeths: ['Camp Dragonhead'] },
    { map: 'Mor Dhona',                   aeths: ["Revenant's Toll"] },
  ],
  HW: [
    { map: 'Coerthas Western Highlands',  aeths: ["Falcon's Nest"] },
    { map: 'The Sea of Clouds',           aeths: ["Ok' Zundu", 'Camp Cloudtop'] },
    { map: 'Azys Lla',                    aeths: ['Helix'] },
    { map: 'The Dravanian Forelands',     aeths: ['Tailfeather', 'Anyx Trine'] },
    { map: 'The Dravanian Hinterlands',   aeths: ['Idyllshire', 'Moghome'] },
    { map: 'The Churning Mists',          aeths: ['Zenith', 'Cloudtop'] },
  ],
  SB: [
    { map: 'The Fringes',                 aeths: ["Rhalgr's Reach", 'Castrum Oriens'] },
    { map: 'The Peaks',                   aeths: ['Ala Ghiri', 'Ala Gannha'] },
    { map: 'The Lochs',                   aeths: ['Porta Praetoria', 'The Ala Mhigan Quarter'] },
    { map: 'The Ruby Sea',                aeths: ['Tamamizu', 'Onokoro'] },
    { map: 'Yanxia',                      aeths: ['Namai', 'The House of the Fierce'] },
    { map: 'The Azim Steppe',             aeths: ['Reunion', 'Dawn Throne'] },
  ],
  ShB: [
    { map: 'Lakeland',                    aeths: ['Fort Jobb'] },
    { map: 'Kholusia',                    aeths: ['Stilltide', 'Wright'] },
    { map: 'Amh Araeng',                  aeths: ['Mord Souq', "The Inn at Journey's Head"] },
    { map: 'Il Mheg',                     aeths: ['Lydha Lran', 'Pla Enni'] },
    { map: "The Rak'tika Greatwood",      aeths: ['Slitherbough', 'Fanow'] },
    { map: 'The Tempest',                 aeths: ['Ondo Cups'] },
  ],
  EW: [
    { map: 'Labyrinthos',                 aeths: ['The Archeion', 'Aporia'] },
    { map: 'Thavnair',                    aeths: ['Yedlihmad', 'The Great Work'] },
    { map: 'Garlemald',                   aeths: ['Camp Broken Glass'] },
    { map: 'Mare Lamentorum',             aeths: ['Sinus Lacrimarum', 'Bestways Burrow'] },
    { map: 'Elpis',                       aeths: ['Poieten Oikos', 'Anagnorisis'] },
    { map: 'Ultima Thule',                aeths: ['Base Omicron', 'Reah Tahra'] },
  ],
  DT: [
    { map: 'Urqopacha',                   aeths: ['Wachunpelo'] },
    { map: "Kozama'uka",                  aeths: ["Ok'hanu", 'Woven Oath'] },
    { map: "Yak T'el",                    aeths: ["Iq Br'aax"] },
    { map: 'Shaaloani',                   aeths: ['Hhetsarro', 'Mehwahhetsoan'] },
    { map: 'Heritage Found',              aeths: ['Electrope Strike'] },
    { map: 'Living Memory',               aeths: ["Worlar's Echo"] },
  ],
};
