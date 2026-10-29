import type { GeometryKind, SceneEntity } from './types';

/** Cut-outs in the window local XY plane. The lintel replaces, rather than overlaps, masonry. */
export function openingCutouts(entity: SceneEntity, kind?: GeometryKind) {
  const opening = entity.opening;
  if (!opening) return [];
  const installation = opening.installation;
  const clearance = installation ? installation.jointMm + installation.preframeFaceMm : 0;
  const widthMm = opening.widthMm + 2 * clearance;
  const heightMm = opening.heightMm + 2 * clearance;
  const result = [{ xMm: 0, yMm: 0, widthMm, heightMm }];
  // A real outlet above the head flashing: the grille must not sit over an uncut panel.
  if (installation && kind === 'cladding') result.push({
    xMm: 0, yMm: heightMm / 2 + 32.5, widthMm: widthMm + 50, heightMm: 65,
  });
  if (installation && kind === 'masonry') result.push({
    xMm: 0, yMm: heightMm / 2 + installation.lintelHeightMm / 2,
    widthMm: widthMm + 2 * installation.lintelBearingMm, heightMm: installation.lintelHeightMm,
  });
  return result;
}
