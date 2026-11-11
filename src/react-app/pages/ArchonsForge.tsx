import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import './ArchonsForge.css';

type VectorInput = { x: number; y: number };
type Settings = { cameraDistance: number; cameraHeight: number; cameraAzimuth: number; cameraFov: number; speed: number; modelScale: number };
type CameraMode = 'follow' | 'free';
// The public R2 URL is intentionally embedded so GitHub builds need no Vite environment variable.
const MODEL = 'https://assets.discordiny.com/archons-forge/arena.glb';
const DEFAULTS: Settings = { cameraDistance: 20, cameraHeight: 23, cameraAzimuth: 0, cameraFov: 52, speed: 6, modelScale: 1 };
const UP = new THREE.Vector3(0, 1, 0);
const RAD = Math.PI / 180;

function Arena({ register, modelScale, onClick }: { register: (meshes: THREE.Mesh[], bounds: THREE.Box3) => void; modelScale: number; onClick: (event: ThreeEvent<MouseEvent>) => void }) {
  const gltf = useLoader(GLTFLoader, MODEL) as GLTF;
  const group = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = true;
        obj.frustumCulled = true;
      }
    });
    return root;
  }, [gltf.scene]);
  useEffect(() => {
    group.scale.setScalar(modelScale);
    group.updateMatrixWorld(true);
    const meshes: THREE.Mesh[] = [];
    group.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh && obj.visible) meshes.push(obj);
    });
    register(meshes, new THREE.Box3().setFromObject(group));
    return () => register([], new THREE.Box3());
  }, [group, modelScale, register]);
  return <primitive object={group} onClick={onClick} />;
}

function Player({ position, yaw }: { position: React.RefObject<THREE.Vector3>; yaw: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.copy(position.current);
      ref.current.rotation.y = yaw.current;
    }
  });
  return <group ref={ref}>
    <mesh position={[0, 0.85, 0]} castShadow><capsuleGeometry args={[0.33, 1.05, 4, 8]} /><meshStandardMaterial color="#c7cbd3" metalness={0.65} roughness={0.35} /></mesh>
    <mesh position={[0, 1.66, 0]} castShadow><sphereGeometry args={[0.3, 12, 8]} /><meshStandardMaterial color="#222c39" metalness={0.7} /></mesh>
    <mesh position={[0.28, 1.12, -0.3]}><boxGeometry args={[0.17, 0.15, 0.85]} /><meshStandardMaterial color="#dc443b" metalness={0.6} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}><ringGeometry args={[0.43, 0.52, 28]} /><meshBasicMaterial color="#f15b4e" side={THREE.DoubleSide} /></mesh>
  </group>;
}

function World({ keys, touch, settings, cameraMode, spawnRequest, cameraReset, onStatus }: {
  keys: React.RefObject<Set<string>>;
  touch: React.RefObject<VectorInput>;
  settings: Settings;
  cameraMode: CameraMode;
  spawnRequest: number;
  cameraReset: number;
  onStatus: (value: string) => void;
}) {
  const { camera, gl } = useThree();
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [bounds, setBounds] = useState<THREE.Box3 | null>(null);
  const [ready, setReady] = useState(false);
  const player = useRef(new THREE.Vector3());
  const yaw = useRef(0);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const freePosition = useRef(new THREE.Vector3());
  const freeYaw = useRef(0);
  const freePitch = useRef(-0.65);
  const followAzimuthOffset = useRef(0);
  const followPitchOffset = useRef(0);
  const zoomFactor = useRef(1);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const previousMode = useRef(cameraMode);

  const previousSpawnRequest = useRef(spawnRequest);
  const previousCameraReset = useRef(cameraReset);

  const register = useCallback((next: THREE.Mesh[], nextBounds: THREE.Box3) => {
    setMeshes(next);
    setBounds(next.length ? nextBounds : null);
    setReady(false);
  }, []);

  const surfaceAt = useCallback((x: number, z: number, referenceY: number, allowAnyHeight = false) => {
    if (!meshes.length || !bounds) return null;
    rayOrigin.set(x, allowAnyHeight ? bounds.max.y + 10 : Math.min(bounds.max.y + 10, referenceY + 1.6), z);
    ray.set(rayOrigin, new THREE.Vector3(0, -1, 0));
    ray.far = Math.max(30, bounds.max.y - bounds.min.y + 30);
    for (const hit of ray.intersectObjects(meshes, false)) {
      if (!hit.face) continue;
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (normal.dot(UP) < 0.68) continue;
      if (!allowAnyHeight && Math.abs(hit.point.y - referenceY) > 1.2) continue;
      return hit.point.clone();
    }
    return null;
  }, [meshes, bounds, ray, rayOrigin]);

  useEffect(() => {
    if (!bounds || !meshes.length) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const candidate = surfaceAt(center.x, center.z, center.y, true);
    player.current.copy(candidate ?? new THREE.Vector3(center.x, bounds.min.y, center.z));
    freePosition.current.copy(player.current).add(new THREE.Vector3(0, 15, 20));
    setReady(true);
    onStatus(candidate ? 'Arena ready. Drag to rotate camera; scroll to zoom. Press F for freecam.' : 'Arena loaded. Click a walkable floor to position your Guardian.');
  }, [bounds, meshes, onStatus, surfaceAt]);

  useEffect(() => {
    const canvas = gl.domElement;
    const down = (event: PointerEvent) => {
      if (document.pointerLockElement === canvas || (event.button !== 0 && event.button !== 2)) return;
      dragging.current = true;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!dragging.current || document.pointerLockElement === canvas) return;
      const dx = event.clientX - lastPointer.current.x;
      const dy = event.clientY - lastPointer.current.y;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      if (cameraMode === 'free') {
        freeYaw.current += dx * 0.005;
        freePitch.current = THREE.MathUtils.clamp(freePitch.current - dy * 0.005, -1.5, 1.5);
      } else {
        followAzimuthOffset.current -= dx * 0.005;
        followPitchOffset.current = THREE.MathUtils.clamp(followPitchOffset.current + dy * 0.005, -1.2, 1.2);
      }
    };
    const lockedMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas || cameraMode !== 'free') return;
      // Positive mouse X rotates the free camera right, matching inverted drag.
      freeYaw.current += event.movementX * 0.003;
      freePitch.current = THREE.MathUtils.clamp(freePitch.current - event.movementY * 0.003, -1.5, 1.5);
    };
    const lockChanged = () => { if (document.pointerLockElement !== canvas) dragging.current = false; };
    document.addEventListener('mousemove', lockedMove);
    document.addEventListener('pointerlockchange', lockChanged);
    const up = () => { dragging.current = false; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (cameraMode === 'follow') zoomFactor.current = THREE.MathUtils.clamp(zoomFactor.current * Math.exp(event.deltaY * 0.001), 0.15, 6);
      else {
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        freePosition.current.addScaledVector(direction, -event.deltaY * 0.035);
      }
    };
    const context = (event: MouseEvent) => event.preventDefault();
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('contextmenu', context);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('contextmenu', context);
      document.removeEventListener('mousemove', lockedMove);
      document.removeEventListener('pointerlockchange', lockChanged);
    };
  }, [gl, camera, cameraMode]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (previousMode.current !== cameraMode) {
      if (cameraMode === 'free') {
        freePosition.current.copy(camera.position);
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        freeYaw.current = Math.atan2(direction.x, -direction.z);
        freePitch.current = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
      }
      previousMode.current = cameraMode;
    }
    if (previousCameraReset.current !== cameraReset) {
      previousCameraReset.current = cameraReset;
      followAzimuthOffset.current = 0;
      followPitchOffset.current = 0;
      zoomFactor.current = 1;
      freeYaw.current = 0;
      freePitch.current = -0.65;
      freePosition.current.copy(player.current).add(new THREE.Vector3(0, 15, 20));
    }
    if (previousSpawnRequest.current !== spawnRequest) {
      previousSpawnRequest.current = spawnRequest;
      if (bounds) {
        const center = bounds.getCenter(new THREE.Vector3());
        const p = surfaceAt(center.x, center.z, center.y, true);
        if (p) player.current.copy(p);
      }
    }
    if (!ready) return;
    const pressed = keys.current;
    const inputX = (pressed.has('d') || pressed.has('arrowright') ? 1 : 0) - (pressed.has('a') || pressed.has('arrowleft') ? 1 : 0) + touch.current.x;
    const inputZ = (pressed.has('s') || pressed.has('arrowdown') ? 1 : 0) - (pressed.has('w') || pressed.has('arrowup') ? 1 : 0) - touch.current.y;
    const input = new THREE.Vector2(inputX, inputZ);
    if (input.lengthSq() > 1) input.normalize();
    const sprint = pressed.has('shift') ? 2.5 : 1;

    if (cameraMode === 'free') {
      const speed = settings.speed * 2 * sprint * dt;
      const forward = new THREE.Vector3(Math.sin(freeYaw.current), 0, -Math.cos(freeYaw.current));
      const right = new THREE.Vector3(Math.cos(freeYaw.current), 0, Math.sin(freeYaw.current));
      freePosition.current.addScaledVector(right, input.x * speed).addScaledVector(forward, -input.y * speed);
      freePosition.current.y += ((pressed.has('e') || pressed.has(' ') ? 1 : 0) - (pressed.has('q') || pressed.has('control') ? 1 : 0)) * speed;
      camera.position.copy(freePosition.current);
      const direction = new THREE.Vector3(Math.sin(freeYaw.current) * Math.cos(freePitch.current), Math.sin(freePitch.current), -Math.cos(freeYaw.current) * Math.cos(freePitch.current));
      camera.lookAt(desired.copy(camera.position).add(direction));
    } else {
      if (input.lengthSq() > 0.001) {
        const step = settings.speed * (pressed.has('shift') ? 1.6 : 1) * dt;
        const nextX = player.current.x + input.x * step;
        const nextZ = player.current.z + input.y * step;
        const next = surfaceAt(nextX, nextZ, player.current.y);
        if (next) {
          player.current.lerp(next, Math.min(1, dt * 18));
          yaw.current = Math.atan2(input.x, -input.y);
        } else {
          const alongX = surfaceAt(nextX, player.current.z, player.current.y);
          const alongZ = surfaceAt(player.current.x, nextZ, player.current.y);
          if (alongX) player.current.lerp(alongX, Math.min(1, dt * 18));
          else if (alongZ) player.current.lerp(alongZ, Math.min(1, dt * 18));
        }
      }
      const azimuth = settings.cameraAzimuth * RAD + followAzimuthOffset.current;
      const distance = settings.cameraDistance * zoomFactor.current;
      const height = (settings.cameraHeight + Math.tan(followPitchOffset.current) * distance) * zoomFactor.current;
      desired.set(player.current.x + Math.sin(azimuth) * distance, player.current.y + height, player.current.z + Math.cos(azimuth) * distance);
      camera.position.lerp(desired, Math.min(1, dt * 8));
      target.copy(player.current).add(new THREE.Vector3(0, 1, 0));
      camera.lookAt(target);
    }
    if (camera instanceof THREE.PerspectiveCamera && camera.fov !== settings.cameraFov) {
      camera.fov = settings.cameraFov;
      camera.updateProjectionMatrix();
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!ready || cameraMode === 'free') return;
    const p = surfaceAt(event.point.x, event.point.z, event.point.y);
    if (p) { player.current.copy(p); onStatus('Spawn moved to selected walkable surface.'); }
  };
  useEffect(() => { gl.setClearColor('#080a10'); }, [gl]);
  return <>
    <ambientLight intensity={2.1} />
    <hemisphereLight intensity={1.4} color="#b9c8ff" groundColor="#42201c" />
    <directionalLight position={[12, 28, 18]} intensity={2.3} />
    <Suspense fallback={null}><Arena register={register} modelScale={settings.modelScale} onClick={handleClick} /></Suspense>
    {ready && <Player position={player} yaw={yaw} />}
  </>;
}

function Joystick({ onMove }: { onMove: (v: VectorInput) => void }) {
  const pointer = useRef<number | null>(null);
  const update = (clientX: number, clientY: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const x = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = ((rect.top + rect.height / 2) - clientY) / (rect.height / 2);
    const length = Math.max(1, Math.hypot(x, y));
    onMove({ x: x / length, y: y / length });
  };
  return <div className="af-joystick" aria-label="Movement joystick" onPointerDown={(e) => { pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e.clientX, e.clientY, e.currentTarget); }} onPointerMove={(e) => { if (pointer.current === e.pointerId) update(e.clientX, e.clientY, e.currentTarget); }} onPointerUp={(e) => { if (pointer.current === e.pointerId) { pointer.current = null; onMove({ x: 0, y: 0 }); } }} onPointerCancel={() => { pointer.current = null; onMove({ x: 0, y: 0 }); }}><span>MOVE</span></div>;
}

export default function ArchonsForge() {
  const keys = useRef(new Set<string>());
  const touch = useRef<VectorInput>({ x: 0, y: 0 });
  const [settings, setSettings] = useState(DEFAULTS);
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');
  const [spawnRequest, setSpawnRequest] = useState(0);
  const [cameraReset, setCameraReset] = useState(0);
  const [status, setStatus] = useState('Downloading arena (approximately 60 MB). Please wait…');
  const [showCalibration, setShowCalibration] = useState(false);
  const [mouseLook, setMouseLook] = useState(false);
  const canvasArea = useRef<HTMLElement>(null);
  const toggleMouseLook = useCallback(() => {
    if (document.pointerLockElement) {
      void document.exitPointerLock();
      return;
    }
    if (cameraMode !== 'free') setCameraMode('free');
    const canvas = canvasArea.current?.querySelector('canvas');
    if (canvas) void canvas.requestPointerLock().catch(() => setMouseLook(false));
  }, [cameraMode]);
  useEffect(() => {
    const changed = () => setMouseLook(document.pointerLockElement !== null);
    document.addEventListener('pointerlockchange', changed);
    return () => document.removeEventListener('pointerlockchange', changed);
  }, []);
  useEffect(() => {
    if (cameraMode !== 'free' && document.pointerLockElement) void document.exitPointerLock();
  }, [cameraMode]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === 'f' && !e.repeat) setCameraMode(v => v === 'follow' ? 'free' : 'follow');
      if (key === 'c' && !e.repeat) {
        e.preventDefault();
        toggleMouseLook();
      }
      if (['w','a','s','d','q','e','arrowup','arrowdown','arrowleft','arrowright','shift','control',' '].includes(key)) {
        e.preventDefault();
        keys.current.add(key);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [toggleMouseLook]);
  const setInput = useCallback((v: VectorInput) => { touch.current = v; }, []);
  const setStatusStable = useCallback((s: string) => setStatus(s), []);
  return <main className="af-page">
    <header className="af-topbar"><a href="/events">← EVENTS</a><strong>OPERATION: CLEANSE <span>/ ARCHON'S FORGE</span></strong><div style={{ display: 'flex', gap: 8 }}><button onClick={() => setCameraMode(v => v === 'follow' ? 'free' : 'follow')}>{cameraMode === 'free' ? 'EXIT FREECAM (F)' : 'FREECAM (F)'}</button><button onClick={toggleMouseLook}>{mouseLook ? 'UNLOCK MOUSE (C)' : 'MOUSE LOOK (C)'}</button><button onClick={() => setShowCalibration(v => !v)}>CALIBRATE</button></div></header>
    <section className="af-viewport" ref={canvasArea}>
      <Canvas camera={{ fov: 52, near: 0.1, far: 5000, position: [0, 25, 20] }} dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}><World keys={keys} touch={touch} settings={settings} cameraMode={cameraMode} spawnRequest={spawnRequest} cameraReset={cameraReset} onStatus={setStatusStable} /></Suspense>
      </Canvas>
      <div className="af-vignette" style={{ pointerEvents: 'none' }} />
      <div className="af-mission" style={{ pointerEvents: 'none' }}><small>ARCHON'S FORGE // RECONNAISSANCE</small><h1>PERFECTION COMPLEX</h1><p>{cameraMode === 'free' ? 'FREECAM ACTIVE — Explore without moving your Guardian.' : 'Explore the full arena, stairs and raised platforms.'}</p></div>
      <div className="af-status" role="status" style={{ pointerEvents: 'none' }}>{status}</div>
      <div className="af-controls"><Joystick onMove={setInput} /><div className="af-hint">{cameraMode === 'free' ? <>FREECAM: WASD MOVE · Q/E UP/DOWN<br />DRAG TO LOOK · C MOUSE LOOK (ESC RELEASE)<br />SHIFT FAST · F RETURN TO GUARDIAN</> : <>WASD / ARROWS · SHIFT SPRINT<br />DRAG TO ORBIT · SCROLL TO ZOOM<br />F FREECAM · CLICK FLOOR TO REPOSITION</>}</div><button onClick={() => setCameraReset(v => v + 1)}>RESET CAMERA</button><button onClick={() => setSpawnRequest(v => v + 1)}>RESET SPAWN</button></div>
      {showCalibration && <aside className="af-calibration"><h2>CAMERA & ARENA CALIBRATION</h2>{([
        ['cameraDistance', 'Camera distance', 2, 120],
        ['cameraHeight', 'Camera elevation', 1, 120],
        ['cameraAzimuth', 'Camera rotation (degrees)', -180, 180],
        ['cameraFov', 'Field of view', 25, 100],
        ['speed', 'Movement speed', 1, 30],
        ['modelScale', 'Model scale', 0.05, 10]
      ] as const).map(([key, label, min, max]) => <label key={key}>{label}: {settings[key].toFixed(2)}<input type="range" min={min} max={max} step={key === 'modelScale' ? 0.05 : 1} value={settings[key]} onChange={e => setSettings(v => ({ ...v, [key]: Number(e.target.value) }))} /></label>)}<p>Drag in the arena to orbit or look around. Press C for mouse-look (pointer lock), Esc to release. In freecam, WASD moves the camera, not the Guardian. Changing model scale resets spawn.</p><button onClick={() => { setSettings(DEFAULTS); setCameraReset(v => v + 1); }}>RESET CAMERA SETTINGS</button></aside>}
    </section>
    <footer className="af-footer">PROTOTYPE // EXPLORATION ONLY · NO COMBAT OR REWARDS YET</footer>
  </main>;
}
