import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import './ArchonsForge.css';

type VectorInput = { x: number; y: number };
type Settings = { cameraDistance: number; cameraHeight: number; speed: number; modelScale: number };
// Set this in your Cloudflare/Vite build environment to the public R2 object URL.
// Example: https://assets.discordiny.com/archons-forge/arena.glb
const MODEL = import.meta.env.VITE_ARCHONS_FORGE_ARENA_URL?.trim() || '';
const DEFAULTS: Settings = { cameraDistance: 15, cameraHeight: 19, speed: 6, modelScale: 1 };
const UP = new THREE.Vector3(0, 1, 0);

function Arena({ register, modelScale, onClick }: { register: (meshes: THREE.Mesh[], bounds: THREE.Box3) => void; modelScale: number; onClick: (event: ThreeEvent<MouseEvent>) => void }) {
  const gltf = useLoader(GLTFLoader, MODEL);
  const group = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.traverse((obj) => {
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
    group.traverse((obj) => { if (obj instanceof THREE.Mesh && obj.visible) meshes.push(obj); });
    register(meshes, new THREE.Box3().setFromObject(group));
    return () => register([], new THREE.Box3());
  }, [group, modelScale, register]);
  return <primitive object={group} onClick={onClick} />;
}

function Player({ position, yaw }: { position: React.RefObject<THREE.Vector3>; yaw: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) { ref.current.position.copy(position.current); ref.current.rotation.y = yaw.current; } });
  return <group ref={ref}>
    <mesh position={[0, 0.85, 0]} castShadow><capsuleGeometry args={[0.33, 1.05, 4, 8]} /><meshStandardMaterial color="#c7cbd3" metalness={0.65} roughness={0.35} /></mesh>
    <mesh position={[0, 1.66, 0]} castShadow><sphereGeometry args={[0.3, 12, 8]} /><meshStandardMaterial color="#222c39" metalness={0.7} /></mesh>
    <mesh position={[0.28, 1.12, -0.3]}><boxGeometry args={[0.17, 0.15, 0.85]} /><meshStandardMaterial color="#dc443b" metalness={0.6} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}><ringGeometry args={[0.43, 0.52, 28]} /><meshBasicMaterial color="#f15b4e" side={THREE.DoubleSide} /></mesh>
  </group>;
}

function World({ keys, touch, settings, spawnRequest, onStatus }: {
  keys: React.RefObject<Set<string>>; touch: React.RefObject<VectorInput>; settings: Settings;
  spawnRequest: number; onStatus: (value: string) => void;
}) {
  const { camera, gl } = useThree();
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  const [bounds, setBounds] = useState<THREE.Box3 | null>(null);
  const [ready, setReady] = useState(false);
  const player = useRef(new THREE.Vector3());
  const yaw = useRef(0);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const camDesired = useMemo(() => new THREE.Vector3(), []);
  const prevSpawnRequest = useRef(spawnRequest);
  const register = useCallback((next: THREE.Mesh[], nextBounds: THREE.Box3) => {
    setMeshes(next); setBounds(next.length ? nextBounds : null); setReady(false);
  }, []);
  const surfaceAt = useCallback((x: number, z: number, referenceY: number, allowAnyHeight = false) => {
    if (!meshes.length || !bounds) return null;
    // Find the nearest walkable horizontal surface; this includes stair treads and platforms.
    rayOrigin.set(x, allowAnyHeight ? bounds.max.y + 10 : Math.min(bounds.max.y + 10, referenceY + 1.6), z);
    ray.set(rayOrigin, new THREE.Vector3(0, -1, 0));
    ray.far = Math.max(30, bounds.max.y - bounds.min.y + 30);
    const hits = ray.intersectObjects(meshes, false);
    for (const hit of hits) {
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
    // Start on a walkable surface near the scene center; can be relocated by clicking a floor.
    const candidate = surfaceAt(center.x, center.z, center.y, true);
    player.current.copy(candidate ?? new THREE.Vector3(center.x, bounds.min.y, center.z));
    setReady(true);
    onStatus(candidate ? 'Arena ready. Click a floor or platform to set your spawn.' : 'No walkable center surface found. Click a floor to place your Guardian.');
  }, [bounds, meshes, onStatus, surfaceAt]);
  useEffect(() => {
    if (spawnRequest === prevSpawnRequest.current) return;
    prevSpawnRequest.current = spawnRequest;
    if (!bounds) return;
    const center = bounds.getCenter(new THREE.Vector3());
    const p = surfaceAt(center.x, center.z, center.y, true);
    if (p) player.current.copy(p);
  }, [spawnRequest, bounds, surfaceAt]);
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!ready || !bounds) return;
    const p = surfaceAt(event.point.x, event.point.z, event.point.y);
    if (p) { player.current.copy(p); onStatus('Spawn moved to selected walkable surface.'); }
    else onStatus('That spot is not a walkable surface. Try the floor or a stair tread.');
  };
  useFrame((_, delta) => {
    if (!ready) return;
    const dt = Math.min(delta, 0.05);
    const pressed = keys.current;
    const inputX = (pressed.has('d') || pressed.has('arrowright') ? 1 : 0) - (pressed.has('a') || pressed.has('arrowleft') ? 1 : 0) + touch.current.x;
    const inputZ = (pressed.has('s') || pressed.has('arrowdown') ? 1 : 0) - (pressed.has('w') || pressed.has('arrowup') ? 1 : 0) - touch.current.y;
    const input = new THREE.Vector2(inputX, inputZ);
    if (input.lengthSq() > 1) input.normalize();
    if (input.lengthSq() > 0.001) {
      const sprint = pressed.has('shift') ? 1.6 : 1;
      const step = settings.speed * sprint * dt;
      const nextX = player.current.x + input.x * step;
      const nextZ = player.current.z + input.y * step;
      // Walkable-surface sampling permits floor, stairs and raised platforms.
      // It intentionally prevents walking into voids or jumping onto surfaces >1.2 units high.
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
    camDesired.copy(player.current).add(new THREE.Vector3(0, settings.cameraHeight, settings.cameraDistance));
    camera.position.lerp(camDesired, Math.min(1, dt * 5));
    target.copy(player.current).add(new THREE.Vector3(0, 1, 0));
    camera.lookAt(target);
  });
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
  const [spawnRequest, setSpawnRequest] = useState(0);
  const [status, setStatus] = useState('Downloading arena (approximately 60 MB). Please wait…');
  const [showCalibration, setShowCalibration] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(e.key.toLowerCase())) { e.preventDefault(); keys.current.add(e.key.toLowerCase()); } };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  const setInput = useCallback((v: VectorInput) => { touch.current = v; }, []);
  const setStatusStable = useCallback((s: string) => setStatus(s), []);
  return <main className="af-page">
    <header className="af-topbar"><a href="/events">← EVENTS</a><strong>OPERATION: CLEANSE <span>/ ARCHON'S FORGE</span></strong><button onClick={() => setShowCalibration((v) => !v)}>CALIBRATE</button></header>
    <section className="af-viewport">
      {MODEL ? <Canvas camera={{ fov: 52, near: 0.1, far: 5000, position: [0, 25, 20] }} dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}><World keys={keys} touch={touch} settings={settings} spawnRequest={spawnRequest} onStatus={setStatusStable} /></Suspense>
      </Canvas> : <div role="alert" style={{padding: 32, color: "#ff8e7d"}}>R2 arena URL is not configured. Set VITE_ARCHONS_FORGE_ARENA_URL in your build environment and rebuild.</div>}
      <div className="af-vignette" />
      <div className="af-mission"><small>ARCHON'S FORGE // RECONNAISSANCE</small><h1>PERFECTION COMPLEX</h1><p>Explore the full arena, stairs and raised platforms.</p></div>
      <div className="af-status" role="status">{status}</div>
      <div className="af-controls"><Joystick onMove={setInput} /><div className="af-hint">WASD / ARROWS · SHIFT SPRINT<br />TOUCH: LEFT JOYSTICK<br />CLICK A WALKABLE SURFACE TO REPOSITION</div><button onClick={() => setSpawnRequest((v) => v + 1)}>RESET SPAWN</button></div>
      {showCalibration && <aside className="af-calibration"><h2>ARENA CALIBRATION</h2>{([['cameraDistance','Camera distance',5,70],['cameraHeight','Camera height',4,70],['speed','Movement speed',1,30],['modelScale','Model scale',0.05,10]] as const).map(([key,label,min,max]) => <label key={key}>{label}: {settings[key].toFixed(2)}<input type="range" min={min} max={max} step={key === 'modelScale' ? 0.05 : 0.5} value={settings[key]} onChange={(e) => setSettings((v) => ({ ...v, [key]: Number(e.target.value) }))} /></label>)}<p>Changing model scale resets your spawn. This prototype uses vertical surface raycasts, not authored collision meshes.</p><button onClick={() => setSettings(DEFAULTS)}>RESET SETTINGS</button></aside>}
    </section>
    <footer className="af-footer">PROTOTYPE // EXPLORATION ONLY · NO COMBAT OR REWARDS YET</footer>
  </main>;
}
