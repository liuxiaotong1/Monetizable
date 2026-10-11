import type { AnimationAction, BufferGeometry, Material, Mesh, Object3D, Skeleton, Texture } from "three";

import { createYelanCastClip, YELAN_CAST_DURATION } from "./yelan-cast-motion";

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
  const [THREE, { GLTFLoader }, { OutlineEffect }] = await Promise.all([
    import("three"), import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/effects/OutlineEffect.js"),
  ]);
  if (signal.aborted) return;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const outline = new OutlineEffect(renderer, {
    defaultThickness: 0.0016,
    defaultColor: [0.055, 0.06, 0.13],
    defaultAlpha: 0.85,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 50);
  const target = new THREE.Vector3(0, 0.02, 0);
  const character = new THREE.Group(); scene.add(character);
  scene.add(new THREE.HemisphereLight(0xdbeaff, 0x403855, 0.7));
  const keyLight = new THREE.DirectionalLight(0xfff4e8, 1.7);
  keyLight.position.set(-3, 4, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.intensity = 0.65;
  keyLight.shadow.radius = 2;
  keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -2.5;
  keyLight.shadow.camera.right = keyLight.shadow.camera.top = 2.5;
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 12;
  keyLight.shadow.normalBias = 0.025;
  keyLight.shadow.bias = -0.0001;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x78d7ff, 1.6);
  rimLight.position.set(3, 2, -4); scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0xb1baff, 0.35);
  fillLight.position.set(3, 1, 4); scene.add(fillLight);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 5),
    new THREE.ShadowMaterial({ color: 0x080c1a, opacity: 0.2 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.415;
  floor.receiveShadow = true;
  scene.add(floor);
  const gradient = new THREE.DataTexture(new Uint8Array([100, 170, 220, 255]), 4, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;

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

  const trailGeometry = new THREE.BufferGeometry();
  const trailPositions = new Float32Array(32 * 3);
  const trailColors = new Float32Array(32 * 3);
  for (let i = 0; i < 32; i++) {
    const strength = (i / 31) ** 2;
    trailColors.set([0.15 * strength, 0.65 * strength, strength], i * 3);
  }
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
  const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  trail.frustumCulled = false;
  trail.visible = false;
  scene.add(trail);
  const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0x8ae5ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.012, 8, 64), pulseMaterial);
  pulse.rotation.x = Math.PI / 2;
  pulse.position.y = -0.65;
  pulse.visible = false;
  pulse.material.userData.outlineParameters = { visible: false };
  scene.add(pulse);

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const timer = new THREE.Timer(); timer.connect(document);
  let disposed = false, ready = false, visible = true, paused = false;
  let raf = 0, elapsed = 0, yaw = 0, distance = 6.0, lastRendered = 0;
  let tossAt: number | undefined;
  let model: Object3D | undefined;
  let hand: Object3D | undefined;
  const handPoint = new THREE.Vector3();
  const releasePoint = new THREE.Vector3();
  let released = false;
  const flight = new THREE.CubicBezierCurve3(releasePoint,
    new THREE.Vector3(0.82, 1.25, 0.7), new THREE.Vector3(0.86, 0.8, -0.3), diceOrigin.clone());
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
  function draw() { if (canDraw()) outline.render(scene, camera); }
  function cancelFrame() { cancelAnimationFrame(raf); raf = 0; }
  function frame(now: number) {
    raf = 0;
    if (!canAnimate()) return;
    if (now - lastRendered < 1000 / 60) { raf = requestAnimationFrame(frame); return; }
    lastRendered = now;
    timer.update(now);
    const delta = Math.min(timer.getDelta(), 0.05); elapsed += delta;
    mixer?.update(delta);
    character.rotation.set(0, Math.sin(elapsed * 0.55) * 0.028, 0);
    character.position.set(0, 0, 0);
    dice.scale.setScalar(1);
    dice.position.copy(diceOrigin);
    dice.position.y += Math.sin(elapsed * 1.7) * 0.045;
    dice.rotation.y = 0.3 + elapsed * 0.35;
    dice.rotation.z = 0.25 + Math.sin(elapsed * 0.9) * 0.12;
    if (tossAt !== undefined) {
      const progress = Math.min(1, (elapsed - tossAt) / YELAN_CAST_DURATION);
      const windup = Math.sin(Math.min(progress / 0.35, 1) * Math.PI / 2);
      const followThrough = Math.sin(Math.max(0, (progress - 0.35) / 0.65) * Math.PI);
      character.rotation.y += -0.16 * windup * (1 - progress) + 0.22 * followThrough;
      character.rotation.z = -0.025 * Math.sin(progress * Math.PI * 2);
      character.position.x = 0.045 * Math.sin(progress * Math.PI * 2);
      character.updateMatrixWorld(true);
      if (hand) {
        hand.getWorldPosition(handPoint);
        handPoint.add(new THREE.Vector3(0, 0.065, 0.045));
      } else handPoint.set(-0.4, 0.65, 0.35);
      if (progress < 0.35) {
        dice.position.copy(diceOrigin).lerp(handPoint, THREE.MathUtils.smoothstep(progress, 0, 0.2));
        dice.scale.setScalar(0.75);
      } else {
        if (!released) { releasePoint.copy(handPoint); released = true; }
        const throwProgress = THREE.MathUtils.smoothstep(progress, 0.35, 0.92);
        flight.getPoint(throwProgress, dice.position);
        dice.scale.setScalar(0.75 + 0.4 * Math.sin(throwProgress * Math.PI));
      }
      dice.rotation.set(0.35 + progress * Math.PI * 6, 0.3 + progress * Math.PI * 5, 0.25 + progress * Math.PI * 4);
      trail.visible = progress > 0.35 && progress < 0.94;
      trailPositions.copyWithin(0, 3);
      trailPositions.set(dice.position.toArray(), 29 * 3);
      // Repeat the newest point at the final two slots for a clean bright trail head.
      trailPositions.set(dice.position.toArray(), 30 * 3);
      trailPositions.set(dice.position.toArray(), 31 * 3);
      trailGeometry.attributes.position.needsUpdate = true;
      const burst = THREE.MathUtils.smoothstep(progress, 0.35, 0.5);
      pulse.visible = progress > 0.35 && progress < 0.86;
      pulse.scale.setScalar(0.5 + burst * 1.2);
      pulseMaterial.opacity = 0.38 * Math.sin(burst * Math.PI);
      particles.material.opacity = 0.55 + 0.35 * Math.sin(progress * Math.PI);
      if (progress >= 1) {
        tossAt = undefined;
        trail.visible = pulse.visible = false;
        particles.material.opacity = 0.55;
        character.rotation.z = 0;
        character.position.set(0, 0, 0);
        dice.scale.setScalar(1);
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
  const motionChanged = () => {
    tossAt = undefined;
    greeting?.stop();
    idle?.reset().setEffectiveWeight(1).play();
    mixer?.update(0);
    trail.visible = pulse.visible = false;
    particles.material.opacity = 0.55;
    character.rotation.set(0, 0, 0);
    character.position.set(0, 0, 0);
    dice.position.copy(diceOrigin); dice.scale.setScalar(1);
    syncAnimation();
  };
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
    reset() { yaw = 0; distance = 6.0; updateCamera(); draw(); },
    cast() {
      if (!ready || !alive() || tossAt !== undefined) return;
      callbacks.cast();
      if (paused || media.matches) return;
      tossAt = elapsed;
      released = false;
      for (let i = 0; i < 32; i++) trailPositions.set(dice.position.toArray(), i * 3);
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
      release(scene); gradient.dispose(); keyLight.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
  signal.addEventListener("abort", () => control.dispose(), { once: true });
  try {
    // Preserve the existing model and textures; apply lighting at runtime.
    const response = await fetch("/models/yelan/yelan.glb", { signal });
    if (!response.ok) throw new Error("Character model unavailable");
    const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), "/models/yelan/");
    if (!alive()) { release(gltf.scene); return; }
    model = gltf.scene; model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("Character bounds invalid");
    model.position.sub(center); character.scale.setScalar(2.8 / size.y); character.add(model);
    const replaced = new Set<Material>();
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      // Faces use a softer fill and no self-shadow to avoid harsh anime face artifacts.
      const upgrade = (source: Material) => {
        const original = source as InstanceType<typeof THREE.MeshBasicMaterial>;
        const facial = /颜|目|睫|眉|齿|口/.test(source.name);
        const skin = facial || /肌/.test(source.name);
        const material = new THREE.MeshToonMaterial({
          name: source.name,
          map: original.map,
          color: original.color,
          opacity: source.opacity,
          transparent: source.transparent,
          alphaTest: source.alphaTest,
          side: source.side,
          depthWrite: source.depthWrite,
          gradientMap: gradient,
          emissive: original.color,
          emissiveMap: original.map,
          emissiveIntensity: skin ? 0.08 : 0.025,
        });
        material.userData.outlineParameters = {
          visible: !facial && !source.transparent,
          thickness: 0.0016,
          color: [0.055, 0.06, 0.13],
        };
        if (original.map) original.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        if (!facial) {
          material.onBeforeCompile = shader => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
              float edgeLight = pow(1.0 - max(dot(normalize(normal), normalize(vViewPosition)), 0.0), 3.0);
              outgoingLight += vec3(0.07, 0.15, 0.22) * edgeLight;
              #include <opaque_fragment>
            `);
          };
          material.customProgramCacheKey = () => 'yelan-toon-rim-v1';
        }
        replaced.add(source);
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(upgrade) : upgrade(object.material);
    });
    replaced.forEach(material => material.dispose());
    // Outline only the character, never the ground or Hydro effects.
    scene.traverse(object => {
      if (object instanceof THREE.Mesh && !model!.getObjectById(object.id)) {
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          material.userData.outlineParameters = { visible: false };
      }
    });
    mixer = new THREE.AnimationMixer(model);
    const idleClip = gltf.animations.find(clip => /idle/i.test(clip.name));
    const greetingClip = createYelanCastClip(THREE, model);
    hand = model.getObjectByName("右中指１") || model.getObjectByName("右手首");
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
