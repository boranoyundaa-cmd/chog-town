// Mini-games client (see the header comment below the engine). The block between ENGINE-BEGIN and ENGINE-END is a verbatim copy of server/games.js
// (the two-player rules, used here for NPC opponents); server/test/games.js fails when they differ. To change a rule, edit the server copy and paste it here.
// ENGINE-BEGIN
// Pure match rules for the four two-player games. No I/O: `rng()` gives [0,1), `now` is a millisecond clock chosen by the caller.
// gmMatch(game, rng, now) -> { start(now), move(seat, msg, now), tick(now), quit(seat), take() -> [{to:'all'|0|1, msg}], over, winner, score }
const GM_TWO = ['rps', 'dance', 'c4', 'ls'];
const GM_RPS_BEATS = { r: 's', p: 'r', s: 'p' };
const GM_C4 = { cols: 7, rows: 6 };
function gmC4Win(grid, c, r) {                                 // grid[c][r], r = 0 is the bottom row; returns the four cells of a winning line through (c, r), or null
  const who = grid[c][r]; if (who == null) return null;
  for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const line = [[c, r]];
    for (const s of [1, -1]) for (let k = 1; k < 4; k++) { const cc = c + dc * k * s, rr = r + dr * k * s; if (cc < 0 || rr < 0 || cc >= GM_C4.cols || rr >= GM_C4.rows || grid[cc][rr] !== who) break; line.push([cc, rr]); }
    if (line.length >= 4) return line.sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, 4);
  }
  return null;
}
function gmCandles(rng, n, start) {                            // a fake price chart: a random walk with a drifting mood, candles as [open, high, low, close]
  const out = []; let p = start, mood = (rng() - 0.5) * 0.8;
  for (let i = 0; i < n; i++) {
    if (rng() < 0.18) mood = (rng() - 0.5) * 1.2;
    const o = p, c = Math.max(5, o * (1 + (mood * 0.35 + (rng() - 0.5) * 2.4) / 100)), hi = Math.max(o, c) * (1 + rng() * 0.012), lo = Math.min(o, c) * (1 - rng() * 0.012);
    out.push([+o.toFixed(2), +hi.toFixed(2), +lo.toFixed(2), +c.toFixed(2)]); p = c;
  }
  return out;
}
function gmMatch(game, rng, now0) {
  const m = { game, over: false, winner: -1, score: [0, 0], round: 0, ev: [], st: {} };
  const emit = (to, msg) => m.ev.push({ to, msg });
  const done = (winner, why, extra) => { if (m.over) return; m.over = true; m.winner = winner; emit('all', Object.assign({ t: 'g_end', winner, score: m.score.slice(), why: why || '' }, extra)); };
  const byScore = () => (m.score[0] > m.score[1] ? 0 : m.score[1] > m.score[0] ? 1 : -1);
  m.take = () => { const e = m.ev; m.ev = []; return e; };
  m.quit = seat => done(1 - seat, 'left');
  const st = m.st;
  if (game === 'rps') {
    const resolve = now => {
      for (let i = 0; i < 2; i++) if (!st.picks[i]) st.picks[i] = 'rps'[(rng() * 3) | 0];
      const [a, b] = st.picks, win = a === b ? -1 : GM_RPS_BEATS[a] === b ? 0 : 1;
      if (win >= 0) m.score[win]++;
      emit('all', { t: 'g_reveal', round: m.round, picks: st.picks.slice(), win, score: m.score.slice() });
      st.played++;
      if (m.score[0] >= 2 || m.score[1] >= 2 || st.played >= 5) return done(byScore(), 'rounds');
      m.round++; st.picks = [null, null]; st.start = now + 3200; st.dl = st.start + 15000;
      emit('all', { t: 'g_round', round: m.round, ms: 15000, delay: 3200 });
    };
    m.start = now => { st.picks = [null, null]; st.played = 0; m.round = 1; st.start = now; st.dl = now + 15000; emit('all', { t: 'g_round', round: 1, ms: 15000, delay: 0 }); };
    m.move = (seat, msg, now) => {
      if (m.over || now < st.start - 100 || st.picks[seat] || !(msg.pick in GM_RPS_BEATS)) return;
      st.picks[seat] = msg.pick; emit('all', { t: 'g_state', ready: [!!st.picks[0], !!st.picks[1]] });
      if (st.picks[0] && st.picks[1]) resolve(now);
    };
    m.tick = now => { if (!m.over && now >= st.dl) resolve(now); };
  } else if (game === 'dance') {
    const begin = (now, delay) => {
      const len = Math.min(6, 3 + m.round), leader = (m.round + 1) % 2, showMs = 900 + len * 650;
      st.seq = Array.from({ length: len }, () => (rng() * 4) | 0); st.follower = 1 - leader; st.start = now + delay; st.dl = st.start + showMs + 8000 + len * 800;
      emit('all', { t: 'g_round', round: m.round, leader, seq: st.seq, showMs, delay, ms: st.dl - st.start });
    };
    const resolve = (ok, now) => {
      if (ok) m.score[st.follower]++;
      emit('all', { t: 'g_reveal', round: m.round, ok, follower: st.follower, score: m.score.slice() });
      if (m.round >= 4) return done(byScore(), 'rounds');
      m.round++; begin(now, 3000);
    };
    m.start = now => { m.round = 1; begin(now, 0); };
    m.move = (seat, msg, now) => {
      if (m.over || seat !== st.follower || now < st.start || !Array.isArray(msg.seq) || msg.seq.length > 8) return;
      resolve(msg.seq.length === st.seq.length && msg.seq.every((v, i) => v === st.seq[i]), now);
    };
    m.tick = now => { if (!m.over && now >= st.dl) resolve(false, now); };
  } else if (game === 'c4') {
    st.grid = Array.from({ length: GM_C4.cols }, () => Array(GM_C4.rows).fill(null)); st.turn = 0; st.n = 0;
    m.start = now => { st.dl = now + 45000; emit('all', { t: 'g_round', turn: 0, ms: 45000 }); };
    m.move = (seat, msg, now) => {
      const c = msg.col;
      if (m.over || seat !== st.turn || !Number.isInteger(c) || c < 0 || c >= GM_C4.cols) return;
      const r = st.grid[c].indexOf(null); if (r < 0) return;
      st.grid[c][r] = seat; st.n++;
      const line = gmC4Win(st.grid, c, r); st.turn = 1 - seat; st.dl = now + 45000;
      emit('all', { t: 'g_state', col: c, row: r, seat, turn: st.turn, ms: 45000 });
      if (line) { m.score[seat] = 1; done(seat, 'four', { line }); } else if (st.n >= GM_C4.cols * GM_C4.rows) done(-1, 'full');
    };
    m.tick = now => { if (!m.over && now >= st.dl) done(1 - st.turn, 'timeout'); };
  } else if (game === 'ls') {
    const begin = (now, delay) => {
      for (let tries = 0; tries < 20; tries++) {
        const all = gmCandles(rng, 32, 80 + rng() * 120); st.hist = all.slice(0, 28); st.fut = all.slice(28);
        if (Math.abs(st.fut[3][3] / st.hist[27][3] - 1) > 0.004) break;
      }
      st.picks = [null, null]; st.start = now + delay; st.dl = st.start + 11000;
      emit('all', { t: 'g_round', round: m.round, hist: st.hist, ms: 11000, delay });
    };
    const resolve = now => {
      const base = st.hist[27][3], end = st.fut[3][3], mv = (end / base - 1) * 100, sg = { L: 1, S: -1 };
      const pnl = st.picks.map(s => +((sg[s] || 0) * mv).toFixed(2)), win = pnl[0] === pnl[1] ? -1 : pnl[0] > pnl[1] ? 0 : 1;
      if (win >= 0) m.score[win]++;
      emit('all', { t: 'g_reveal', round: m.round, picks: st.picks.slice(), fut: st.fut, pnl, win, score: m.score.slice() });
      st.played++;
      if (m.score[0] >= 2 || m.score[1] >= 2 || st.played >= 5) return done(byScore(), 'rounds');
      m.round++; begin(now, 5200);
    };
    m.start = now => { m.round = 1; st.played = 0; begin(now, 0); };
    m.move = (seat, msg, now) => {
      if (m.over || now < st.start - 100 || st.picks[seat] || (msg.side !== 'L' && msg.side !== 'S')) return;
      st.picks[seat] = msg.side; emit('all', { t: 'g_state', ready: [!!st.picks[0], !!st.picks[1]] });
      if (st.picks[0] && st.picks[1]) resolve(now);
    };
    m.tick = now => { if (!m.over && now >= st.dl) resolve(now); };
  }
  return m;
}
// ENGINE-END

// ===== games: the mini-games (docs/game/world.md, Mini-games). Each game is an HTML/canvas window over the town, not a 3D scene =====
// Record games (client computes, sends only the result): Stack the luggage, Rhythm, Daily Chog. Two-player games (server referee in server/games.js,
// or a local NPC opponent running the same ENGINE block above): rock-paper-scissors, dance copy, connect four, long/short duel.
// Only `GAMES` and the gm* engine names are global. Keys while a window is open are caught in the capture phase so the Chog does not walk.
const GAMES = { open: null, profile: { trophies: [], badges: [], best: {}, played: {} }, boards: {}, day: null };
(function () {
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sfx = n => { try { if (window.AUDIO && AUDIO.sfx) AUDIO.sfx(n); } catch (e) { /* optional */ } };
  const today = () => new Date().toISOString().slice(0, 10);
  const META = [
    { id: 'stack', name: 'Stack the luggage', kind: 'solo', where: 'Arcade', blurb: 'One button. Drop the suitcases, keep them lined up, build the tower.' },
    { id: 'rhythm', name: 'Rhythm', kind: 'solo', where: 'NOVA DJ booth', blurb: 'Hit the notes on the beat with D F J K. About a minute and a half.' },
    { id: 'daily', name: 'Daily Chog', kind: 'solo', where: 'Gallery', blurb: 'Guess today\'s Chog from trait hints. Same puzzle for everyone, six guesses.' },
    { id: 'rps', name: 'Rock paper scissors', kind: 'duel', where: 'Anywhere', blurb: 'Best of three. Both choose, then both reveal at once.' },
    { id: 'dance', name: 'Dance copy', kind: 'duel', where: 'Anywhere', blurb: 'One dances a sequence of arrows, the other copies it. The sequences grow.' },
    { id: 'c4', name: 'Connect four', kind: 'duel', where: 'Café tables', blurb: 'Seven columns, six rows, Chog faces for pieces. Line up four.' },
    { id: 'ls', name: 'Long/Short duel', kind: 'duel', where: 'Arcade', blurb: 'Same fake chart for both. Go long or short, the candles open, PnL decides.' },
  ];
  const BYID = Object.fromEntries(META.map(m => [m.id, m]));
  GAMES.META = META;
  const DOORS = [                                                         // where the town prompts "Play ..." (door x offset on the facade, see world_city.js)
    { b: 'Arcade', dx: -0.8, game: 'stack' }, { b: 'NOVA Club', dx: -0.9, game: 'rhythm' }, { b: 'Gallery', dx: 1.2, game: 'daily' },
  ];

  // ---------- local record (offline play, and the fallback list of trophies)
  const KEY = 'chog_games';
  let LS = { gid: null, best: {}, trophies: [], played: {}, daily: null };
  try { Object.assign(LS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
  if (!LS.gid) LS.gid = Array.from({ length: 16 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[(Math.random() * 36) | 0]).join('');
  const saveLS = () => { try { localStorage.setItem(KEY, JSON.stringify(LS)); } catch (e) { /* ignore */ } };
  saveLS();
  GAMES.trophies = () => {                                                // every trophy earned: the server's list plus the ones kept in this browser (one per game per day)
    const seen = new Set(), out = [];
    for (const t of [...GAMES.profile.trophies, ...LS.trophies]) { const k = t.game + '|' + t.day; if (!seen.has(k) && BYID[t.game]) { seen.add(k); out.push({ game: t.game, day: t.day }); } }
    return out.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  };
  GAMES.badges = () => GAMES.profile.badges.slice();
  GAMES.bestOf = id => Math.max(LS.best[id] || 0, GAMES.profile.best[id] || 0);
  const online = () => typeof NET !== 'undefined' && NET.status === 'online';
  const netSend = m => { if (typeof NET !== 'undefined' && NET.send) NET.send(m); };
  const BADGE_TXT = { tower: 'Tower builder', metronome: 'Metronome', sharp_eye: 'Sharp eye', all_rounder: 'All-rounder', duelist: 'Duelist' };
  const BADGE_HINT = { tower: '15 floors of luggage', metronome: '90% perfect hits', sharp_eye: 'Daily Chog in 2 guesses', all_rounder: 'played every game', duelist: '10 wins against players' };

  // a result of a record game: remember it here, tell the server (it checks the numbers and applies its own daily cap), and hand back what to show
  const pendingScore = {};
  function recordSolo(game, payload, score, eligible) {
    const res = { score, best: Math.max(LS.best[game] || 0, score), trophy: false, newBest: score > (LS.best[game] || 0) };
    LS.best[game] = res.best; LS.played[game] = true;
    if (eligible && !LS.trophies.some(t => t.game === game && t.day === today())) { LS.trophies.push({ game, day: today() }); res.trophy = true; }
    saveLS();
    if (online()) netSend(Object.assign({ t: 'g_score', game }, payload));
    return res;
  }
  function recordNpcWin(game) {
    LS.played[game] = true; let trophy = false;
    if (!LS.trophies.some(t => t.game === game && t.day === today())) { LS.trophies.push({ game, day: today() }); trophy = true; }
    saveLS(); if (online()) netSend({ t: 'g_score', game, npc: true, won: true });
    return trophy;
  }

  // ---------- window frame
  const root = el('div'); root.id = 'gm'; document.body.appendChild(root);
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'css/games.css'; document.head.appendChild(css);
  const toastBox = el('div'); toastBox.id = 'gm-toasts'; root.appendChild(toastBox);
  const promptEl = el('button', 'gm-prompt'); promptEl.style.display = 'none'; root.appendChild(promptEl);
  const say = msg => { if (typeof toast === 'function') toast(msg); };
  function closeWin() {
    const o = GAMES.open; if (!o) return; GAMES.open = null;
    try { if (o.view && o.view.destroy) o.view.destroy(); } catch (e) { console.warn('games destroy', e); }
    if (o.onClose) try { o.onClose(); } catch (e) { /* ignore */ }
    o.back.remove(); promptTick();
  }
  GAMES.close = closeWin;
  // modal: dimmed backdrop and a card with a header; `side: true` keeps the world clickable (a panel at the bottom)
  function openWin(id, title, build, opt = {}) {
    closeWin();
    if (typeof GAME !== 'undefined' && GAME.keys) GAME.keys.u = GAME.keys.d = GAME.keys.l = GAME.keys.r = false;
    const back = el('div', 'gm-back' + (opt.panel ? ' panel' : '')), card = el('div', 'gm-card' + (opt.cls ? ' ' + opt.cls : ''));
    const head = el('div', 'gm-head', `<h2>${esc(title)}</h2>`), x = el('button', 'gm-x', '×'); x.setAttribute('aria-label', 'Close'); x.onclick = () => (opt.onX ? opt.onX() : closeWin()); head.appendChild(x);
    const body = el('div', 'gm-body'); card.appendChild(head); card.appendChild(body); back.appendChild(card); root.appendChild(back);
    if (!opt.panel) back.addEventListener('pointerdown', e => { if (e.target === back && opt.backClose !== false) (opt.onX ? opt.onX() : closeWin()); });
    const o = GAMES.open = { id, back, card, body, head, view: null, panel: !!opt.panel, onClose: opt.onClose };
    o.view = build(body, o) || null; promptTick(); return o;
  }

  // ---------- keys: the open window gets them before the town does (D F J K must not walk the Chog)
  addEventListener('keydown', e => {
    const o = GAMES.open;
    if (!o) { if (e.code === 'KeyG' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target.matches && e.target.matches('input,textarea'))) { e.preventDefault(); e.stopPropagation(); GAMES.toggle(); } return; }
    const inField = e.target.matches && e.target.matches('input,textarea');
    if (e.code === 'Escape') { if (inField) { e.target.blur(); e.stopPropagation(); return; } e.stopPropagation(); e.preventDefault(); if (o.view && o.view.onEsc && o.view.onEsc()) return; closeWin(); return; }
    if (inField) return;
    const used = o.view && o.view.onKey ? o.view.onKey(e) : false;
    if (used || !o.panel) { e.stopPropagation(); if (used || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault(); }
  }, true);
  addEventListener('keyup', e => { const o = GAMES.open; if (o && o.view && o.view.onKeyUp && o.view.onKeyUp(e)) e.stopPropagation(); }, true);

  // ---------- the Games window: list, leaderboards, trophies
  GAMES.toggle = () => { if (GAMES.open && GAMES.open.id === 'hub') closeWin(); else GAMES.hub(); };
  GAMES.hub = function (tab = 'games') {
    openWin('hub', 'Games', (body, o) => {
      let cur = tab, bgame = 'stack', bper = 'day';
      const draw = () => {
        body.innerHTML = '';
        const tabs = el('div', 'gm-tabs'); for (const [k, l] of [['games', 'Games'], ['boards', 'Leaderboards'], ['trophies', 'Trophies']]) { const b = el('button', cur === k ? 'on' : '', l); b.onclick = () => { cur = k; draw(); }; tabs.appendChild(b); } body.appendChild(tabs);
        if (cur === 'games') {
          const grid = el('div', 'gm-list');
          for (const m of META) {
            const best = GAMES.bestOf(m.id), c = el('div', 'gm-item'), sc = m.id === 'rhythm' ? best : best;
            c.innerHTML = `<div class="gi"><b>${esc(m.name)}</b><small>${m.kind === 'solo' ? 'Solo · ' : 'Two players · '}${esc(m.where)}</small><p>${esc(m.blurb)}</p>${best && m.kind === 'solo' ? `<small class="bst">Best ${m.id === 'daily' ? (best + ' pts') : sc}</small>` : ''}</div><div class="ga"></div>`;
            const a = c.querySelector('.ga');
            if (m.kind === 'solo') { const b = el('button', 'gm-btn', 'Play'); b.onclick = () => GAMES.play(m.id); a.appendChild(b); }
            else { const b = el('button', 'gm-btn', 'Play vs NPC'); b.onclick = () => GAMES.vsNpc(m.id); a.appendChild(b); a.appendChild(el('small', '', 'or click a player')); }
            grid.appendChild(c);
          }
          body.appendChild(grid);
        } else if (cur === 'boards') {
          const sel = el('div', 'gm-pills'); for (const m of META) { const b = el('button', bgame === m.id ? 'on' : '', esc(m.name)); b.onclick = () => { bgame = m.id; draw(); }; sel.appendChild(b); } body.appendChild(sel);
          const per = el('div', 'gm-pills small'); for (const [k, l] of [['day', 'Today'], ['week', 'This week']]) { const b = el('button', bper === k ? 'on' : '', l); b.onclick = () => { bper = k; draw(); }; per.appendChild(b); } body.appendChild(per);
          const box = el('div', 'gm-board'); body.appendChild(box);
          const cache = GAMES.boards[bgame + '|' + bper];
          if (!online()) box.innerHTML = '<p class="gm-note">Leaderboards need the town server, which is offline right now.</p>';
          else if (!cache) { box.innerHTML = '<p class="gm-note">Loading…</p>'; netSend({ t: 'g_board', game: bgame, period: bper }); GAMES._boardRedraw = draw; }
          else {
            const unit = BYID[bgame].kind === 'duel' ? 'wins' : bgame === 'stack' ? 'floors' : 'pts';
            box.innerHTML = (cache.top.length ? cache.top.map(r => `<div class="gm-row${r.you ? ' me' : ''}"><i>${r.rank}</i><span>${esc(r.name)}</span><b>${r.score} ${unit}</b></div>`).join('') : '<p class="gm-note">Nobody yet. Be the first.</p>') +
              (cache.you ? (cache.you.rank > 10 ? `<div class="gm-row me"><i>${cache.you.rank}</i><span>You</span><b>${cache.you.score} ${unit}</b></div>` : '') : cache.top.length ? '<p class="gm-note">You are not on this board yet.</p>' : '');
            box.appendChild(el('p', 'gm-note small', `Resets ${bper === 'day' ? 'every day' : 'every Monday'} (UTC). ${bgame === 'daily' ? 'Score is 7 minus your guesses.' : bgame === 'rhythm' ? '1000 per perfect hit, 600 per good.' : ''}`));
          }
          if (online() && cache) { /* refresh quietly */ }
        } else {
          const tr = GAMES.trophies(), by = {}; for (const t of tr) by[t.game] = (by[t.game] || 0) + 1;
          body.appendChild(el('p', 'gm-note', 'One trophy per game per day. They go on your Home shelf.'));
          const g = el('div', 'gm-troph-grid'); for (const m of META) g.appendChild(el('div', 'gm-tg' + (by[m.id] ? ' has' : ''), `${cup(26)}<b>${by[m.id] || 0}</b><small>${esc(m.name)}</small>`)); body.appendChild(g);
          const bd = el('div', 'gm-badges'); bd.appendChild(el('h3', '', 'Badges'));
          for (const k of Object.keys(BADGE_TXT)) bd.appendChild(el('div', 'gm-badge' + (GAMES.profile.badges.includes(k) ? ' has' : ''), `<i>${GAMES.profile.badges.includes(k) ? '★' : '☆'}</i><span><b>${BADGE_TXT[k]}</b><small>${BADGE_HINT[k]}</small></span>`));
          body.appendChild(bd);
          if (!online()) body.appendChild(el('p', 'gm-note small', 'Offline: only the trophies kept in this browser are shown. Badges come from the town server.'));
        }
      };
      draw(); o.redraw = draw;
      if (online()) netSend({ t: 'g_me' });
    }, { cls: 'hub' });
  };
  const cup = (s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/><path d="M12 14v3M8.5 20h7M9.5 17h5v3h-5z"/></svg>`;
  // a "Trophies" row for the My Chog card (ui.js card())
  GAMES.trophyRow = function () {
    const tr = GAMES.trophies(), by = {}; for (const t of tr) by[t.game] = (by[t.game] || 0) + 1;
    const r = el('div', 'gm-trow'); r.innerHTML = `<h3>Trophies</h3>`;
    const chips = el('div', 'gm-tchips');
    if (!tr.length) chips.appendChild(el('span', 'gm-tnone', 'None yet. Win a game today.'));
    for (const m of META) if (by[m.id]) chips.appendChild(el('span', 'gm-tchip', `${cup(15)}${esc(m.name)}${by[m.id] > 1 ? ' ×' + by[m.id] : ''}`));
    for (const b of GAMES.profile.badges) if (BADGE_TXT[b]) chips.appendChild(el('span', 'gm-tchip badge', `★ ${BADGE_TXT[b]}`));
    r.appendChild(chips); const more = el('button', 'gm-tmore', 'Games'); more.onclick = () => GAMES.hub('trophies'); r.appendChild(more); return r;
  };

  GAMES.play = id => {
    if (id === 'stack') return GAMES.stack(); if (id === 'rhythm') return GAMES.rhythm(); if (id === 'daily') return GAMES.daily();
    return GAMES.vsNpc(id);
  };

  // ---------- door prompts: near the Arcade, NOVA or Gallery door the town offers the game that lives there
  const nearDoor = () => {
    if ((typeof ROOM !== 'undefined' && ROOM.active) || (typeof HOTEL !== 'undefined' && HOTEL.active) || typeof GAME === 'undefined' || !GAME.me || typeof CITY === 'undefined') return null;
    const p = GAME.me.position;
    for (const d of DOORS) { const b = CITY.buildings.find(x => x.name === d.b); if (!b) continue; if (Math.hypot(p.x - (b.x + d.dx), p.z - (b.z + b.d / 2 + 0.5)) < 2.1) return d; }
    return null;
  };
  let promptGame = null;
  function promptTick() {
    const d = GAMES.open ? null : nearDoor();
    if (!d) { promptEl.style.display = 'none'; promptGame = null; return; }
    if (promptGame !== d.game) { promptGame = d.game; promptEl.textContent = 'Play ' + BYID[d.game].name; promptEl.onclick = () => GAMES.play(d.game); }
    promptEl.style.display = 'block';
  }
  setInterval(promptTick, 200);
  GAMES.nearDoor = nearDoor;

  // ---------- challenges: choose a game, send it to a player (server) or start it against a resident (local engine)
  const TWO = META.filter(m => m.kind === 'duel');
  GAMES.challenge = function (target) {                               // target: {kind:'player', id, name} | {kind:'npc', npc}
    const isNpc = target.kind === 'npc', nm = isNpc ? target.npc.name : target.name;
    if (!isNpc && !online()) { say('The town server is offline, so you cannot challenge players. Residents still play.'); return; }
    openWin('pick', 'Challenge ' + nm, body => {
      body.appendChild(el('p', 'gm-note', isNpc ? `${esc(nm)} is a resident (NPC). The game runs in your browser.` : `${esc(nm)} has 20 seconds to accept.`));
      const list = el('div', 'gm-list');
      for (const m of TWO) {
        const c = el('div', 'gm-item'); c.innerHTML = `<div class="gi"><b>${esc(m.name)}</b><p>${esc(m.blurb)}</p></div><div class="ga"></div>`;
        const b = el('button', 'gm-btn', 'Challenge'); b.onclick = () => { if (isNpc) GAMES.vsNpc(m.id, target.npc); else { netSend({ t: 'g_challenge', to: target.id, game: m.id }); closeWin(); } };
        c.querySelector('.ga').appendChild(b); list.appendChild(c);
      }
      body.appendChild(list);
    });
    if (typeof NET !== 'undefined' && !isNpc && NET.closeCard) NET.closeCard();
    if (isNpc && typeof NPC !== 'undefined' && NPC.closeCard) NPC.closeCard();
  };
  GAMES.challengeNpc = npc => GAMES.challenge({ kind: 'npc', npc });
  GAMES.challengePlayer = r => GAMES.challenge({ kind: 'player', id: r.id, name: r.name });
  GAMES.vsNpc = function (game, npc) {
    if (!npc && typeof NPC !== 'undefined' && NPC.list && NPC.list.length) { const pool = NPC.list.filter(r => !r.role || !/Guard/i.test(r.role)); npc = pool[(Math.random() * pool.length) | 0] || NPC.list[0]; }
    if (typeof NPC !== 'undefined' && NPC.closeCard) NPC.closeCard();
    startMatch(localMatch(game, { id: 'npc', name: npc ? npc.name : 'Resident', npc: true, node: npc ? npc.c : null, token: null }));
  };

  // incoming and outgoing challenges are small cards at the top
  const toasts = new Map();
  function cardToast(key, html, ms, actions) {
    removeToast(key);
    const c = el('div', 'gm-toast', html + `<div class="gm-bar"><i style="animation-duration:${ms}ms"></i></div>`), a = el('div', 'gm-acts');
    for (const [label, fn, ghost] of actions) { const b = el('button', 'gm-btn' + (ghost ? ' ghost' : ''), label); b.onclick = () => { fn(); removeToast(key); }; a.appendChild(b); }
    c.insertBefore(a, c.querySelector('.gm-bar')); toastBox.appendChild(c);
    const t = setTimeout(() => removeToast(key), ms + 400); toasts.set(key, { c, t });
  }
  function removeToast(key) { const o = toasts.get(key); if (!o) return; clearTimeout(o.t); o.c.remove(); toasts.delete(key); }

  // ---------- messages from the town server (registered as a standing waiter in net.js)
  GAMES.onNet = function (m) {
    if (m.t === 'welcome') { netSend({ t: 'g_hello', gid: LS.gid }); return; }
    if (typeof m.t !== 'string' || m.t.slice(0, 2) !== 'g_') return;
    const o = GAMES.open, v = o && o.view;
    switch (m.t) {
      case 'g_me': GAMES.profile = { trophies: m.trophies || [], badges: m.badges || [], best: m.best || {}, played: m.played || {} }; GAMES.day = m.day; if (o && o.redraw) o.redraw(); break;
      case 'g_board': GAMES.boards[m.game + '|' + m.period] = m; if (o && o.id === 'hub' && o.redraw) o.redraw(); break;
      case 'g_scored': { const f = pendingScore[m.game]; if (f) f(m); if (m.ok) netSend({ t: 'g_me' }); break; }
      case 'g_invite': {
        const r = typeof NET !== 'undefined' ? NET.remotes.get(m.from.id) : null; if (r && NET.isMuted(r)) { netSend({ t: 'g_decline', cid: m.cid }); break; }
        sfx('click'); cardToast('inv' + m.cid, `<b>${esc(m.from.name)}</b> challenges you<small>${esc(BYID[m.game] ? BYID[m.game].name : m.game)}</small>`, m.ms || 20000, [['Accept', () => netSend({ t: 'g_accept', cid: m.cid })], ['Decline', () => netSend({ t: 'g_decline', cid: m.cid }), 1]]); break;
      }
      case 'g_sent': cardToast('inv' + m.cid, `Waiting for an answer<small>${esc(BYID[m.game] ? BYID[m.game].name : '')}</small>`, m.ms || 20000, [['Cancel', () => netSend({ t: 'g_cancel', cid: m.cid }), 1]]); break;
      case 'g_gone': removeToast('inv' + m.cid); if (m.why === 'declined') say('Challenge declined.'); else if (m.why === 'expired') say('The challenge ran out of time.'); break;
      case 'g_start': {
        const opp = Object.assign({ npc: false }, m.opp); const ln = typeof NET !== 'undefined' ? NET.remotes.get(opp.id) : null; opp.node = ln && ln.root;
        for (const k of [...toasts.keys()]) removeToast(k);
        startMatch({ mid: m.mid, game: m.game, you: m.you, opp, send: msg => netSend(Object.assign({ t: 'g_move', mid: m.mid }, msg)), quit: () => netSend({ t: 'g_quit', mid: m.mid }), local: false }); break;
      }
      case 'g_reward': sfx('trophy'); say(m.trophy ? 'Trophy earned! Find it on your My Chog card.' : 'Win recorded.'); if (m.badges && m.badges.length) say('New badge: ' + m.badges.map(b => BADGE_TXT[b] || b).join(', ')); netSend({ t: 'g_me' }); break;
      case 'g_err': say(m.reason || 'That did not work.'); break;
      default: if (v && m.mid != null && GAMES.match && GAMES.match.mid === m.mid) matchEvent(m);
    }
  };
  if (typeof NET !== 'undefined' && NET.waiters) NET.waiters.add(GAMES.onNet);
  if (online()) netSend({ t: 'g_hello', gid: LS.gid });

  // ---------- a two-player match: the shell shared by every game (header with both players, the game view, the result)
  function matchEvent(m) {
    const mt = GAMES.match; if (!mt || !GAMES.open || !GAMES.open.view) return;
    if (m.t === 'g_end') mt.ended = true;
    if (mt.ai && mt.local) { /* the AI listens through localMatch */ }
    GAMES.open.view.onEvent(m);
  }
  function startMatch(mt) {
    const info = META.find(x => x.id === mt.game);
    closeWin(); GAMES.match = mt;
    const panel = mt.game === 'rps';
    const o = openWin('match', info.name, (body, win) => {
      const v = VIEWS[mt.game](body, mt, win);
      return v;
    }, { panel, cls: 'match ' + mt.game, backClose: false, onX: () => leaveMatch(), onClose: () => { if (GAMES.match === mt) { if (!mt.ended && mt.quit) mt.quit(); if (mt.dispose) mt.dispose(); GAMES.match = null; } } });
    const names = el('div', 'gm-vs', `<span class="you"><i></i>You</span><em>vs</em><span class="opp">${esc(mt.opp.name)}${mt.opp.npc ? '<u>NPC</u>' : ''}</span>`);
    o.head.insertBefore(names, o.head.querySelector('.gm-x'));
    if (mt.local) mt.begin();
    return o;
  }
  function leaveMatch() {
    const mt = GAMES.match; if (mt && !mt.ended && !confirmQuit(mt)) return;
    closeWin();
  }
  const confirmQuit = mt => { if (mt.opp.npc) return true; return confirm('Leave the game? You forfeit the match.'); };

  // result block shared by the 2-player views
  function endBox(mt, msg, extra) {
    const win = msg.winner === mt.you, tie = msg.winner === -1;
    sfx(tie ? 'tie' : win ? 'win' : 'lose');
    const box = el('div', 'gm-end ' + (tie ? 'tie' : win ? 'win' : 'lose'));
    const why = msg.why === 'left' ? (win ? 'Your opponent left.' : 'You left.') : msg.why === 'timeout' ? (win ? 'Your opponent ran out of time.' : 'You ran out of time.') : '';
    box.innerHTML = `<b>${tie ? 'Draw' : win ? 'You win!' : 'You lose'}</b><span>${esc(why)} ${extra || ''}</span>`;
    let trophy = false;
    if (win && mt.local) trophy = recordNpcWin(mt.game);
    if (win && mt.local) box.appendChild(el('small', '', trophy ? 'Trophy earned for beating a resident!' : 'Trophy for this game is already yours today.'));
    if (win && !mt.local) box.appendChild(el('small', '', 'Win recorded on the leaderboards.'));
    const a = el('div', 'gm-acts');
    if (mt.opp.npc) { const again = el('button', 'gm-btn', 'Play again'); again.onclick = () => GAMES.vsNpc(mt.game, mt.opp.npcRef); a.appendChild(again); }
    const done = el('button', 'gm-btn ghost', 'Close'); done.onclick = () => closeWin(); a.appendChild(done); box.appendChild(a);
    return box;
  }

  // ---------- local match against a resident: the same engine as the server runs in the browser, plus a small AI
  function localMatch(game, opp) {
    const mid = 'L' + Date.now(), eng = gmMatch(game, Math.random, performance.now());
    const mt = { mid, game, you: 0, opp, local: true, ended: false, timers: [], npcRef: null };
    opp.npcRef = typeof NPC !== 'undefined' && NPC.list ? NPC.list.find(r => r.name === opp.name) : null;
    const clock = () => performance.now();
    const ai = makeAI(game, (msg, delay) => { const t = setTimeout(() => { if (!eng.over && GAMES.match === mt) { eng.move(1, msg, clock()); pump(); } }, delay); mt.timers.push(t); });
    function pump() {
      for (const { to, msg } of eng.take()) {
        const full = Object.assign({ mid }, msg);
        ai(full);
        if (to === 'all' || to === 0) setTimeout(() => { if (GAMES.match === mt) matchEvent(full); }, 0);
      }
    }
    mt.send = msg => { if (!eng.over) { eng.move(0, msg, clock()); pump(); } };
    mt.quit = () => { if (!eng.over) eng.quit(0); };
    mt.begin = () => { eng.start(clock()); pump(); const iv = setInterval(() => { if (GAMES.match !== mt || eng.over) { clearInterval(iv); return; } eng.tick(clock()); pump(); }, 250); mt.timers.push(iv); };
    mt.dispose = () => { for (const t of mt.timers) { clearTimeout(t); clearInterval(t); } };
    return mt;
  }

  // ---------- the resident's brain: easy to medium, reacts to the same messages a player's client would
  function makeAI(game, act) {
    const rnd = (a, b) => a + Math.random() * (b - a);
    if (game === 'rps') {
      let myLast = null;
      return m => {
        if (m.t === 'g_reveal') myLast = m.picks[0];
        if (m.t === 'g_round') { const beat = { r: 'p', p: 's', s: 'r' }; let pick = 'rps'[(Math.random() * 3) | 0]; if (myLast && Math.random() < 0.33) pick = beat[myLast]; act({ pick }, (m.delay || 0) + rnd(900, 2800)); }
      };
    }
    if (game === 'dance') {
      return m => {
        if (m.t !== 'g_round' || m.leader === 1) return;                         // the resident answers only when it is the follower
        const len = m.seq.length, p = [0, 0.95, 0.92, 0.88, 0.8, 0.7, 0.62][len] || 0.6; let seq = m.seq.slice();
        if (Math.random() > p) { const i = (Math.random() * len) | 0; seq[i] = (seq[i] + 1 + ((Math.random() * 3) | 0)) % 4; }
        act({ seq }, (m.delay || 0) + m.showMs + 500 + len * rnd(280, 520));
      };
    }
    if (game === 'c4') {
      const grid = Array.from({ length: GM_C4.cols }, () => Array(GM_C4.rows).fill(null));
      const score4 = (g, me) => {
        let s = 0; const op = 1 - me;
        for (let c = 0; c < GM_C4.cols; c++) for (let r = 0; r < GM_C4.rows; r++) for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
          let a = 0, b = 0, ok = true;
          for (let k = 0; k < 4; k++) { const cc = c + dc * k, rr = r + dr * k; if (cc < 0 || rr < 0 || cc >= GM_C4.cols || rr >= GM_C4.rows) { ok = false; break; } const v = g[cc][rr]; if (v === me) a++; else if (v === op) b++; }
          if (!ok) continue; if (a && !b) s += [0, 1, 6, 40][a] || 0; if (b && !a) s -= [0, 1, 6, 48][b] || 0;
        }
        for (let r = 0; r < GM_C4.rows; r++) if (g[3][r] === me) s += 3;
        return s;
      };
      const moves = g => [3, 2, 4, 1, 5, 0, 6].filter(c => g[c].indexOf(null) >= 0);
      const nega = (g, depth, who, a, b, me) => {                              // negamax with alpha-beta, scores from `who`'s point of view
        const ms = moves(g); if (!ms.length) return 0; if (depth === 0) return score4(g, who) - score4(g, 1 - who) * 0.0;
        let best = -1e9;
        for (const c of ms) {
          const r = g[c].indexOf(null); g[c][r] = who; const win = gmC4Win(g, c, r);
          const v = win ? 1e6 + depth : -nega(g, depth - 1, 1 - who, -b, -a, me); g[c][r] = null;
          if (v > best) best = v; if (best > a) a = best; if (a >= b) break;
        }
        return best;
      };
      const choose = () => {
        const ms = moves(grid); let best = ms[0], bv = -1e9;
        if (Math.random() < 0.12) return ms[(Math.random() * ms.length) | 0];     // an honest mistake now and then
        for (const c of ms) { const r = grid[c].indexOf(null); grid[c][r] = 1; const win = gmC4Win(grid, c, r); const v = win ? 1e7 : -nega(grid, 3, 0, -1e9, 1e9, 1) + Math.random() * 0.5; grid[c][r] = null; if (v > bv) { bv = v; best = c; } }
        return best;
      };
      return m => {
        if (m.t === 'g_state' && m.col != null) { grid[m.col][m.row] = m.seat; if (m.turn === 1) act({ col: choose() }, rnd(700, 1500)); }
      };
    }
    if (game === 'ls') {
      return m => {
        if (m.t !== 'g_round') return;
        const cl = m.hist.map(c => c[3]), mom = cl[cl.length - 1] / cl[cl.length - 6] - 1;
        const long = Math.random() < (mom > 0 ? 0.62 : 0.38);
        act({ side: long ? 'L' : 'S' }, (m.delay || 0) + rnd(2500, 7500));
      };
    }
    return () => { };
  }

  // ---------- small drawing helpers for the two-player views
  const GEST = {
    r: '<svg viewBox="0 0 48 48"><path d="M11 24c0-7 4-11 10-11h6c6 0 10 4 10 11v6c0 8-6 13-13 13S11 38 11 30z" fill="#f5cfa6" stroke="#3a2418" stroke-width="2.6" stroke-linejoin="round"/><path d="M17 22v7M24 20v8M31 22v7" stroke="#3a2418" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>',
    p: '<svg viewBox="0 0 48 48"><path d="M12 26V15a2.5 2.5 0 0 1 5 0v8-12a2.5 2.5 0 0 1 5 0v12-14a2.5 2.5 0 0 1 5 0v14-10a2.5 2.5 0 0 1 5 0v18c0 8-5 14-13 14-6 0-9-3-12-8l-4-7a2.6 2.6 0 0 1 4-3z" fill="#f5cfa6" stroke="#3a2418" stroke-width="2.4" stroke-linejoin="round"/></svg>',
    s: '<svg viewBox="0 0 48 48"><path d="M24 28 12 9M24 28 36 9" stroke="#3a2418" stroke-width="9" stroke-linecap="round"/><path d="M24 28 12 9M24 28 36 9" stroke="#e8e3f4" stroke-width="5" stroke-linecap="round"/><circle cx="17" cy="38" r="6" fill="none" stroke="#3a2418" stroke-width="3.4"/><circle cx="31" cy="38" r="6" fill="none" stroke="#3a2418" stroke-width="3.4"/><path d="M20 33 28 28M28 33 20 28" stroke="#3a2418" stroke-width="3"/></svg>',
  };
  const ARROW_SVG = d => `<svg viewBox="0 0 48 48" style="transform:rotate(${d * 90}deg)"><path d="M24 7 40 25H30v16H18V25H8z" fill="currentColor" stroke="rgba(0,0,0,.35)" stroke-width="2" stroke-linejoin="round"/></svg>`;
  function chogFace(g, cx, cy, r, base, dark) {                                   // a Chog head for a connect-four piece
    g.save(); g.translate(cx, cy);
    g.fillStyle = dark; g.strokeStyle = '#2a1d3a'; g.lineWidth = r * 0.09; g.lineJoin = 'round';
    g.beginPath(); for (let i = 0; i < 7; i++) { const a = -Math.PI * 0.95 + i * Math.PI * 0.9 / 6, rr = i % 2 ? r * 1.0 : r * 1.28; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.lineTo(0, -r * 0.2); g.closePath(); g.fill(); g.stroke();   // spiky hair blades
    g.fillStyle = base; g.beginPath(); g.arc(0, r * 0.05, r * 0.92, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#f6ecd8'; g.beginPath(); g.ellipse(0, r * 0.14, r * 0.66, r * 0.58, 0, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.strokeStyle = '#2a1d3a'; g.lineWidth = r * 0.07;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.29, r * 0.08, r * 0.2, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#1a1028'; g.beginPath(); g.arc(s * r * 0.3, r * 0.1, r * 0.1, 0, 7); g.fill(); g.fillStyle = '#fff'; }
    g.fillStyle = '#f08ab8'; g.beginPath(); g.ellipse(0, r * 0.3, r * 0.07, r * 0.05, 0, 0, 7); g.fill();
    g.strokeStyle = '#2a1d3a'; g.beginPath(); g.moveTo(-r * 0.15, r * 0.42); g.quadraticCurveTo(0, r * 0.54, r * 0.15, r * 0.42); g.stroke();
    g.restore();
  }
  const pip = (n, of, cls) => Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on ' : ''}${cls}"></i>`).join('');
  function timerBar(host) {                                                       // a thin countdown bar; call .set(msFromNow, totalMs)
    const bar = el('div', 'gm-timer', '<i></i>'), fill = bar.firstChild; host.appendChild(bar);
    return { el: bar, set(ms, total) { fill.style.transition = 'none'; fill.style.width = Math.max(0, Math.min(1, ms / total)) * 100 + '%'; fill.getBoundingClientRect(); fill.style.transition = `width ${Math.max(0, ms)}ms linear`; fill.style.width = '0%'; }, stop() { const w = getComputedStyle(fill).width; fill.style.transition = 'none'; fill.style.width = w; } };
  }

  const VIEWS = {};

  // ----- rock paper scissors: a panel at the bottom, gestures in bubbles above both heads
  VIEWS.rps = function (body, mt, win) {
    body.innerHTML = '<div class="rps-top"><span class="rps-st">Get ready…</span><span class="rps-sc"></span></div><div class="rps-btns"></div>';
    const st = body.querySelector('.rps-st'), sc = body.querySelector('.rps-sc'), btns = body.querySelector('.rps-btns');
    const mine = { b: el('div', 'gm-bubble me', '?'), node: () => (typeof GAME !== 'undefined' ? GAME.me : null) }, theirs = { b: el('div', 'gm-bubble', '?'), node: () => (mt.opp.node && mt.opp.node.parent ? mt.opp.node : mt.opp.id !== 'npc' && typeof NET !== 'undefined' && NET.remotes.get(mt.opp.id) ? NET.remotes.get(mt.opp.id).root : null) };
    root.appendChild(mine.b); root.appendChild(theirs.b);
    const label = { r: 'Rock', p: 'Paper', s: 'Scissors' }; let enabled = false, picked = null, raf = 0, dead = false, tm = null, endTimer = 0, lock = 0;
    const timer = timerBar(body);
    for (const k of ['r', 'p', 's']) { const b = el('button', 'gm-gest', `${GEST[k]}<span>${label[k]}</span><kbd>${'rps'.indexOf(k) + 1}</kbd>`); b.dataset.k = k; b.onclick = () => choose(k); btns.appendChild(b); }
    const setBtns = on => { enabled = on; btns.classList.toggle('off', !on); for (const b of btns.children) b.classList.toggle('sel', b.dataset.k === picked); };
    function choose(k) { if (!enabled || picked) return; picked = k; sfx('click'); mine.b.className = 'gm-bubble me ready'; mine.b.innerHTML = '…'; setBtns(false); st.textContent = 'Locked in. Waiting for ' + mt.opp.name + '…'; mt.send({ pick: k }); }
    function frame() {
      if (dead) return; raf = requestAnimationFrame(frame);
      const k = Math.max(0.8, Math.min(1.6, innerHeight / 810)), v = frame.v || (frame.v = new THREE.Vector3());
      for (const o of [mine, theirs]) {
        const n = o.node(); if (!n || n.visible === false) { o.b.style.display = 'none'; continue; }
        v.set(n.position.x, n.position.y + 2.05 * n.scale.y, n.position.z); v.project(cam);
        const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
        o.b.style.display = v.z < 1 && x > -60 && x < innerWidth + 60 && y > -60 && y < innerHeight + 60 ? 'flex' : 'none';
        o.b.style.transform = `translate(${x.toFixed(1)}px, ${(y - 52 * k).toFixed(1)}px) translate(-50%, -100%) scale(${k})`;
      }
    }
    frame();
    const scoreTxt = s => { sc.innerHTML = `<b>You</b> ${pip(s[mt.you], 2, 'pip')} <em>${s[mt.you]} - ${s[1 - mt.you]}</em> ${pip(s[1 - mt.you], 2, 'pip opp')} <b>${esc(mt.opp.name)}</b>`; };
    scoreTxt([0, 0]);
    const resetBubbles = () => { mine.b.className = 'gm-bubble me'; mine.b.innerHTML = '?'; theirs.b.className = 'gm-bubble'; theirs.b.innerHTML = '?'; };
    return {
      onKey(e) { const i = { Digit1: 'r', Digit2: 'p', Digit3: 's', Numpad1: 'r', Numpad2: 'p', Numpad3: 's', KeyR: 'r', KeyP: 'p', KeyS: 's' }[e.code]; if (!i || e.ctrlKey || e.metaKey || e.altKey) return false; choose(i); return true; },
      onEvent(m) {
        if (m.t === 'g_round') {
          clearTimeout(lock); const startIn = m.delay || 0; picked = null; setBtns(false); if (m.round === 1) st.textContent = 'Get ready…';
          lock = setTimeout(() => { if (dead) return; resetBubbles(); picked = null; setBtns(true); st.textContent = 'Round ' + m.round + ': choose!'; timer.set(m.ms, m.ms); sfx('go'); }, startIn);
        } else if (m.t === 'g_state') {
          const opp = m.ready[1 - mt.you]; if (opp && !picked) { theirs.b.className = 'gm-bubble ready'; theirs.b.innerHTML = '!'; } else if (opp) { theirs.b.className = 'gm-bubble ready'; theirs.b.innerHTML = '✓'; }
        } else if (m.t === 'g_reveal') {
          clearTimeout(lock); timer.stop(); setBtns(false); const a = m.picks[mt.you], b = m.picks[1 - mt.you];
          mine.b.className = 'gm-bubble me show'; mine.b.innerHTML = GEST[a]; theirs.b.className = 'gm-bubble show'; theirs.b.innerHTML = GEST[b];
          const w = m.win === -1 ? -1 : m.win === mt.you ? 1 : 0; mine.b.classList.add(w === 1 ? 'won' : w === 0 ? 'lost' : 'tied'); theirs.b.classList.add(w === 0 ? 'won' : w === 1 ? 'lost' : 'tied');
          st.textContent = w === 1 ? `${label[a]} beats ${label[b]}. You take the round.` : w === 0 ? `${label[b]} beats ${label[a]}. ${mt.opp.name} takes it.` : `Both ${label[a]}. Again.`; sfx(w === 1 ? 'win' : w === 0 ? 'lose' : 'tie'); scoreTxt(m.score);
        } else if (m.t === 'g_end') {
          mt.ended = true; clearTimeout(lock); endTimer = setTimeout(() => { if (dead) return; btns.style.display = 'none'; timer.el.style.display = 'none'; body.appendChild(endBox(mt, m, '')); }, 1500);
        }
      },
      destroy() { dead = true; cancelAnimationFrame(raf); clearTimeout(lock); clearTimeout(endTimer); mine.b.remove(); theirs.b.remove(); },
    };
  };

  // ----- dance copy: arrows light up one by one, the follower repeats them
  VIEWS.dance = function (body, mt, win) {
    body.innerHTML = '<div class="dc-sc"></div><div class="dc-msg">Get ready…</div><div class="dc-seq"></div><div class="dc-in"></div><div class="dc-pad"></div>';
    const msg = body.querySelector('.dc-msg'), seqEl = body.querySelector('.dc-seq'), inEl = body.querySelector('.dc-in'), pad = body.querySelector('.dc-pad'), scEl = body.querySelector('.dc-sc');
    const timer = timerBar(body); const T = []; let seq = [], inp = [], listening = false, role = '', dead = false, sent = false;
    const later = (fn, ms) => { T.push(setTimeout(() => { if (!dead) fn(); }, ms)); };
    for (let d = 0; d < 4; d++) { const b = el('button', 'dc-key', ARROW_SVG(d)); b.dataset.d = d; b.onclick = () => press(d); pad.appendChild(b); }
    const KEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
    function press(d) {
      if (!listening || sent) return; inp.push(d); sfx('click'); flash(d); drawIn();
      if (inp.length === seq.length) { sent = true; listening = false; timer.stop(); msg.textContent = 'Sent. Waiting for the result…'; mt.send({ seq: inp.slice() }); }
    }
    const flash = d => { const b = pad.children[d]; b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 140); };
    const drawIn = () => { inEl.innerHTML = seq.map((_, i) => `<span class="dc-t${i < inp.length ? ' f' : ''}">${i < inp.length ? ARROW_SVG(inp[i]) : ''}</span>`).join(''); };
    const scoreTxt = s => { scEl.innerHTML = `<b>You</b> ${s[mt.you]} - ${s[1 - mt.you]} <b>${esc(mt.opp.name)}</b>`; };
    scoreTxt([0, 0]);
    return {
      onKey(e) { if (!(e.code in KEYS) || e.ctrlKey || e.metaKey || e.altKey) return false; press(KEYS[e.code]); return true; },
      onEvent(m) {
        if (m.t === 'g_round') {
          later(() => {                                                       // the previous round's result stays on screen until this one starts
            seq = m.seq; inp = []; sent = false; listening = false; role = m.leader === mt.you ? 'lead' : 'follow'; inEl.innerHTML = ''; seqEl.innerHTML = seq.map(() => '<span class="dc-t"></span>').join(''); pad.classList.toggle('off', role === 'lead'); msg.className = 'dc-msg';
            msg.textContent = `Round ${m.round} of 4 · ` + (role === 'lead' ? 'You dance, ' + mt.opp.name + ' copies' : 'Watch ' + mt.opp.name + ', then copy');
            later(() => { msg.textContent = role === 'lead' ? 'Dance!' : 'Watch closely…'; }, 700);
            const step = 650, t0 = 900;
            seq.forEach((d, i) => { later(() => { seqEl.children[i].innerHTML = ARROW_SVG(d); seqEl.children[i].classList.add('lit'); sfx('click'); }, t0 + i * step); later(() => seqEl.children[i].classList.remove('lit'), t0 + i * step + 480); });
            later(() => { if (role === 'follow') { listening = true; drawIn(); msg.textContent = 'Your turn: copy it with the arrow keys (or WASD)'; timer.set(m.ms - m.showMs, m.ms - m.showMs); sfx('go'); } else msg.textContent = `${mt.opp.name} is copying you…`; }, m.showMs);
          }, m.delay || 0);
        } else if (m.t === 'g_reveal') {
          listening = false; timer.stop(); const youFollow = m.follower === mt.you;
          msg.textContent = m.ok ? (youFollow ? 'Perfect copy! Point for you.' : `${mt.opp.name} copied you. Point for them.`) : (youFollow ? 'Not quite. No point.' : `${mt.opp.name} missed it. No point.`);
          msg.className = 'dc-msg ' + (m.ok ? (youFollow ? 'good' : 'bad') : (youFollow ? 'bad' : 'good')); setTimeout(() => { msg.className = 'dc-msg'; }, 2500);
          sfx(m.ok && youFollow ? 'hit_perfect' : m.ok ? 'miss' : youFollow ? 'miss' : 'hit_good'); scoreTxt(m.score);
        } else if (m.t === 'g_end') { mt.ended = true; listening = false; timer.stop(); later(() => { pad.style.display = 'none'; body.appendChild(endBox(mt, m, '')); }, 1600); }
      },
      destroy() { dead = true; T.forEach(clearTimeout); },
    };
  };

  // ----- connect four
  VIEWS.c4 = function (body, mt, win) {
    const CW = 64, W = GM_C4.cols * CW, H = (GM_C4.rows + 1) * CW;
    body.innerHTML = '<div class="c4-st">Get ready…</div>';
    const st = body.querySelector('.c4-st'), cv = el('canvas', 'c4-cv'); cv.width = W; cv.height = H; body.appendChild(cv);
    const timer = timerBar(body), g = cv.getContext('2d');
    const grid = Array.from({ length: GM_C4.cols }, () => Array(GM_C4.rows).fill(null)), drops = []; let turn = 0, hover = -1, line = null, raf = 0, dead = false, over = false;
    const COL = [['#8a5ae8', '#4a2a9a'], ['#f2a93a', '#b8661a']];                        // purple for seat 0, gold for seat 1
    const colOf = seat => COL[seat === mt.you ? 0 : 1];
    const myTurn = () => !over && turn === mt.you;
    function draw(ts) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#3a2470'; g.beginPath(); g.roundRect ? g.roundRect(0, CW, W, H - CW, 14) : g.rect(0, CW, W, H - CW); g.fill();
      // pieces sit behind the board face so the holes show them
      for (let c = 0; c < GM_C4.cols; c++) for (let r = 0; r < GM_C4.rows; r++) { const v = grid[c][r]; if (v == null) continue; const dr = drops.find(d => d.c === c && d.r === r); const y = dr ? dropY(dr) : H - (r + 0.5) * CW; const [a, b] = colOf(v); chogFace(g, c * CW + CW / 2, y, CW * 0.38, a, b); }
      g.save(); g.fillStyle = '#4a2f8a'; g.beginPath(); g.rect(0, CW, W, H - CW);
      for (let c = 0; c < GM_C4.cols; c++) for (let r = 0; r < GM_C4.rows; r++) { g.moveTo(c * CW + CW / 2 + CW * 0.42, H - (r + 0.5) * CW); g.arc(c * CW + CW / 2, H - (r + 0.5) * CW, CW * 0.42, 0, Math.PI * 2, true); }
      g.fill('evenodd'); g.restore();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; for (let c = 0; c < GM_C4.cols; c++) for (let r = 0; r < GM_C4.rows; r++) { g.beginPath(); g.arc(c * CW + CW / 2, H - (r + 0.5) * CW, CW * 0.42, 0, 7); g.stroke(); }
      if (hover >= 0 && myTurn() && grid[hover].indexOf(null) >= 0) { const [a, b] = colOf(mt.you); g.globalAlpha = 0.85; chogFace(g, hover * CW + CW / 2, CW * 0.5, CW * 0.38, a, b); g.globalAlpha = 1; g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(hover * CW, CW, CW, H - CW); }
      if (line) { const k = 0.5 + 0.5 * Math.sin((ts || 0) / 160); g.lineWidth = 5; g.strokeStyle = `rgba(255,236,120,${0.5 + k * 0.5})`; for (const [c, r] of line) { g.beginPath(); g.arc(c * CW + CW / 2, H - (r + 0.5) * CW, CW * 0.45, 0, 7); g.stroke(); } }
    }
    const dropY = d => { const ty = H - (d.r + 0.5) * CW, from = -CW * 0.5, T = Math.sqrt(2 * (ty - from) / 2600), k = (performance.now() - d.t0) / 1000; if (k >= T) return ty; return from + 0.5 * 2600 * k * k; };
    function frame(ts) {
      if (dead) return; raf = requestAnimationFrame(frame);
      for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; if (dropY(d) >= H - (d.r + 0.5) * CW) { drops.splice(i, 1); sfx('drop'); } }
      draw(ts);
    }
    frame(0);
    const col = e => { const r = cv.getBoundingClientRect(); return Math.max(0, Math.min(GM_C4.cols - 1, Math.floor((e.clientX - r.left) / r.width * GM_C4.cols))); };
    cv.onmousemove = e => { hover = col(e); }; cv.onmouseleave = () => { hover = -1; };
    const drop = c => { if (myTurn() && grid[c].indexOf(null) >= 0) { mt.send({ col: c }); } else if (!over && turn !== mt.you) say('Wait for your turn.'); };
    cv.onclick = e => drop(col(e));
    const setTurn = (t, ms) => { turn = t; st.textContent = over ? '' : t === mt.you ? 'Your turn: click a column' : mt.opp.name + ' is thinking…'; st.className = 'c4-st' + (t === mt.you ? ' me' : ''); if (ms) timer.set(ms, ms); };
    return {
      onKey(e) { const m = /^(Digit|Numpad)([1-7])$/.exec(e.code); if (!m) return false; drop(+m[2] - 1); return true; },
      onEvent(m) {
        if (m.t === 'g_round') setTurn(m.turn, m.ms);
        else if (m.t === 'g_state') { grid[m.col][m.row] = m.seat; drops.push({ c: m.col, r: m.row, t0: performance.now() }); sfx('stack'); setTurn(m.turn, m.ms); draw(0); }
        else if (m.t === 'g_end') { over = true; mt.ended = true; line = m.line || null; timer.stop(); timer.el.style.display = 'none'; st.textContent = ''; setTimeout(() => { if (!dead) body.appendChild(endBox(mt, m, m.why === 'four' ? 'Four in a row.' : m.why === 'full' ? 'The board is full.' : '')); }, 900); }
      },
      destroy() { dead = true; cancelAnimationFrame(raf); },
    };
  };

  // ----- long/short duel: one fake chart for both, pick a side, the next candles open
  VIEWS.ls = function (body, mt, win) {
    const W = 600, H = 300;
    body.innerHTML = '<div class="ls-top"><span class="ls-sc"></span><span class="ls-st">Get ready…</span></div>';
    const st = body.querySelector('.ls-st'), sc = body.querySelector('.ls-sc'), cv = el('canvas', 'ls-cv'); cv.width = W; cv.height = H; body.appendChild(cv);
    const timer = timerBar(body), g = cv.getContext('2d'), btns = el('div', 'ls-btns', '<button class="ls-long"><b>Long</b><small>price goes up</small><kbd>L</kbd></button><button class="ls-short"><b>Short</b><small>price goes down</small><kbd>S</kbd></button>'); body.appendChild(btns);
    const res = el('div', 'ls-res'); body.appendChild(res);
    let hist = [], fut = [], shown = 0, picked = null, enabled = false, dead = false, revealUntil = 0; const T = [];
    const later = (fn, ms) => { T.push(setTimeout(() => { if (!dead) fn(); }, ms)); };
    function draw() {
      g.clearRect(0, 0, W, H); const all = hist.concat(fut.slice(0, shown)); if (!all.length) return;
      let lo = Infinity, hi = -Infinity; for (const c of all) { lo = Math.min(lo, c[2]); hi = Math.max(hi, c[1]); } const pad = (hi - lo) * 0.12 + 0.01; lo -= pad; hi += pad;
      const slot = (W - 70) / 32, y = v => 10 + (1 - (v - lo) / (hi - lo)) * (H - 20);
      g.fillStyle = 'rgba(122,58,200,.05)'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(58,36,96,.1)'; g.lineWidth = 1; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(0, H * i / 5); g.lineTo(W, H * i / 5); g.stroke(); }
      all.forEach((c, i) => { const x = 8 + i * slot + slot / 2, up = c[3] >= c[0], col = up ? '#1fa971' : '#e0455a'; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y(c[1])); g.lineTo(x, y(c[2])); g.stroke(); const top = y(Math.max(c[0], c[3])), hh = Math.max(2, Math.abs(y(c[0]) - y(c[3]))); g.fillRect(x - slot * 0.32, top, slot * 0.64, hh); });
      const ey = y(hist[hist.length - 1][3]); g.setLineDash([5, 4]); g.strokeStyle = 'rgba(43,33,64,.55)'; g.beginPath(); g.moveTo(0, ey); g.lineTo(W - 56, ey); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#2b2140'; g.font = '700 11px Nunito, sans-serif'; g.fillText('entry ' + hist[hist.length - 1][3].toFixed(2), W - 62, ey - 4);
      if (shown) { const last = all[all.length - 1], ly = y(last[3]); g.fillStyle = last[3] >= hist[hist.length - 1][3] ? '#1fa971' : '#e0455a'; g.fillText(last[3].toFixed(2), W - 56, ly + 4); }
    }
    const scoreTxt = s => { sc.innerHTML = `<b>You</b> ${pip(s[mt.you], 2, 'pip')} ${s[mt.you]} - ${s[1 - mt.you]} ${pip(s[1 - mt.you], 2, 'pip opp')} <b>${esc(mt.opp.name)}</b>`; };
    scoreTxt([0, 0]);
    const pickSide = s => { if (!enabled || picked) return; picked = s; enabled = false; sfx('click'); btns.classList.add('locked'); btns.children[s === 'L' ? 0 : 1].classList.add('sel'); st.textContent = `Locked: ${s === 'L' ? 'LONG' : 'SHORT'}. Waiting for ${mt.opp.name}…`; mt.send({ side: s }); };
    btns.children[0].onclick = () => pickSide('L'); btns.children[1].onclick = () => pickSide('S');
    const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
    return {
      onKey(e) { if (e.ctrlKey || e.metaKey || e.altKey) return false; if (e.code === 'KeyL') { pickSide('L'); return true; } if (e.code === 'KeyS') { pickSide('S'); return true; } return false; },
      onEvent(m) {
        if (m.t === 'g_round') {
          const wait = Math.max(0, revealUntil - Date.now());                 // the last reveal is still playing: show the new chart after it
          later(() => {
            res.innerHTML = ''; res.className = 'ls-res'; hist = m.hist; fut = []; shown = 0; picked = null; enabled = false; btns.classList.remove('locked'); for (const b of btns.children) b.classList.remove('sel'); btns.classList.add('wait'); draw();
            st.textContent = 'Round ' + m.round + ': study the chart…';
          }, wait);
          later(() => { enabled = true; btns.classList.remove('wait'); st.textContent = 'Go long or short! You have 10 seconds.'; timer.set(m.ms - 1000, m.ms - 1000); sfx('go'); }, Math.max(m.delay || 0, wait + 300));
        } else if (m.t === 'g_state') { if (m.ready[1 - mt.you] && !(m.ready[mt.you])) st.textContent = mt.opp.name + ' has chosen. Your move!'; }
        else if (m.t === 'g_reveal') {
          enabled = false; timer.stop(); fut = m.fut; shown = 0; btns.classList.add('locked'); revealUntil = Date.now() + 3800;
          const name = s => (s === 'L' ? 'LONG' : s === 'S' ? 'SHORT' : 'FLAT'), me = m.picks[mt.you], op = m.picks[1 - mt.you], pm = m.pnl[mt.you], po = m.pnl[1 - mt.you];
          st.textContent = 'The candles open…'; for (let i = 0; i < 4; i++) later(() => { shown = i + 1; sfx('click'); draw(); }, 500 + i * 500);
          later(() => {
            const w = m.win === -1 ? -1 : m.win === mt.you ? 1 : 0;
            res.className = 'ls-res on ' + (w === 1 ? 'win' : w === 0 ? 'lose' : 'tie');
            res.innerHTML = `<div><small>You</small><b>${name(me)}</b><em class="${pm >= 0 ? 'up' : 'dn'}">${fmt(pm)}</em></div><div class="v">${w === 1 ? 'You win the round' : w === 0 ? esc(mt.opp.name) + ' wins the round' : 'Round tied'}</div><div><small>${esc(mt.opp.name)}</small><b>${name(op)}</b><em class="${po >= 0 ? 'up' : 'dn'}">${fmt(po)}</em></div>`;
            st.textContent = w === 1 ? 'Nice read.' : w === 0 ? 'The market had other plans.' : 'Same call, same PnL. Replay.'; sfx(w === 1 ? 'win' : w === 0 ? 'lose' : 'tie'); scoreTxt(m.score);
          }, 2700);
        } else if (m.t === 'g_end') { mt.ended = true; later(() => { btns.style.display = 'none'; timer.el.style.display = 'none'; body.appendChild(endBox(mt, m, '')); }, 3600); }
      },
      destroy() { dead = true; T.forEach(clearTimeout); },
    };
  };

  // ---------- shared bits of the three record games: the result card, with the server's rank when it answers
  function resultCard(game, title, lines, res, again) {
    const box = el('div', 'gm-result');
    box.innerHTML = `<h3>${esc(title)}</h3>${lines.map(l => `<p>${l}</p>`).join('')}<p class="rk"></p><p class="tr">${res.trophy ? cup(18) + ' Trophy earned today!' : 'Trophy for this game: already yours today, or not reached.'}</p>`;
    const rk = box.querySelector('.rk'), tr = box.querySelector('.tr'); if (!res.trophy) tr.classList.add('dim'); else sfx('trophy');
    rk.textContent = online() ? 'Checking the leaderboard…' : 'Offline: your best is kept in this browser.';
    pendingScore[game] = m => {
      if (!m.ok) { rk.textContent = m.reason === 'too fast' ? 'Leaderboard: wait a few seconds between runs.' : m.reason === 'already played today' ? 'Leaderboard: today\'s Daily Chog was already counted.' : ''; return; }
      rk.textContent = m.rank ? `Leaderboard: #${m.rank.day} today · #${m.rank.week} this week` : '';
      if (m.trophy) { tr.innerHTML = cup(18) + ' Trophy earned today!'; tr.classList.remove('dim'); }
      if (m.badges && m.badges.length) say('New badge: ' + m.badges.map(b => BADGE_TXT[b] || b).join(', '));
    };
    const a = el('div', 'gm-acts');
    if (again) { const b = el('button', 'gm-btn', 'Play again'); b.onclick = again; a.appendChild(b); }
    const c = el('button', 'gm-btn ghost', 'Close'); c.onclick = () => closeWin(); a.appendChild(c); box.appendChild(a);
    return box;
  }

  // ---------- Stack the luggage (Arcade): one button, slide, drop, the overhang is cut
  GAMES.stack = function () {
    openWin('stack', 'Stack the luggage', body => {
      const W = 420, H = 600, BH = 34, BASE = 190;
      const PAL = [['#e8604c', '#a8382a'], ['#3a8ad8', '#2358a0'], ['#f2b83a', '#b8821a'], ['#4ab88a', '#2a7a5a'], ['#9a5ad8', '#6a34a8'], ['#f08ab8', '#b04a80']];
      body.innerHTML = '<div class="stk-hud"><span>Floors <b class="stk-n">0</b></span><span class="stk-b">Best ' + (LS.best.stack || 0) + '</span></div>';
      const cv = el('canvas', 'stk-cv'); cv.width = W; cv.height = H; const stage = el('div', 'gm-stage'); stage.appendChild(cv); body.appendChild(stage); const g = cv.getContext('2d'), nEl = body.querySelector('.stk-n');
      body.appendChild(el('p', 'gm-note small center', 'Click, Space or Enter to drop the suitcase. Line it up: the overhang is cut off.'));
      let blocks, cur, falls, camY, run, state, raf = 0, last = 0, dead = false, floors, msgT = 0, msg = '', shake = 0;
      const spawn = () => { const p = blocks[blocks.length - 1], right = floors % 2 === 1; cur = { x: right ? W - p.w : 0, w: p.w, dir: right ? -1 : 1, c: (floors + 1) % PAL.length }; };
      const reset = () => { blocks = [{ x: (W - BASE) / 2, w: BASE, c: 0 }]; falls = []; camY = 0; run = 0; floors = 0; state = 'play'; nEl.textContent = 0; msg = ''; spawn(); const r = body.querySelector('.gm-result'); if (r) r.remove(); };
      const yOf = i => H - 64 - (i + 1) * BH + camY;
      function suitcase(x, y, w, c, top, alpha) {
        g.save(); g.globalAlpha = alpha == null ? 1 : alpha;
        if (top && w > 36) { g.strokeStyle = '#4a3a2a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + w / 2 - 14, y + 1); g.lineTo(x + w / 2 - 14, y - 8); g.lineTo(x + w / 2 + 14, y - 8); g.lineTo(x + w / 2 + 14, y + 1); g.stroke(); }
        g.fillStyle = c[0]; g.strokeStyle = '#2a1d3a'; g.lineWidth = 2.5; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, BH - 3, 7) : g.rect(x, y, w, BH - 3); g.fill(); g.stroke();
        g.fillStyle = c[1]; const sw = Math.max(5, w * 0.07); g.fillRect(x + w * 0.2, y + 2, sw, BH - 7); g.fillRect(x + w * 0.8 - sw, y + 2, sw, BH - 7);
        g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x + 6, y + 4, Math.max(0, w - 12), 4);
        g.fillStyle = '#d8c070'; for (const cx of [x + 6, x + w - 6]) { g.beginPath(); g.arc(cx, y + 8, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(cx, y + BH - 11, 2.4, 0, 7); g.fill(); }
        g.restore();
      }
      function draw() {
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f3e4ff'); bg.addColorStop(1, '#ffe9cf'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(122,58,200,.07)'; for (let i = 0; i < 8; i++) g.fillRect(((i * 97 + camY * 0.3) % (W + 40)) - 20, 0, 22, H);
        g.save(); if (shake > 0) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        g.fillStyle = '#d9cfc0'; g.fillRect(0, H - 64 + camY, W, 100); g.fillStyle = '#c4b8a6'; for (let i = 0; i < 9; i++) g.fillRect(i * 52, H - 64 + camY, 2, 100);
        g.fillStyle = '#8a6a4a'; g.fillRect(W / 2 - 150, H - 64 + camY - 6, 300, 8);                                   // the bellhop cart base
        blocks.forEach((b, i) => suitcase(b.x, yOf(i), b.w, PAL[b.c], i === blocks.length - 1 && state !== 'play'));
        if (state === 'play') suitcase(cur.x, yOf(blocks.length), cur.w, PAL[cur.c], true);
        for (const f of falls) { g.save(); g.translate(f.x + f.w / 2, f.y + BH / 2); g.rotate(f.r); g.translate(-f.w / 2, -BH / 2); suitcase(0, 0, f.w, PAL[f.c], false, Math.max(0, 1 - f.t * 0.7)); g.restore(); }
        g.restore();
        if (msgT > 0) { g.fillStyle = '#7a3ac8'; g.font = '700 26px Fredoka, sans-serif'; g.textAlign = 'center'; g.globalAlpha = Math.min(1, msgT * 2); g.fillText(msg, W / 2, 90 - (1 - Math.min(1, msgT)) * 0); g.globalAlpha = 1; g.textAlign = 'left'; }
      }
      function frame(ts) {
        if (dead) return; raf = requestAnimationFrame(frame); const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; step(dt); draw();
      }
      function step(dt) {
        if (state === 'play') { cur.x += cur.dir * Math.min(150 + floors * 11, 440) * dt; if (cur.x < 0) { cur.x = 0; cur.dir = 1; } if (cur.x + cur.w > W) { cur.x = W - cur.w; cur.dir = -1; } }
        const want = Math.max(0, (blocks.length - 8) * BH); camY += (want - camY) * Math.min(1, dt * 5);
        for (let i = falls.length - 1; i >= 0; i--) { const f = falls[i]; f.vy += 1500 * dt; f.y += f.vy * dt; f.r += f.vr * dt; f.t += dt; if (f.y > H + 200) falls.splice(i, 1); }
        msgT = Math.max(0, msgT - dt); shake = Math.max(0, shake - dt * 40);
      }
      function drop() {
        if (state !== 'play') return;
        const p = blocks[blocks.length - 1], left = Math.max(cur.x, p.x), right = Math.min(cur.x + cur.w, p.x + p.w), ov = right - left, y = yOf(blocks.length);
        if (ov <= 3) { falls.push({ x: cur.x, y, w: cur.w, c: cur.c, vy: 0, r: 0, vr: cur.dir * 1.4, t: 0 }); state = 'over'; sfx('lose'); finish(); return; }
        let nx = left, nw = ov, perfect = false;
        if (Math.abs(cur.x - p.x) <= 5) { perfect = true; nx = p.x; nw = p.w; run++; if (run >= 3 && nw < BASE) { nw = Math.min(BASE, nw + 12); nx = Math.max(0, nx - 6); } }
        else { run = 0; const cutX = cur.x < p.x ? cur.x : p.x + p.w, cutW = cur.x < p.x ? p.x - cur.x : cur.x + cur.w - (p.x + p.w); falls.push({ x: cutX, y, w: cutW, c: cur.c, vy: 0, r: 0, vr: cur.x < p.x ? -1.6 : 1.6, t: 0 }); shake = 6; }
        blocks.push({ x: nx, w: nw, c: cur.c }); floors++; nEl.textContent = floors;
        sfx(perfect ? 'stack_perfect' : 'stack'); if (perfect) { msg = run >= 3 ? 'Perfect ×' + run : 'Perfect!'; msgT = 1; }
        spawn();
      }
      function finish() {
        const res = recordSolo('stack', { floors }, floors, floors >= 8);
        body.querySelector('.stk-b').textContent = 'Best ' + res.best;
        const card = resultCard('stack', floors >= 15 ? 'A skyscraper of suitcases!' : floors >= 8 ? 'Nice tower' : 'The pile fell over', [`<b>${floors}</b> floors${res.newBest ? ' · new best!' : ' · best ' + res.best}`], res, () => { reset(); });
        setTimeout(() => { if (!dead && state === 'over') stage.appendChild(card); }, 700);
      }
      reset(); raf = requestAnimationFrame(frame);
      cv.addEventListener('pointerdown', e => { e.preventDefault(); drop(); });
      return {
        onKey(e) { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') { if (!e.repeat) drop(); return true; } return false; },
        frame: dt => { step(dt); draw(); }, drop, get floors() { return floors; },
        destroy() { dead = true; cancelAnimationFrame(raf); },
      };
    }, { cls: 'stack' });
  };

  // ---------- Rhythm (NOVA DJ booth): four lanes on the beat grid of the club track
  GAMES.rhythm = function () {
    openWin('rhythm', 'Rhythm · NOVA DJ booth', body => {
      const W = 440, H = 600, LANES = 4, LW = 88, LX = (W - LANES * LW) / 2, HIT = H - 110, FALL = 1.5, BPM = 120, SPB = 60 / BPM, KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], LBL = ['D', 'F', 'J', 'K'];
      const COLS = ['#ff5aa8', '#ffc23a', '#3ad8c8', '#8a5ae8'];
      body.innerHTML = '<div class="rh-hud"><span>Combo <b class="rh-c">0</b></span><span class="rh-acc">100%</span><span>Score <b class="rh-s">0</b></span></div>';
      const cv = el('canvas', 'rh-cv'); cv.width = W; cv.height = H; const stage = el('div', 'gm-stage'); stage.appendChild(cv); body.appendChild(stage); const g = cv.getContext('2d');
      const cEl = body.querySelector('.rh-c'), sEl = body.querySelector('.rh-s'), aEl = body.querySelector('.rh-acc');
      const chart = () => {                                                     // the same chart every time: a quarter-note grid with a few off-beats, denser in the second half
        let sd = 1969; const rnd = () => { sd = (sd * 48271) % 2147483647; return sd / 2147483647; }, notes = []; let lane = 1;
        for (let b = 4; b < 144; b++) {
          const dense = b > 40, p1 = b < 20 ? 0.6 : 0.78, p2 = dense ? 0.3 : 0.1;
          if (rnd() < p1) { lane = rnd() < 0.72 ? (lane + 1 + ((rnd() * 3) | 0)) % LANES : lane; notes.push({ t: b * SPB, lane, st: 0 }); }
          if (rnd() < p2) { const l2 = (lane + 1 + ((rnd() * 3) | 0)) % LANES; notes.push({ t: (b + 0.5) * SPB, lane: l2, st: 0 }); }
        }
        return notes;
      };
      let notes, t0 = 0, usingAudio = false, actx = null, state = 'intro', P, G, M, combo, maxCombo, score, raf = 0, dead = false, pops = [], pressed = [0, 0, 0, 0], tick = 0, endAt = 0;
      const clock = () => (usingAudio ? AUDIO.now() : actx ? actx.currentTime : performance.now() / 1000);
      const intro = el('div', 'gm-result rh-intro', '<h3>Hit the notes on the beat</h3><p>Four lanes: <kbd>D</kbd> <kbd>F</kbd> <kbd>J</kbd> <kbd>K</kbd> (or click the lanes). Press when a note reaches the line. About a minute and a half.</p>'); stage.appendChild(intro);
      const go = el('button', 'gm-btn', 'Start'); go.onclick = () => begin(); intro.appendChild(go);
      function begin() {
        intro.remove(); notes = chart(); P = G = M = 0; combo = maxCombo = score = 0; pops = []; tick = 0; usingAudio = false; actx = null;
        try { if (window.AUDIO && AUDIO.playTrack && AUDIO.now) { const tr = AUDIO.playTrack('club', BPM); if (tr && tr.startTime > 0) { usingAudio = true; t0 = tr.startTime; } } } catch (e) { usingAudio = false; }
        if (!usingAudio) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { actx = null; } t0 = clock() + 1.0; }
        state = 'play'; endAt = notes[notes.length - 1].t + 1.6; const r = body.querySelector('.gm-result'); if (r) r.remove();
      }
      function metronome(now) {                                                 // no club track available: a click on every beat
        if (usingAudio || !actx) return; while (tick * SPB <= now + 0.03) { const t = actx.currentTime + Math.max(0, tick * SPB - now); try { const o = actx.createOscillator(), v = actx.createGain(); o.frequency.value = tick % 4 === 0 ? 1100 : 760; v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(0.16, t + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); o.connect(v); v.connect(actx.destination); o.start(t); o.stop(t + 0.09); } catch (e) { /* ignore */ } tick++; }
      }
      const pop = (txt, col) => pops.push({ txt, col, t: 0 });
      function hit(l) {
        if (state !== 'play') return; pressed[l] = 0.12; const now = clock() - t0; let best = null;
        for (const n of notes) { if (n.st || n.lane !== l) continue; const d = Math.abs(n.t - now); if (d <= 0.15 && (!best || d < best.d)) best = { n, d }; }
        if (!best) return;
        best.n.st = best.d <= 0.07 ? 1 : 2; if (best.n.st === 1) { P++; score += 1000; pop('PERFECT', '#ff5aa8'); sfx('hit_perfect'); } else { G++; score += 600; pop('GOOD', '#3a8ad8'); sfx('hit_good'); }
        combo++; maxCombo = Math.max(maxCombo, combo); hud();
      }
      function hud() { cEl.textContent = combo; sEl.textContent = score; const n = P + G + M; aEl.textContent = n ? Math.round((P + G * 0.6) / n * 100) + '%' : '100%'; }
      function step(dt) {
        if (state !== 'play') return; const now = clock() - t0; metronome(now);
        for (const n of notes) if (!n.st && now - n.t > 0.15) { n.st = 3; M++; combo = 0; pop('MISS', '#e0455a'); sfx('miss'); hud(); }
        for (const p of pops) p.t += dt; pops = pops.filter(p => p.t < 0.6); for (let i = 0; i < 4; i++) pressed[i] = Math.max(0, pressed[i] - dt);
        if (now > endAt) finish();
      }
      function draw() {
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1d1238'); bg.addColorStop(1, '#3b1a5e'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        const now = state === 'play' || state === 'done' ? clock() - t0 : -2, beat = now / SPB;
        for (let l = 0; l < LANES; l++) {
          g.fillStyle = pressed[l] > 0 ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.05)'; g.fillRect(LX + l * LW + 2, 0, LW - 4, H);
          g.fillStyle = COLS[l]; g.globalAlpha = 0.9; g.fillRect(LX + l * LW + 4, HIT - 3, LW - 8, 6); g.globalAlpha = 1;
          g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '700 20px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText(LBL[l], LX + l * LW + LW / 2, HIT + 44); g.textAlign = 'left';
        }
        const pulse = beat > 0 ? 1 - (beat % 1) : 0; g.fillStyle = `rgba(255,90,168,${0.05 + pulse * 0.1})`; g.fillRect(0, HIT - 6, W, 12);
        if (state !== 'intro') for (const n of notes) {
          if (n.st === 1 || n.st === 2) continue; const y = HIT - (n.t - now) / FALL * HIT; if (y < -30 || y > H + 20) continue;
          g.globalAlpha = n.st === 3 ? 0.25 : 1; g.fillStyle = COLS[n.lane]; g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.roundRect ? g.roundRect(LX + n.lane * LW + 8, y - 13, LW - 16, 26, 9) : g.rect(LX + n.lane * LW + 8, y - 13, LW - 16, 26); g.fill(); g.stroke(); g.globalAlpha = 1;
        }
        for (const p of pops) { g.globalAlpha = 1 - p.t / 0.6; g.fillStyle = p.col; g.font = '700 26px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText(p.txt, W / 2, HIT - 90 - p.t * 40); g.globalAlpha = 1; g.textAlign = 'left'; }
        if (state === 'play' && now < 0) { const n = Math.ceil(-now / SPB); g.fillStyle = '#fff'; g.font = '700 70px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText(n > 4 ? '' : n, W / 2, H / 2); g.textAlign = 'left'; }
        else if (state === 'play' && now >= 0 && now < 3 * SPB) { g.fillStyle = 'rgba(255,255,255,' + (1 - now / (3 * SPB)) + ')'; g.font = '700 40px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText('GO!', W / 2, H / 2); g.textAlign = 'left'; }
      }
      function finish() {
        state = 'done'; try { if (window.AUDIO && AUDIO.stopTrack) AUDIO.stopTrack(); } catch (e) { /* ignore */ } if (actx) { try { actx.close(); } catch (e) { /* ignore */ } actx = null; }
        const n = P + G + M, acc = n ? (P + G * 0.6) / n : 0, grade = acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.7 ? 'B' : acc >= 0.5 ? 'C' : 'D';
        const res = recordSolo('rhythm', { perfect: P, good: G, miss: M }, score, acc >= 0.6);
        stage.appendChild(resultCard('rhythm', 'Grade ' + grade, [`<b>${score}</b> points${res.newBest ? ' · new best!' : ' · best ' + res.best}`, `${P} perfect · ${G} good · ${M} miss · longest combo ${maxCombo}`], res, () => { state = 'intro'; const r = body.querySelector('.gm-result'); if (r) r.remove(); stage.appendChild(intro); }));
        sfx(acc >= 0.6 ? 'cheer' : 'lose');
      }
      function frame() { if (dead) return; raf = requestAnimationFrame(frame); step(1 / 60); draw(); }
      raf = requestAnimationFrame(frame);
      cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W - LX; if (x >= 0 && x < LANES * LW) hit(Math.floor(x / LW)); });
      return {
        onKey(e) { const l = KEYS.indexOf(e.code); if (l >= 0) { if (!e.repeat) hit(l); return true; } if ((e.code === 'Space' || e.code === 'Enter') && state === 'intro') { begin(); return true; } return false; },
        frame: dt => { step(dt); draw(); }, hit, begin, stats: () => ({ P, G, M, score, state }), notes: () => notes, now: () => clock() - t0,
        destroy() { dead = true; cancelAnimationFrame(raf); try { if (window.AUDIO && AUDIO.stopTrack && state !== 'intro') AUDIO.stopTrack(); } catch (e) { /* ignore */ } if (actx) { try { actx.close(); } catch (e) { /* ignore */ } } },
      };
    }, { cls: 'rhythm', backClose: false });
  };

  // ---------- Daily Chog (Gallery): one Chog a day for everybody, six guesses, trait-by-trait feedback
  const CATS = ['Tier', 'Base', 'Skin', 'Eyes', 'Head', 'Body', 'Mouth', 'Aura', 'Accessory'];
  const DAILY_START = Date.UTC(2026, 9, 1) - 864e5;
  function dailyId(day) {
    let h = 2166136261; const s = 'chog-daily-' + day; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    let a = h >>> 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    let id = 1 + Math.floor(r * 1969); for (let k = 0; k < 1969 && !(typeof TOKENS !== 'undefined' && TOKENS[id]); k++) id = id % 1969 + 1; return id;
  }
  GAMES.dailyId = dailyId;
  GAMES.daily = async function () {
    if (typeof WALLET !== 'undefined' && WALLET.dataReady) await WALLET.dataReady;
    const day = today(), id = dailyId(day), no = Math.floor((Date.parse(day) - DAILY_START) / 864e5) + 1;
    if (!LS.daily || LS.daily.day !== day) { LS.daily = { day, guesses: [], done: false, solved: false, recorded: false }; saveLS(); }
    const D = LS.daily, tv = (tid, cat) => { const t = TOKENS[tid] && TOKENS[tid].traits; return (t && t[cat]) || 'None'; };
    openWin('daily', 'Daily Chog · Gallery', body => {
      let sugg = [];
      const draw = () => {
        const keepVal = body.querySelector('input') ? body.querySelector('input').value : '', hadFocus = body.querySelector('input') === document.activeElement;
        body.innerHTML = '';
        body.appendChild(el('div', 'dc-head', `<b>Daily Chog #${no}</b><span>${day}</span><span class="n">Guess ${Math.min(D.guesses.length + (D.done ? 0 : 1), 6)} of 6</span>`));
        const tbl = el('div', 'dl-tbl'); const hd = el('div', 'dl-row hd', '<span class="who">Guess</span>' + CATS.map(c => `<span>${c}</span>`).join('')); tbl.appendChild(hd);
        for (let r = 0; r < 6; r++) {
          const gid = D.guesses[r], row = el('div', 'dl-row' + (gid ? '' : ' empty'));
          if (gid) { row.innerHTML = `<span class="who"><img alt="" src="data/portraits/${gid}.webp" onerror="this.style.display='none'"><b>#${gid}</b></span>` + CATS.map(c => { const v = tv(gid, c), m = v === tv(id, c); return `<span class="${m ? 'ok' : 'no'}" title="${c}: ${esc(v)}">${esc(v)}</span>`; }).join(''); }
          else row.innerHTML = '<span class="who">-</span>' + CATS.map(() => '<span></span>').join('');
          tbl.appendChild(row);
        }
        body.appendChild(tbl);
        body.appendChild(el('p', 'gm-note small', 'Green: same as today\'s Chog. Red: different. Search by number (like 1700) or by a trait or legend name.'));
        if (!D.done) {
          const form = el('div', 'dl-in'), inp = document.createElement('input'); inp.type = 'text'; inp.placeholder = 'Token number or name…'; inp.maxLength = 24; inp.autocomplete = 'off'; inp.spellcheck = false; inp.value = keepVal;
          const sg = el('div', 'dl-sg'), go = el('button', 'gm-btn', 'Guess');
          const upd = () => {
            const q = inp.value.trim().toLowerCase().replace(/^#/, ''); sg.innerHTML = ''; sugg = [];
            if (q) {
              const ids = Object.keys(TOKENS).filter(k => +k >= 1 && +k <= 1969);
              if (/^\d+$/.test(q)) sugg = ids.filter(k => k.startsWith(q)).sort((a, b) => (a === q ? -1 : b === q ? 1 : a - b)).slice(0, 8);
              else sugg = ids.filter(k => { const t = TOKENS[k]; return (t.name || '').toLowerCase().includes(q) || Object.values(t.traits || {}).some(v => String(v).toLowerCase().includes(q)); }).slice(0, 8);
            }
            for (const k of sugg) { const b = el('button', 'dl-s', `<img alt="" src="data/portraits/${k}.webp" onerror="this.style.display='none'"><b>#${k}</b><small>${esc((TOKENS[k].traits.Tier || '') + (TOKENS[k].traits.Legend ? ' · ' + TOKENS[k].traits.Legend : ''))}</small>`); b.onclick = () => guess(+k); sg.appendChild(b); }
          };
          inp.oninput = upd; inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') { const n = parseInt(inp.value.replace(/^#/, ''), 10); if (/^#?\d+$/.test(inp.value.trim()) && n >= 1 && n <= 1969 && TOKENS[n]) guess(n); else if (sugg.length) guess(+sugg[0]); else say('No Chog found for that.'); } else if (e.key === 'Escape') inp.blur(); };
          go.onclick = () => inp.onkeydown({ key: 'Enter', stopPropagation() { } });
          form.appendChild(inp); form.appendChild(go); body.appendChild(form); body.appendChild(sg); if (hadFocus) setTimeout(() => { inp.focus(); upd(); }, 0); else if (keepVal) upd();
        } else {
          const n = D.guesses.length, win = D.solved, tt = TOKENS[id].traits;
          const share = `Chog Hotel Daily Chog #${no}  ${win ? n : 'X'}/6\n` + D.guesses.map(gid => CATS.map(c => (tv(gid, c) === tv(id, c) ? '🟩' : '⬛')).join('')).join('\n');
          const res = el('div', 'gm-result dl-res'); const reveal = el('div', 'dl-reveal');
          reveal.innerHTML = `<img alt="" src="data/portraits/${id}.webp" onerror="this.style.display='none'"><div><h3>${win ? `Solved in ${n}!` : 'Not this time'}</h3><p>Today's Chog was <b>${esc(TOKENS[id].name)}</b>${tt.Tier ? ' · ' + esc(tt.Tier) : ''}${TOKENS[id].rank ? ' · rank ' + TOKENS[id].rank : ''}.</p><p class="rk"></p><p class="tr"></p></div>`;
          res.appendChild(reveal);
          const pre = el('pre', 'dl-share'); pre.textContent = share; res.appendChild(pre);
          const a = el('div', 'gm-acts'), cp = el('button', 'gm-btn', 'Copy result'); cp.onclick = () => copyText(share).then(ok => { cp.textContent = ok ? 'Copied!' : 'Press Ctrl+C'; setTimeout(() => { cp.textContent = 'Copy result'; }, 1800); }); a.appendChild(cp);
          const cl = el('button', 'gm-btn ghost', 'Close'); cl.onclick = () => closeWin(); a.appendChild(cl); res.appendChild(a);
          const left = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1) - Date.now(); res.appendChild(el('p', 'gm-note small center', `Next Chog in ${Math.floor(left / 36e5)}h ${Math.floor(left % 36e5 / 6e4)}m (UTC midnight).`));
          body.appendChild(res);
          const rk = res.querySelector('.rk'), tr = res.querySelector('.tr'), r0 = LS.dailyRes || { trophy: win };
          tr.innerHTML = win ? (cup(18) + (r0.trophy ? ' Trophy earned today!' : ' Trophy: already yours today.')) : ''; rk.textContent = online() ? '' : 'Offline: the result stays in this browser.';
          pendingScore.daily = m => { if (m.ok) rk.textContent = m.rank ? `Leaderboard: #${m.rank.day} today · #${m.rank.week} this week` : ''; else if (m.reason === 'already played today') rk.textContent = 'Already counted on the leaderboard today.'; };
          if (D.lastRank) rk.textContent = D.lastRank;
        }
      };
      const copyText = async s => { try { await navigator.clipboard.writeText(s); return true; } catch (e) { try { const t = document.createElement('textarea'); t.value = s; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok; } catch (e2) { return false; } } };
      function guess(gid) {
        if (D.done) return; if (!TOKENS[gid]) return say('That Chog does not exist.');
        if (D.guesses.includes(gid)) { say('You already guessed #' + gid + '.'); return; }
        D.guesses.push(gid); sfx('click');
        if (gid === id) { D.done = true; D.solved = true; } else if (D.guesses.length >= 6) { D.done = true; D.solved = false; }
        saveLS(); draw();
        if (D.done && !D.recorded) {
          D.recorded = true; const n = D.guesses.length; const r = recordSolo('daily', { day, guesses: n, solved: D.solved }, D.solved ? 7 - n : 0, D.solved); LS.dailyRes = r; saveLS(); sfx(D.solved ? 'win' : 'lose'); if (r.trophy) sfx('trophy'); draw();
        }
      }
      draw();
      return { draw, guess, id: () => id, state: () => D, onKey() { return false; }, destroy() { } };
    }, { cls: 'daily' });
  };
})();
