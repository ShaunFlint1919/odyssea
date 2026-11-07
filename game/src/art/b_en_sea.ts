// =====================================================================================
//  ENEMY ART — sea units, top-down hulls (bow pointing DOWN) with deck details.
//  Hulls are drawn as a dark flared side band around a lighter bevelled deck, so they
//  read as ships from above on any water colour.
// =====================================================================================
import type { PixelMap } from './pixel';
import { Grid, type Mask } from './b_en_kit';

const METAL = 'KgGhH';

/** Hull side band + bevelled deck (deck = hull shrunk by 1px). Returns the deck mask. */
function hullAndDeck(g: Grid, hull: Mask, deckBase: number): Mask {
  g.shade(hull, { base: 0.9, bevel: 1, hi: 2.2, lo: 1 });
  const deck = g.shrink(hull, 1, true);
  g.shade(deck, { base: deckBase, bevel: 2, hi: 2.2, lo: 1.4 });
  // railing glints along the lit (left) deck edge
  g.paint(g.edge(deck, 'left'), (_x, y) => (y % 2 === 0 ? '5' : ''));
  return deck;
}

/** Gun housing (palette) with two thin barrels pointing down (dir 1) or up (dir -1). */
function gunHouse(g: Grid, cx: number, cy: number, w: number, h: number, barrel: number, dir: 1 | -1): void {
  const x0 = cx - w / 2, y0 = cy - h / 2;
  const bx = [Math.floor(cx) - 1, Math.floor(cx)];
  const by0 = dir > 0 ? Math.floor(cy) : Math.floor(cy) - barrel - Math.ceil(h / 2);
  const len = barrel + Math.ceil(h / 2);
  const house = g.poly([x0 + 1, y0, x0 + w - 1, y0, x0 + w, y0 + 1.2, x0 + w, y0 + h - 1.2, x0 + w - 1, y0 + h, x0 + 1, y0 + h, x0, y0 + h - 1.2, x0, y0 + 1.2]);
  g.castShadow(g.grow(house, 1), 1, 1, 1);
  g.fill(g.grow(house, 1), 'k');
  g.fill(g.rect(bx[0], by0, 1, len), 'h').fill(g.rect(bx[1], by0, 1, len), 'G');
  g.plot([bx[0], dir > 0 ? by0 + len - 1 : by0, bx[1], dir > 0 ? by0 + len - 1 : by0], 'K');
  g.shade(house, { base: 3.4, bevel: 1.5, hi: 2.6 });
  g.set(Math.floor(x0 + 1), Math.floor(y0 + 1), '5');
}

/** sea_boat (20) — patrol boat: pointed bow, wheelhouse with windows, bow gun, twin outboards. */
export function drawBoat(): PixelMap {
  const g = new Grid(20, 20);
  const hull = g.poly([10, 19.6, 14.6, 13.4, 15.2, 6, 14.6, 1.4, 5.4, 1.4, 4.8, 6, 5.4, 13.4]);
  hullAndDeck(g, hull, 2.1);
  g.darken(g.and(hull, g.line(10, 15, 10, 18)), 1);
  // wheelhouse
  const cab = g.rect(7, 4, 6, 6);
  g.castShadow(cab, 1, 1, 2);
  g.fill(g.grow(cab, 1), 'k');
  g.shade(cab, { base: 3.6, bevel: 1.2, hi: 2.4 });
  g.fill(g.rect(7, 9, 6, 1), 'c').plot([7, 9], 'q').plot([8, 9], 'C');
  g.plot([9, 5, 10, 5], 'K').plot([9, 4], 'R').plot([12, 5], 'h');
  // bow gun
  g.fill(g.rect(9, 13, 2, 4), 'G').plot([9, 13, 9, 14], 'h').plot([9, 16, 10, 16], 'K');
  const gun = g.circle(10, 12.6, 1.6);
  g.shade(gun, { ramp: METAL, base: 2.6, bevel: 1.6, round: true });
  // outboard engines on the stern
  g.fill(g.or(g.rect(6, 1, 2, 2), g.rect(12, 1, 2, 2)), 'K').plot([6, 1, 12, 1], 'g');
  return g.outline().toMap();
}

/** sea_destroyer (48) — destroyer: fore & aft gun turrets, bridge, funnel, mast, AA mounts. */
export function drawDestroyer(): PixelMap {
  const g = new Grid(48, 48);
  const hull = g.poly([24, 47.6, 27.8, 42, 31, 34, 32.8, 24, 32.8, 10, 31.2, 3.6, 28.4, 1.4, 19.6, 1.4, 16.8, 3.6, 15.2, 10, 15.2, 24, 17, 34, 20.2, 42]);
  const deck = hullAndDeck(g, hull, 2);
  g.darken(g.and(deck, g.rect(24, 8, 1, 30)), 1);
  // breakwater chevron + anchor gear on the bow
  g.fill(g.and(deck, g.or(g.line(19, 38, 23, 41), g.line(28, 38, 24, 41))), '1');
  g.plot([23, 43, 24, 43], 'K').plot([22, 42, 25, 42], 'g');
  // fore turret (barrels to the bow) and aft turret (barrels to the stern)
  gunHouse(g, 24, 34, 7, 5, 6, 1);
  gunHouse(g, 24, 8.5, 6, 5, 5, -1);
  // bridge block with forward windows
  const bridge = g.poly([19.6, 20, 28.4, 20, 29.6, 21.4, 29.6, 27.4, 28, 29, 20, 29, 18.4, 27.4, 18.4, 21.4]);
  g.castShadow(bridge, 2, 2, 2);
  g.fill(g.grow(bridge, 1), 'k');
  g.shade(bridge, { base: 3.3, bevel: 1.5, hi: 2.6 });
  const top = g.rect(21, 21, 6, 4);
  g.castShadow(top, 1, 1, 1);
  g.shade(top, { base: 3.9, bevel: 1, hi: 2 });
  g.fill(g.rect(20, 27, 8, 1), 'c').plot([20, 27], 'q').plot([21, 27, 22, 27], 'C');
  // mast with radar + light
  g.fill(g.rect(23, 17, 2, 3), 'G').plot([23, 17], 'h');
  g.fill(g.rect(21, 18, 6, 1), 'g').plot([21, 18], 'h').plot([24, 16], 'R');
  // funnel
  const funnel = g.ellipse(24, 13.2, 3.2, 2.8);
  g.castShadow(funnel, 2, 2, 2);
  g.fill(g.grow(funnel, 1), 'k');
  g.shade(funnel, { base: 3, bevel: 1.6, round: true });
  g.fill(g.ellipse(24, 13, 1.8, 1.4), 'K').plot([23, 12], 'g');
  // AA mounts + lifeboats along the sides
  for (const [x, y] of [[18, 30], [28, 30], [18, 16], [28, 16]] as [number, number][]) {
    g.fill(g.rect(x, y, 2, 2), 'G').plot([x, y], 'h').plot([x + 1, y + 1], 'g');
    g.set(x + (x < 24 ? 0 : 1), y + 2, 'K');
  }
  g.fill(g.sym(g.rect(18, 22, 1, 4)), 'h').plotSym([18, 25], 'G');
  return g.outline().toMap();
}
