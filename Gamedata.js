// ============================================================
// GAME DATA - Items, Crates, Rarities
// ============================================================

const RARITIES = {
  common:    { name: 'Common',    color: '#9ca3af', glow: '#9ca3af44', chance: 0.60,   tier: 1 },
  uncommon:  { name: 'Uncommon',  color: '#22c55e', glow: '#22c55e44', chance: 0.25,   tier: 2 },
  rare:      { name: 'Rare',      color: '#3b82f6', glow: '#3b82f644', chance: 0.10,   tier: 3 },
  epic:      { name: 'Epic',      color: '#a855f7', glow: '#a855f744', chance: 0.04,   tier: 4 },
  legendary: { name: 'Legendary', color: '#f59e0b', glow: '#f59e0b44', chance: 0.009,  tier: 5 },
  mythic:    { name: 'Mythic',    color: '#ef4444', glow: '#ef444444', chance: 0.0009, tier: 6 },
  divine:    { name: 'Divine',    color: 'rainbow', glow: '#ffffff44', chance: 0.0001, tier: 7 },
  ultra1:    { name: 'Ultra',     color: '#00ffff', glow: '#00ffff88', chance: 0.000001,    tier: 8, display: '1 in 1,000,000' },
  ultra2:    { name: 'Hyper',     color: '#ff00ff', glow: '#ff00ff88', chance: 0.00000001,  tier: 9, display: '1 in 100,000,000' },
  ultra3:    { name: 'Cosmic',    color: '#ffffff', glow: '#ffffff99', chance: 0.000000001, tier: 10, display: '1 in 1,000,000,000' },
  ultra4:    { name: 'Omnipotent',color: '#ffd700', glow: '#ffd70099', chance: 0.000000000001, tier: 11, display: '1 in 1,000,000,000,000' },
};

const ITEMS = [
  // === COMMON ITEMS ===
  { id: 'c001', name: 'Rusty Coin', rarity: 'common',    icon: '🪙', value: 5,    desc: 'A worn, tarnished coin.' },
  { id: 'c002', name: 'Wooden Shield', rarity: 'common', icon: '🛡️', value: 8,    desc: 'Basic wooden protection.' },
  { id: 'c003', name: 'Old Dagger', rarity: 'common',    icon: '🗡️', value: 6,    desc: 'Dull but still functional.' },
  { id: 'c004', name: 'Bread Loaf', rarity: 'common',    icon: '🍞', value: 3,    desc: 'Surprisingly filling.' },
  { id: 'c005', name: 'Pebble', rarity: 'common',        icon: '🪨', value: 2,    desc: 'Just a rock. Or is it?' },
  { id: 'c006', name: 'Leather Boots', rarity: 'common', icon: '👢', value: 10,   desc: 'Well-worn travel boots.' },
  { id: 'c007', name: 'Hemp Rope', rarity: 'common',     icon: '🧵', value: 4,    desc: 'Always useful to have.' },
  { id: 'c008', name: 'Candle', rarity: 'common',        icon: '🕯️', value: 3,    desc: 'Lights up the darkest caves.' },
  { id: 'c009', name: 'Cloth Bandage', rarity: 'common', icon: '🩹', value: 5,    desc: 'Stops minor bleeding.' },
  { id: 'c010', name: 'Wooden Bow', rarity: 'common',    icon: '🏹', value: 9,    desc: 'Simple but effective.' },
  { id: 'c011', name: 'Fishing Rod', rarity: 'common',   icon: '🎣', value: 7,    desc: 'For the patient angler.' },
  { id: 'c012', name: 'Iron Nail', rarity: 'common',     icon: '📌', value: 2,    desc: 'Holds things together.' },
  { id: 'c013', name: 'Empty Bottle', rarity: 'common',  icon: '🍶', value: 4,    desc: 'Could hold anything.' },
  { id: 'c014', name: 'Wool Hat', rarity: 'common',      icon: '🎩', value: 6,    desc: 'Keeps your head warm.' },
  { id: 'c015', name: 'Tin Cup', rarity: 'common',       icon: '🫙', value: 3,    desc: 'Dented but drinkable.' },

  // === UNCOMMON ITEMS ===
  { id: 'u001', name: 'Silver Ring', rarity: 'uncommon',    icon: '💍', value: 50,   desc: 'A simple silver band.' },
  { id: 'u002', name: 'Steel Sword', rarity: 'uncommon',    icon: '⚔️', value: 65,   desc: 'Sharper than most.' },
  { id: 'u003', name: 'Iron Helm', rarity: 'uncommon',      icon: '⛑️', value: 55,   desc: 'Solid iron headgear.' },
  { id: 'u004', name: 'Potion of Speed', rarity: 'uncommon',icon: '🧪', value: 70,   desc: 'Fleet-footed formula.' },
  { id: 'u005', name: 'Copper Key', rarity: 'uncommon',     icon: '🗝️', value: 45,   desc: 'Opens many doors.' },
  { id: 'u006', name: 'Map Fragment', rarity: 'uncommon',   icon: '🗺️', value: 60,   desc: 'Part of a larger secret.' },
  { id: 'u007', name: 'Storm Scroll', rarity: 'uncommon',   icon: '📜', value: 80,   desc: 'Contains weather magic.' },
  { id: 'u008', name: 'Fox Pelt', rarity: 'uncommon',       icon: '🦊', value: 55,   desc: 'Warm and valuable fur.' },
  { id: 'u009', name: 'Magic Compass', rarity: 'uncommon',  icon: '🧭', value: 75,   desc: 'Points toward treasure.' },
  { id: 'u010', name: 'Blue Crystal', rarity: 'uncommon',   icon: '💎', value: 90,   desc: 'Faintly glowing gem.' },
  { id: 'u011', name: 'Shadow Cloak', rarity: 'uncommon',   icon: '🧥', value: 85,   desc: 'Hard to see in.' },
  { id: 'u012', name: 'Bone Charm', rarity: 'uncommon',     icon: '🦴', value: 50,   desc: 'Provides minor warding.' },

  // === RARE ITEMS ===
  { id: 'r001', name: 'Enchanted Blade', rarity: 'rare',    icon: '🔷', value: 250,  desc: 'Hums with arcane energy.' },
  { id: 'r002', name: 'Dragon Scale', rarity: 'rare',       icon: '🐉', value: 300,  desc: 'Impervious to flame.' },
  { id: 'r003', name: 'Mana Crystal', rarity: 'rare',       icon: '🔮', value: 275,  desc: 'Crystallized magic.' },
  { id: 'r004', name: 'Thunder Gauntlet', rarity: 'rare',   icon: '⚡', value: 320,  desc: 'Channels lightning.' },
  { id: 'r005', name: 'Phantom Mask', rarity: 'rare',       icon: '👻', value: 290,  desc: 'Face of the unseen.' },
  { id: 'r006', name: 'Arcane Tome', rarity: 'rare',        icon: '📖', value: 350,  desc: 'Ancient spellbook.' },
  { id: 'r007', name: 'Vortex Staff', rarity: 'rare',       icon: '🌀', value: 310,  desc: 'Creates small storms.' },
  { id: 'r008', name: 'Ice Crown', rarity: 'rare',          icon: '👑', value: 400,  desc: 'Freezes the mind.' },
  { id: 'r009', name: 'Fire Emblem', rarity: 'rare',        icon: '🔥', value: 330,  desc: 'Smoldering with power.' },
  { id: 'r010', name: 'Moon Amulet', rarity: 'rare',        icon: '🌙', value: 280,  desc: 'Grants lunar vision.' },

  // === EPIC ITEMS ===
  { id: 'e001', name: 'Void Blade', rarity: 'epic',         icon: '🌑', value: 1200, desc: 'Cuts through reality.' },
  { id: 'e002', name: 'Soul Gem', rarity: 'epic',           icon: '💜', value: 1500, desc: 'Contains a trapped soul.' },
  { id: 'e003', name: 'Titan Armor', rarity: 'epic',        icon: '🛡️', value: 1800, desc: 'Forged by giants.' },
  { id: 'e004', name: 'Celestial Bow', rarity: 'epic',      icon: '🌟', value: 1400, desc: 'Arrows pierce stars.' },
  { id: 'e005', name: 'Chaos Orb', rarity: 'epic',          icon: '🌪️', value: 2000, desc: 'Unpredictable power.' },
  { id: 'e006', name: 'Phantom Crown', rarity: 'epic',      icon: '👑', value: 2200, desc: 'Ruler of shadows.' },
  { id: 'e007', name: 'Elder Wand', rarity: 'epic',         icon: '🪄', value: 1900, desc: 'Mastery over death.' },
  { id: 'e008', name: 'Abyssal Ring', rarity: 'epic',       icon: '🖤', value: 1700, desc: 'Power from the deep.' },

  // === LEGENDARY ITEMS ===
  { id: 'l001', name: 'Sunforged Sword', rarity: 'legendary',  icon: '☀️', value: 8000,  desc: 'Blazing with solar power.' },
  { id: 'l002', name: 'Moonweave Robe', rarity: 'legendary',   icon: '🌕', value: 9500,  desc: 'Woven from moonlight.' },
  { id: 'l003', name: 'Storm Trident', rarity: 'legendary',    icon: '🔱', value: 11000, desc: 'Commands the seas.' },
  { id: 'l004', name: 'Infinity Gauntlet', rarity: 'legendary',icon: '✊', value: 15000, desc: 'Controls reality itself.' },
  { id: 'l005', name: 'Phoenix Feather', rarity: 'legendary',  icon: '🦅', value: 12000, desc: 'Grants rebirth.' },
  { id: 'l006', name: 'God Slayer', rarity: 'legendary',       icon: '⚔️', value: 20000, desc: 'Even gods fear this blade.' },

  // === MYTHIC ITEMS ===
  { id: 'm001', name: 'Universe Key', rarity: 'mythic',     icon: '🗝️', value: 75000,  desc: 'Opens any dimension.' },
  { id: 'm002', name: 'Star Fragment', rarity: 'mythic',    icon: '⭐', value: 100000, desc: 'Piece of a dead star.' },
  { id: 'm003', name: 'Reality Shard', rarity: 'mythic',    icon: '💫', value: 120000, desc: 'Reality bends around it.' },
  { id: 'm004', name: 'Void Crystal', rarity: 'mythic',     icon: '🔲', value: 90000,  desc: 'Fragment of nothingness.' },

  // === DIVINE ITEMS ===
  { id: 'd001', name: 'Divine Relic', rarity: 'divine',     icon: '✨', value: 500000, desc: 'Touched by a deity.' },
  { id: 'd002', name: 'Creation Orb', rarity: 'divine',     icon: '🌈', value: 750000, desc: 'Born at the start of time.' },

  // === ULTRA RARE ITEMS ===
  { id: 'ur01', name: 'OMEGA SHARD', rarity: 'ultra1',      icon: '💠', value: 5000000,       desc: '1 in a million. Truly impossible.' },
  { id: 'ur02', name: 'NEXUS CORE', rarity: 'ultra2',       icon: '🔵', value: 50000000,      desc: 'One of only a few in existence.' },
  { id: 'ur03', name: 'PRIMORDIAL EYE', rarity: 'ultra3',   icon: '👁️', value: 500000000,     desc: 'The eye that saw creation.' },
  { id: 'ur04', name: 'ABSOLUTE ZERO', rarity: 'ultra4',    icon: '❄️', value: 999999999999,  desc: 'The rarest item in existence.' },
];

const CRATES = [
  {
    id: 'starter',
    name: 'Starter Crate',
    price: 50,
    icon: '📦',
    color: '#9ca3af',
    description: 'A basic crate for beginners.',
    items: ['c001','c002','c003','c004','c005','c006','c007','c008','u001','u002','r001'],
  },
  {
    id: 'warrior',
    name: 'Warrior Crate',
    price: 150,
    icon: '⚔️',
    color: '#ef4444',
    description: 'Contains combat gear and weapons.',
    items: ['c003','c010','u002','u003','r001','r004','e001','l006'],
  },
  {
    id: 'mystic',
    name: 'Mystic Crate',
    price: 200,
    icon: '🔮',
    color: '#a855f7',
    description: 'Magical artifacts and arcane items.',
    items: ['u007','u010','r003','r006','r007','e002','e007','l002','m003'],
  },
  {
    id: 'explorer',
    name: 'Explorer Crate',
    price: 120,
    icon: '🗺️',
    color: '#22c55e',
    description: 'Tools for the adventurous spirit.',
    items: ['c011','c012','u005','u006','u009','r010','e004','l005'],
  },
  {
    id: 'shadow',
    name: 'Shadow Crate',
    price: 300,
    icon: '🌑',
    color: '#6b21a8',
    description: 'Dark and mysterious contents.',
    items: ['u011','u012','r005','e001','e008','l004','m001','m004'],
  },
  {
    id: 'celestial',
    name: 'Celestial Crate',
    price: 500,
    icon: '🌟',
    color: '#f59e0b',
    description: 'Items blessed by the heavens.',
    items: ['r008','r010','e004','e006','l001','l002','l005','m002','d001'],
  },
  {
    id: 'mythic',
    name: 'Mythic Crate',
    price: 1000,
    icon: '💀',
    color: '#ef4444',
    description: 'For the most daring collectors.',
    items: ['e001','e002','e005','l001','l003','l006','m001','m002','m003','m004','d001','d002'],
  },
  {
    id: 'divine',
    name: 'Divine Crate',
    price: 2500,
    icon: '✨',
    color: 'rainbow',
    description: 'Touched by divinity itself.',
    items: ['l001','l002','l003','l004','l005','l006','m001','m002','m003','m004','d001','d002','ur01'],
  },
  {
    id: 'void',
    name: 'Void Crate',
    price: 5000,
    icon: '🕳️',
    color: '#000000',
    description: 'From the space between worlds.',
    items: ['m001','m002','m003','m004','d001','d002','ur01','ur02'],
  },
  {
    id: 'omega',
    name: 'OMEGA Crate',
    price: 10000,
    icon: '⚡',
    color: '#ffffff',
    description: 'The rarest crate in existence.',
    items: ['d001','d002','ur01','ur02','ur03','ur04'],
  },
];

module.exports = { RARITIES, ITEMS, CRATES };
