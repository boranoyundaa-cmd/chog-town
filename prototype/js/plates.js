// ===== nameplates: Storybook tags floating over every Chog (HTML, positioned from the 3D head) =====
// The player's plate shows the wallet-side name; NPCs (npc.js, the hotel receptionist) get a muted plate with their role. Plates hide behind buildings and with the space they live in.
const PLATES = { items: [] };
(function () {
  const host = document.createElement('div'); host.id = 'plates'; document.body.insertBefore(host, document.getElementById('ui'));
  const add = (root, isMe, role) => { const e = document.createElement('div'); e.className = 'plate' + (isMe ? ' me' : '') + (role ? ' npc' : ''); e.innerHTML = '<i class="dot"></i><b></b>' + (role ? '<em></em>' : ''); if (role) e.querySelector('em').textContent = role; host.appendChild(e); const it = { root, e, isMe, label: null, npc: role || null }; PLATES.items.push(it); return it; };
  const me = add(null, true);
  PLATES.add = (root, npcRole) => add(root, false, npcRole);                       // other players (net.js); npcRole marks a resident or staff member
  const shown = o => { for (; o; o = o.parent) if (o.visible === false) return false; return true; };
  PLATES.remove = it => { const i = PLATES.items.indexOf(it); if (i >= 0) PLATES.items.splice(i, 1); it.e.remove(); };
  PLATES.me = me;
  // a speech bubble above a plate: shown for a few seconds, replaced by the next line
  PLATES.say = (it, text) => {
    if (!it.say) { it.say = document.createElement('div'); it.say.className = 'say'; it.e.appendChild(it.say); }
    it.say.textContent = text; it.say.classList.add('on'); clearTimeout(it.sayT); it.sayT = setTimeout(() => it.say && it.say.classList.remove('on'), 3500 + Math.min(4000, text.length * 55));
  };
  const v = new THREE.Vector3();
  animated.push(() => {
    me.root = GAME.me; const scale = Math.max(0.8, Math.min(1.6, innerHeight / 810)), W = innerWidth, H = innerHeight;
    for (const it of PLATES.items) {
      if (!it.root || !shown(it.root)) { it.e.style.display = 'none'; continue; }
      v.set(it.root.position.x, it.root.position.y + 2.05 * it.root.scale.y, it.root.position.z);
      const hidden = !it.isMe && GAME.hiddenAt(v), p = v.clone().project(cam), x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
      const off = x < -80 || x > W + 80 || y < -40 || y > H + 40;
      it.e.style.display = hidden || off ? 'none' : 'flex';
      if (hidden || off) continue;
      const name = GAME.nameOf(it.root); if (name !== it.label) { it.label = name; it.e.querySelector('b').textContent = name; }
      const tier = it.isMe ? (typeof curTraits === 'function' && isHolder() ? hex(chogOptionsFromTraits(curTraits()).tier) : '#9a8a7a') : (it.tierColor || '#9a8a7a'); it.e.style.setProperty('--tier', tier);
      it.e.classList.toggle('hover', GAME.hoverChog === it.root);
      it.e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${scale})`;
      it.e.style.zIndex = Math.round(y);
    }
  });
})();
