import * as THREE from 'three';
import type { SceneEntity } from '../domain/types';
import { resolveWindowAssembly, type WindowAssemblyPart } from '../domain/windowAssembly';

/** Exact polygonal extrusion of the canonical millimetre part; no decorative displacement. */
export function windowPartGeometry(part: WindowAssemblyPart): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  part.profile.forEach(([a, b], index) => index ? shape.lineTo(a * .001, b * .001) : shape.moveTo(a * .001, b * .001));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: (part.toMm - part.fromMm) * .001, bevelEnabled: false, curveSegments: 1, steps: 1 });
  geometry.translate(0, 0, part.fromMm * .001);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index++) {
    const a = position.getX(index), b = position.getY(index), along = position.getZ(index);
    if (part.axis === 'x') position.setXYZ(index, along, a, b);
    if (part.axis === 'y') position.setXYZ(index, a, along, b);
  }
  // X/Z reflection for a Y extrusion changes handedness. Reverse triangle winding accordingly.
  if (part.axis === 'y') {
    for (let index = 0; index < position.count; index += 3) {
      const x = position.getX(index + 1), y = position.getY(index + 1), z = position.getZ(index + 1);
      position.setXYZ(index + 1, position.getX(index + 2), position.getY(index + 2), position.getZ(index + 2));
      position.setXYZ(index + 2, x, y, z);
    }
  }
  geometry.deleteAttribute('uv');
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export function buildWindowAssemblyMesh(entity: SceneEntity): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Montaje de ventana · premarco, fijaciones, juntas, telares y vierteaguas';
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  resolveWindowAssembly(entity).forEach((part) => {
    const isGlass = part.kind === 'glass';
    const key = `${part.kind}-${part.color}`;
    let material = materials.get(key);
    if (!material) {
      const metal = part.kind === 'coping' || part.kind === 'fastener' || ['frame', 'sash', 'preframe', 'glazing-bead', 'spacer', 'hinge', 'handle', 'head-ventilation'].includes(part.role);
      material = new THREE.MeshStandardMaterial({ color: part.color, metalness: metal ? .55 : 0, roughness: isGlass ? .08 : metal ? .35 : .82, transparent: isGlass, opacity: isGlass ? .22 : 1, depthWrite: !isGlass });
      materials.set(key, material);
    }
    const mesh = new THREE.Mesh(windowPartGeometry(part), material);
    mesh.name = part.label;
    mesh.userData.entityId = entity.id;
    mesh.userData.assemblyPartId = part.id;
    mesh.userData.assemblyRole = part.role;
    mesh.castShadow = !isGlass;
    mesh.receiveShadow = !isGlass;
    group.add(mesh);
  });
  return group;
}
