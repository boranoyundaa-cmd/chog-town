// ===== NFT traits -> chog() options =====
// Data-driven by keyword, because the collection has 73 Body / 47 Head / 41 Eyes values and a long tail.
// Unknown values fall back to a sensible default instead of failing. See docs/reference/chog-collection.md.
const COLOR_WORDS = {
  black: 0x24222e, dark: 0x2a2838, white: 0xf2efe6, gr: 0x8a8a98, silver: 0xb8bcc8, red: 0xd8323c, orange: 0xf08a30, yellow: 0xf4c82c,
  gold: 0xf0b030, green: 0x3ac85a, mint: 0x6ae0b0, aqua: 0x30c8d8, cyan: 0x30c8d8, blue: 0x3a70e0, navy: 0x24367a, purple: 0x7a3ac8,
  violet: 0x8a4aff, pink: 0xff6aa8, brown: 0x7a4a2a, cream: 0xf0e4c4, rose: 0xff7a98, royal: 0x4a4ad8, army: 0x5a6a3a,
};
const FALLBACK_PALETTE = [0xd8323c, 0x3a70e0, 0x3ac85a, 0xf08a30, 0x7a3ac8, 0x30c8d8, 0xf4c82c, 0xff6aa8];
const hashStr = s => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
function colorOf(name, fallback) {
  const s = name.toLowerCase();
  for (const k of ['gray', 'grey']) if (s.includes(k)) return COLOR_WORDS.gr;
  for (const k in COLOR_WORDS) if (k !== 'gr' && s.includes(k)) return COLOR_WORDS[k];
  return fallback !== undefined ? fallback : FALLBACK_PALETTE[hashStr(name) % FALLBACK_PALETTE.length];
}
const has = (s, ...ks) => ks.some(k => s.includes(k));

const SKIN_HAIR = { Origin: 0x5b35b0, Pink: 0xff4a98, Red: 0xe0283a, Black: 0x2c2a3a, Yellow: 0xf4c82c, White: 0xf4f2ea, Green: 0x2fb58a, Grey: 0x8a8a98, Blue: 0x3a70e0 };
const BG_COLORS = {
  Aqua: 0x70e0e0, 'Aqua Mint': 0x88e8d0, 'Coral Pink': 0xf49890, 'Deep Aqua': 0x30a8b8, 'Deep Blue': 0x2848a8, 'Fresh Green': 0x78d868, Lemon: 0xf8e870,
  'Lemon Yellow': 0xf4f060, 'Light Magenta': 0xe890d8, 'Light Purple': 0xc8b0f0, 'Lime Green': 0xa8e040, Mint: 0x98e8c0, Mon: 0x836ef9, 'Noble Blue': 0x4868c8,
  'Peach Pink': 0xf8b8a0, Radioactive: 0x80e040, Rosie: 0xf4a0b8, 'Rosy Pink': 0xf090a8, 'Sky Blue': 0x90c8f0, 'Soft Lavender': 0xd8c8f0, Sunlight: 0xf8d890,
};
const TIER_COLORS = { Common: 0x9aa0aa, Uncommon: 0x4ac86a, Rare: 0x4a8aff, Epic: 0xb04aff, Legendary: 0xffc030 };

// ---- Body -> { kind, cloth, ... }
const BODY_SPECIAL = [
  [/banana/, { kind: 'suit', cloth: 0xf4d03a, belly: 0xf8e68a }], [/shark/, { kind: 'suit', cloth: 0x6a8aa8, belly: 0xe8eef4 }],
  [/astro/, { kind: 'suit', cloth: 0xeceff4, hands: 0x9aa0b0 }], [/duck/, { kind: 'suit', cloth: 0xf4d03a, belly: 0xf8e68a }],
  [/dragon/, { kind: 'suit', cloth: 0x3a9a5a, belly: 0xe8d890 }], [/toad/, { kind: 'suit', cloth: 0xff8ab8, belly: 0xffd0e0 }],
  [/sci fi/, { kind: 'suit', cloth: 0x8aa8c8, belly: 0x30e0f0 }], [/squid game guard/, { kind: 'suit', cloth: 0xf06aa0 }],
  [/squid game/, { kind: 'suit', cloth: 0x2a9a8a }], [/inmate/, { kind: 'suit', cloth: 0xf08a30 }],
  [/prisoner/, { kind: 'suit', cloth: 0xf2efe6, stripes: 0x24222e }], [/mummy/, { kind: 'suit', cloth: 0xe8dcb8, stripes: 0xb8a878 }],
  [/golden armor/, { kind: 'robe', cloth: 0xe0b040, robeTrim: 0xfff0a0 }], [/kings robe/, { kind: 'robe', cloth: 0xc02030, robeTrim: 0xf4f0e4 }],
  [/jesus/, { kind: 'robe', cloth: 0xf4f0e4, robeTrim: 0xd8c890 }], [/wizard/, { kind: 'robe', cloth: 0x3a2a8a, robeTrim: 0xf0c040 }],
  [/gojo/, { kind: 'jacket', cloth: 0x1c1c2c }], [/guko/, { kind: 'suit', cloth: 0xf07a20, belly: 0x3a6ad8 }],
  [/stripes/, { kind: 'shirt', cloth: 0xf2efe6, stripes: 0x24222e }],
];
function bodyOptions(name) {
  const s = name.toLowerCase();
  for (const [re, o] of BODY_SPECIAL) if (re.test(s)) return Object.assign({}, o);
  if (has(s, 'yukata')) return { kind: 'robe', cloth: colorOf(s, 0xf4f0e4), robeTrim: 0xd8c890 };
  if (has(s, 'chinese')) return { kind: 'robe', cloth: colorOf(s, 0x3a70e0), robeTrim: 0xf0c040 };
  if (has(s, 'tux')) return { kind: 'tux', cloth: colorOf(s, 0x1c1c26), tie: s.includes('red') ? 0x1a1a24 : 0xd8323c };
  if (has(s, 'hoodie')) return { kind: 'hoodie', cloth: colorOf(s, has(s, 'electro') ? 0x30c0e0 : has(s, 'glitch') ? 0x30e0a0 : has(s, 'mon') ? 0x7a3ac8 : undefined) };
  if (has(s, 'trackset')) return { kind: 'suit', cloth: colorOf(s, 0x24222e), stripes: 0xf2efe6 };
  if (has(s, 'vest')) return { kind: 'vest', cloth: has(s, 'ceo') ? 0x2a2a3a : colorOf(s, 0x2a2a3a) };
  if (has(s, 'jacket')) return { kind: 'jacket', cloth: colorOf(s, 0x2a2a3a) };
  if (has(s, 'jersey')) return { kind: 'shirt', cloth: colorOf(s, 0xd8323c) };
  return { kind: 'shirt', cloth: colorOf(s) };                          // shirts, tees, tanks, polos, memes, unknown
}

// ---- Head -> { head, headC, ... }
function headOptions(name) {
  const s = name.toLowerCase();
  const brand = has(s, 'btc', 'buttcoin') ? 0xf08a30 : has(s, 'mon ', 'mon', 'choggie', 'chog ', 'chog') ? 0x7a3ac8 : has(s, 'dollar') ? 0x3a9a5a : has(s, 'star') ? 0x24367a
    : has(s, 'cloud') ? 0xa8d0f0 : has(s, 'thunder') ? 0xf4d03a : has(s, 'peace') ? (s.includes('red') ? 0xd8323c : 0x5a6a4a) : has(s, 'jeet', 'retard', 'horny') ? 0xd8323c : has(s, 'wagmi', '10k') ? 0x3ac85a : undefined;
  const c = colorOf(s, brand);
  if (s.includes('crown')) return { head: 'crown' };
  if (s.includes('wizard beanie') || s.includes('wizard hat')) return { head: 'wizard', headC: 0x4a2a9a, headC2: 0xf0c040 };
  if (s.includes('bucket')) return { head: 'bucket', headC: c };
  if (s.includes('beanie')) return { head: 'beanie', headC: c, headC2: 0xf2efe6, pom: has(s, 'mon', 'choggie') };
  if (s.includes('cap')) return { head: 'cap', capC: c, headC: c, logoC: 0xf2efe6 };
  if (has(s, 'headband', 'bandana')) return { head: 'headband', headC: s.includes('japan') ? 0xf2efe6 : 0xd8323c };
  if (s.includes('durag')) return { head: 'durag', headC: colorOf(s, 0x24222e) };
  if (s.includes('spartan')) return { head: 'helmet' };
  if (s.includes('russian')) return { head: 'ushanka', headC: 0x8a7a6a };
  if (s.includes('thorn')) return { head: 'thorn' };
  if (s.includes('3rd eye')) return { head: 'thirdeye' };
  if (s.includes('clown nose')) return { head: 'clownnose' };
  if (s.includes('plumber')) return { head: 'plumber' };
  if (s.includes('robber')) return { head: 'robber' };
  if (s.includes('rainbow wig')) return { head: 'wig', hairMulti: true };
  if (s.includes('bob hair')) return {};
  if (s.includes('neet')) return { head: 'beanie', headC: 0x8a8a98, headC2: 0xb8bcc8 };
  if (s.includes('hat')) return { head: 'bucket', headC: c };
  return { head: 'dome', headC: c };                                    // MEGA Chog, MCGA ... unknown headwear
}

// ---- Eyes
function eyeOptions(name) {
  const s = name.toLowerCase(), o = {};
  if (s.includes('laser')) return { eyeStyle: 'laser', eyeColor: has(s, 'fire') ? 0xff6a20 : has(s, 'green') ? 0x40ff60 : has(s, 'purple') ? 0xb040ff : 0x40e0f0 };
  if (s.includes('visor')) return { eyeStyle: 'visor', eyeColor: has(s, 'plasma') ? 0xff30c0 : has(s, 'sunset') ? 0xff8a30 : 0xff5ab0, eyeColor2: has(s, 'plasma') ? 0x8030ff : has(s, 'sunset') ? 0xff4a80 : 0x4a8aff };
  if (s.includes('vr')) return { eyeStyle: 'vr', eyeColor: has(s, 'classic') ? 0x40e0a0 : 0x6a8aff };
  if (s.includes('glass')) return { eyeStyle: 'glass', eyeColor: has(s, 'btc') ? 0xf08a30 : has(s, '3d') ? 0x40a0ff : has(s, 'anime') ? 0xff8ad0 : 0x70b8e8, frameColor: has(s, 'retro') ? 0xd8323c : 0x222230 };
  if (s.includes('closed')) return { eyeStyle: 'closed', tears: has(s, 'cry') };
  if (has(s, 'crying', 'tear', 'teary')) return { eyeStyle: 'round', tears: true };
  if (has(s, 'happy', 'xd')) return { eyeStyle: 'happy' };
  if (has(s, 'dead')) return { eyeStyle: 'x' };
  if (s.includes('heart')) return { eyeStyle: 'heart' };
  if (s.includes('angry')) return { eyeStyle: 'angry' };
  if (s.includes('side')) return { eyeStyle: 'side' };
  if (has(s, 'tired', 'smirk', 'thug')) return { eyeStyle: 'tired' };
  if (has(s, 'viper', 'vertical', 'frog')) return { eyeStyle: 'slit', eyeColor: s.includes('frog') ? 0x6ae04a : 0xf4d03a };
  if (s.includes('clown')) return { eyeStyle: 'clown', eyeColor: has(s, 'mix') ? 0x3a8ae8 : 0xd8323c };
  if (s.includes('blue flat')) return { eyeStyle: 'flat', eyeColor: 0x4a8ae8 };
  if (s === 'flat') return { eyeStyle: 'flat', eyeColor: 0x120820 };
  if (s.includes('mixed')) return { eyeStyle: 'white' };
  return { eyeStyle: 'round' };
}

const MOUTHS = { 'btc coin': { mouth: 'coin', mouthColor: 0xf0a030 }, 'mon coin': { mouth: 'coin', mouthColor: 0x8a4ad8 }, bubblegum: { mouth: 'bubble' }, 'clown mouth': { mouth: 'clown' },
  drooling: { mouth: 'drool' }, flat: { mouth: 'flat' }, 'gold tooth': { mouth: 'gold' }, grit: { mouth: 'grit' }, 'lip bite': { mouth: 'lipbite' }, 'rainbow puke': { mouth: 'puke' },
  sad: { mouth: 'sad' }, smile: { mouth: 'smile' }, 'normal smile': { mouth: 'smile' }, worried: { mouth: 'worried' }, wo: { mouth: 'worried' } };

// ---- Aura (value "Clean" means no aura)
function auraOptions(name) {
  const s = name.toLowerCase();
  if (s === 'clean') return {};
  if (has(s, 'burning', 'fiery', 'fire')) return { aura: 0xff6a20, auraStyle: 'fire' };
  if (s.includes('wind')) return { aura: 0xdff4ff, auraStyle: 'wind' };
  if (s.includes('smoke')) return { aura: 0xb0b0c0, auraStyle: 'smoke' };
  if (s.includes('mist')) return { aura: 0xff9ad0, auraStyle: 'smoke' };
  const map = [['aqua', 0x40e0e0], ['cool', 0x60c0ff], ['royal', 0x4a4aff], ['rose', 0xff6a9a], ['light purple', 0xc0a0ff], ['violet', 0x8a4aff], ['purple', 0xa040ff], ['mint', 0x6af0b0], ['yellow', 0xffe040], ['pink', 0xff8ac8]];
  for (const [k, c] of map) if (s.includes(k)) return { aura: c, auraStyle: 'glow' };
  return { aura: 0xc0a0ff, auraStyle: 'glow' };
}

const ACCESSORIES = { cigar: { cigar: true }, coin: { acc: 'coin' }, fwog: { acc: 'frog' }, 'green candle': { acc: 'candle', accColor: 0x3ac85a }, 'red candle': { acc: 'candle', accColor: 0xd8323c }, heart: { acc: 'heart' }, knife: { acc: 'knife' }, sb: { acc: 'badge' } };

// ---- all together
function chogOptionsFromTraits(t) {
  const o = { scale: CHOG_SCALE };
  const hair = SKIN_HAIR[t.Skin] ?? colorOf(String(t.Skin || ''), 0x5b35b0);
  o.hair = hair; o.suit = hair;
  if (t.Skin === 'Multi Colored') { o.hairMulti = true; o.hair = 0xd04ad0; o.suit = 0x9a5ad8; }
  const skull = t.Base === 'Skull' || t.Form === 'Skull';
  if (t.Naked !== 'Yes' && t.Body) Object.assign(o, bodyOptions(t.Body));
  if (t.Head) Object.assign(o, headOptions(t.Head));
  Object.assign(o, eyeOptions(t.Eyes || 'Round'));
  Object.assign(o, MOUTHS[(t.Mouth || 'smile').toLowerCase()] || { mouth: 'smile' });
  if (t.Aura) Object.assign(o, auraOptions(t.Aura));
  if (t.Accessory) Object.assign(o, ACCESSORIES[t.Accessory.toLowerCase()] || { acc: 'badge' });
  if (t.Base === 'Radioactive') { o.faceC = 0xd0f088; if (o.aura === undefined) Object.assign(o, { aura: 0x60ff40, auraStyle: 'glow' }); }
  if (skull) Object.assign(o, { faceC: 0xe6e4d4, eyeStyle: 'socket', mouth: 'teeth', tears: false });
  o.bg = BG_COLORS[t.Background] ?? 0xc8b0f0; o.tier = TIER_COLORS[t.Tier] ?? TIER_COLORS.Common;
  return o;
}

// the default Chog every visitor without the NFT gets: the origin purple Chog
const DEFAULT_TRAITS = { Background: 'Light Purple', Base: 'Origin', Form: 'Chog', Skin: 'Origin', Eyes: 'Round', Mouth: 'Smile', Side: 'Right', Naked: 'Yes', Tier: 'Common' };

// make the passes aware of a dynamically built Chog (outline hulls / glow objects are hidden in the normal pass; auras animate)
function registerChog(root) {
  root.traverse(m => { if (m.userData && (m.userData.isHull || m.userData.noNormal) && typeof hiddenInNormal !== 'undefined' && !hiddenInNormal.includes(m)) hiddenInNormal.push(m); });
  if (root.userData.tick) animated.push(t => root.userData.tick(t));
  return root;
}
function chogFromTraits(traits, extra = {}) { const root = chog(Object.assign(chogOptionsFromTraits(traits), extra)); root.userData.traits = traits; return registerChog(root); }
