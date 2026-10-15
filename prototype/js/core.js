// ===== core: renderer, scene, camera, lights =====
// pixel style: fixed 960x540 scene upscaled 2x. Other styles: the canvas follows the window (device pixels, capped at 1920 on the long side)
// and the scene is supersampled (SS) then box-filtered down by the final pass. ?res=1920x1080 forces a size (screenshots).
const QS = new URLSearchParams(location.search);
function viewSize() {
  if (PIXEL) return { cw: 1920, ch: 1080, sw: 960, sh: 540 };
  let cw, ch;
  if (QS.has('res')) [cw, ch] = QS.get('res').split('x').map(Number);
  else {
    const dpr = Math.min(window.devicePixelRatio || 1, window.LITE ? 1.5 : 2); cw = Math.round(innerWidth * dpr); ch = Math.round(innerHeight * dpr);          // LITE: the phone companion (m.html)
    const m = Math.max(cw, ch); if (m > 1920) { const k = 1920 / m; cw = Math.round(cw * k); ch = Math.round(ch * k); }
  }
  const ss = window.LITE ? 1 : Math.min(cw, ch) >= 1000 ? 2 : 1.5;          // cheaper supersampling on phones, none in the companion
  return { cw, ch, sw: Math.round(cw * ss), sh: Math.round(ch * ss) };
}
let VS = viewSize(), W = VS.sw, H = VS.sh, OUT = VS.cw / VS.sw, SS = VS.sh / VS.ch, ASPECT = VS.cw / VS.ch;
let BL = (W / 2) / 480;            // bloom kernel scale so the glow has the same screen width in every style
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(VS.cw, VS.ch, false);
renderer.domElement.style.imageRendering = PIXEL ? 'pixelated' : 'auto';
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const SKY_TOP = '#5d4f9c', SKY_MID = '#e0807f', SKY_LOW = '#ffc27c', SKY_BOT = '#ffe3a8';
scene.background = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, SKY_TOP); gr.addColorStop(0.42, SKY_MID); gr.addColorStop(0.78, SKY_LOW); gr.addColorStop(1, SKY_BOT);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256); return new THREE.CanvasTexture(c);
})();
scene.fog = new THREE.Fog(0xf0a888, 112, 190);

// orthographic isometric camera
let FW = 26;                       // visible world width
const sunSprites = [];             // [sprite, base scale], kept in the top-left of the view
const camTarget = new THREE.Vector3(0, 3.0, 0);
const cam = new THREE.OrthographicCamera(-FW / 2, FW / 2, FW / ASPECT / 2, -FW / ASPECT / 2, 1, 260);
const CAM_DIR = new THREE.Vector3(1, 1.0, 1).normalize();
function updateCam() {
  cam.left = -FW / 2; cam.right = FW / 2; cam.top = FW / ASPECT / 2; cam.bottom = -FW / ASPECT / 2; cam.updateProjectionMatrix();
  for (const sp of sunSprites) { sp[0].position.x = -FW * 0.4; sp[0].position.y = FW / ASPECT * 0.33; sp[0].scale.set(sp[1] * FW / 26, sp[1] * FW / 26, 1); }
  cam.position.copy(camTarget).addScaledVector(CAM_DIR, 90); cam.lookAt(camTarget);
  cam.updateMatrixWorld();
}
updateCam(); scene.add(cam);

// lights: warm golden sun, purple sky fill, cool rim
const hemi = new THREE.HemisphereLight(0xb7a3ff, 0x8c6a5c, 0.42); scene.add(hemi);
const SUN_OFF = new THREE.Vector3(-11, 10, 6);        // sun position relative to the camera target (daycycle.js moves it through the day)
const sun = new THREE.DirectionalLight(0xffc88a, 0.68);
sun.position.set(-11, 10, 6); sun.target.position.set(0, 0, 0);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);
const rim = new THREE.DirectionalLight(0x8e78ff, 0.16); rim.position.set(-8, 6, -12); scene.add(rim);

// sun disc glued to the camera view
(function () {
  const s = glowSprite(0xffd890, 11, 0.7); cam.add(s); s.position.set(-10.5, 5.3, -120); sunSprites.push([s, 14]);
  const d = glowSprite(0xfff2cc, 5, 1); cam.add(d); d.position.set(-10.5, 5.3, -119); sunSprites.push([d, 2.4]);
  updateCam();
})();
