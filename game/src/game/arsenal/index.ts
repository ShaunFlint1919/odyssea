// STUB — to be implemented by the ARSENAL owner (see src/game/arsenal/api.ts).
import type { Arsenal, CreateArsenal } from './api';

export const createArsenal: CreateArsenal = (host, loadout, depths) => {
  void host; void loadout; void depths;
  let rearMode: 0 | 1 = 0;
  const arsenal: Arsenal = {
    update() {},
    setLoadout() {},
    get rearMode() { return rearMode; },
    toggleRearMode() { rearMode = rearMode === 0 ? 1 : 0; return rearMode; },
    frontPower: 1,
    rearPower: 1,
    boostFrontPower() { return 1; },
    forEachShot() {},
    forEachBlocker() {},
    shotCount: 0,
    clearShots() {},
    setVisible() {},
    destroy() {},
  };
  return arsenal;
};
