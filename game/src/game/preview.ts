import type { CreateWeaponPreview } from './contracts';

// STUB — to be implemented by the gameplay module owner (see docs/ARCHITECTURE.md).
export const createWeaponPreview: CreateWeaponPreview = (scene, x, y, w, h, loadout) => {
  void scene; void x; void y; void w; void h; void loadout;
  return { setLoadout() {}, destroy() {} };
};
