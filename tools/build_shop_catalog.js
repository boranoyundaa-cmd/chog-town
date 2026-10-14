'use strict';
// Builds the shop catalog the game uses from the contract's own item list (contracts/items.json: ids, kinds, prices, tiers) plus the display data below
// (tab, text, which extra slot a cosmetic wears, what a venue extra does, which room piece a decor kit unlocks).
//   node tools/build_shop_catalog.js   ->  prototype/data/shop_items.json (client)  and  server/shop_items.json (server, same file)
// Prices and tiers always come from items.json, so the page and the contract cannot drift apart.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts', 'items.json'), 'utf8'));

// display data by item id. slot = the extra Chog slot (aura, held, badge, plate, eyes); piece = the room piece id (prototype/js/space_data.js, kit 'shop');
// extra = budget a venue extra adds; use = what the owner does with it (event, mega, camera); look = colours and shapes the client draws
const DISPLAY = {
  1: { tab: 'decor', piece: 'shopNeonSign', desc: 'A buzzing wall sign with a hot pink DEGEN, for walls.' },
  2: { tab: 'decor', piece: 'shopBull', desc: 'A gold bull on a plinth. Number go up.' },
  3: { tab: 'decor', piece: 'shopBearRug', desc: 'A bear skin rug. The bear market is under your feet.' },
  4: { tab: 'decor', piece: 'shopPumpkins', desc: 'Three glowing pumpkins for a spooky corner.' },
  5: { tab: 'decor', piece: 'shopArcade', desc: 'A retro arcade cabinet with a glowing screen.' },
  6: { tab: 'decor', piece: 'shopCyberLamps', desc: 'Two neon lamp posts, cyan and magenta. Each lights the room.' },
  7: { tab: 'decor', piece: 'shopTrophyShelf', desc: 'A gold shelf with cups, for the wall.' },
  8: { tab: 'decor', piece: 'shopAquarium', desc: 'A whale in a glass tank. For Whales only.' },
  9: { tab: 'cosmetic', slot: 'aura', desc: 'A purple glow ring and sparkles around your feet.', look: { c: 0x9a5ad8, c2: 0xe8c8ff, style: 'ring' } },
  10: { tab: 'cosmetic', slot: 'aura', desc: 'Green candles flare up around you. Number go up.', look: { c: 0x2ee86a, c2: 0xc8ffd8, style: 'flare' } },
  11: { tab: 'cosmetic', slot: 'held', desc: 'A hot coffee in your hand. Markets never sleep.', look: { style: 'cup', c: 0xf4f0e4, c2: 0x7a4a26 } },
  12: { tab: 'cosmetic', slot: 'held', desc: 'A diamond in your hand. You never sell.', look: { style: 'diamond', c: 0x7ae8ff, c2: 0xffffff } },
  13: { tab: 'cosmetic', slot: 'badge', desc: 'A badge by your name: you were here early.', look: { icon: '🤝', label: 'Early fren', c: '#3a8ad8' } },
  14: { tab: 'cosmetic', slot: 'badge', desc: 'A diamond badge by your name.', look: { icon: '💎', label: 'Diamond', c: '#18b8d8' } },
  15: { tab: 'cosmetic', slot: 'plate', desc: 'A gold name plate.', look: { c: '#ffd24a', c2: '#c8901a', ink: '#4a2c00' } },
  16: { tab: 'cosmetic', slot: 'plate', desc: 'A neon pink name plate that glows.', look: { c: '#ff5ab8', c2: '#b0187a', ink: '#ffffff', glow: '#ff5ab8' } },
  17: { tab: 'cosmetic', slot: 'eyes', desc: 'Red laser beams from your eyes. Not financial advice.', look: { c: 0xff2a2a, rainbow: false } },
  18: { tab: 'cosmetic', slot: 'eyes', desc: 'Rainbow laser eyes, cycling every colour. Legends only.', look: { c: 0xff2a2a, rainbow: true } },
  19: { tab: 'venue', extra: { lights: 4 }, desc: 'Four more lights in your venue (each stack adds four, up to +8).' },
  20: { tab: 'venue', extra: { pieces: 20 }, desc: '20 more pieces on each level of your venue (stacks, up to +120 in all).' },
  21: { tab: 'venue', extra: { pieces: 60 }, desc: '60 more pieces on each level of your venue. For Whale venues and up.' },
  22: { tab: 'venue', use: 'event', desc: 'Announce a 24 hour event: your title shows in the hotel lobby directory and as a banner in town.' },
  23: { tab: 'venue', use: 'camera', desc: 'A security camera: a live view of who is in your venue and where, with a scanline screen.' },
  24: { tab: 'venue', use: 'mega', desc: 'A Penthouse mega event: 24 hours, shown first in the lobby and town. Legend venues only.' },
};
const NAMES = {      // shown names (items.json names are the on-chain labels)
  1: 'Degen neon sign', 2: 'Bull statue', 3: 'Bear rug', 4: 'Halloween pumpkin set', 5: 'Retro arcade cabinet', 6: 'Cyberpunk lamp pair', 7: 'Gold trophy shelf', 8: 'Whale tank aquarium',
  9: 'Aura: purple glow', 10: 'Aura: green candle flare', 11: 'Held: coffee cup', 12: 'Held: diamond hands', 13: 'Badge: early fren', 14: 'Badge: diamond', 15: 'Name plate: gold', 16: 'Name plate: neon pink',
  17: 'Laser eyes: red', 18: 'Laser eyes: rainbow', 19: 'Extra light budget +4', 20: 'Extra piece budget +20', 21: 'Extra piece budget +60', 22: 'Event / festival (24 h)', 23: 'Security camera', 24: 'Penthouse mega-event (24 h)',
};

const items = src.items.map(it => {
  const d = DISPLAY[it.id];
  if (!d) throw new Error('no display data for item ' + it.id);
  return Object.assign({ id: it.id, kind: it.kind, name: NAMES[it.id] || it.name, priceChog: it.priceChog, minTier: it.minTier, maxPerWallet: it.maxPerWallet, active: it.active }, d);
});
const out = { version: 1, chainId: 143, slots: ['aura', 'held', 'badge', 'plate', 'eyes'], extraCap: { pieces: 120, lights: 8 }, burnPct: 90, teamPct: 10, items };
const json = JSON.stringify(out);
fs.writeFileSync(path.join(ROOT, 'prototype', 'data', 'shop_items.json'), json);
fs.writeFileSync(path.join(ROOT, 'server', 'shop_items.json'), json);
console.log('shop_items.json:', items.length, 'items (', ['decor', 'cosmetic', 'venue'].map(t => items.filter(i => i.tab === t).length + ' ' + t).join(', '), ')');
