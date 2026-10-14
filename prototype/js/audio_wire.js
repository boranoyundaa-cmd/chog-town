// ===== audio wiring: which music plays where, and the small UI sounds (the synthesizer itself is audio.js: AUDIO) =====
// One watcher decides the place from the game state (town by the light, lobby, hall, Home, venue by its music or kind) and calls AUDIO.setPlace when it changes; it also plays the door and
// elevator sounds when the scene changes. Delegated clicks give the HUD its sounds (no hover sounds except the dock, no steps). Everything is optional: with no AUDIO nothing happens.
// `sfxPlay(name)` is the guarded call other files use. Loaded after tour.js (needs HOTEL, ROOM, VENUE, NET, UI, DAY).
const sfxPlay = n => { try { if (window.AUDIO && AUDIO.sfx) AUDIO.sfx(n); } catch (e) { /* the sound is optional */ } };
(function () {
  if (!window.AUDIO) return;
  let lastSfx = 0;
  const raw = AUDIO.sfx; AUDIO.sfx = function (n) { lastSfx = performance.now(); return raw.call(AUDIO, n); };      // so a toast does not pile its sound onto another one

  // ---- the place: music follows where you are
  let night = false, lastPlace = null, lastKind = null, lastFloor = null;
  function place() {
    if (typeof HOTEL !== 'undefined' && HOTEL.active) return HOTEL.floor === 0 ? 'lobby' : 'hall';
    if (typeof ROOM !== 'undefined' && ROOM.active) {
      if (ROOM.kind === 'facade') return 'hall';
      const v = ROOM.venue; if (v && !v.exhibit) return typeof VENUE !== 'undefined' ? VENUE.trackOf(VENUE.inside || v) : 'lobby';
      return 'home';
    }
    const n = typeof DAY !== 'undefined' ? DAY.n : 0; if (night ? n < 0.4 : n > 0.6) night = !night;      // dusk and dawn, with a margin so the music does not flip back and forth
    return night ? 'town_night' : 'town_day';
  }
  function kind() { return typeof HOTEL !== 'undefined' && HOTEL.active ? 'hotel' : typeof ROOM !== 'undefined' && ROOM.active ? 'room' : 'town'; }
  setInterval(() => {
    try {
      const p = place(); if (p !== lastPlace) { lastPlace = p; AUDIO.setPlace(p); }
      const k = kind(), f = k === 'hotel' ? HOTEL.floor : null;
      if (lastKind !== null) { if (k !== lastKind) sfxPlay('door'); else if (k === 'hotel' && f !== lastFloor) sfxPlay('elevator_ding'); }
      lastKind = k; lastFloor = f;
    } catch (e) { /* not ready yet */ }
  }, 250);

  // ---- HUD sounds: one delegated listener
  const OWN = '#gm, #shop, #hfade';                                                  // the games and the shop make their own sounds
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button, a.btn, .dk'); if (!b || b.disabled || b.closest(OWN)) return;
    if (!b.closest('#ui, #hotelp, #doorp, .roomhud, .hotelhud')) return;
    sfxPlay(b.classList.contains('dk') ? 'open' : b.classList.contains('x') ? 'close' : 'click');
  }, true);
  document.addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('.dk'); if (b && !b.contains(e.relatedTarget)) sfxPlay('hover'); });

  // ---- toasts (only when no other sound just played) and chat from others (soft)
  const toast0 = window.toast; if (typeof toast0 === 'function') window.toast = function (m) { const r = toast0.apply(this, arguments); if (performance.now() - lastSfx > 300) sfxPlay('toast'); return r; };
  let chatAt = 0;
  if (typeof NET !== 'undefined' && NET.waiters) NET.waiters.add(m => {
    if (m.t !== 'chat' || m.id === NET.id) return; const r = NET.remotes && NET.remotes.get(m.id); if (r && NET.isMuted && NET.isMuted(r)) return;
    const t = performance.now(); if (t - chatAt > 1200) { chatAt = t; sfxPlay('chat'); }
  });
})();
