import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, Layers } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { TEXTURE_MAP, CONSTRUCTION_SYSTEMS } from '../utils/config';

// Texture loader with cache
const loader = new THREE.TextureLoader();
const realTextureCache: Record<string, THREE.Texture | null> = {};

function loadRealTexture(textureId?: string): THREE.Texture | null {
  if (!textureId) return null;
  if (realTextureCache[textureId] !== undefined) return realTextureCache[textureId];
  
  const path = TEXTURE_MAP[textureId];
  if (!path || path.endsWith('.svg')) { realTextureCache[textureId] = null; return null; }
  
  const base = (import.meta as any).env?.BASE_URL || '/constructopro-v12/';
  const fullPath = path.startsWith('/') ? base.replace(/\/$/, '') + path : path;
  
  try {
    const tex = loader.load(fullPath);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.colorSpace = THREE.SRGBColorSpace;
    realTextureCache[textureId] = tex;
    return tex;
  } catch {
    realTextureCache[textureId] = null;
    return null;
  }
}

function generateFallbackTexture(type: string, color: string, textureId?: string): THREE.CanvasTexture {
  const size = 256;
  const cvs = document.createElement('canvas');
  cvs.width = size; cvs.height = size;
  const ctx = cvs.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);

  if (type === 'brick') {
    const bH = 24, bW = 64;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    for (let dy = 0; dy < size; dy += bH) {
      ctx.beginPath(); ctx.moveTo(0, dy); ctx.lineTo(size, dy); ctx.stroke();
      const off = (Math.floor(dy / bH) % 2) === 0 ? 0 : bW / 2;
      for (let dx = off; dx < size; dx += bW) {
        ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx, dy + bH); ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 800; i++) ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1 + Math.random() * 2);
  } else if (type === 'insulation') {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    for (let dy = 4; dy < size; dy += 10) {
      ctx.beginPath(); ctx.moveTo(0, dy);
      for (let dx = 0; dx < size; dx += 8) ctx.quadraticCurveTo(dx + 4, dy - 5, dx + 8, dy);
      ctx.stroke();
    }
  } else if (type === 'foam') {
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.5;
    for (let i = 0; i < 400; i++) { ctx.beginPath(); ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0, Math.PI * 2); ctx.stroke(); }
  } else if (type === 'waterproof') {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    for (let d = -size; d < size * 2; d += 6) { ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - size, size); ctx.stroke(); }
  } else if (type === 'plaster') {
    ctx.fillStyle = 'rgba(0,0,0,0.02)';
    for (let i = 0; i < 2000; i++) ctx.fillRect(Math.random() * size, Math.random() * size, 0.5, 0.5);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 1000; i++) ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }

  const tex = new THREE.CanvasTexture(cvs);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export const Viewport3D: React.FC = () => {
  const { layers, selectedId, hoveredId, setHoveredId, activeSystem } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let w = containerRef.current.clientWidth || 800;
    let h = containerRef.current.clientHeight || 500;
    const asp = w / h;
    const f = 130;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.OrthographicCamera(f * asp / -2, f * asp / 2, f / 2, f / -2, 0.1, 3000);
    camera.position.set(110, 80, 110);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.id = 'canvas3D-webgl';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.zIndex = '1';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xddeeff, 1.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(50, 100, 70);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.6);
    fillLight.position.set(-40, 30, -50);
    scene.add(fillLight);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const nw = containerRef.current.clientWidth;
      const nh = containerRef.current.clientHeight;
      if (!nw || !nh) return;
      const nAsp = nw / nh;
      cameraRef.current.left = f * nAsp / -2;
      cameraRef.current.right = f * nAsp / 2;
      cameraRef.current.top = f / 2;
      cameraRef.current.bottom = f / -2;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(nw, nh);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    let animId: number;
    const loop = () => {
      animId = requestAnimationFrame(loop);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    loop();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animId);
      if (rendererRef.current?.domElement?.parentNode === containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;

    const dispose = (obj: any) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m: any) => { if (m.map) m.map.dispose(); m.dispose(); });
        else { if (obj.material.map) obj.material.map.dispose(); obj.material.dispose(); }
      }
    };
    while (group.children.length > 0) {
      const child = group.children[0];
      child.traverse(dispose);
      group.remove(child);
    }
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);

    if (layers.length === 0) return;

    const BLOCK_W = 55;
    const BLOCK_H = 55;
    const LAYER_GAP = 2.5;
    const THICKNESS_SCALE = 0.12;

    const thicknessOf = (l: any): number => {
      const raw = parseInt(l.EspesorRaw);
      return Math.max((isNaN(raw) ? 10 : raw) * THICKNESS_SCALE, 1.5);
    };

    const totalDepth = layers.reduce((sum, l) => sum + thicknessOf(l), 0) + (layers.length - 1) * LAYER_GAP;
    let currentZ = totalDepth / 2;

    layers.forEach((l, i) => {
      const d = thicknessOf(l);
      currentZ -= d / 2;

      const isTargeted = hoveredId ? hoveredId === l.instanceId : selectedId === l.instanceId;
      const isFaded = !!(hoveredId || selectedId) && !isTargeted;

      const geo = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, d);
      
      // Try to load photorealistic texture first, fall back to procedural
      let texture: THREE.Texture;
      const realTex = loadRealTexture(l.textureId);
      if (realTex) {
        texture = realTex.clone();
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        // v15: Block is 55x55 units ≈ 0.55m, texture = 1m². Repeat = 0.55
        const repeatFactor = BLOCK_W / 100;
        texture.repeat.set(repeatFactor, repeatFactor);
      } else {
        texture = generateFallbackTexture(l.textureClass, l.color, l.textureId);
      }
      
      const isInsulation = l.type === 'Aislante Térmico';
      const isWaterproof = l.type === 'Barrera de Agua';
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        color: realTex ? 0xffffff : l.color,
        transparent: isFaded,
        opacity: isFaded ? 0.15 : 1.0,
        emissive: isTargeted ? new THREE.Color(l.color) : new THREE.Color(0x000000),
        emissiveIntensity: isTargeted ? 0.3 : 0,
        depthWrite: !isFaded,
        roughness: isInsulation ? 0.95 : (isWaterproof ? 0.4 : 0.7),
        metalness: l.textureId === 'aluminio' || l.textureId === 'composite-alu' ? 0.6 : 0.0,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, BLOCK_H / 2, currentZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edgeMat = new THREE.LineBasicMaterial({ color: isFaded ? 0x333333 : 0x1a1a1a, transparent: isFaded, opacity: isFaded ? 0.1 : 1.0 });
      mesh.add(new THREE.LineSegments(edgeGeo, edgeMat));

      group.add(mesh);
      currentZ -= d / 2 + LAYER_GAP;
    });

    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const sysConfig = CONSTRUCTION_SYSTEMS[activeSystem];
      const isHorizontal = sysConfig?.orientation === 'horizontal';

      if (isHorizontal) {
        // Rotamos para que quede horizontal sobre el plano, EXT arriba
        group.rotation.x = -Math.PI / 2;
        group.rotation.z = Math.PI / 8;
        group.position.set(-center.x, -center.y, -center.z);
      } else {
        group.position.set(-center.x, -center.y, -center.z);
        group.rotation.y = Math.PI / 10;
      }
    }
  }, [layers, hoveredId, selectedId, activeSystem]);

  // Method to force render for PDF capture
  (window as any).__force3DRender = () => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  };

  return (
    <div className="h-[50%] relative flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #0c1524 0%, #060b14 50%, #030508 100%)' }}>
      
      <div className="absolute top-2 right-2 z-10 pointer-events-none">
        <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-emerald-500/20 flex items-center backdrop-blur-sm">
          <Box className="w-3 h-3 mr-1" /> ISOMÉTRICA 3D
        </span>
      </div>

      {/* EXT / INT labels */}
      {layers.length > 0 && (() => {
        const isHoriz = CONSTRUCTION_SYSTEMS[activeSystem]?.orientation === 'horizontal';
        return (
          <>
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="bg-blue-500/15 text-blue-400 text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-blue-500/20 backdrop-blur-sm">
                {isHoriz ? '↑ EXT / SUP' : '← EXT'}
              </span>
            </div>
            <div className="absolute bottom-[60px] left-2 z-10 pointer-events-none">
              <span className="bg-purple-500/15 text-purple-400 text-[8px] px-2 py-0.5 rounded font-bold uppercase tracking-widest border border-purple-500/20 backdrop-blur-sm">
                {isHoriz ? '↓ INT / INF' : 'INT →'}
              </span>
            </div>
          </>
        );
      })()}

      {/* Enhanced legend */}
      {layers.length > 0 && (
        <div className="absolute bottom-2 right-2 z-10 bg-slate-900/85 backdrop-blur-md px-3 py-2.5 rounded-lg border border-slate-700/40 shadow-lg max-w-[240px]">
          <div className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Leyenda 3D — EXT→INT</div>
          <div className="flex flex-col gap-1">
            {layers.map((l, i) => (
              <div 
                key={l.instanceId}
                onMouseEnter={() => setHoveredId(l.instanceId)}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex items-center gap-2 text-[8px] px-1.5 py-1 rounded cursor-pointer transition-all ${
                  l.instanceId === hoveredId ? 'bg-orange-500/15 text-orange-300' : 'text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                {/* Show real texture thumbnail in legend */}
                {(l as any).image && !(l as any).image.endsWith('.svg') ? (
                  <img src={(() => {
                    const base = (import.meta as any).env?.BASE_URL || '/constructopro-v12/';
                    const imgPath = (l as any).image as string;
                    return imgPath.startsWith('/') ? base.replace(/\/$/, '') + imgPath : imgPath;
                  })()} className="w-2.5 h-2.5 rounded-sm object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-white/10" style={{ backgroundColor: l.color }} />
                )}
                <span className="truncate font-semibold flex-1">{l.Nombre}</span>
                <span className="text-[7px] font-mono text-slate-500 shrink-0">{parseInt(l.EspesorRaw) || l.EspesorVirtualMM}mm</span>
                <span className="text-[7px] font-bold shrink-0" style={{ color: i === 0 ? '#60a5fa' : i === layers.length - 1 ? '#a78bfa' : '#475569' }}>
                  {i === 0 ? 'EXT' : i === layers.length - 1 ? 'INT' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-move" id="canvas3D-container" />
      
      {layers.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center p-6 border border-slate-700/30 rounded-xl bg-slate-800/40 backdrop-blur-md shadow-xl max-w-xs">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
              <Layers className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-200 mb-1">Configurador 3D</h2>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Añade materiales desde el catálogo lateral para visualizar el detalle constructivo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
