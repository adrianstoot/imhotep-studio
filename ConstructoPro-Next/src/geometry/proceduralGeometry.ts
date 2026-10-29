import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ProductDefinition, ProductVariant, SceneEntity } from '../domain/types';
import type { CoverageLayout, OpeningRect } from './layout';
import { createPbrMaterial } from './proceduralMaterials';
import { isSuppressedByOpening, resolveLinearSegments } from './sceneResolver';
import { roofTileInstallationTilt } from '../domain/construction';
import { buildWindowAssemblyMesh } from './windowAssemblyMesh';

const MM = 0.001;

function tag(object: THREE.Object3D, entity: SceneEntity): void {
  object.userData.entityId = entity.id;
  object.traverse((child) => { child.userData.entityId = entity.id; });
}

function hollowUnitGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0.5);
  shape.lineTo(-0.5, 0.5);
  shape.closePath();
  const columns = 6;
  const rows = 2;
  const gapX = 0.045;
  const gapY = 0.09;
  const holeWidth = (0.82 - gapX * (columns - 1)) / columns;
  const holeHeight = (0.66 - gapY * (rows - 1)) / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x0 = -0.41 + column * (holeWidth + gapX);
      const y0 = -0.33 + row * (holeHeight + gapY);
      const hole = new THREE.Path();
      hole.moveTo(x0, y0);
      hole.lineTo(x0 + holeWidth, y0);
      hole.lineTo(x0 + holeWidth, y0 + holeHeight);
      hole.lineTo(x0, y0 + holeHeight);
      hole.closePath();
      shape.holes.push(hole);
    }
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 });
  geometry.translate(0, 0, -0.5);
  geometry.computeVertexNormals();
  return geometry;
}

function waveTileGeometry(): THREE.BufferGeometry {
  const segmentsX = 28;
  const segmentsY = 10;
  const thickness = 0.11;
  const positions: number[] = [];
  const indices: number[] = [];
  const reliefAt = (px: number, py: number) => {
    const barrel = Math.exp(-Math.pow(px / 0.235, 2)) * 0.68;
    const leftChannel = -Math.exp(-Math.pow((px + 0.34) / 0.09, 2)) * 0.09;
    const rightChannel = -Math.exp(-Math.pow((px - 0.34) / 0.09, 2)) * 0.09;
    const edgeLocks = Math.exp(-Math.pow((Math.abs(px) - 0.47) / 0.032, 2)) * 0.16;
    const headLap = Math.max(0, (py - 0.39) / 0.11) * 0.055;
    return 0.11 + barrel + leftChannel + rightChannel + edgeLocks + headLap;
  };
  for (let layer = 0; layer < 2; layer += 1) {
    for (let y = 0; y <= segmentsY; y += 1) {
      for (let x = 0; x <= segmentsX; x += 1) {
        const px = x / segmentsX - 0.5;
        const py = y / segmentsY - 0.5;
        positions.push(px, py, reliefAt(px, py) - layer * thickness);
      }
    }
  }
  const stride = segmentsX + 1;
  const layerSize = stride * (segmentsY + 1);
  for (let layer = 0; layer < 2; layer += 1) {
    for (let y = 0; y < segmentsY; y += 1) {
      for (let x = 0; x < segmentsX; x += 1) {
        const a = layer * layerSize + y * stride + x;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        if (layer === 0) indices.push(a, b, d, a, d, c);
        else indices.push(a, d, b, a, c, d);
      }
    }
  }
  const perimeter: Array<[number, number]> = [];
  for (let x = 0; x <= segmentsX; x += 1) perimeter.push([x, 0]);
  for (let y = 1; y <= segmentsY; y += 1) perimeter.push([segmentsX, y]);
  for (let x = segmentsX - 1; x >= 0; x -= 1) perimeter.push([x, segmentsY]);
  for (let y = segmentsY - 1; y > 0; y -= 1) perimeter.push([0, y]);
  perimeter.forEach(([x, y], index) => {
    const [nextX, nextY] = perimeter[(index + 1) % perimeter.length];
    const topA = y * stride + x;
    const topB = nextY * stride + nextX;
    const bottomA = layerSize + topA;
    const bottomB = layerSize + topB;
    indices.push(topA, bottomA, bottomB, topA, bottomB, topB);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function flatInterlockingTileGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const part = (width: number, height: number, depth: number, x: number, y: number, z: number) => {
    const geometry = new RoundedBoxGeometry(width, height, depth, 2, Math.min(0.025, width / 7, height / 7, depth / 5));
    geometry.translate(x, y, z);
    parts.push(geometry);
  };
  // Planum-like flat interlocking ceramic tile: body, side locks, head rib,
  // drainage channels and two underside hanging nibs are all real volumes.
  part(0.84, 0.9, 0.16, 0, -0.025, 0);
  part(0.075, 0.9, 0.25, -0.455, -0.025, 0.015);
  part(0.075, 0.9, 0.25, 0.455, -0.025, 0.015);
  part(0.82, 0.085, 0.27, 0, 0.4475, 0.02);
  part(0.026, 0.78, 0.06, -0.37, -0.02, 0.105);
  part(0.026, 0.78, 0.06, 0.37, -0.02, 0.105);
  part(0.13, 0.11, 0.28, -0.24, 0.37, -0.085);
  part(0.13, 0.11, 0.28, 0.24, 0.37, -0.085);
  const geometry = mergeGeometries(parts, false);
  parts.forEach((entry) => entry.dispose());
  if (!geometry) throw new Error('No se pudo construir la geometría de teja plana.');
  geometry.computeVertexNormals();
  return geometry;
}

function slateGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0.5, 0.39);
  shape.quadraticCurveTo(0.5, 0.5, 0.39, 0.5);
  shape.lineTo(-0.39, 0.5);
  shape.quadraticCurveTo(-0.5, 0.5, -0.5, 0.39);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 });
  geometry.translate(0, 0, -0.5);
  return geometry;
}

function roofTileGeometry(product: ProductDefinition): THREE.BufferGeometry {
  const geometry = product.name.startsWith('Planum') ? flatInterlockingTileGeometry()
    : product.name.includes('Pizarra') ? slateGeometry() : waveTileGeometry();
  geometry.computeBoundingBox();
  const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.scale(1 / size.x, 1 / size.y, 1 / size.z);
  return geometry;
}

function isFoamInsulation(product: ProductDefinition): boolean {
  const identity = `${product.id} ${product.name}`.toLocaleLowerCase('es');
  return identity.includes('danopren') || identity.includes('xps') || identity.includes('poliestireno');
}

function fibrousInsulationGeometry(): THREE.BufferGeometry {
  // Fibre detail belongs in the surface maps. Millimetre-scale displaced
  // vertices used to pierce the adjoining 0.4 mm membrane and flicker yellow.
  // Keep the physical contact faces exactly inside the commercial envelope.
  return new THREE.BoxGeometry(1, 1, 1);
}

function instanceTint(index: number, strength = 0.055): THREE.Color {
  const phase = ((index * 37) % 19) / 18 - 0.5;
  const warm = ((index * 17) % 11) / 10 - 0.5;
  const value = 1 + phase * strength;
  return new THREE.Color(value + warm * strength * 0.2, value, value - warm * strength * 0.16);
}

function configureInstances(mesh: THREE.InstancedMesh, entity: SceneEntity, layout: CoverageLayout): void {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.entityId = entity.id;
  mesh.userData.pieceKeys = layout.pieces.map((piece) => piece.key);
  mesh.userData.layout = layout;
}

function addJointBacking(
  group: THREE.Group,
  entity: SceneEntity,
  product: ProductDefinition,
  variant: ProductVariant,
  layout: CoverageLayout,
): void {
  if (!layout.joints.length) return;
  const depth = Math.max(variant.depthMm * MM, 0.001);
  const isVentilatedJoint = product.geometryKind === 'cladding';
  const isTileJoint = product.geometryKind === 'paver';
  const jointColor = isVentilatedJoint
    ? '#20272b'
    : isTileJoint
      ? '#8e887f'
      : product.geometryKind === 'board'
        ? '#d5d0c5'
        : product.color;
  const jointProduct: ProductDefinition = {
    ...product,
    id: `${product.id}-joint-backing`,
    color: jointColor,
    accent: jointColor,
    geometryKind: isVentilatedJoint ? 'membrane' : 'finish',
    metalness: 0,
    roughness: isVentilatedJoint ? 0.78 : 0.94,
  };
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const joints = new THREE.InstancedMesh(geometry, createPbrMaterial(jointProduct), layout.joints.length);
  joints.name = isVentilatedJoint ? 'Fondo continuo de junta' : 'Relleno continuo de junta';
  joints.castShadow = !isVentilatedJoint;
  joints.receiveShadow = true;
  joints.userData.entityId = entity.id;
  joints.userData.jointKeys = layout.joints.map((joint) => joint.key);
  const visibleDepth = isVentilatedJoint ? Math.min(0.003, depth) : Math.max(0.001, depth - (isTileJoint ? 0.0012 : 0.0005));
  const z = isVentilatedJoint ? -depth / 2 + visibleDepth / 2 : -(depth - visibleDepth) / 2;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  layout.joints.forEach((joint, index) => {
    matrix.compose(
      new THREE.Vector3(joint.xMm * MM, joint.yMm * MM, z),
      quaternion,
      new THREE.Vector3(Math.max(0.0002, joint.widthMm * MM), Math.max(0.0002, joint.heightMm * MM), visibleDepth),
    );
    joints.setMatrixAt(index, matrix);
  });
  joints.instanceMatrix.needsUpdate = true;
  group.add(joints);
}

function pieceInstances(
  entity: SceneEntity,
  layout: CoverageLayout,
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  dimensions: (piece: CoverageLayout['pieces'][number], index: number) => [number, number, number, number, number, number],
  tintStrength = 0.02,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, layout.pieces.length);
  configureInstances(mesh, entity, layout);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  layout.pieces.forEach((piece, index) => {
    const [x, y, z, width, height, depth] = dimensions(piece, index);
    matrix.compose(
      new THREE.Vector3(x, y, z),
      quaternion,
      new THREE.Vector3(Math.max(0.0002, width), Math.max(0.0002, height), Math.max(0.0002, depth)),
    );
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, instanceTint(index, tintStrength));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function aacCoverage(
  entity: SceneEntity,
  product: ProductDefinition,
  variant: ProductVariant,
  layout: CoverageLayout,
): THREE.Group {
  const group = new THREE.Group();
  const depth = Math.max(variant.depthMm * MM, 0.012);
  const unitGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.018);
  const unit = pieceInstances(
    entity,
    layout,
    unitGeometry,
    createPbrMaterial(product),
    (piece) => [piece.xMm * MM, piece.yMm * MM, 0, piece.widthMm * MM, piece.heightMm * MM, depth],
    0.035,
  );
  unit.name = 'Bloques de hormigón celular por piezas';
  group.add(unit);

  const edgeProduct: ProductDefinition = {
    ...product,
    id: `${product.id}-tongue-groove`,
    color: '#a9a69d',
    accent: '#d7d3c7',
    geometryKind: 'solid',
    roughness: 0.98,
  };
  const edgeMaterial = createPbrMaterial(edgeProduct);
  const edgeGeometry = new RoundedBoxGeometry(1, 1, 1, 1, 0.02);
  const grooves = pieceInstances(
    entity,
    layout,
    edgeGeometry,
    edgeMaterial,
    (piece) => [
      (piece.xMm - piece.widthMm / 2 + Math.min(7, piece.widthMm * 0.04)) * MM,
      piece.yMm * MM,
      depth / 2 + 0.00035,
      Math.min(0.007, piece.widthMm * MM * 0.04),
      Math.max(0.001, piece.heightMm * MM - 0.014),
      0.0007,
    ],
    0.015,
  );
  grooves.name = 'Canal machihembrado visible';
  group.add(grooves);
  addJointBacking(group, entity, product, variant, layout);
  tag(group, entity);
  return group;
}

function layeredBoardCoverage(
  entity: SceneEntity,
  product: ProductDefinition,
  variant: ProductVariant,
  layout: CoverageLayout,
): THREE.Group {
  const group = new THREE.Group();
  const depth = Math.max(variant.depthMm * MM, 0.001);
  const geometry = new RoundedBoxGeometry(1, 1, 1, 1, 0.008);
  if (product.name.startsWith('Panel CLT')) {
    const layerDepth = depth / 5;
    const colors = ['#b7783f', '#986039', '#c48648', '#986039', '#b7783f'];
    colors.forEach((color, layerIndex) => {
      const layerProduct: ProductDefinition = {
        ...product,
        id: `${product.id}-lamella-${layerIndex}`,
        color,
        accent: color,
        roughness: 0.68,
      };
      const material = createPbrMaterial(layerProduct);
      [material.map, material.normalMap].forEach((map) => {
        if (!map || layerIndex % 2 === 0) return;
        map.center.set(0.5, 0.5);
        map.rotation = Math.PI / 2;
      });
      const z = -depth / 2 + layerDepth / 2 + layerIndex * layerDepth;
      const layer = pieceInstances(
        entity,
        layout,
        geometry,
        material,
        (piece) => [piece.xMm * MM, piece.yMm * MM, z, piece.widthMm * MM, piece.heightMm * MM, layerDepth * 0.985],
        0.025,
      );
      layer.name = `Lámina CLT ${layerIndex + 1} · ${layerIndex % 2 ? 'transversal' : 'longitudinal'}`;
      group.add(layer);
    });
  } else {
    const paper = Math.min(0.00042, depth * 0.08);
    const coreProduct: ProductDefinition = {
      ...product,
      id: `${product.id}-gypsum-core`,
      color: '#d8d4ca',
      accent: '#f0eee7',
      geometryKind: 'solid',
      roughness: 0.96,
    };
    const paperProduct: ProductDefinition = {
      ...product,
      id: `${product.id}-paper-face`,
      color: product.manufacturer === 'Placo' ? '#dfddd4' : product.color,
      accent: '#f3f1ea',
      roughness: 0.88,
    };
    const core = pieceInstances(
      entity,
      layout,
      geometry,
      createPbrMaterial(coreProduct),
      (piece) => [piece.xMm * MM, piece.yMm * MM, 0, piece.widthMm * MM, piece.heightMm * MM, Math.max(0.0005, depth - paper * 2)],
      0.012,
    );
    core.name = 'Núcleo mineral de yeso';
    group.add(core);
    [-1, 1].forEach((side) => {
      const face = pieceInstances(
        entity,
        layout,
        geometry,
        createPbrMaterial({ ...paperProduct, id: `${paperProduct.id}-${side}` }),
        (piece) => [piece.xMm * MM, piece.yMm * MM, side * (depth / 2 - paper / 2), piece.widthMm * MM, piece.heightMm * MM, paper],
        0.008,
      );
      face.name = side > 0 ? 'Cartón cara vista' : 'Cartón dorso';
      group.add(face);
    });
  }
  addJointBacking(group, entity, product, variant, layout);
  tag(group, entity);
  return group;
}

function danolosaCoverage(
  entity: SceneEntity,
  product: ProductDefinition,
  variant: ProductVariant,
  layout: CoverageLayout,
): THREE.Group {
  const group = new THREE.Group();
  const totalDepth = Math.max(variant.depthMm * MM, 0.04);
  const concreteDepth = Math.min(0.035, totalDepth * 0.7);
  const xpsDepth = Math.max(0.004, totalDepth - concreteDepth);
  const geometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.018);
  const concreteProduct: ProductDefinition = {
    ...product,
    id: `${product.id}-porous-concrete`,
    color: variant.label.includes('Blanca') ? '#d9d7d0' : '#a8a7a2',
    accent: '#e9e7e0',
    geometryKind: 'solid',
    roughness: 0.97,
  };
  const xpsProduct: ProductDefinition = {
    ...product,
    id: `${product.id}-xps`,
    color: '#4bb7d1',
    accent: '#8fe5ee',
    geometryKind: 'insulation',
    roughness: 0.76,
  };
  const top = pieceInstances(
    entity,
    layout,
    geometry,
    createPbrMaterial(concreteProduct),
    (piece) => [piece.xMm * MM, piece.yMm * MM, totalDepth / 2 - concreteDepth / 2, piece.widthMm * MM, piece.heightMm * MM, concreteDepth],
    0.04,
  );
  top.name = 'DANOLOSA · losa superior de hormigón poroso 35 mm';
  const xps = pieceInstances(
    entity,
    layout,
    geometry,
    createPbrMaterial(xpsProduct),
    (piece) => [piece.xMm * MM, piece.yMm * MM, -totalDepth / 2 + xpsDepth / 2, piece.widthMm * MM, piece.heightMm * MM, xpsDepth],
    0.018,
  );
  xps.name = `DANOLOSA · aislamiento XPS ${Math.round(xpsDepth / MM)} mm`;
  group.add(xps, top);
  addJointBacking(group, entity, product, variant, layout);
  tag(group, entity);
  return group;
}

function membraneCoverage(
  entity: SceneEntity,
  product: ProductDefinition,
  variant: ProductVariant,
  layout: CoverageLayout,
): THREE.Group {
  const group = new THREE.Group();
  const depth = Math.max(variant.depthMm * MM, 0.00035);
  const geometry = new RoundedBoxGeometry(1, 1, 1, 1, 0.008);
  const bands = pieceInstances(
    entity,
    layout,
    geometry,
    createPbrMaterial(product),
    (piece) => [
      piece.xMm * MM,
      piece.yMm * MM,
      (piece.row % 2) * Math.min(0.00024, depth * 0.08),
      piece.widthMm * MM,
      piece.heightMm * MM,
      depth,
    ],
    0.012,
  );
  bands.name = `Bandas comerciales con solape ${entity.coverage?.overlapMm ?? 0} mm`;
  group.add(bands);
  tag(group, entity);
  return group;
}

function ceramicCladdingCoverage(
  entity: SceneEntity,
  product: ProductDefinition,
  variant: ProductVariant,
  layout: CoverageLayout,
): THREE.Group {
  const group = new THREE.Group();
  const depth = Math.max(variant.depthMm * MM, 0.012);
  const shell = Math.min(0.004, depth * 0.18);
  const material = createPbrMaterial(product);
  const box = new RoundedBoxGeometry(1, 1, 1, 1, 0.012);
  const add = (name: string, dimensions: (piece: CoverageLayout['pieces'][number]) => [number, number, number, number, number, number]) => {
    const mesh = pieceInstances(entity, layout, box, material.clone(), dimensions, 0.04);
    mesh.name = name;
    group.add(mesh);
  };
  add('Cara cerámica exterior', (piece) => [piece.xMm * MM, piece.yMm * MM, depth / 2 - shell / 2, piece.widthMm * MM, piece.heightMm * MM, shell]);
  add('Cara cerámica posterior', (piece) => [piece.xMm * MM, piece.yMm * MM, -depth / 2 + shell / 2, piece.widthMm * MM, piece.heightMm * MM, shell]);
  [-0.32, -0.11, 0.11, 0.32].forEach((factor, index) => add(`Tabique hueco ${index + 1}`, (piece) => [
    piece.xMm * MM + factor * piece.widthMm * MM,
    piece.yMm * MM,
    0,
    shell,
    piece.heightMm * MM,
    Math.max(0.001, depth - shell * 2),
  ]));
  const reliefProduct: ProductDefinition = {
    ...product,
    id: `${product.id}-relief`,
    color: new THREE.Color(product.color).multiplyScalar(0.84).getStyle(),
    accent: product.accent,
  };
  [-0.28, 0, 0.28].forEach((factor, index) => {
    const relief = pieceInstances(
      entity,
      layout,
      box,
      createPbrMaterial({ ...reliefProduct, id: `${reliefProduct.id}-${index}` }),
      (piece) => [piece.xMm * MM, piece.yMm * MM + factor * piece.heightMm * MM, depth / 2 + 0.00055, Math.max(0.001, piece.widthMm * MM - 0.006), 0.0018, 0.0011],
      0.025,
    );
    relief.name = `Relieve longitudinal ${index + 1}`;
    group.add(relief);
  });
  addJointBacking(group, entity, product, variant, layout);
  tag(group, entity);
  return group;
}

function masonryCoverage(
  entity: SceneEntity,
  product: ProductDefinition,
  variant: ProductVariant,
  layout: CoverageLayout,
): THREE.Group {
  const root = new THREE.Group();
  const high = new THREE.Group();
  const material = createPbrMaterial(product);
  const grooveMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(product.color).multiplyScalar(0.58),
    roughness: 0.92,
    metalness: 0,
  });
  const unitBox = new RoundedBoxGeometry(1, 1, 1, 1, 0.035);
  const plainBox = new THREE.BoxGeometry(1, 1, 1);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const depth = Math.max(variant.depthMm * MM, 0.012);

  const addPart = (
    name: string,
    partMaterial: THREE.Material,
    dimensions: (piece: CoverageLayout['pieces'][number]) => [number, number, number, number, number, number],
    rounded = false,
  ) => {
    const mesh = new THREE.InstancedMesh(rounded ? unitBox : plainBox, partMaterial, layout.pieces.length);
    configureInstances(mesh, entity, layout);
    mesh.name = name;
    layout.pieces.forEach((piece, index) => {
      const [x, y, z, width, height, partDepth] = dimensions(piece);
      position.set(x, y, z);
      scale.set(Math.max(width, 0.0004), Math.max(height, 0.0004), Math.max(partDepth, 0.0004));
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, instanceTint(index, 0.105));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    high.add(mesh);
  };

  const shellY = (piece: CoverageLayout['pieces'][number]) => Math.min(0.008, piece.heightMm * MM * 0.18);
  const shellZ = Math.min(0.007, depth * 0.16);
  addPart('Cáscara superior', material, (piece) => [piece.xMm * MM, (piece.yMm + piece.heightMm / 2) * MM - shellY(piece) / 2, 0, piece.widthMm * MM, shellY(piece), depth], true);
  addPart('Cáscara inferior', material, (piece) => [piece.xMm * MM, (piece.yMm - piece.heightMm / 2) * MM + shellY(piece) / 2, 0, piece.widthMm * MM, shellY(piece), depth], true);
  addPart('Cara exterior', material, (piece) => [piece.xMm * MM, piece.yMm * MM, depth / 2 - shellZ / 2, piece.widthMm * MM, Math.max(0.001, piece.heightMm * MM - shellY(piece) * 2), shellZ], true);
  addPart('Cara posterior', material, (piece) => [piece.xMm * MM, piece.yMm * MM, -depth / 2 + shellZ / 2, piece.widthMm * MM, Math.max(0.001, piece.heightMm * MM - shellY(piece) * 2), shellZ], true);
  addPart('Tabique horizontal interior', material, (piece) => [piece.xMm * MM, piece.yMm * MM, 0, piece.widthMm * MM, shellY(piece), Math.max(0.001, depth - shellZ * 2)]);
  [-0.25, 0, 0.25].forEach((factor, index) => addPart(`Tabique vertical interior ${index + 1}`, material, (piece) => [piece.xMm * MM, piece.yMm * MM, factor * depth, piece.widthMm * MM, Math.max(0.001, piece.heightMm * MM - shellY(piece) * 2), shellZ]));
  [-0.28, 0, 0.28].forEach((factor, index) => addPart(`Estría exterior ${index + 1}`, grooveMaterial, (piece) => [piece.xMm * MM, piece.yMm * MM + factor * piece.heightMm * MM, depth / 2 + 0.00045, Math.max(0.001, piece.widthMm * MM - 0.004), 0.00135, 0.0009]));

  if (layout.joints.length) {
    const mortarProduct: ProductDefinition = {
      ...product,
      id: `${product.id}-mortar`,
      color: '#938b80',
      accent: '#d2c9b8',
      roughness: 0.96,
      metalness: 0,
      geometryKind: 'finish',
    };
    const mortar = new THREE.InstancedMesh(plainBox, createPbrMaterial(mortarProduct), layout.joints.length);
    mortar.castShadow = true;
    mortar.receiveShadow = true;
    mortar.userData.entityId = entity.id;
    mortar.userData.jointKeys = layout.joints.map((joint) => joint.key);
    const recess = Math.max(0, Math.min(variant.depthMm - 1, entity.coverage?.mortarRecessMm ?? 3)) * MM;
    layout.joints.forEach((joint, index) => {
      position.set(joint.xMm * MM, joint.yMm * MM, -recess / 2);
      scale.set(joint.widthMm * MM, joint.heightMm * MM, Math.max(0.001, depth - recess));
      matrix.compose(position, quaternion, scale);
      mortar.setMatrixAt(index, matrix);
    });
    mortar.instanceMatrix.needsUpdate = true;
    high.add(mortar);
  }

  const low = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), createPbrMaterial(product), layout.pieces.length);
  configureInstances(low, entity, layout);
  layout.pieces.forEach((piece, index) => {
    position.set(piece.xMm * MM, piece.yMm * MM, 0);
    scale.set(piece.widthMm * MM, piece.heightMm * MM, depth);
    matrix.compose(position, quaternion, scale);
    low.setMatrixAt(index, matrix);
  });
  low.instanceMatrix.needsUpdate = true;
  const lod = new THREE.LOD();
  lod.addLevel(high, 0);
  lod.addLevel(low, 8);
  lod.userData.entityId = entity.id;
  root.add(lod);
  tag(root, entity);
  return root;
}

function instancedCoverage(
  entity: SceneEntity,
  product: ProductDefinition,
  variant: ProductVariant,
  layout: CoverageLayout,
): THREE.Group {
  if (product.geometryKind === 'masonry') {
    return product.name.startsWith('Bloque de hormigón celular')
      ? aacCoverage(entity, product, variant, layout)
      : masonryCoverage(entity, product, variant, layout);
  }
  if (product.geometryKind === 'board') return layeredBoardCoverage(entity, product, variant, layout);
  if (product.geometryKind === 'membrane') return membraneCoverage(entity, product, variant, layout);
  if (product.name.startsWith('DANOLOSA')) return danolosaCoverage(entity, product, variant, layout);
  if (product.geometryKind === 'cladding' && ['FAVETON', 'TEMPIO'].includes(product.manufacturer)) {
    return ceramicCladdingCoverage(entity, product, variant, layout);
  }
  const group = new THREE.Group();
  const geometry = product.geometryKind === 'roof-tile'
      ? roofTileGeometry(product)
      : product.geometryKind === 'insulation' && !isFoamInsulation(product)
        ? fibrousInsulationGeometry()
      : new RoundedBoxGeometry(1, 1, 1, product.geometryKind === 'insulation' ? 2 : 1, product.geometryKind === 'insulation' ? 0.025 : 0.008);
  const material = createPbrMaterial(product);
  const mesh = new THREE.InstancedMesh(geometry, material, layout.pieces.length);
  const useLod = product.geometryKind === 'roof-tile';
  const lowMesh = useLod
    ? new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), createPbrMaterial(product), layout.pieces.length)
    : null;
  [mesh, lowMesh].filter(Boolean).forEach((candidate) => {
    const instance = candidate as THREE.InstancedMesh;
    instance.castShadow = true;
    instance.receiveShadow = true;
    instance.userData.entityId = entity.id;
    instance.userData.pieceKeys = layout.pieces.map((piece) => piece.key);
    instance.userData.layout = layout;
  });
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const tileTilt = product.geometryKind === 'roof-tile' && entity.coverage ? roofTileInstallationTilt(product, variant, entity.coverage) : 0;
  if (tileTilt) quaternion.setFromEuler(new THREE.Euler(tileTilt, 0, 0));
  const installationLift = tileTilt ? variant.heightMm / 2 * Math.sin(Math.abs(tileTilt)) + variant.depthMm / 2 * (Math.cos(tileTilt) - 1) : 0;
  layout.pieces.forEach((piece, index) => {
    // Each tile has its own installation tilt: the butt of the upper course
    // clears the head of the lower one, while every head sits on its batten.
    position.set(piece.xMm * MM, piece.yMm * MM, installationLift * MM);
    scale.set(piece.widthMm * MM, piece.heightMm * MM, Math.max(variant.depthMm * MM, 0.001));
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, instanceTint(index, product.geometryKind === 'insulation' ? 0.035 : 0.024));
    lowMesh?.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  if (lowMesh) {
    lowMesh.instanceMatrix.needsUpdate = true;
    const lod = new THREE.LOD();
    lod.addLevel(mesh, 0);
    lod.addLevel(lowMesh, 12);
    lod.userData.entityId = entity.id;
    group.add(lod);
  } else {
    group.add(mesh);
  }

  addJointBacking(group, entity, product, variant, layout);

  if (product.geometryKind === 'cladding' && layout.pieces.length <= 180) {
    const screwGeometry = new THREE.CylinderGeometry(0.0042, 0.0042, 0.003, 12);
    screwGeometry.rotateX(Math.PI / 2);
    const screwMaterial = new THREE.MeshStandardMaterial({ color: '#555d63', metalness: 0.9, roughness: 0.22 });
    const screwCount = layout.pieces.length * 4;
    const screws = new THREE.InstancedMesh(screwGeometry, screwMaterial, screwCount);
    const screwMatrix = new THREE.Matrix4();
    let index = 0;
    layout.pieces.forEach((piece) => {
      const halfW = piece.widthMm * MM / 2 - 0.025;
      const halfH = piece.heightMm * MM / 2 - 0.025;
      [[-halfW, -halfH], [halfW, -halfH], [-halfW, halfH], [halfW, halfH]].forEach(([dx, dy]) => {
        screwMatrix.makeTranslation(piece.xMm * MM + dx, piece.yMm * MM + dy, variant.depthMm * MM / 2 + 0.002);
        screws.setMatrixAt(index++, screwMatrix);
      });
    });
    screws.userData.entityId = entity.id;
    group.add(screws);
  }
  tag(group, entity);
  return group;
}

function shapeCoverage(entity: SceneEntity, product: ProductDefinition, variant: ProductVariant, openings: OpeningRect[]): THREE.Mesh {
  const width = (entity.coverage?.widthMm ?? variant.widthMm) * MM;
  const height = (entity.coverage?.heightMm ?? variant.heightMm) * MM;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();
  openings.forEach((opening) => {
    const x0 = (opening.xMm - opening.widthMm / 2) * MM;
    const x1 = (opening.xMm + opening.widthMm / 2) * MM;
    const y0 = (opening.yMm - opening.heightMm / 2) * MM;
    const y1 = (opening.yMm + opening.heightMm / 2) * MM;
    const hole = new THREE.Path();
    hole.moveTo(x0, y0);
    hole.lineTo(x0, y1);
    hole.lineTo(x1, y1);
    hole.lineTo(x1, y0);
    hole.closePath();
    shape.holes.push(hole);
  });
  const depth = Math.max(variant.depthMm * MM, 0.0015);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: product.geometryKind !== 'membrane',
    bevelSize: Math.min(depth * 0.08, 0.004),
    bevelThickness: Math.min(depth * 0.08, 0.004),
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new THREE.Mesh(geometry, createPbrMaterial(product));
  mesh.castShadow = product.geometryKind !== 'membrane';
  mesh.receiveShadow = true;
  tag(mesh, entity);
  return mesh;
}

function boxPart(width: number, height: number, depth: number, material: THREE.Material, x = 0, y = 0, z = 0, radius = 0.002): THREE.Mesh {
  const geometry = new RoundedBoxGeometry(width, height, depth, 2, Math.min(radius, width / 5, height / 5, depth / 5));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  // Transmissive panes must not project the blocky raster shadow of their
  // triangulated bevels onto the spacer and gasket behind them.
  mesh.castShadow = !material.transparent && !(material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0);
  mesh.receiveShadow = !material.transparent;
  return mesh;
}

function rectangularPlateWithSlots(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();
  const slotWidth = Math.max(0.008, width * 0.13);
  const slotHeight = Math.max(0.026, height * 0.28);
  [-0.24, 0.24].forEach((factor) => {
    const hole = new THREE.Path();
    const x0 = factor * width - slotWidth / 2;
    const y0 = height * 0.05 - slotHeight / 2;
    hole.moveTo(x0, y0);
    hole.lineTo(x0 + slotWidth, y0);
    hole.lineTo(x0 + slotWidth, y0 + slotHeight);
    hole.lineTo(x0, y0 + slotHeight);
    hole.closePath();
    shape.holes.push(hole);
  });
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: Math.min(0.0012, depth * 0.15),
    bevelThickness: Math.min(0.0012, depth * 0.15),
    bevelSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function perforatedDiscGeometry(radius: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const ring = radius * 0.62;
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const hole = new THREE.Path();
    hole.absarc(Math.cos(angle) * ring, Math.sin(angle) * ring, radius * 0.075, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function windowObject(entity: SceneEntity, product: ProductDefinition, variant: ProductVariant): THREE.Group {
  if (entity.opening?.installation) {
    const assembly = buildWindowAssemblyMesh(entity);
    tag(assembly, entity);
    return assembly;
  }
  const group = new THREE.Group();
  const width = variant.widthMm * MM;
  const height = variant.heightMm * MM;
  const depth = variant.depthMm * MM;
  const frame = Math.min(0.078, width * 0.085, height * 0.085);
  const frameMaterial = createPbrMaterial(product);
  const frameHighlight = createPbrMaterial({
    ...product,
    id: `${product.id}-machined-edge`,
    color: new THREE.Color(product.color).offsetHSL(0, -0.025, 0.075).getStyle(),
    roughness: Math.min(0.34, product.roughness + 0.045),
  });
  const thermalBreakMaterial = new THREE.MeshStandardMaterial({ color: '#171b1e', roughness: 0.82, metalness: 0.02 });
  const gasketMaterial = new THREE.MeshStandardMaterial({ color: '#101315', roughness: 0.9, metalness: 0 });
  const perimeterSealMaterial = new THREE.MeshStandardMaterial({ color: '#44484a', roughness: 0.96, metalness: 0 });
  const glassProduct = { ...product, id: `${product.id}-insulating-glass`, geometryKind: 'glass' as const, color: '#a9dce6', roughness: 0.065, metalness: 0.02 };
  const glassMaterial = createPbrMaterial(glassProduct);
  const spacerMaterial = new THREE.MeshStandardMaterial({ color: '#a0a5a6', metalness: 0.68, roughness: 0.34 });
  const hardwareMaterial = new THREE.MeshPhysicalMaterial({
    color: '#b9bec1',
    metalness: 0.84,
    roughness: 0.2,
    clearcoat: 0.18,
    clearcoatRoughness: 0.24,
  });
  const frontZ = depth / 2;
  const addOuterBar = (horizontal: boolean, length: number, x: number, y: number) => {
    group.add(boxPart(horizontal ? length : frame, horizontal ? frame : length, depth, frameMaterial, x, y, 0, 0.003));
    group.add(boxPart(
      horizontal ? Math.max(0.01, length - frame * 0.16) : 0.006,
      horizontal ? 0.006 : Math.max(0.01, length - frame * 0.16),
      0.006,
      frameHighlight,
      x,
      y,
      frontZ + 0.0015,
      0.0012,
    ));
  };

  // Installation joint behind the aluminium frame. It is deliberately visible
  // in close views so students can distinguish frame, seal and wall opening.
  group.add(
    boxPart(width + 0.014, 0.009, depth + 0.014, perimeterSealMaterial, 0, height / 2 + 0.0045, -0.003, 0.002),
    boxPart(width + 0.014, 0.009, depth + 0.014, perimeterSealMaterial, 0, -height / 2 - 0.0045, -0.003, 0.002),
    boxPart(0.009, height, depth + 0.014, perimeterSealMaterial, -width / 2 - 0.0045, 0, -0.003, 0.002),
    boxPart(0.009, height, depth + 0.014, perimeterSealMaterial, width / 2 + 0.0045, 0, -0.003, 0.002),
  );

  addOuterBar(true, width, 0, height / 2 - frame / 2);
  addOuterBar(true, width, 0, -height / 2 + frame / 2);
  addOuterBar(false, height - frame * 2, -width / 2 + frame / 2, 0);
  addOuterBar(false, height - frame * 2, width / 2 - frame / 2, 0);

  const clearW = width - frame * 2;
  const clearH = height - frame * 2;
  const mullion = frame * 0.7;
  const sashGap = 0.006;
  const sashW = (clearW - mullion - sashGap) / 2;
  const sashH = clearH;
  const sashFrame = frame * 0.53;
  group.add(
    boxPart(mullion, clearH, depth * 0.9, frameMaterial, 0, 0, 0.004, 0.0025),
    boxPart(0.006, clearH - 0.012, 0.006, frameHighlight, -mullion * 0.22, 0, frontZ + 0.002, 0.001),
    boxPart(0.006, clearH - 0.012, 0.006, thermalBreakMaterial, mullion * 0.2, 0, frontZ + 0.0025, 0.001),
  );

  [-1, 1].forEach((side) => {
    const cx = side * (mullion / 2 + sashGap / 2 + sashW / 2);
    const sashZ = 0.007;
    const glassW = Math.max(0.08, sashW - sashFrame * 2 - 0.012);
    const glassH = Math.max(0.08, sashH - sashFrame * 2 - 0.012);
    const paneDepth = 0.004;
    const cavity = 0.016;
    const paneOffset = cavity / 2 + paneDepth / 2;
    group.add(
      boxPart(sashW, sashFrame, depth * 0.74, frameMaterial, cx, sashH / 2 - sashFrame / 2, sashZ, 0.0024),
      boxPart(sashW, sashFrame, depth * 0.74, frameMaterial, cx, -sashH / 2 + sashFrame / 2, sashZ, 0.0024),
      boxPart(sashFrame, sashH - sashFrame * 2, depth * 0.74, frameMaterial, cx - sashW / 2 + sashFrame / 2, 0, sashZ, 0.0024),
      boxPart(sashFrame, sashH - sashFrame * 2, depth * 0.74, frameMaterial, cx + sashW / 2 - sashFrame / 2, 0, sashZ, 0.0024),
      boxPart(glassW, glassH, paneDepth, glassMaterial, cx, 0, sashZ + paneOffset, 0.0007),
      boxPart(glassW, glassH, paneDepth, glassMaterial, cx, 0, sashZ - paneOffset, 0.0007),
    );

    const spacerInset = 0.009;
    const spacerW = 0.007;
    group.add(
      boxPart(glassW - spacerInset * 2, spacerW, cavity, spacerMaterial, cx, glassH / 2 - spacerInset, sashZ, 0.0008),
      boxPart(glassW - spacerInset * 2, spacerW, cavity, spacerMaterial, cx, -glassH / 2 + spacerInset, sashZ, 0.0008),
      boxPart(spacerW, glassH - spacerInset * 2, cavity, spacerMaterial, cx - glassW / 2 + spacerInset, 0, sashZ, 0.0008),
      boxPart(spacerW, glassH - spacerInset * 2, cavity, spacerMaterial, cx + glassW / 2 - spacerInset, 0, sashZ, 0.0008),
    );

    // Four glazing beads and four EPDM gaskets on both visible faces.
    [-1, 1].forEach((faceSide) => {
      const beadZ = sashZ + faceSide * (depth * 0.285);
      const gasketZ = sashZ + faceSide * (paneOffset + paneDepth / 2 + 0.0013);
      group.add(
        boxPart(glassW + 0.014, 0.012, 0.007, frameHighlight, cx, glassH / 2 + 0.007, beadZ, 0.001),
        boxPart(glassW + 0.014, 0.012, 0.007, frameHighlight, cx, -glassH / 2 - 0.007, beadZ, 0.001),
        boxPart(0.012, glassH, 0.007, frameHighlight, cx - glassW / 2 - 0.007, 0, beadZ, 0.001),
        boxPart(0.012, glassH, 0.007, frameHighlight, cx + glassW / 2 + 0.007, 0, beadZ, 0.001),
        boxPart(glassW, 0.006, 0.004, gasketMaterial, cx, glassH / 2, gasketZ, 0.0008),
        boxPart(glassW, 0.006, 0.004, gasketMaterial, cx, -glassH / 2, gasketZ, 0.0008),
        boxPart(0.006, glassH, 0.004, gasketMaterial, cx - glassW / 2, 0, gasketZ, 0.0008),
        boxPart(0.006, glassH, 0.004, gasketMaterial, cx + glassW / 2, 0, gasketZ, 0.0008),
      );
    });

    const hingeX = cx + side * (sashW / 2 - sashFrame * 0.08);
    [-0.3, 0.3].forEach((factor) => {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.064, 24), hardwareMaterial);
      hinge.position.set(hingeX, factor * sashH, frontZ + 0.009);
      hinge.castShadow = true;
      group.add(hinge);
    });

    // Machined mitre lines at sash corners.
    [-1, 1].forEach((vertical) => {
      group.add(
        boxPart(0.0016, sashFrame * 0.72, 0.003, thermalBreakMaterial, cx - sashW / 2 + sashFrame * 0.5, vertical * (sashH / 2 - sashFrame * 0.5), frontZ + 0.004, 0.0004),
        boxPart(0.0016, sashFrame * 0.72, 0.003, thermalBreakMaterial, cx + sashW / 2 - sashFrame * 0.5, vertical * (sashH / 2 - sashFrame * 0.5), frontZ + 0.004, 0.0004),
      );
    });
  });

  // Escutcheon, spindle and lever are separate movable-looking components.
  const handleX = mullion / 2 + sashFrame * 0.72;
  const handleZ = frontZ + 0.023;
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.025, 24), hardwareMaterial);
  spindle.rotation.x = Math.PI / 2;
  spindle.position.set(handleX, 0, frontZ + 0.014);
  spindle.castShadow = true;
  group.add(
    boxPart(0.025, 0.12, 0.012, hardwareMaterial, handleX, 0, frontZ + 0.009, 0.005),
    spindle,
    boxPart(0.105, 0.017, 0.018, hardwareMaterial, handleX + 0.043, 0.038, handleZ, 0.006),
  );

  // Drainage slots in the lower outer profile.
  [-0.31, -0.12, 0.12, 0.31].forEach((factor) => {
    group.add(boxPart(0.026, 0.004, 0.005, thermalBreakMaterial, factor * width, -height / 2 + frame * 0.42, frontZ + 0.004, 0.001));
  });
  group.name = `${product.manufacturer} · marco, dos hojas, RPT, doble vidrio, EPDM y herrajes`;
  tag(group, entity);
  return group;
}

function glassObject(entity: SceneEntity, product: ProductDefinition, variant: ProductVariant): THREE.Group {
  const group = new THREE.Group();
  const width = Math.max(variant.widthMm * MM, 0.1);
  const height = Math.max(variant.heightMm * MM, 0.1);
  const totalDepth = Math.max(variant.depthMm * MM, 0.012);
  const paneDepth = Math.min(0.004, totalDepth * 0.24);
  const cavityDepth = Math.max(0.004, totalDepth - paneDepth * 2);
  const glassMaterial = createPbrMaterial(product);
  const spacerMaterial = new THREE.MeshStandardMaterial({ color: '#858b8e', metalness: 0.76, roughness: 0.28 });
  const primarySeal = new THREE.MeshStandardMaterial({ color: '#202326', metalness: 0.03, roughness: 0.8 });
  const secondarySeal = new THREE.MeshStandardMaterial({ color: '#3d4245', metalness: 0.02, roughness: 0.64 });
  const paneOffset = cavityDepth / 2 + paneDepth / 2;
  group.add(
    boxPart(width, height, paneDepth, glassMaterial, 0, 0, paneOffset, 0.001),
    boxPart(width, height, paneDepth, glassMaterial, 0, 0, -paneOffset, 0.001),
  );

  const inset = Math.min(0.015, width * 0.04, height * 0.04);
  const spacerWidth = Math.min(0.012, inset * 0.72);
  const innerWidth = Math.max(0.01, width - inset * 2);
  const innerHeight = Math.max(0.01, height - inset * 2);
  group.add(
    boxPart(innerWidth, spacerWidth, cavityDepth, spacerMaterial, 0, height / 2 - inset, 0, 0.001),
    boxPart(innerWidth, spacerWidth, cavityDepth, spacerMaterial, 0, -height / 2 + inset, 0, 0.001),
    boxPart(spacerWidth, innerHeight, cavityDepth, spacerMaterial, -width / 2 + inset, 0, 0, 0.001),
    boxPart(spacerWidth, innerHeight, cavityDepth, spacerMaterial, width / 2 - inset, 0, 0, 0.001),
  );
  const sealWidth = Math.min(0.008, inset * 0.45);
  [primarySeal, secondarySeal].forEach((seal, index) => {
    const edgeInset = sealWidth * (0.55 + index * 0.95);
    const edgeDepth = Math.max(0.0015, cavityDepth * (index === 0 ? 0.32 : 0.68));
    group.add(
      boxPart(width - edgeInset * 2, sealWidth, edgeDepth, seal, 0, height / 2 - edgeInset, 0, 0.001),
      boxPart(width - edgeInset * 2, sealWidth, edgeDepth, seal, 0, -height / 2 + edgeInset, 0, 0.001),
      boxPart(sealWidth, height - edgeInset * 2, edgeDepth, seal, -width / 2 + edgeInset, 0, 0, 0.001),
      boxPart(sealWidth, height - edgeInset * 2, edgeDepth, seal, width / 2 - edgeInset, 0, 0, 0.001),
    );
  });
  group.name = 'Unidad de vidrio aislante · dos lunas, cámara, separador y doble sellado';
  tag(group, entity);
  return group;
}

function profileObject(entity: SceneEntity, product: ProductDefinition, variant: ProductVariant, openings: OpeningRect[]): THREE.Group {
  const group = new THREE.Group();
  const material = createPbrMaterial(product);
  const edgeMaterial = createPbrMaterial({
    ...product,
    id: `${product.id}-extrusion-edge`,
    color: new THREE.Color(product.color).offsetHSL(0, -0.02, 0.065).getStyle(),
    roughness: Math.min(0.36, product.roughness + 0.04),
  });
  const width = Math.max(variant.widthMm * MM, 0.018);
  const depth = Math.max(variant.depthMm * MM, 0.018);
  const wall = Math.min(0.0032, width / 9, depth / 9);
  resolveLinearSegments(entity, product, openings).forEach((segment) => {
    const length = segment.lengthMm * MM;
    const center = segment.centerMm * MM;
    const segmentGroup = new THREE.Group();
    segmentGroup.position.y = center;
    segmentGroup.name = segment.key;
    const label = variant.label.toUpperCase();
    if (product.id === 'edu-timber-batten-50x30') {
      segmentGroup.add(boxPart(width, length, depth, material, 0, 0, 0, 0.0008));
    } else if (product.id === 'edu-partition-stud-70') {
      const sheet = 0.0006;
      segmentGroup.add(
        boxPart(sheet, length, depth, material, -width / 2 + sheet / 2),
        boxPart(width, length, sheet, material, 0, 0, -depth / 2 + sheet / 2),
        boxPart(width, length, sheet, material, 0, 0, depth / 2 - sheet / 2),
        boxPart(sheet, length, 0.007, material, width / 2 - sheet / 2, 0, depth / 2 - 0.0035),
        boxPart(sheet, length, 0.007, material, width / 2 - sheet / 2, 0, -depth / 2 + 0.0035),
      );
    } else if (label.startsWith('T ')) {
      segmentGroup.add(
        boxPart(width, length, wall, material, 0, 0, depth / 2 - wall / 2),
        boxPart(wall, length, depth, material, 0, 0, 0),
        boxPart(width * 0.46, length, wall * 0.7, edgeMaterial, 0, 0, depth / 2 + wall * 0.34, wall * 0.2),
        boxPart(wall * 0.72, length, depth * 0.56, edgeMaterial, 0, 0, -depth * 0.18, wall * 0.2),
      );
    } else if (label.startsWith('L ')) {
      segmentGroup.add(
        boxPart(width, length, wall, material, 0, 0, depth / 2 - wall / 2),
        boxPart(wall, length, depth, material, -width / 2 + wall / 2, 0, 0),
        boxPart(width * 0.22, length, wall * 0.72, edgeMaterial, width * 0.36, 0, depth / 2 + wall * 0.34, wall * 0.2),
        boxPart(wall * 0.72, length, depth * 0.34, edgeMaterial, -width / 2 - wall * 0.34, 0, -depth * 0.31, wall * 0.2),
      );
    } else {
      // Folded omega section: web, cheeks, return lips and raised stiffener.
      segmentGroup.add(
        boxPart(wall, length, depth, material, -width / 2 + wall / 2),
        boxPart(width, length, wall, material, 0, 0, -depth / 2 + wall / 2),
        boxPart(wall, length, depth, material, width / 2 - wall / 2),
        boxPart(width * 0.34, length, wall, material, -width * 0.34, 0, depth / 2 - wall / 2),
        boxPart(width * 0.34, length, wall, material, width * 0.34, 0, depth / 2 - wall / 2),
        boxPart(wall * 1.4, length, depth * 0.24, edgeMaterial, -width * 0.17, 0, depth * 0.38, wall * 0.25),
        boxPart(wall * 1.4, length, depth * 0.24, edgeMaterial, width * 0.17, 0, depth * 0.38, wall * 0.25),
        boxPart(width * 0.32, length, wall * 0.65, edgeMaterial, 0, 0, -depth / 2 - wall * 0.3, wall * 0.2),
      );
    }
    group.add(segmentGroup);
  });
  tag(group, entity);
  return group;
}

function bracketObject(entity: SceneEntity, product: ProductDefinition, variant: ProductVariant): THREE.Group {
  const group = new THREE.Group();
  const material = createPbrMaterial(product);
  const width = variant.widthMm * MM;
  const height = variant.heightMm * MM;
  const depth = variant.depthMm * MM;
  if (product.name.startsWith('Pedestal BUZON')) {
    // A deck support stands on its Y axis; it is not a facade L bracket.
    const radius = Math.max(width, depth) / 2;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.012, 36), material);
    foot.position.y = -height / 2 + 0.006;
    const head = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.83, radius * 0.83, 0.012, 36), material);
    head.position.y = height / 2 - 0.006;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.32, radius * 0.38, Math.max(0.012, height - 0.024), 24), material);
    group.add(foot, stem, head);
    group.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
    tag(group, entity);
    return group;
  }
  const plate = Math.min(0.006, width / 6);
  const thermalPadMaterial = new THREE.MeshStandardMaterial({
    color: product.manufacturer === 'EJOT' ? '#20272b' : '#bb372f',
    roughness: 0.68,
    metalness: 0,
  });
  const backPlate = new THREE.Mesh(rectangularPlateWithSlots(width, height, plate), material);
  backPlate.position.z = -depth / 2;
  backPlate.castShadow = true;
  backPlate.receiveShadow = true;
  group.add(
    boxPart(width * 0.88, height * 0.9, 0.006, thermalPadMaterial, 0, 0, -depth / 2 - plate - 0.003, 0.001),
    backPlate,
    boxPart(width, plate, depth, material, 0, -height / 2 + plate / 2, 0),
    boxPart(width * 0.72, plate * 0.8, depth * 0.72, material, 0, -height * 0.3, -depth * 0.04, plate * 0.15),
    boxPart(plate * 0.8, height * 0.5, depth * 0.62, material, -width * 0.38, -height * 0.12, -depth * 0.08, plate * 0.15),
    boxPart(plate * 0.8, height * 0.5, depth * 0.62, material, width * 0.38, -height * 0.12, -depth * 0.08, plate * 0.15),
  );
  const gussetShape = new THREE.Shape();
  gussetShape.moveTo(0, 0);
  gussetShape.lineTo(0, Math.min(height * 0.34, depth * 0.7));
  gussetShape.lineTo(Math.min(depth * 0.58, height * 0.36), 0);
  gussetShape.closePath();
  const gussetGeometry = new THREE.ExtrudeGeometry(gussetShape, { depth: plate, bevelEnabled: true, bevelSize: plate * 0.12, bevelThickness: plate * 0.12, bevelSegments: 1 });
  gussetGeometry.translate(0, 0, -plate / 2);
  gussetGeometry.rotateY(Math.PI / 2);
  [-0.27, 0.27].forEach((factor) => {
    const gusset = new THREE.Mesh(gussetGeometry, material);
    gusset.position.set(factor * width, -height / 2 + plate, -depth / 2 + plate);
    gusset.castShadow = true;
    gusset.receiveShadow = true;
    group.add(gusset);
  });
  const boltMaterial = new THREE.MeshStandardMaterial({ color: '#bec5ca', metalness: 0.72, roughness: 0.26 });
  [-0.25, 0.25].forEach((factor) => {
    const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.003, 20), boltMaterial);
    washer.rotation.x = Math.PI / 2;
    washer.position.set(factor * width, 0.16 * height, -depth / 2 - 0.006);
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 6), boltMaterial);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(factor * width, 0.16 * height, -depth / 2 - 0.011);
    const socket = boxPart(0.006, 0.002, 0.002, thermalPadMaterial, factor * width, 0.16 * height, -depth / 2 - 0.018, 0.0004);
    group.add(washer, bolt, socket);
  });
  tag(group, entity);
  return group;
}

function fastenerObject(entity: SceneEntity, product: ProductDefinition, variant: ProductVariant): THREE.Group {
  const group = new THREE.Group();
  const material = createPbrMaterial(product);
  const discRadius = Math.max(variant.widthMm * MM / 2, 0.012);
  const shaftLength = Math.max(variant.heightMm * MM, 0.04);
  const shaftRadius = Math.max(variant.depthMm * MM / 2, 0.003);
  const disc = new THREE.Mesh(perforatedDiscGeometry(discRadius, 0.008), material);
  disc.castShadow = true;
  disc.receiveShadow = true;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 12), material);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -shaftLength / 2;
  const screwMaterial = new THREE.MeshStandardMaterial({ color: '#8b9399', metalness: 0.62, roughness: 0.3 });
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(discRadius * 0.16, discRadius * 0.16, 0.011, 16), screwMaterial);
  screw.rotation.x = Math.PI / 2;
  screw.position.z = 0.005;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(shaftRadius * 1.05, shaftRadius * 3.2, 16), screwMaterial);
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -shaftLength - shaftRadius * 1.6;
  group.add(disc, shaft, screw, tip);
  const threadCount = Math.min(18, Math.max(8, Math.round(shaftLength / Math.max(shaftRadius * 2.8, 0.006))));
  for (let index = 0; index < threadCount; index += 1) {
    const thread = new THREE.Mesh(
      new THREE.TorusGeometry(shaftRadius * 1.12, Math.max(0.00035, shaftRadius * 0.11), 6, 18),
      screwMaterial,
    );
    thread.position.z = -shaftLength * (0.16 + index * 0.72 / Math.max(1, threadCount - 1));
    thread.castShadow = true;
    group.add(thread);
  }
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const rib = boxPart(discRadius * 0.68, discRadius * 0.075, 0.003, material, Math.cos(angle) * discRadius * 0.31, Math.sin(angle) * discRadius * 0.31, 0.0052, 0.0005);
    rib.rotation.z = angle;
    group.add(rib);
  }
  group.add(
    boxPart(discRadius * 0.22, discRadius * 0.045, 0.002, material, 0, 0, 0.011, 0.00035),
    boxPart(discRadius * 0.045, discRadius * 0.22, 0.002, material, 0, 0, 0.011, 0.00035),
  );
  tag(group, entity);
  return group;
}

function copingObject(entity: SceneEntity, product: ProductDefinition, variant: ProductVariant): THREE.Group {
  const group = new THREE.Group();
  const material = createPbrMaterial(product);
  const returnDepth = variant.widthMm * MM;
  const length = Math.min(entity.cutLengthMm ?? variant.heightMm, variant.heightMm) * MM;
  const lip = Math.max(variant.depthMm * MM, 0.034);
  const sheet = 0.0012;
  if (product.name.includes('Canalón')) {
    const radius = returnDepth / 2;
    const gutter = new THREE.Shape();
    for (let i = 0; i <= 32; i += 1) {
      const angle = i * Math.PI / 32;
      const x = Math.cos(angle) * radius;
      const y = -Math.sin(angle) * radius;
      if (i === 0) gutter.moveTo(x, y); else gutter.lineTo(x, y);
    }
    for (let i = 32; i >= 0; i -= 1) {
      const angle = i * Math.PI / 32;
      gutter.lineTo(Math.cos(angle) * (radius - sheet), -Math.sin(angle) * (radius - sheet));
    }
    gutter.closePath();
    const geometry = new THREE.ExtrudeGeometry(gutter, { depth: length, bevelEnabled: false, curveSegments: 32 });
    geometry.translate(0, 0, -length / 2);
    geometry.rotateX(Math.PI / 2);
    const trough = new THREE.Mesh(geometry, material);
    trough.castShadow = true;
    trough.receiveShadow = true;
    group.add(trough);
    tag(group, entity);
    return group;
  }
  const lowerName = entity.name.toLocaleLowerCase('es');
  const isSill = lowerName.includes('vierteaguas');
  const isHead = lowerName.includes('dintel');
  const isJamb = lowerName.includes('jamba');
  const exteriorProjection = 0.062;
  const fullDepth = returnDepth + exteriorProjection;
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#59636a', metalness: 0.76, roughness: 0.28 });
  const seal = new THREE.MeshStandardMaterial({ color: '#24282a', metalness: 0.02, roughness: 0.9 });
  const screwMaterial = new THREE.MeshStandardMaterial({ color: '#aeb5b9', metalness: 0.86, roughness: 0.2 });

  const addSealantBead = (x: number, z: number) => {
    const bead = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, Math.max(0.04, length - 0.04), 18), seal);
    bead.position.set(x, 0, z);
    bead.castShadow = true;
    group.add(bead);
  };
  const addFaceFasteners = (x: number, z: number, count: number) => {
    for (let index = 0; index < count; index += 1) {
      const y = count === 1 ? 0 : -length * 0.36 + index * length * 0.72 / (count - 1);
      const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.0018, 20), screwMaterial);
      washer.rotation.x = Math.PI / 2;
      washer.position.set(x, y, z);
      washer.castShadow = true;
      group.add(washer);
    }
  };

  if (isSill || isHead) {
    // These pieces are authored in a longitudinal Y axis and the sample rotates
    // them 90 degrees around Z. The resulting tray therefore spans the entire
    // window width while its real folded section remains visible in Y/Z.
    const tray = boxPart(sheet, length, fullDepth, material, 0, 0, exteriorProjection - fullDepth / 2, 0.00035);
    tray.rotation.y = isSill ? -THREE.MathUtils.degToRad(4.5) : 0;
    const frontDrop = isSill ? 0.058 : 0.048;
    const front = boxPart(frontDrop, length, sheet, material, isSill ? -frontDrop * 0.42 : frontDrop * 0.42, 0, exteriorProjection, 0.00035);
    const rearUpstand = boxPart(0.044, length, sheet, material, isSill ? 0.021 : -0.021, 0, -returnDepth, 0.00035);
    const dripHem = boxPart(0.012, length, 0.006, darkMetal, isSill ? -frontDrop + 0.004 : frontDrop - 0.004, 0, exteriorProjection + 0.002, 0.0005);
    const innerFold = boxPart(0.014, length, 0.006, material, isSill ? 0.036 : -0.036, 0, -returnDepth + 0.002, 0.0004);
    group.add(tray, front, rearUpstand, dripHem, innerFold);

    // End dams are independent folds; without them water could escape into the jamb.
    [-1, 1].forEach((side) => {
      group.add(boxPart(0.048, 0.006, fullDepth, material, isSill ? -0.02 : 0.02, side * (length / 2 - 0.003), exteriorProjection - fullDepth / 2, 0.00045));
    });
    addSealantBead(isSill ? 0.03 : -0.03, -returnDepth + 0.007);
    addFaceFasteners(isSill ? -0.018 : 0.018, exteriorProjection + 0.002, Math.max(3, Math.round(length / 0.42)));
    group.name = isSill
      ? 'Vierteaguas plegado · pendiente 4,5°, peto posterior, testeros y goterón'
      : 'Dintel plegado · bandeja, retorno posterior, testeros y goterón';
  } else if (isJamb) {
    const side = lowerName.includes('izquierda') ? -1 : 1;
    group.add(
      boxPart(sheet, length, fullDepth, material, 0, 0, exteriorProjection - fullDepth / 2, 0.00035),
      boxPart(0.066, length, sheet, material, side * 0.032, 0, exteriorProjection, 0.00045),
      boxPart(0.025, length, sheet, material, -side * 0.012, 0, -returnDepth, 0.0004),
      boxPart(0.009, length, 0.012, darkMetal, side * 0.064, 0, exteriorProjection - 0.005, 0.0005),
      boxPart(0.012, length, 0.008, material, -side * 0.022, 0, -returnDepth + 0.003, 0.0004),
    );
    addSealantBead(side * 0.013, -returnDepth + 0.009);
    addFaceFasteners(side * 0.033, exteriorProjection + 0.002, Math.max(3, Math.round(length / 0.42)));
    group.name = `${lowerName.includes('izquierda') ? 'Jamba izquierda' : 'Jamba derecha'} · bandeja, retorno, junta y fijaciones`;
  } else {
    // Generic folded coping/drain. The commercial width is the return into Z,
    // while the visible face remains a narrow, correctly folded band.
    group.add(
      boxPart(sheet, length, returnDepth, material, 0, 0, -returnDepth / 2),
      boxPart(lip, length, sheet, material, lip / 2 - sheet / 2, 0, 0),
      boxPart(lip * 0.45, length, sheet, material, -lip * 0.225, 0, -returnDepth, 0.0004),
      boxPart(sheet, length, Math.min(0.018, returnDepth * 0.16), material, lip - sheet / 2, 0, -Math.min(0.009, returnDepth * 0.08), 0.0004),
      boxPart(sheet, length, Math.min(0.012, returnDepth * 0.12), material, -lip * 0.45, 0, -returnDepth + Math.min(0.006, returnDepth * 0.06), 0.0004),
    );
  }
  tag(group, entity);
  return group;
}

function genericObject(entity: SceneEntity, product: ProductDefinition, variant: ProductVariant, openings: OpeningRect[]): THREE.Object3D {
  if (product.geometryKind === 'window') return windowObject(entity, product, variant);
  if (product.geometryKind === 'glass') return glassObject(entity, product, variant);
  if (product.geometryKind === 'profile') return profileObject(entity, product, variant, openings);
  if (product.openingBehavior === 'suppress-unit' && isSuppressedByOpening(entity, openings)) {
    const suppressed = new THREE.Group();
    suppressed.userData.suppressedByOpening = true;
    tag(suppressed, entity);
    return suppressed;
  }
  if (product.geometryKind === 'bracket') return bracketObject(entity, product, variant);
  if (product.geometryKind === 'fastener') return fastenerObject(entity, product, variant);
  if (product.geometryKind === 'coping' || product.geometryKind === 'drain') return copingObject(entity, product, variant);
  const mesh = boxPart(
    Math.max(variant.widthMm * MM, 0.006),
    Math.max(variant.heightMm * MM, 0.006),
    Math.max(variant.depthMm * MM, 0.002),
    createPbrMaterial(product),
  );
  tag(mesh, entity);
  return mesh;
}

export function buildEntityObject(
  entity: SceneEntity,
  product: ProductDefinition,
  openings: OpeningRect[],
  layout?: CoverageLayout,
): THREE.Object3D {
  const variant = product.variants.find((entry) => entry.id === entity.variantId) ?? product.variants[0];
  const repeated = ['masonry', 'insulation', 'membrane', 'cladding', 'board', 'paver', 'roof-tile'].includes(product.geometryKind);
  const object = entity.coverage
    ? (repeated && layout ? instancedCoverage(entity, product, variant, layout) : shapeCoverage(entity, product, variant, openings))
    : genericObject(entity, product, variant, openings);
  if (!entity.coverage && object instanceof THREE.Group) consolidateEntityMeshes(object, entity);
  object.position.set(...entity.transform.position.map((value) => value * MM) as [number, number, number]);
  object.rotation.set(...entity.transform.rotation);
  object.name = entity.name;
  object.userData.entityId = entity.id;
  object.userData.productId = entity.productId;
  return object;
}

/** Batch the internal parts of one selectable product without merging different entities. */
function consolidateEntityMeshes(root: THREE.Group, entity: SceneEntity): void {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => { if (child instanceof THREE.Mesh && !(child instanceof THREE.InstancedMesh)) meshes.push(child); });
  if (meshes.length < 2 || meshes.some((mesh) => Array.isArray(mesh.material))) return;
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; casts: boolean; receives: boolean }>();
  const originals = new Set<THREE.BufferGeometry>();
  meshes.forEach((mesh) => {
    const material = mesh.material as THREE.Material;
    const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
    const signature = Object.keys(geometry.attributes).sort().join(',');
    const key = `${material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}:${signature}`;
    const entry = groups.get(key) ?? { material, geometries: [], casts: mesh.castShadow, receives: mesh.receiveShadow };
    entry.geometries.push(geometry);
    groups.set(key, entry);
    originals.add(mesh.geometry);
  });
  root.clear();
  groups.forEach(({ material, geometries, casts, receives }) => {
    const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = casts;
      mesh.receiveShadow = receives;
      root.add(mesh);
      geometries.forEach((geometry) => { if (geometry !== merged) geometry.dispose(); });
    } else geometries.forEach((geometry) => root.add(new THREE.Mesh(geometry, material)));
  });
  originals.forEach((geometry) => geometry.dispose());
  tag(root, entity);
}

export function buildGhost(product: ProductDefinition): THREE.Object3D {
  const variant = product.variants[0];
  const width = (product.defaultCoverageMm?.width ?? variant.widthMm) * MM;
  const height = (product.defaultCoverageMm?.height ?? variant.heightMm) * MM;
  const depth = Math.max(variant.depthMm * MM, 0.006);
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(width, height, depth, 2, Math.min(0.012, depth / 4)),
    createPbrMaterial(product, { ghost: true }),
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color: '#55e6ff', transparent: true, opacity: 0.9 }),
  );
  mesh.add(edges);
  return mesh;
}
