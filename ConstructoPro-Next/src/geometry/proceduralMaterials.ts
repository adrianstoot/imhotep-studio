import * as THREE from 'three';
import type { GeometryKind, ProductDefinition } from '../domain/types';

type TextureChannel = 'albedo' | 'normal' | 'roughness';

function seededNoise(seed: number): () => number {
  let value = seed || 1;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function seedFromString(value: string): number {
  return [...value].reduce((seed, character) => ((seed << 5) - seed + character.charCodeAt(0)) | 0, 2166136261) >>> 0;
}

function hash2d(x: number, y: number, seed: number): number {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 69069);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value);
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const a = hash2d(x0, y0, seed);
  const b = hash2d(x0 + 1, y0, seed);
  const c = hash2d(x0, y0 + 1, seed);
  const d = hash2d(x0 + 1, y0 + 1, seed);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}

function fbm(x: number, y: number, seed: number): number {
  return (
    valueNoise(x / 54, y / 54, seed) * 0.52
    + valueNoise(x / 23, y / 23, seed + 17) * 0.28
    + valueNoise(x / 8, y / 8, seed + 41) * 0.14
    + valueNoise(x / 2.5, y / 2.5, seed + 79) * 0.06
  );
}

function textureScale(kind: GeometryKind): [number, number] {
  switch (kind) {
    case 'masonry': return [1.8, 1.8];
    case 'insulation': return [2.6, 2.6];
    case 'solid': return [2.2, 2.2];
    case 'finish': return [2.8, 2.8];
    case 'paver': return [1.05, 1.05];
    case 'roof-tile': return [1.15, 1.15];
    case 'cladding': return [1.05, 1.05];
    case 'board': return [1.15, 1.15];
    default: return [1.6, 1.6];
  }
}

function albedoVariation(kind: GeometryKind): number {
  switch (kind) {
    case 'insulation': return 0.115;
    case 'masonry': return 0.09;
    case 'solid': return 0.075;
    case 'finish': return 0.055;
    case 'roof-tile': return 0.075;
    case 'paver': return 0.05;
    case 'board': return 0.12;
    case 'membrane': return 0.07;
    case 'cladding': return 0.038;
    default: return 0.04;
  }
}

function isFoamInsulation(product: ProductDefinition): boolean {
  const identity = `${product.id} ${product.name} ${product.manufacturer}`.toLocaleLowerCase('es');
  return identity.includes('danopren') || identity.includes('xps') || identity.includes('poliestireno');
}

function surfaceHeight(product: ProductDefinition, x: number, y: number, seed: number): number {
  const base = fbm(x, y, seed);
  switch (product.geometryKind) {
    case 'board': {
      const warp = valueNoise(x / 42, y / 42, seed + 101) * 12;
      const grain = Math.sin((x + warp) * 0.17) * 0.08 + Math.sin((x + warp) * 0.047) * 0.06;
      return THREE.MathUtils.clamp(base * 0.72 + 0.14 + grain, 0, 1);
    }
    case 'insulation': {
      if (isFoamInsulation(product)) {
        const extrusion = Math.sin(y * 0.09) * 0.012;
        return THREE.MathUtils.clamp(base * 0.36 + 0.32 + extrusion, 0, 1);
      }
      const fibres = Math.sin(x * 0.33 + Math.sin(y * 0.075) * 2.5) * 0.055;
      return THREE.MathUtils.clamp(base * 0.76 + 0.12 + fibres, 0, 1);
    }
    case 'cladding': {
      const fibre = Math.sin(x * 0.24 + Math.sin(y * 0.035)) * 0.018;
      return THREE.MathUtils.clamp(base * 0.34 + 0.33 + fibre, 0, 1);
    }
    case 'membrane': {
      const granule = hash2d(x, y, seed + 213) > 0.78 ? 0.16 : 0;
      return THREE.MathUtils.clamp(base * 0.7 + 0.14 + granule, 0, 1);
    }
    case 'paver': {
      const vein = Math.sin(x * 0.026 + Math.sin(y * 0.018) * 2.2) * 0.045;
      return THREE.MathUtils.clamp(base * 0.62 + 0.19 + vein, 0, 1);
    }
    case 'roof-tile': {
      const clay = valueNoise(x / 4.5, y / 4.5, seed + 301) * 0.1;
      return THREE.MathUtils.clamp(base * 0.72 + clay + 0.08, 0, 1);
    }
    default:
      return base;
  }
}

function decorateAlbedo(
  context: CanvasRenderingContext2D,
  product: ProductDefinition,
  size: number,
  random: () => number,
): void {
  context.save();
  if (product.geometryKind === 'insulation') {
    if (isFoamInsulation(product)) {
      context.globalAlpha = 0.16;
      for (let index = 0; index < 44; index += 1) {
        const y = random() * size;
        context.strokeStyle = random() > 0.5 ? '#e8fbff' : '#2d889b';
        context.lineWidth = 0.3 + random() * 0.45;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(size, y + (random() - 0.5) * 2);
        context.stroke();
      }
    } else {
      context.globalAlpha = 0.34;
      context.lineWidth = 0.4;
      for (let index = 0; index < 390; index += 1) {
        const y = random() * size;
        context.strokeStyle = random() > 0.56 ? '#fff1ae' : random() > 0.45 ? '#75602c' : '#3e3523';
        context.beginPath();
        context.moveTo(-8, y);
        context.bezierCurveTo(size * 0.3, y + (random() - 0.5) * 13, size * 0.72, y + (random() - 0.5) * 16, size + 8, y + (random() - 0.5) * 11);
        context.stroke();
      }
    }
  }
  if (product.geometryKind === 'board') {
    context.globalAlpha = 0.22;
    for (let index = 0; index < 72; index += 1) {
      const x = random() * size;
      context.strokeStyle = random() > 0.48 ? '#4e2d1b' : '#f4c981';
      context.lineWidth = 0.45 + random() * 0.75;
      context.beginPath();
      context.moveTo(x, -8);
      context.bezierCurveTo(x + (random() - 0.5) * 15, size * 0.3, x + (random() - 0.5) * 21, size * 0.7, x + (random() - 0.5) * 12, size + 8);
      context.stroke();
    }
    for (let index = 0; index < 8; index += 1) {
      context.strokeStyle = '#56331f';
      context.lineWidth = 0.9;
      context.beginPath();
      context.ellipse(random() * size, random() * size, 2 + random() * 6, 0.8 + random() * 2, random() * Math.PI, 0, Math.PI * 2);
      context.stroke();
    }
  }
  if (product.geometryKind === 'paver') {
    context.globalAlpha = 0.13;
    for (let index = 0; index < 24; index += 1) {
      const y = random() * size;
      context.strokeStyle = random() > 0.5 ? '#faf7ee' : '#625e58';
      context.lineWidth = 0.45 + random() * 1.2;
      context.beginPath();
      context.moveTo(-12, y);
      context.bezierCurveTo(size * 0.3, y + (random() - 0.5) * 38, size * 0.68, y + (random() - 0.5) * 46, size + 12, y + (random() - 0.5) * 28);
      context.stroke();
    }
  }
  if (product.geometryKind === 'masonry' || product.geometryKind === 'solid' || product.geometryKind === 'finish') {
    const porous = product.geometryKind !== 'finish' || product.name.toLocaleLowerCase('es').includes('mortero');
    const count = porous ? 260 : 130;
    for (let index = 0; index < count; index += 1) {
      context.globalAlpha = 0.035 + random() * 0.1;
      context.fillStyle = random() > 0.54 ? '#fffdf5' : '#241f1b';
      context.beginPath();
      context.arc(random() * size, random() * size, 0.25 + random() * 1.15, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (product.geometryKind === 'roof-tile') {
    for (let index = 0; index < 95; index += 1) {
      context.globalAlpha = 0.018 + random() * 0.06;
      context.fillStyle = random() > 0.5 ? '#f0b278' : '#2b2523';
      context.beginPath();
      context.arc(random() * size, random() * size, 0.7 + random() * 4.2, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (product.geometryKind === 'membrane') {
    for (let index = 0; index < 680; index += 1) {
      const value = 55 + Math.round(random() * 115);
      context.globalAlpha = 0.1 + random() * 0.23;
      context.fillStyle = `rgb(${value},${value},${value})`;
      const radius = 0.25 + random() * 0.95;
      context.fillRect(random() * size, random() * size, radius, radius);
    }
  }
  if (product.geometryKind === 'cladding') {
    context.globalAlpha = 0.095;
    for (let index = 0; index < 92; index += 1) {
      const x = random() * size;
      context.strokeStyle = random() > 0.5 ? '#eff1ec' : '#343a37';
      context.lineWidth = 0.25 + random() * 0.55;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + (random() - 0.5) * 5, size);
      context.stroke();
    }
  }
  context.restore();
}

function makeTexture(product: ProductDefinition, channel: TextureChannel): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { alpha: false })!;
  const seed = seedFromString(product.id);
  const base = new THREE.Color(product.color).convertLinearToSRGB();
  const variation = product.geometryKind === 'insulation' && !isFoamInsulation(product)
    ? 0.17
    : albedoVariation(product.geometryKind);
  const image = context.createImageData(size, size);
  const heights = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) heights[y * size + x] = surfaceHeight(product, x, y, seed);
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = y * size + x;
      const index = offset * 4;
      const height = heights[offset];
      if (channel === 'albedo') {
        const shade = 1 + (height - 0.5) * variation;
        const warm = (height - 0.5) * (product.geometryKind === 'masonry' || product.geometryKind === 'board' ? 0.018 : 0);
        image.data[index] = THREE.MathUtils.clamp(Math.round((base.r * shade + warm) * 255), 0, 255);
        image.data[index + 1] = THREE.MathUtils.clamp(Math.round((base.g * shade + warm * 0.38) * 255), 0, 255);
        image.data[index + 2] = THREE.MathUtils.clamp(Math.round((base.b * shade - warm * 0.22) * 255), 0, 255);
      } else if (channel === 'normal') {
        const left = heights[y * size + Math.max(0, x - 1)];
        const right = heights[y * size + Math.min(size - 1, x + 1)];
        const up = heights[Math.max(0, y - 1) * size + x];
        const down = heights[Math.min(size - 1, y + 1) * size + x];
        const normal = new THREE.Vector3((left - right) * 3.2, (up - down) * 3.2, 1).normalize();
        image.data[index] = Math.round((normal.x * 0.5 + 0.5) * 255);
        image.data[index + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
        image.data[index + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      } else {
        const materialRoughness = THREE.MathUtils.clamp(product.roughness + (height - 0.5) * 0.13, 0.22, 0.99);
        const value = Math.round(materialRoughness * 255);
        image.data[index] = value;
        image.data[index + 1] = value;
        image.data[index + 2] = value;
      }
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  if (channel === 'albedo') decorateAlbedo(context, product, size, seededNoise(seed + 907));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = channel === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const [repeatX, repeatY] = textureScale(product.geometryKind);
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 12;
  return texture;
}

function isManufacturedSmooth(kind: GeometryKind): boolean {
  return ['profile', 'bracket', 'fastener', 'window', 'glass', 'drain', 'coping'].includes(kind);
}

function photographicAlbedo(product: ProductDefinition): THREE.Texture | null {
  const path = product.geometryKind === 'insulation' && !isFoamInsulation(product)
    ? '/materials/lana_roca_real.png'
    : product.geometryKind === 'solid' && /hormig[oó]n/i.test(product.name)
      ? '/materials/hormigon_real.png' : null;
  if (!path) return null;
  const texture = new THREE.TextureLoader().load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...(product.geometryKind === 'insulation' ? [6, 3] : [3.2, 1.2]) as [number, number]);
  texture.anisotropy = 8;
  return texture;
}

export function createPbrMaterial(product: ProductDefinition, options: { ghost?: boolean; cut?: boolean } = {}): THREE.MeshPhysicalMaterial {
  const glass = product.geometryKind === 'glass';
  const membrane = product.geometryKind === 'membrane';
  const ghost = options.ghost ?? false;
  const textured = !glass && !ghost && !isManufacturedSmooth(product.geometryKind);
  const normalStrength = (() => {
    switch (product.geometryKind) {
      case 'cladding': return 0.34;
      case 'membrane': return 0.12;
      case 'solid': return 0.28;
      case 'finish': return 0.24;
      case 'masonry': return 0.4;
      case 'insulation': return 0.25;
      case 'board': return 0.58;
      case 'paver': return 0.44;
      case 'roof-tile': return 0.54;
      default: return 0.24;
    }
  })();
  const material = new THREE.MeshPhysicalMaterial({
    color: textured ? (options.cut ? '#d7d7d7' : '#ffffff') : product.color,
    map: textured ? photographicAlbedo(product) ?? makeTexture(product, 'albedo') : null,
    normalMap: textured ? makeTexture(product, 'normal') : null,
    normalScale: new THREE.Vector2(normalStrength, normalStrength),
    roughness: textured ? 1 : ghost ? 0.25 : product.roughness,
    roughnessMap: textured ? makeTexture(product, 'roughness') : null,
    metalness: product.metalness,
    transparent: glass || ghost,
    opacity: ghost ? 0.34 : glass ? 0.24 : 1,
    // Flat architectural glazing needs transparency and reflection. Refraction
    // of two merged, closely spaced panes introduced cloudy offscreen artefacts.
    transmission: 0,
    thickness: glass ? 0.012 : 0,
    ior: glass ? 1.52 : 1.5,
    side: membrane ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite: !glass && !ghost,
  });
  if (glass) {
    material.color.set('#d3e5e8');
    material.roughness = 0.08;
    material.metalness = 0;
    material.envMapIntensity = 0.75;
    material.attenuationColor.set('#dff7fb');
    material.attenuationDistance = 1.8;
    material.specularIntensity = 1;
  }
  if (product.geometryKind === 'roof-tile') {
    material.clearcoat = 0.055;
    material.clearcoatRoughness = 0.72;
  }
  if (product.geometryKind === 'paver') {
    material.clearcoat = 0.045;
    material.clearcoatRoughness = 0.78;
  }
  if (product.geometryKind === 'insulation') {
    material.sheen = 0.1;
    material.sheenRoughness = 0.96;
    material.sheenColor.set(product.accent);
  }
  if (product.geometryKind === 'board') {
    material.sheen = 0.08;
    material.sheenRoughness = 0.86;
    material.sheenColor.set('#d9aa70');
  }
  if (product.geometryKind === 'masonry') {
    material.clearcoat = 0.012;
    material.clearcoatRoughness = 0.96;
  }
  if (product.metalness > 0.45) {
    material.envMapIntensity = 0.8;
    material.clearcoat = 0.05;
    material.clearcoatRoughness = 0.4;
    material.anisotropy = 0.34;
    material.anisotropyRotation = Math.PI / 2;
  }
  if (product.geometryKind === 'window') {
    // The visible aluminium frame is coated, rather than exposed polished metal.
    material.metalness = 0.18;
    material.roughness = 0.36;
    material.envMapIntensity = 0.65;
  }
  return material;
}

export function disposeObjectResources(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.map?.dispose();
        material.normalMap?.dispose();
        material.roughnessMap?.dispose();
      }
      material.dispose();
    });
  });
}
