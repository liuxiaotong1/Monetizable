import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createArmGesture, createHandSocket } from './arm-gesture.js';
import { createDiceMaterial, DICE_PIP_COLOR } from './dice-material.js';

const canvas = document.getElementById('duo-canvas');
const locale = new URLSearchParams(location.search).get('locale') || 'en';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const send = (type, detail = {}) => parent.postMessage({ type, ...detail }, location.origin);
const smooth = value => T.MathUtils.smoothstep(value, 0, 1);
const labels = {
  zh: '点击星澜或查理玩骰子；左右键选择角色，回车掷骰',
  fr: 'Jouer aux dés avec Astra ou Charlie. Flèches pour choisir, Entrée pour lancer.',
  en: 'Play dice with Astra or Charlie. Arrow keys choose a hero; Enter rolls the dice.',
};
canvas.setAttribute('aria-label', labels[locale] || labels.en);

let renderer;
try {
  renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
} catch {
  send('hero-duo-error', { reason: 'webgl-unavailable' });
}

if (renderer) start();

function start() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  // One light pass for both heroes. Painted floor ellipses avoid shadow-map passes.
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-1, 1, 2, 0, .01, 20);
  camera.position.set(0, .91, 5);
  camera.lookAt(0, .91, 0);
  scene.add(new T.HemisphereLight(0xfffaf0, 0x8f9eac, 2));
  const key = new T.DirectionalLight(0xfff5e1, 2.7);
  key.position.set(-2, 4, 3);
  const fill = new T.DirectionalLight(0xbfdfff, 1.6);
  fill.position.set(3, 2, 1);
  scene.add(key, fill);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const cubeGeometry = new RoundedBoxGeometry(.085, .085, .085, 2, .007);
  const pipGeometry = new T.SphereGeometry(.0048, 8, 6);
  const gold = createDiceMaterial();
  const pipMaterial = new T.MeshStandardMaterial({ color: DICE_PIP_COLOR, roughness: .5 });
  const dots = [ [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [-1, 1], [1, -1], [1, 1]], [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]], [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]] ];

  function createDice() {
    const dice = new T.Group();
    dice.add(new T.Mesh(cubeGeometry, gold));
    const pips = new T.InstancedMesh(pipGeometry, pipMaterial, 21);
    const dot = new T.Object3D();
    let index = 0;
    dots.forEach((face, side) => face.forEach(([a, b]) => {
      dot.position.set(0, 0, 0);
      dot.position.setComponent(Math.floor(side / 2), (side % 2 ? 1 : -1) * .043);
      dot.position.setComponent((Math.floor(side / 2) + 1) % 3, a * .022);
      dot.position.setComponent((Math.floor(side / 2) + 2) % 3, b * .022);
      dot.updateMatrix();
      pips.setMatrixAt(index++, dot.matrix);
    }));
    dice.add(pips);
    dice.visible = false;
    scene.add(dice);
    return dice;
  }

  const characters = [
    { id: 'female', url: './female-landing-20261023.glb.gz', lane: -.16, turn: .055 },
    { id: 'supercharlie', url: './supercharlie-landing-20261023.glb.gz', lane: .16, turn: -.055 },
  ].map(spec => {
    const root = new T.Group();
    root.rotation.y = spec.turn;
    scene.add(root);
    const shadow = new T.Mesh(new T.CircleGeometry(.32, 40), new T.MeshBasicMaterial({ color: 0x75684c, transparent: true, opacity: .10, depthWrite: false }));
    shadow.scale.y = .13;
    shadow.position.set(0, .008, -.2);
    const ring = new T.Mesh(new T.RingGeometry(.32, .324, 64), new T.MeshBasicMaterial({ color: 0xb99a56, transparent: true, opacity: .3, depthWrite: false }));
    ring.scale.y = .17;
    ring.position.set(0, .008, -.21);
    scene.add(shadow, ring);
    return { ...spec, root, shadow, ring, dice: createDice(), model: null, rests: [], bones: {}, elapsed: 0, playing: false, releasePoint: null, shown: false };
  });

  let globalInView = true, localInView = true, failed = false, allReadySent = false;
  let frame = 0, lastFrame = 0, clock = 0, focused = 0;
  const visible = () => !document.hidden && globalInView && localInView && !failed;
  const wake = () => {
    if (!frame && visible() && characters.some(hero => hero.model)) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  const updateVisibility = () => {
    if (!visible() && frame) { cancelAnimationFrame(frame); frame = 0; }
    else wake();
  };

  function resize() {
    const width = canvas.clientWidth || 1, height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    const viewHeight = 2.18, viewWidth = viewHeight * width / height;
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
    characters.forEach(hero => {
      // Stable screen lanes: faces at 34% and 66%, crown at ~13%, feet at ~92%.
      hero.root.position.x = viewWidth * hero.lane;
      hero.shadow.position.x = hero.root.position.x;
      hero.ring.position.x = hero.root.position.x;
    });
    wake();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const observer = new IntersectionObserver(entries => {
    localInView = entries[0]?.isIntersecting ?? true;
    updateVisibility();
  });
  observer.observe(canvas);
  document.addEventListener('visibilitychange', updateVisibility);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    failed = true;
    updateVisibility();
    send('hero-duo-error', { reason: 'webgl-context-lost' });
  });

  const aliases = { pelvis: 'Hips', spine_01: 'Spine', spine_02: 'Spine1', spine_03: 'Spine2', head: 'Head', upperarm_r: 'RightArm', lowerarm_r: 'RightForeArm', hand_r: 'RightHand' };
  characters.forEach(hero => {
    loader.load(hero.url, gltf => {
      if (failed) return;
      const model = gltf.scene;
      model.traverse(node => { if (node.isSkinnedMesh) node.skeleton.pose(); });
      model.updateMatrixWorld(true);
      const box = new T.Box3().setFromObject(model);
      const center = box.getCenter(new T.Vector3());
      const scale = 1.7 / box.getSize(new T.Vector3()).y;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
      hero.root.add(model);
      model.traverse(node => {
        if (node.isBone) {
          hero.bones[aliases[node.name] || node.name.replace('mixamorig', '').replace(':', '')] = node;
          hero.rests.push([node, node.position.clone(), node.quaternion.clone()]);
        }
        if (node.isMesh) {
          node.frustumCulled = false;
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            material.roughness = material.name === 'CharlieNativeHead' ? .85 : .75;
            material.metalness = material.name === 'CharlieNativeHead' ? 0 : .08;
          }
        }
      });
      hero.model = model;
      hero.gesture = createArmGesture(model);
      hero.socket = createHandSocket(model);
      wake();
    }, undefined, () => {
      failed = true;
      updateVisibility();
      send('hero-duo-error', { hero: hero.id, reason: 'model-load' });
    });
  });

  const raycaster = new T.Raycaster();
  const pointer = new T.Vector2();
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    const hits = characters.filter(hero => hero.model).map(hero => ({ hero, hit: raycaster.intersectObjects([hero.model, hero.dice], true)[0] })).filter(item => item.hit);
    return hits.sort((a, b) => a.hit.distance - b.hit.distance)[0]?.hero;
  }
  function trigger(hero) {
    if (!hero?.model || hero.playing || failed) return;
    hero.playing = true;
    canvas.dataset.activeHero = hero.id;
    hero.elapsed = 0;
    hero.releasePoint = null;
    send('hero-duo-tap', { hero: hero.id });
    wake();
  }
  canvas.addEventListener('click', event => trigger(pick(event)));
  canvas.addEventListener('pointermove', event => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    canvas.style.cursor = x > .16 && x < .84 && y > .12 && y < .92 ? 'pointer' : 'default';
  }, { passive: true });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      focused = event.key === 'ArrowLeft' ? 0 : 1;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      trigger(characters[focused]);
    }
  });
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === 'hero-duo-visibility') {
      globalInView = event.data.visible === true;
      updateVisibility();
    } else if (event.data?.type === 'hero-duo-roll') {
      trigger(characters.find(hero => hero.id === event.data.hero));
    }
  });

  const turn = new T.Quaternion();
  const tilt = new T.Euler();
  function animate(hero, dt) {
    if (!hero.model) return;
    if (hero.playing) {
      hero.elapsed += dt;
      if (hero.elapsed >= 4.2) hero.playing = false;
    }
    for (const [bone, position, quaternion] of hero.rests) {
      bone.position.copy(position);
      bone.quaternion.copy(quaternion);
    }
    const t = hero.elapsed;
    const blend = hero.playing ? smooth(t / .7) * (1 - smooth((t - 3.3) / .9)) : 0;
    const breath = reducedMotion ? 0 : Math.sin(clock * 1.7 + hero.lane * 4);
    hero.root.position.y = breath * .0025;
    hero.root.rotation.y = hero.turn + (reducedMotion ? 0 : Math.sin(clock * .65 + hero.lane) * .015);
    if (hero.bones.Spine) {
      tilt.set(0, .025 * blend, breath * .005);
      hero.bones.Spine.quaternion.multiply(turn.setFromEuler(tilt));
    }
    if (hero.bones.Head) {
      tilt.set(-.07 * blend * Math.sin(Math.PI * T.MathUtils.clamp((t - 1.18) / 1.1, 0, 1)), -.08 * blend, .02 * blend);
      hero.bones.Head.quaternion.multiply(turn.setFromEuler(tilt));
    }
    hero.gesture({
      wind: blend * Math.sin(Math.PI * T.MathUtils.clamp(t / 1.4, 0, 1)),
      release: blend * smooth((t - 1.15) / .45) * (1 - smooth((t - 2.2) / .6)),
      catching: blend * Math.exp(-Math.pow((t - 2.3) / .2, 2)),
    });
    hero.root.updateMatrixWorld(true);
    const socket = hero.socket(.085);
    hero.dice.position.copy(socket.position);
    hero.dice.quaternion.copy(socket.quaternion);
    if (hero.playing && t > 1.18 && t < 2.28) {
      if (!hero.releasePoint) hero.releasePoint = socket.position.clone();
      const flight = (t - 1.18) / 1.1;
      hero.dice.position.copy(hero.releasePoint).lerp(socket.position, flight);
      hero.dice.position.y += 4 * .33 * flight * (1 - flight);
      hero.dice.position.z += Math.sin(flight * Math.PI) * .08;
      hero.dice.rotation.set(flight * Math.PI * 4, flight * Math.PI * 3, flight * Math.PI * 2);
    }
    hero.dice.visible = true;
    canvas.dataset[hero.id + 'Dice'] = hero.playing && t > 1.18 && t < 2.28 ? 'flight' : 'held';
  }

  function tick(now) {
    frame = 0;
    if (!visible()) return;
    if (now - lastFrame < 1000 / 30) { frame = requestAnimationFrame(tick); return; }
    const dt = Math.min((now - lastFrame) / 1000, .065);
    lastFrame = now;
    clock += dt;
    characters.forEach(hero => animate(hero, dt));
    try { renderer.render(scene, camera); }
    catch {
      failed = true;
      send('hero-duo-error', { reason: 'render' });
      return;
    }
    characters.forEach(hero => {
      if (hero.model && !hero.shown) {
        hero.shown = true;
        canvas.dataset[hero.id + 'Ready'] = 'true';
        send('hero-duo-character-ready', { hero: hero.id });
      }
    });
    if (!allReadySent && characters.every(hero => hero.shown)) {
      allReadySent = true;
      canvas.dataset.ready = 'true';
      send('hero-duo-ready');
    }
    if (!reducedMotion || characters.some(hero => hero.playing)) frame = requestAnimationFrame(tick);
  }
  send('hero-duo-mounted');
}
