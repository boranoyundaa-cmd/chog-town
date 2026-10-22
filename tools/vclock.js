// Injected into the page before it loads (tools/cdp.js): a clock the capture moves itself. Until __vt.freeze() the page runs in real time;
// after it, timers, requestAnimationFrame, performance.now and Date only move on __vt.tick(ms), so every frame is exactly 1/30 s apart.
(() => {
  const R = { st: setTimeout.bind(window), ct: clearTimeout.bind(window), si: setInterval.bind(window), ci: clearInterval.bind(window),
    raf: requestAnimationFrame.bind(window), pn: performance.now.bind(performance), dn: Date.now, D: Date };
  let frozen = false, vnow = 0, dateBase = 0, seq = 1;
  const timers = new Map(), rafq = new Map();
  const V = window.__vt = { frozen: () => frozen };
  const arm = (id, t) => {
    t.start = R.pn();
    t.real = (t.repeat ? R.si : R.st)(() => { if (frozen || !timers.has(id)) return; if (!t.repeat) timers.delete(id); t.fn(...t.args); }, t.delay);
  };
  const add = (repeat, fn, delay, args) => {
    if (typeof fn !== 'function') { const src = String(fn); fn = () => (0, eval)(src); }
    const id = seq++, t = { fn, args, delay: Math.max(repeat ? 1 : 0, +delay || 0), repeat };
    timers.set(id, t);
    if (frozen) t.due = vnow + t.delay; else arm(id, t);
    return id;
  };
  const clear = id => { const t = timers.get(id); if (!t) return; timers.delete(id); if (t.real != null) { R.ct(t.real); R.ci(t.real); } };
  window.setTimeout = (fn, delay, ...args) => add(false, fn, delay, args);
  window.setInterval = (fn, delay, ...args) => add(true, fn, delay, args);
  window.clearTimeout = window.clearInterval = clear;
  window.requestAnimationFrame = cb => {
    const id = seq++; rafq.set(id, cb);
    if (!frozen) R.raf(ts => { if (frozen || !rafq.has(id)) return; rafq.delete(id); cb(ts); });   // frozen by then: it waits for the next tick
    return id;
  };
  window.cancelAnimationFrame = id => { rafq.delete(id); };
  performance.now = () => frozen ? vnow : R.pn();
  const dnow = () => frozen ? dateBase + vnow : R.dn();
  const ct = window.BaseAudioContext && Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, 'currentTime');   // audio clocks too (the rhythm game reads one)
  if (ct) Object.defineProperty(BaseAudioContext.prototype, 'currentTime', { configurable: true, get() { const real = ct.get.call(this); if (!frozen) return real; if (this.__vt0 == null) this.__vt0 = real - vnow / 1000; return this.__vt0 + vnow / 1000; } });
  window.Date = class extends R.D { constructor(...a) { super(...(a.length ? a : [dnow()])); } static now() { return dnow(); } };

  V.freeze = () => {
    if (frozen) return;
    vnow = R.pn(); dateBase = R.dn() - vnow; frozen = true;
    for (const t of timers.values()) {
      if (t.real != null) { R.ct(t.real); R.ci(t.real); t.real = null; }
      t.due = t.repeat ? vnow + t.delay : vnow + Math.max(0, t.delay - (vnow - t.start));
    }
    return vnow;
  };
  V.tick = async (ms = 1000 / 30) => {
    const end = vnow + ms;
    for (let guard = 0; guard < 20000; guard++) {
      let best = null, bid = 0;
      for (const [id, t] of timers) if (t.due <= end && (!best || t.due < best.due)) { best = t; bid = id; }
      if (!best) break;
      vnow = Math.max(vnow, best.due);
      if (best.repeat) best.due += best.delay; else timers.delete(bid);
      try { best.fn(...best.args); } catch (e) { console.error(e); }
      await null;   // let promise continuations of that timer run, as they would in a real page
    }
    vnow = end;
    const cbs = [...rafq.values()]; rafq.clear();
    for (const cb of cbs) { try { cb(vnow); } catch (e) { console.error(e); } }
    await null;
    return vnow;
  };
})();
