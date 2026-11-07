// Renders the ORIGINAL Nova Corsair launcher icons and splash images with Playwright:
// a swept-wing corsair silhouette over a teal / magenta nebula disc on a dark background (no text).
//
//   node tools/icons.mjs            writes android/app/src/main/res/** + screens/icons-preview.png
//
// Outputs (Capacitor / Android Studio conventions):
//   mipmap-<density>/ic_launcher.png             48dp  legacy square icon
//   mipmap-<density>/ic_launcher_round.png       48dp  legacy round icon
//   mipmap-<density>/ic_launcher_foreground.png 108dp  adaptive icon foreground (safe zone: r 33dp)
//   values/ic_launcher_background.xml                  adaptive icon background colour
//   drawable[-port|-land]-<density>/splash.png         dark background + small centred emblem
//   drawable/splash_icon.xml                           vector emblem for the Android 12+ system splash
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const PREVIEW = path.join(ROOT, 'screens', 'icons-preview.png');

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
/** Adaptive icon background colour (deep indigo) and splash background (= COLORS.bg / nc_background). */
const ICON_BG = '#0B0A1A';
const SPLASH_BG = '#05040A';
const SPLASH_SIZES = {
  drawable: [480, 320],
  'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800], 'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600], 'drawable-port-xxxhdpi': [1280, 1920],
  'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480], 'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960], 'drawable-land-xxxhdpi': [1920, 1280],
};

// ------------------------------------------------------------------------------- geometry
// Everything lives in the 108x108 adaptive-icon space, centre (54, 54).
const C = 54;
const DISC_R = 28.5;

/** Right half of the corsair outline (dx from the centre line, y), nose to tail. */
const HULL_RIGHT = [
  [0, 14.5], [1.7, 21.5], [3.1, 29.5], [4.3, 37],  // needle nose + cockpit section
  [6.8, 44], [11.5, 50.5],                         // leading-edge root extension
  [27.5, 63.5], [29.5, 70.5], [21.5, 68.6],        // swept wing + wingtip
  [13.6, 69.6], [13.6, 78.4], [11.2, 84],          // trailing edge, engine nacelle
  [7.2, 84], [5.6, 78.2], [0, 80.4],               // nozzle, tail
];
/** Lit upper wing panel (left side, light from the top-left) and shaded right panel. */
const PANEL_LIT = [[-7, 46.5], [-12, 52.5], [-26, 63.6], [-20.5, 66.2], [-8.4, 59]];
const PANEL_SHADE = [[7, 46.5], [12, 52.5], [26, 63.6], [20.5, 66.2], [8.4, 59]];
/** Twin tail-fin highlights along the nacelles. */
const FINS = [[[-9.4, 69.5], [-9.4, 80.5]], [[9.4, 69.5], [9.4, 80.5]]];
const CANOPY_RIGHT = [[0, 26.5], [1.5, 31.5], [1.95, 38], [1.2, 42.6], [0, 44.2]];
const FLAME = [[-2.3, 84], [2.3, 84], [1.2, 89.5], [0, 96.5], [-1.2, 89.5]];
const SHIP_SCALE = 0.86;
const SHIP_CY = 55; // where the ship's visual centre (y = 55.75 in outline space) lands

function place([dx, y], scale = SHIP_SCALE) {
  return [C + dx * scale, SHIP_CY + (y - 55.75) * scale];
}
const fmt = (n) => Number(n.toFixed(2));
function polyPath(points) {
  return `M${points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' L')} Z`;
}
function mirrored(right) {
  const left = right.slice().reverse().filter(([dx]) => dx !== 0).map(([dx, y]) => [-dx, y]);
  return [...right, ...left];
}
const HULL_PATH = polyPath(mirrored(HULL_RIGHT).map((p) => place(p)));
const CANOPY_PATH = polyPath(mirrored(CANOPY_RIGHT).map((p) => place(p)));
const FLAME_PATHS = [-9.2, 9.2].map((ox) => polyPath(FLAME.map(([dx, y]) => place([dx + ox, y]))));
const PANEL_LIT_PATH = polyPath(PANEL_LIT.map((p) => place(p)));
const PANEL_SHADE_PATH = polyPath(PANEL_SHADE.map((p) => place(p)));
const FIN_PATHS = FINS.map(([a, b]) => { const [x1, y1] = place(a); const [x2, y2] = place(b); return `M${fmt(x1)},${fmt(y1)} L${fmt(x2)},${fmt(y2)}`; });
const circlePath = (cx, cy, r) => `M${fmt(cx - r)},${fmt(cy)} a${r},${r} 0 1,0 ${fmt(2 * r)},0 a${r},${r} 0 1,0 ${fmt(-2 * r)},0 Z`;

/** Deterministic pseudo-random generator (stars). */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function stars(seed, count, inside) {
  const r = rng(seed);
  const out = [];
  while (out.length < count) {
    const x = r() * 108;
    const y = r() * 108;
    const d = Math.hypot(x - C, y - C);
    if (inside ? d < DISC_R - 3 : d > DISC_R + 3 && d < 50) out.push([x, y, 0.25 + r() * (inside ? 0.45 : 0.6), 0.35 + r() * 0.65]);
  }
  return out;
}

// ------------------------------------------------------------------------------- SVG art

const NEBULA_STOPS = [
  [0, '#d9fff9'], [0.16, '#5ff3dc'], [0.34, '#2ec9c8'], [0.52, '#5a63e0'], [0.7, '#a24cf2'], [0.86, '#d04cff'], [1, '#5a1677'],
];

/**
 * The emblem (glow + nebula disc + ship). `withStars` adds background stars outside the disc;
 * `withClouds` adds the turbulence nebula texture (launcher icons only: the splash keeps smooth
 * gradients, like the Android 12+ vector splash, and compresses ~3x better).
 */
function emblemSvgBody({ withStars, withClouds }) {
  const stops = NEBULA_STOPS.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  const inner = stars(7, 9, true).map(([x, y, r, a]) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="#ffffff" opacity="${fmt(a)}"/>`).join('');
  const outer = withStars ? stars(21, 16, false).map(([x, y, r, a]) => `<circle cx="${fmt(x)}" cy="${fmt(y)}" r="${fmt(r)}" fill="#cfe9ff" opacity="${fmt(a * 0.8)}"/>`).join('') : '';
  return `
  <defs>
    <radialGradient id="neb" cx="0.36" cy="0.3" r="0.82">${stops}</radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.62" stop-color="#0a0518" stop-opacity="0"/>
      <stop offset="1" stop-color="#0a0518" stop-opacity="0.72"/>
    </radialGradient>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.55" stop-color="#d04cff" stop-opacity="0.55"/>
      <stop offset="0.75" stop-color="#7a3cff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#2ee6c8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="hull" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#2b2742"/>
      <stop offset="0.55" stop-color="#14111f"/>
      <stop offset="1" stop-color="#07060d"/>
    </linearGradient>
    <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.35" stop-color="#ff9cf6"/>
      <stop offset="1" stop-color="#d04cff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="canopy" cx="0.4" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#e9fffb"/>
      <stop offset="0.45" stop-color="#2ee6c8"/>
      <stop offset="1" stop-color="#0c6b62"/>
    </radialGradient>
    <clipPath id="disc"><circle cx="${C}" cy="${C}" r="${DISC_R}"/></clipPath>
    <filter id="clouds" x="0" y="0" width="108" height="108" filterUnits="userSpaceOnUse">
      <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="4" seed="11" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 0.42  0 0 0 0 0.98  3.4 0 0 0 -1.55" result="pink"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="4" result="m"/>
      <feColorMatrix in="m" type="matrix" values="0 0 0 0 0.62  0 0 0 0 1  0 0 0 0 0.94  0 3.2 0 0 -1.5" result="teal"/>
      <feMerge><feMergeNode in="pink"/><feMergeNode in="teal"/></feMerge>
    </filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.5"/></filter>
  </defs>
  ${outer}
  <circle cx="${C}" cy="${C}" r="${DISC_R + 9}" fill="url(#halo)"/>
  <circle cx="${C}" cy="${C}" r="${DISC_R}" fill="url(#neb)"/>
  <g clip-path="url(#disc)">
    ${withClouds ? '<rect x="0" y="0" width="108" height="108" filter="url(#clouds)" opacity="0.8" style="mix-blend-mode:screen"/>' : ''}
    ${inner}
    <circle cx="${C}" cy="${C}" r="${DISC_R}" fill="url(#vignette)"/>
    <path d="${circlePath(C - 2.2, C - 2.6, DISC_R - 1.2)}" fill="none" stroke="#e9fffb" stroke-opacity="0.35" stroke-width="0.7" filter="url(#soft)"/>
  </g>
  <circle cx="${C}" cy="${C}" r="${DISC_R}" fill="none" stroke="#f2a6ff" stroke-opacity="0.5" stroke-width="0.6"/>
  ${FLAME_PATHS.map((d) => `<path d="${d}" fill="url(#flame)"/>`).join('')}
  <path d="${HULL_PATH}" fill="#05040a" stroke="#05040a" stroke-width="2.2" stroke-linejoin="round" opacity="0.55" transform="translate(1.2 1.6)"/>
  <path d="${HULL_PATH}" fill="url(#hull)" stroke="#9ff5e8" stroke-opacity="0.9" stroke-width="0.95" stroke-linejoin="round"/>
  <path d="${PANEL_LIT_PATH}" fill="#5b5590" opacity="0.7"/>
  <path d="${PANEL_SHADE_PATH}" fill="#000000" opacity="0.35"/>
  ${FIN_PATHS.map((d) => `<path d="${d}" stroke="#8f88c0" stroke-width="1" stroke-linecap="round" opacity="0.8"/>`).join('')}
  <path d="M${fmt(C)},${fmt(place([0, 46])[1])} L${fmt(C)},${fmt(place([0, 77])[1])}" stroke="#5a5480" stroke-width="0.8" stroke-linecap="round"/>
  <path d="${CANOPY_PATH}" fill="url(#canopy)"/>`;
}

/** Full SVG document. `view` = [x, y, w, h] in icon space; `bg` = 'none' | 'square' | 'circle' | 'fill:<color>'. */
function svgDoc(view, bg, { withStars = true, withClouds = true } = {}) {
  const [vx, vy, vw, vh] = view;
  let back = '';
  if (bg === 'square' || bg === 'circle') {
    const shape = bg === 'square'
      ? `<rect x="${vx + vw * 0.035}" y="${vy + vh * 0.035}" width="${vw * 0.93}" height="${vh * 0.93}" rx="${vw * 0.2}" fill="url(#bgGrad)"/>`
      : `<circle cx="${vx + vw / 2}" cy="${vy + vh / 2}" r="${vw * 0.465}" fill="url(#bgGrad)"/>`;
    back = `<defs><radialGradient id="bgGrad" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="#1b1638"/><stop offset="1" stop-color="${ICON_BG}"/></radialGradient></defs>${shape}`;
  } else if (bg.startsWith('fill:')) {
    back = `<rect x="${vx - 1000}" y="${vy - 1000}" width="${vw + 2000}" height="${vh + 2000}" fill="${bg.slice(5)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.join(' ')}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${back}${emblemSvgBody({ withStars, withClouds })}</svg>`;
}

// ------------------------------------------------------------------------------- vector splash icon

/** Android VectorDrawable of the emblem (gradients via aapt:attr; no filters). */
function emblemVectorXml({ sizeDp, scale, comment }) {
  const items = (stops) => stops.map(([o, c, a = 'FF']) => `                <item android:offset="${o}" android:color="#${a}${c.slice(1).toUpperCase()}" />`).join('\n');
  const grad = (type, attrs, stops) => `
        <aapt:attr name="android:fillColor">
            <gradient android:type="${type}" ${attrs}>
${items(stops)}
            </gradient>
        </aapt:attr>`;
  const hullTop = place([0, 15])[1];
  const hullBottom = place([0, 84])[1];
  const flames = FLAME_PATHS.map((d) => `
    <path android:pathData="${d}">${grad('linear', `android:startX="54" android:startY="${fmt(place([0, 84])[1])}" android:endX="54" android:endY="${fmt(place([0, 96.5])[1])}"`, [[0, '#FFFFFF'], [0.35, '#FF9CF6'], [1, '#D04CFF', '00']])}
    </path>`).join('');
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by tools/icons.mjs — ${comment} -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="${sizeDp}dp"
    android:height="${sizeDp}dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <group
        android:pivotX="54"
        android:pivotY="54"
        android:scaleX="${scale}"
        android:scaleY="${scale}">
    <path android:pathData="${circlePath(C, C, DISC_R + 9)}">${grad('radial', `android:centerX="54" android:centerY="54" android:gradientRadius="${DISC_R + 9}"`, [[0.55, '#D04CFF', '8C'], [0.75, '#7A3CFF', '38'], [1, '#2EE6C8', '00']])}
    </path>
    <path android:pathData="${circlePath(C, C, DISC_R)}">${grad('radial', `android:centerX="${fmt(C - DISC_R * 0.28)}" android:centerY="${fmt(C - DISC_R * 0.4)}" android:gradientRadius="${fmt(DISC_R * 1.64)}"`, NEBULA_STOPS.map(([o, c]) => [o, c.toUpperCase()]))}
    </path>
    <path android:pathData="${circlePath(C, C, DISC_R)}">${grad('radial', `android:centerX="54" android:centerY="54" android:gradientRadius="${DISC_R}"`, [[0.62, '#0A0518', '00'], [1, '#0A0518', 'B8']])}
    </path>
    <path
        android:pathData="${circlePath(C, C, DISC_R)}"
        android:strokeColor="#80F2A6FF"
        android:strokeWidth="0.6" />${flames}
    <path
        android:pathData="${HULL_PATH}"
        android:strokeColor="#E69FF5E8"
        android:strokeWidth="0.95"
        android:strokeLineJoin="round">${grad('linear', `android:startX="54" android:startY="${fmt(hullTop)}" android:endX="62" android:endY="${fmt(hullBottom)}"`, [[0, '#2B2742'], [0.55, '#14111F'], [1, '#07060D']])}
    </path>
    <path
        android:fillColor="#B35B5590"
        android:pathData="${PANEL_LIT_PATH}" />
    <path
        android:fillColor="#59000000"
        android:pathData="${PANEL_SHADE_PATH}" />${FIN_PATHS.map((d) => `
    <path
        android:pathData="${d}"
        android:strokeColor="#CC8F88C0"
        android:strokeWidth="1"
        android:strokeLineCap="round" />`).join('')}
    <path android:pathData="${CANOPY_PATH}">${grad('radial', `android:centerX="53.5" android:centerY="${fmt(place([0, 31])[1])}" android:gradientRadius="7"`, [[0, '#E9FFFB'], [0.45, '#2EE6C8'], [1, '#0C6B62']])}
    </path>
    </group>
</vector>
`;
}

// ------------------------------------------------------------------------------- render

async function render(page, file, w, h, svg, transparent) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style></head><body>${svg}</body></html>`);
  mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const written = [];
  for (const [density, f] of Object.entries(DENSITIES)) {
    const dir = path.join(RES, `mipmap-${density}`);
    const s48 = Math.round(48 * f);
    const s108 = Math.round(108 * f);
    // Legacy icons show the adaptive "visible" area (72 of 108 units) plus a little margin.
    await render(page, path.join(dir, 'ic_launcher.png'), s48, s48, svgDoc([16, 16, 76, 76], 'square'), true);
    await render(page, path.join(dir, 'ic_launcher_round.png'), s48, s48, svgDoc([16, 16, 76, 76], 'circle'), true);
    await render(page, path.join(dir, 'ic_launcher_foreground.png'), s108, s108, svgDoc([0, 0, 108, 108], 'none'), true);
    written.push(`mipmap-${density} (${s48}px, foreground ${s108}px)`);
  }
  for (const [dir, [w, h]] of Object.entries(SPLASH_SIZES)) {
    // Small centred emblem: the disc spans ~30 % of the shorter side.
    const units = (DISC_R * 2) / 0.3;
    const minSide = Math.min(w, h);
    const vw = units * (w / minSide);
    const vh = units * (h / minSide);
    await render(page, path.join(RES, dir, 'splash.png'), w, h, svgDoc([C - vw / 2, C - vh / 2, vw, vh], `fill:${SPLASH_BG}`, { withStars: false, withClouds: false }), false);
    written.push(`${dir}/splash.png ${w}x${h}`);
  }
  writeFileSync(path.join(RES, 'values', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ICON_BG}</color>\n</resources>\n`);
  writeFileSync(path.join(RES, 'drawable', 'splash_icon.xml'),
    emblemVectorXml({ sizeDp: 288, scale: 0.78, comment: 'Android 12+ system splash emblem (shown inside a 192dp circle).' }));
  // Vector twins of the adaptive icon layers (the launcher itself uses the mipmap PNGs).
  mkdirSync(path.join(RES, 'drawable-v24'), { recursive: true });
  writeFileSync(path.join(RES, 'drawable-v24', 'ic_launcher_foreground.xml'),
    emblemVectorXml({ sizeDp: 108, scale: 1, comment: 'adaptive icon foreground (vector twin of mipmap ic_launcher_foreground).' }));
  writeFileSync(path.join(RES, 'drawable', 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<!-- GENERATED by tools/icons.mjs — adaptive icon background. -->\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <solid android:color="@color/ic_launcher_background" />\n</shape>\n`);
  written.push('values/ic_launcher_background.xml', 'drawable/splash_icon.xml', 'drawable-v24/ic_launcher_foreground.xml', 'drawable/ic_launcher_background.xml');

  // Review sheet: launcher masks on dark and light wallpapers + legacy icons + splash.
  const dataUri = (file) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;
  const fg = (d) => dataUri(path.join(RES, `mipmap-${d}`, 'ic_launcher_foreground.png'));
  const legacy = (d, n) => dataUri(path.join(RES, `mipmap-${d}`, n));
  const cell = (mask, bg, size) => `<div style="width:${size}px;height:${size}px;border-radius:${mask};background:${ICON_BG};overflow:hidden;position:relative;margin:10px;display:inline-block;vertical-align:middle">
      <img src="${fg('xxxhdpi')}" style="position:absolute;width:${size * 1.5}px;height:${size * 1.5}px;left:${-size * 0.25}px;top:${-size * 0.25}px"></div>`;
  const row = (bg) => `<div style="background:${bg};padding:12px">${[192, 96, 48].map((s) => cell('50%', bg, s) + cell('28%', bg, s)).join('')}
      <img src="${legacy('xxxhdpi', 'ic_launcher.png')}" style="width:96px;margin:10px;vertical-align:middle">
      <img src="${legacy('xxxhdpi', 'ic_launcher_round.png')}" style="width:96px;margin:10px;vertical-align:middle">
      <img src="${legacy('mdpi', 'ic_launcher.png')}" style="width:48px;margin:10px;vertical-align:middle;image-rendering:pixelated">
      <img src="${legacy('mdpi', 'ic_launcher_round.png')}" style="width:48px;margin:10px;vertical-align:middle;image-rendering:pixelated"></div>`;
  await page.setViewportSize({ width: 1300, height: 880 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#222">${row('#1d2733')}${row('#e9e4f2')}
    <div style="padding:12px;background:#000"><img src="${dataUri(path.join(RES, 'drawable-port-xhdpi', 'splash.png'))}" style="height:300px;margin-right:12px">
    <img src="${dataUri(path.join(RES, 'drawable-land-hdpi', 'splash.png'))}" style="height:200px;vertical-align:top"></div></body></html>`);
  await page.waitForTimeout(300);
  mkdirSync(path.dirname(PREVIEW), { recursive: true });
  await page.screenshot({ path: PREVIEW, fullPage: true });
  console.log(`icons written:\n  ${written.join('\n  ')}\npreview: ${path.relative(ROOT, PREVIEW)}`);
} finally {
  await browser.close();
}
