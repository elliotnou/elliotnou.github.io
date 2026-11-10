/*
  Marble bust
  -----------
  Renders bust.glb with three.js. The bust turns its head toward the pointer,
  can be dragged to spin, and drifts back to face you when left alone.

  bust.glb is a slimmed copy of the bust in model.glb (geometry plus 1K
  textures, about 1.4 MB). To use a different Blender model, export it as .glb
  and change MODEL below. Keep textures at 1K or 2K so the page stays fast.
*/
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL = 'bust.glb';
const REST_YAW = -0.3;      // radians. The pose it settles into.
const FOLLOW_YAW = 0.6;     // how far it turns to follow the pointer.
const FOLLOW_PITCH = 0.14;
const EASE = 0.06;          // 0..1. Lower = heavier, slower head.

const stage = document.querySelector('.bust-stage');
const figure = stage?.closest('.bust');

function init() {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 4 / 5, 0.1, 50);
  camera.position.set(0, 0, 5.4);

  // Soft studio light: a warm key from the upper left, a cool rim from behind.
  const key = new THREE.DirectionalLight(0xfff4e6, 3.2);
  key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 1.2);
  rim.position.set(4, 2, -4);
  scene.add(key, rim);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const state = { yaw: REST_YAW, pitch: 0, targetYaw: REST_YAW, targetPitch: 0, drag: 0, dragging: false, lastX: 0, spin: 0 };
  let visible = true;
  let loaded = false;

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function frame(t) {
    requestAnimationFrame(frame);
    if (!loaded || !visible || document.hidden) return;

    if (!state.dragging) {
      state.drag += state.spin;      // coast after release
      state.spin *= 0.94;
      state.drag *= 0.965;           // then drift back to rest
    }
    const sway = reduceMotion ? 0 : Math.sin(t * 0.0006) * 0.05;
    state.yaw += (state.targetYaw + sway - state.yaw) * EASE;
    state.pitch += (state.targetPitch - state.pitch) * EASE;

    pivot.rotation.y = state.yaw + state.drag;
    pivot.rotation.x = state.pitch;
    renderer.render(scene, camera);
  }

  new GLTFLoader().load(MODEL, (gltf) => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const holder = new THREE.Group();
    holder.add(model);
    holder.scale.setScalar(2.3 / Math.max(size.x, size.y, size.z));
    pivot.add(holder);

    model.traverse((o) => {
      if (o.isMesh) {
        o.material.envMapIntensity = 0.45;
        for (const k of ['map', 'normalMap', 'roughnessMap']) {
          if (o.material[k]) o.material[k].anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
      }
    });

    loaded = true;
    resize();
    stage.classList.add('ready');
  }, undefined, () => figure.classList.add('failed'));

  /* Pointer follow */
  if (!reduceMotion) {
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const ny = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      state.targetYaw = REST_YAW * 0.4 + THREE.MathUtils.clamp(nx * 2, -1, 1) * FOLLOW_YAW;
      state.targetPitch = THREE.MathUtils.clamp(ny * 2, -1, 1) * FOLLOW_PITCH;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { state.targetYaw = REST_YAW; state.targetPitch = 0; });
  }

  /* Drag to spin */
  stage.addEventListener('pointerdown', (e) => {
    state.dragging = true; state.lastX = e.clientX; state.spin = 0;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const dx = (e.clientX - state.lastX) * 0.012;
    state.lastX = e.clientX;
    state.drag += dx; state.spin = dx;
  });
  const release = () => { state.dragging = false; };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(stage);
  requestAnimationFrame(frame);
}

if (stage) {
  try { init(); }
  catch (err) { figure.classList.add('failed'); }
}
