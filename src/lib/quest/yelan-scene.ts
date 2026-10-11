import type { AnimationAction, BufferGeometry, Material, Mesh, Object3D, Skeleton, Texture } from "three";

export const YELAN_SOURCE = "https://wiki.hoyolab.com/pc/genshin/entry/2252?lang=zh-cn";
export interface YelanScene {
  rotate(degrees: number): void; zoom(factor: number): void; reset(): void;
  cast(): void; setPaused(paused: boolean): void; dispose(): void;
}

export async function mountYelanScene(
  canvas: HTMLCanvasElement, host: HTMLElement,
  callbacks: { ready(): void; failed(): void; cast(): void }, signal: AbortSignal,
): Promise<YelanScene | undefined> {
  if (signal.aborted) return;
  const [THREE, { GLTFLoader }] = await Promise.all([
    import("three"), import("three/addons/loaders/GLTFLoader.js"),
  ]);
  if (signal.aborted) return;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const target = new THREE.Vector3(0, 0.18, 0);
  const character = new THREE.Group(); scene.add(character);
  scene.add(new THREE.HemisphereLight(0xc9eaff, 0x536789, 2.1));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(2, 4, 5); scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x53bbff, 1.8);
  rimLight.position.set(-3, 1, -2); scene.add(rimLight);

  const dice = new THREE.Group();
  const cubeGeometry = new THREE.BoxGeometry(0.21, 0.21, 0.21);
  dice.add(new THREE.Mesh(cubeGeometry, new THREE.MeshStandardMaterial({
    color: 0x36b8ef, emissive: 0x12779e, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.87, roughness: 0.22, metalness: 0.15,
  })));
  dice.add(new THREE.LineSegments(new THREE.EdgesGeometry(cubeGeometry), new THREE.LineBasicMaterial({ color: 0x8cffff, transparent: true, opacity: 0.9 })));
  const pipGeometry = new THREE.SphereGeometry(0.017, 8, 6);
  const pipMaterial = new THREE.MeshBasicMaterial({ color: 0xe3ffff });
  const patterns = [
    [[0,0]], [[-1,-1],[1,1]], [[-1,-1],[0,0],[1,1]],
    [[-1,-1],[-1,1],[1,-1],[1,1]], [[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],
    [[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]],
  ];
  patterns.forEach((pattern, face) => pattern.forEach(([a,b]) => {
    const pip = new THREE.Mesh(pipGeometry, pipMaterial);
    const axis = Math.floor(face / 2), sign = face % 2 ? -1 : 1;
    pip.position.setComponent(axis, sign * 0.107);
    pip.position.setComponent((axis + 1) % 3, a * 0.049);
    pip.position.setComponent((axis + 2) % 3, b * 0.049);
    dice.add(pip);
  }));
  const diceOrigin = new THREE.Vector3(-0.78, 0.65, 0.45);
  dice.position.copy(diceOrigin); dice.rotation.set(0.35, 0.3, 0.25); scene.add(dice);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x54cbe9, transparent: true, opacity: 0.23, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.004, 6, 64), ringMaterial);
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.42; scene.add(ring);
  const particlesGeometry = new THREE.BufferGeometry();
  const particlesPositions = new Float32Array(36 * 3);
  for (let i = 0; i < 36; i++) {
    const angle = i * 2.39996;
    particlesPositions[i * 3] = Math.cos(angle) * (0.65 + (i % 4) * 0.11);
    particlesPositions[i * 3 + 1] = -1.1 + (i / 36) * 2.8;
    particlesPositions[i * 3 + 2] = Math.sin(angle) * 0.6;
  }
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlesPositions, 3));
  const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({ color: 0x73d9ff, size: 0.018, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(particles);

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const timer = new THREE.Timer(); timer.connect(document);
  let disposed = false, ready = false, visible = true, paused = false;
  let raf = 0, elapsed = 0, yaw = 0, distance = 5.6, lastRendered = 0;
  let tossAt: number | undefined;
  let model: Object3D | undefined;
  let mixer: InstanceType<typeof THREE.AnimationMixer> | undefined;
  let idle: AnimationAction | undefined, greeting: AnimationAction | undefined;
  const alive = () => !disposed && !signal.aborted;
  const canDraw = () => alive() && ready && visible && !document.hidden;
  const canAnimate = () => canDraw() && !paused && !media.matches;

  function release(root: Object3D) {
    const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>(), skeletons = new Set<Skeleton>();
    root.traverse(object => {
      const mesh = object as Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => {
        materials.add(material);
        Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
      });
      if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
    });
    textures.forEach(texture => {
      texture.dispose();
      const image = texture.source.data;
      if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
    });
    materials.forEach(material => material.dispose());
    geometries.forEach(geometry => geometry.dispose());
    skeletons.forEach(skeleton => skeleton.dispose());
  }
  function updateCamera() {
    camera.position.set(Math.sin(yaw) * distance, 0.28, Math.cos(yaw) * distance);
    camera.lookAt(target);
  }
  function draw() { if (canDraw()) renderer.render(scene, camera); }
  function cancelFrame() { cancelAnimationFrame(raf); raf = 0; }
  function frame(now: number) {
    raf = 0;
    if (!canAnimate()) return;
    if (now - lastRendered < 1000 / 30) { raf = requestAnimationFrame(frame); return; }
    lastRendered = now;
    timer.update(now);
    const delta = Math.min(timer.getDelta(), 0.05); elapsed += delta;
    mixer?.update(delta);
    character.rotation.y = Math.sin(elapsed * 0.55) * 0.028;
    dice.position.copy(diceOrigin);
    dice.position.y += Math.sin(elapsed * 1.7) * 0.045;
    dice.rotation.y = 0.3 + elapsed * 0.35;
    dice.rotation.z = 0.25 + Math.sin(elapsed * 0.9) * 0.12;
    if (tossAt !== undefined) {
      const progress = (elapsed - tossAt) / 1.5;
      if (progress >= 1) tossAt = undefined;
      else {
        dice.position.y += Math.sin(progress * Math.PI) * 0.55;
        dice.rotation.x = 0.35 + progress * Math.PI * 4;
        dice.rotation.z += progress * Math.PI * 2;
      }
    } else dice.rotation.x = 0.35;
    particles.rotation.y = elapsed * 0.035;
    particles.position.y = Math.sin(elapsed * 0.65) * 0.06;
    ringMaterial.opacity = 0.18 + Math.sin(elapsed * 1.2) * 0.06;
    draw(); raf = requestAnimationFrame(frame);
  }
  function syncAnimation() {
    cancelFrame(); timer.reset();
    if (canAnimate()) raf = requestAnimationFrame(frame); else draw();
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (width <= 0 || height <= 0 || disposed) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); draw();
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; syncAnimation(); }, { threshold: 0.05 });
  observer.observe(host);
  const resizer = new ResizeObserver(resize); resizer.observe(canvas);
  const visibilityChanged = () => syncAnimation();
  const motionChanged = () => { tossAt = undefined; syncAnimation(); };
  const contextLost = (event: Event) => { event.preventDefault(); ready = false; control.dispose(); callbacks.failed(); };
  document.addEventListener("visibilitychange", visibilityChanged);
  media.addEventListener("change", motionChanged);
  canvas.addEventListener("webglcontextlost", contextLost);
  const onGreetingFinished = () => {
    if (!alive() || !greeting || !idle) return;
    greeting.fadeOut(0.25); idle.reset().fadeIn(0.25).play();
  };
  const control: YelanScene = {
    rotate(degrees) { yaw += degrees * Math.PI / 180; updateCamera(); draw(); },
    zoom(factor) { distance = Math.max(3.8, Math.min(7.8, distance * factor)); updateCamera(); draw(); },
    reset() { yaw = 0; distance = 5.6; updateCamera(); draw(); },
    cast() {
      if (!ready || !alive()) return;
      callbacks.cast();
      if (paused || media.matches) return;
      tossAt = elapsed;
      if (greeting) {
        idle?.fadeOut(0.15);
        greeting.reset().setLoop(THREE.LoopOnce, 1); greeting.clampWhenFinished = true;
        greeting.fadeIn(0.15).play();
      }
    },
    setPaused(value) { paused = value; syncAnimation(); },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelFrame(); observer.disconnect(); resizer.disconnect(); timer.dispose();
      document.removeEventListener("visibilitychange", visibilityChanged);
      media.removeEventListener("change", motionChanged);
      canvas.removeEventListener("webglcontextlost", contextLost);
      mixer?.removeEventListener("finished", onGreetingFinished);
      mixer?.stopAllAction(); if (model) mixer?.uncacheRoot(model);
      if (model && !model.parent) release(model);
      release(scene); renderer.dispose(); renderer.forceContextLoss();
    },
  };
  signal.addEventListener("abort", () => control.dispose(), { once: true });
  try {
    // All assets remain behind this Site's owner-only access boundary.
    const response = await fetch("/models/yelan/yelan.glb", { signal });
    if (!response.ok) throw new Error("Character model unavailable");
    const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "/models/yelan/");
    if (!alive()) { release(gltf.scene); return; }
    model = gltf.scene; model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("Character bounds invalid");
    model.position.sub(center); character.scale.setScalar(2.8 / size.y); character.add(model);
    mixer = new THREE.AnimationMixer(model);
    const idleClip = gltf.animations.find(clip => /idle/i.test(clip.name));
    const greetingClip = gltf.animations.find(clip => /greet|wave|cast/i.test(clip.name));
    if (idleClip) { idle = mixer.clipAction(idleClip); idle.play(); mixer.update(0); }
    if (greetingClip) { greeting = mixer.clipAction(greetingClip); mixer.addEventListener("finished", onGreetingFinished); }
    updateCamera(); resize(); await renderer.compileAsync(scene, camera);
    if (!alive()) return;
    ready = true; draw(); callbacks.ready(); syncAnimation();
    return control;
  } catch (error) {
    if (alive()) { control.dispose(); callbacks.failed(); }
    if (signal.aborted) return;
    throw error;
  }
}
