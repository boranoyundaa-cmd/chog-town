// character inspection scene: a row of Chogs facing the camera
const world = new THREE.Group(); scene.add(world);
scene.add(M(new THREE.CylinderGeometry(6, 6, 0.3, 28), tmat(0xffffff, { tex: TEX.grass, em: 0.15 }), 0, -0.15, 0));
const variants = [
  { hair: 0x5b35b0, outfit: 'vest', head: 'straw' },
  { hair: 0xe0283a, suit: 0x5a32b0, outfit: 'tunic', head: 'crown', scarf: true },
  { hair: 0xf4c82c, outfit: 'vest', vest: 0x5a9ad6 },
  { hair: 0xff4a98, outfit: 'jacket', head: 'headset', trim: 0x60e0f0 },
  { hair: 0x5b35b0 },
];
const row = [];
variants.forEach((v, i) => {
  const c = chog(Object.assign({ scale: 1.15 }, v)); const k = (i - 2) * 1.45, r = Math.SQRT1_2;
  c.position.set(k * r, 0, -k * r); c.rotation.y = Math.PI / 4; world.add(c); row.push(c);
});
// pose variety: one waving, one arms-out, one walking mid-stride
row[2].userData.arms[1].rotation.z = 2.7;
row[3].userData.arms[0].rotation.z = -1.1; row[3].userData.arms[1].rotation.z = 1.1;
row[4].userData.legs[0].rotation.x = 0.6; row[4].userData.legs[1].rotation.x = -0.6; row[4].userData.arms[0].rotation.x = -0.6; row[4].userData.arms[1].rotation.x = 0.6;
scene.traverse(o => { if (o.userData && (o.userData.isHull || o.userData.noNormal)) hiddenInNormal.push(o); });
FW = 8.2; camTarget.set(0, 1.35, 0); updateCam();
