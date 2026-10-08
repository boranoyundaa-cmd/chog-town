// ===== main: post-process pipeline, controls, loop =====
const nearest = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
const linear = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
let rtScene, rtNormal, rtBright, rtBlurA, rtBlurB, rtMask;
function buildTargets() {
  for (const t of [rtScene, rtNormal, rtBright, rtBlurA, rtBlurB, rtMask]) if (t) { t.dispose(); if (t.depthTexture) t.depthTexture.dispose(); }
  rtScene = new THREE.WebGLRenderTarget(W, H, PIXEL ? nearest : linear); rtScene.depthTexture = new THREE.DepthTexture(W, H);
  rtNormal = new THREE.WebGLRenderTarget(W, H, nearest);
  rtMask = new THREE.WebGLRenderTarget(W, H, nearest); rtMask.depthTexture = new THREE.DepthTexture(W, H);
  rtBright = new THREE.WebGLRenderTarget(W / 2, H / 2, linear);
  rtBlurA = new THREE.WebGLRenderTarget(W / 2, H / 2, linear);
  rtBlurB = new THREE.WebGLRenderTarget(W / 2, H / 2, linear);
}
buildTargets();

const postScene = new THREE.Scene();
const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); postScene.add(quad);
const VERT = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.); }';
const sm = (frag, uniforms) => new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false });

const matBright = sm(`
  precision highp float; varying vec2 vUv; uniform sampler2D tex;
  void main(){ vec3 c=texture2D(tex,vUv).rgb; float l=dot(c,vec3(.299,.587,.114)); gl_FragColor=vec4(c*smoothstep(.9,1.0,l),1.); }`, { tex: { value: rtScene.texture } });
const matBlur = sm(`
  precision highp float; varying vec2 vUv; uniform sampler2D tex; uniform vec2 dir;
  void main(){ vec3 c=texture2D(tex,vUv).rgb*.227;
    c+=texture2D(tex,vUv+dir*1.385).rgb*.316; c+=texture2D(tex,vUv-dir*1.385).rgb*.316;
    c+=texture2D(tex,vUv+dir*3.23).rgb*.07; c+=texture2D(tex,vUv-dir*3.23).rgb*.07; gl_FragColor=vec4(c,1.); }`,
  { tex: { value: null }, dir: { value: new THREE.Vector2() } });
const matComp = sm(`
  precision highp float; varying vec2 vUv;
  uniform sampler2D tColor, tDepth, tNormal, tBloom; uniform vec2 res; uniform float dth;
  float dAt(vec2 o){ return texture2D(tDepth, vUv+o).r; }
  vec3 nAt(vec2 o){ return texture2D(tNormal, vUv+o).rgb*2.-1.; }
  void main(){
    vec2 px=1./res; vec3 c=texture2D(tColor,vUv).rgb;
    float d=dAt(vec2(0.)); vec3 n=nAt(vec2(0.));
    float de=0., ne=0.;
    vec2 o0=vec2(px.x,0.), o1=vec2(-px.x,0.), o2=vec2(0.,px.y), o3=vec2(0.,-px.y);
    de+=step(dth,dAt(o0)-d)+step(dth,dAt(o1)-d)+step(dth,dAt(o2)-d)+step(dth,dAt(o3)-d);
    ne+=step(.42,1.-dot(n,nAt(o0)))+step(.42,1.-dot(n,nAt(o1)))+step(.42,1.-dot(n,nAt(o2)))+step(.42,1.-dot(n,nAt(o3)));
    de=clamp(de,0.,1.)*(1.-smoothstep(.36,.46,d)); ne=clamp(ne,0.,1.)*(1.-de)*(1.-smoothstep(.36,.46,d));
    c=mix(c,c*vec3(.2,.12,.3),de*.9);
    c=mix(c,c*vec3(.58,.46,.72),ne*.7);
    float l=dot(c,vec3(.299,.587,.114));
    c=mix(vec3(l),c,1.14);
    c=mix(c*vec3(.86,.78,1.1), c*vec3(1.1,1.03,.88), smoothstep(.12,.7,l));
    c+=texture2D(tBloom,vUv).rgb*.32;
    c=mix(c, c*c*(3.-2.*c), .28);
    vec3 over=max(c-.68,0.); c=min(c,.68)+over/(1.+over*2.6);
    c*=1.-.32*pow(length(vUv-.5)*1.3,2.4);
    gl_FragColor=vec4(c,1.);
  }`, { tColor: { value: rtScene.texture }, tDepth: { value: rtScene.depthTexture }, tNormal: { value: rtNormal.texture }, tBloom: { value: rtBlurB.texture }, tMask: { value: rtMask.texture }, tMaskDepth: { value: rtMask.depthTexture }, res: { value: new THREE.Vector2(W, H) }, ss: { value: SS }, dth: { value: 0.35 / 259 } });

// non-pixel styles swap in their own final pass (styles.js); unknown names fall back to 'smooth'
// DEV TOOL ONLY (art comparison with ?style=): the game has ONE art style and never switches it per space or per player. Final materials are built on first use and share the uniforms of matComp
const FINALS = {};
function finalMat(name) { if (!FINALS[name]) FINALS[name] = sm(STYLE_PRE + (STYLE_FRAG[name] || STYLE_FRAG.smooth), Object.assign({}, matComp.uniforms)); return FINALS[name]; }
let matFinal = PIXEL ? matComp : finalMat(STYLE);
const SOFT_STYLES = ['smooth', 'mini', 'paint', 'hybrid'], NO_HULL_STYLES = ['flat', 'mini'];
function setRenderStyle(name) {                       // pixel needs its own render targets, so it stays a page-level choice (?style=pixel)
  if (PIXEL || !STYLE_FRAG[name]) return false;
  matFinal = finalMat(name); setShadeSoft(SOFT_STYLES.includes(name));
  const hide = NO_HULL_STYLES.includes(name); hiddenInNormal.filter(o => o.userData.isHull).forEach(o => o.visible = !hide);
  window.RENDER_STYLE = name; return true;
}
window.RENDER_STYLE = STYLE; if (!PIXEL) setRenderStyle(STYLE);

const normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
const maskRed = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }), maskYellow = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(postScene, postCam); }

function renderFrame() {
  // 1) colour
  renderer.setRenderTarget(rtScene); renderer.render(scene, cam);
  // 2) normals (skip glow/hull/particle objects). The shadow map is not needed again, so it is not re-rendered for the extra passes.
  const shadowAuto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  const bg = scene.background, fog = scene.fog, vis = hiddenInNormal.concat(noNormalPass).map(o => [o, o.visible]);
  vis.forEach(([o]) => o.visible = false); scene.background = null; scene.fog = null; scene.overrideMaterial = normalMat;
  renderer.setClearColor(0x8080ff, 1); renderer.setRenderTarget(rtNormal); renderer.render(scene, cam);
  // 2b) Chog mask (non-pixel styles): layer 1 red = any Chog part, layer 2 yellow = face; own depth so the final pass can tell if a Chog is hidden
  if (!PIXEL) {
    renderer.setRenderTarget(rtMask); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.autoClear = false;
    cam.layers.set(1); scene.overrideMaterial = maskRed; renderer.render(scene, cam);
    cam.layers.set(2); scene.overrideMaterial = maskYellow; renderer.render(scene, cam);
    cam.layers.set(0); renderer.autoClear = true;
  }
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; vis.forEach(([o, v]) => o.visible = v);
  renderer.shadowMap.autoUpdate = shadowAuto;
  // 3) bloom
  pass(matBright, rtBright);
  matBlur.uniforms.tex.value = rtBright.texture; matBlur.uniforms.dir.value.set(BL / (W / 2), 0); pass(matBlur, rtBlurA);
  matBlur.uniforms.tex.value = rtBlurA.texture; matBlur.uniforms.dir.value.set(0, BL / (H / 2)); pass(matBlur, rtBlurB);
  matBlur.uniforms.tex.value = rtBlurB.texture; matBlur.uniforms.dir.value.set(1.5 * BL / (W / 2), 0); pass(matBlur, rtBlurA);
  matBlur.uniforms.tex.value = rtBlurA.texture; matBlur.uniforms.dir.value.set(0, 1.5 * BL / (H / 2)); pass(matBlur, rtBlurB);
  // 4) composite
  pass(matFinal, null);
}

// controls: drag to pan, wheel to zoom, P to save a full-res PNG
const RIGHT = new THREE.Vector3(1, 0, -1).normalize(), FWD = new THREE.Vector3(-1, 0, -1).normalize();
let drag = null;
renderer.domElement.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; });
addEventListener('pointerup', () => drag = null);
addEventListener('pointermove', e => {
  if (!drag || typeof GAME !== 'undefined') return;     // in the game the camera follows the player
  const k = FW / renderer.domElement.getBoundingClientRect().width;
  camTarget.addScaledVector(RIGHT, -(e.clientX - drag[0]) * k).addScaledVector(FWD, (e.clientY - drag[1]) * k * 1.9);
  camTarget.x = Math.max(-9, Math.min(9, camTarget.x)); camTarget.z = Math.max(-9, Math.min(9, camTarget.z));
  drag = [e.clientX, e.clientY]; updateCam();
});
addEventListener('wheel', e => {
  if (typeof GAME !== 'undefined') { if (e.target === renderer.domElement) GAME.zoomT = Math.max(GAME.zoomMin, Math.min(GAME.zoomMax, GAME.zoomT * Math.exp(e.deltaY * 0.0012))); return; }
  FW = Math.max(7, Math.min(30, FW * Math.exp(e.deltaY * 0.001))); updateCam();
}, { passive: true });
function capture(name = 'shot.png') {
  renderFrame();
  return new Promise(res => renderer.domElement.toBlob(b => fetch('/save?name=' + name, { method: 'POST', body: b }).then(() => res(name)), 'image/png'));
}
addEventListener('keydown', e => { if (e.key === 'p' || e.key === 'P') capture('shot_' + Date.now() + '.png'); });

// query params for inspection: ?zoom=8&tx=..&tz=..
(function () {
  const q = new URLSearchParams(location.search);
  if (q.has('zoom')) { FW = +q.get('zoom'); if (typeof GAME !== 'undefined') GAME.zoomT = FW; }
  if (q.has('tx')) camTarget.x = +q.get('tx');
  if (q.has('tz')) camTarget.z = +q.get('tz');
  if (q.has('ty')) camTarget.y = +q.get('ty');
  if (q.has('freeze')) window.__freeze = +q.get('freeze');
  updateCam();
})();

const clock = new THREE.Clock(); let T = 0;
function update(dt) {
  T += dt;
  if (window.__freeze !== undefined && T > window.__freeze) { /* hold animation time */ } else for (const f of animated) f(T, dt);
  sun.position.set(camTarget.x + SUN_OFF.x, SUN_OFF.y, camTarget.z + SUN_OFF.z); sun.target.position.set(camTarget.x, 0, camTarget.z);
}
function frame() {
  update(Math.min(clock.getDelta(), 0.05));
  renderFrame();
  requestAnimationFrame(frame);
}
// headless / hidden-tab testing: advance the simulation by n steps without waiting for requestAnimationFrame
window.step = (n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) update(dt); renderFrame(); };
frame();
window.__ready = true;

// follow the window: new canvas size, new render targets, new camera aspect (non-pixel styles, unless ?res forces a size)
function onViewResize() {
  if (PIXEL || QS.has('res')) return;
  VS = viewSize(); W = VS.sw; H = VS.sh; OUT = VS.cw / VS.sw; SS = VS.sh / VS.ch; ASPECT = VS.cw / VS.ch; BL = (W / 2) / 480;
  renderer.setSize(VS.cw, VS.ch, false); buildTargets();
  matBright.uniforms.tex.value = rtScene.texture;
  const u = matComp.uniforms; u.tColor.value = rtScene.texture; u.tDepth.value = rtScene.depthTexture; u.tNormal.value = rtNormal.texture; u.tBloom.value = rtBlurB.texture; u.tMask.value = rtMask.texture; u.tMaskDepth.value = rtMask.depthTexture; u.res.value.set(W, H); u.ss.value = SS;
  updateCam();
}
let _rz; addEventListener('resize', () => { clearTimeout(_rz); _rz = setTimeout(onViewResize, 120); });
