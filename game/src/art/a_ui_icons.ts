// UI icon pixel maps (ART-A). Bodies only: a 1px dark outline is added by the generator,
// so every map keeps a 1px transparent margin. Light comes from the top-left.
import { COMMON_COLORS, type ColorMap, type PixelMap } from './pixel';

/** Extra colour chars used by the icon maps (on top of COMMON_COLORS). */
export const ICON_COLORS: ColorMap = {
  ...COMMON_COLORS,
  b: '#1d4f9e', // shield blue dark
  B: '#40a0ff', // shield blue
  l: '#b6e0ff', // shield blue light
  o: '#a8620c', // gold dark
  O: '#ffd060', // gold
  u: '#fff2b8', // gold light
  n: '#b88a10', // energy dark
  N: '#ffe040', // energy yellow
  p: '#f2a6ff', // magenta light
  a: '#b4fff2', // teal light
  d: '#2a2638', // icon steel dark
  s: '#4a4660', // icon steel mid
  S: '#7a7690', // icon steel light
  f: '#ff9a3c', // orange (rear fire)
  F: '#ffd8a0', // orange light
};

export const ICON_MAPS: Record<string, PixelMap> = {
  // Fighter hull seen from above, nose up.
  ui_icon_hull: [
    '................',
    '.......Hh.......',
    '.......Hh.......',
    '......HqCs......',
    '......hCcs......',
    '.....HhSssd.....',
    '....HhSSssdd....',
    '...HhSSSssddd...',
    '..HhSMSSssdMdd..',
    '.HhSMMSSssdMMdd.',
    '.hSSSSSSssddddd.',
    '.ddddsSSssdddKK.',
    '....K.eyyE.K....',
    '.......EE.......',
    '................',
    '................',
  ],
  // Front gun: barrel pointing up firing two bolts.
  ui_icon_front: [
    '................',
    '...w......w.....',
    '...y......y.....',
    '...E......E.....',
    '................',
    '......wHh.......',
    '......HSsd......',
    '......hSsd......',
    '......hSsd......',
    '.....HhSsdd.....',
    '....HhSSssdd....',
    '...HhSTTTTsdd...',
    '...hSSaTTtssd...',
    '...dddddddddd...',
    '................',
    '................',
  ],
  // Rear gun: twin barrels pointing down, bolts fired backwards.
  ui_icon_rear: [
    '................',
    '...HHhhhhhhhd...',
    '...hSSSSSSssd...',
    '...hSaTTTTtsd...',
    '....dSsssssd....',
    '....hSd..hSd....',
    '....hSd..hSd....',
    '....hsd..hsd....',
    '....ddd..ddd....',
    '................',
    '....F.....F.....',
    '....f.....f.....',
    '...ef....ef.....',
    '..e.....e.......',
    '................',
    '................',
  ],
  // Shield crest.
  ui_icon_shield: [
    '................',
    '..wlllllllllB...',
    '..lBBBBBBBBBBb..',
    '..lBwlBBBBBBBb..',
    '..lBlBBBlBBBBb..',
    '..lBlBBllBBBBb..',
    '..lBBBllllBBBb..',
    '..lBBBBllBBBbb..',
    '...lBBBBlBBBb...',
    '...lBBBBBBBbb...',
    '....lBBBBBBb....',
    '.....lBBBBb.....',
    '......lBbb......',
    '.......bb.......',
    '................',
    '................',
  ],
  // Generator: power cell with a lightning bolt.
  ui_icon_generator: [
    '................',
    '......HSSd......',
    '....HhhhhhSd....',
    '....hKKKKNnd....',
    '....hKKKNNKd....',
    '....hKKNNKKd....',
    '....hKNNNNKd....',
    '....hKKKNnKd....',
    '....hKKNnKKd....',
    '....hKKNKKKd....',
    '....hKNKKKKd....',
    '....hKKKKKKd....',
    '....Sddddddd....',
    '................',
    '................',
    '................',
  ],
  // Sidekick drone pod with side fins and a magenta core.
  ui_icon_sidekick: [
    '................',
    '................',
    '......HhSs......',
    '.....HhSSsd.....',
    '..H.HhqCSsdd.d..',
    '.HS.hSCcSssd.sd.',
    '.hShSSSMMssddsd.',
    '.hSSSSMppMsdddd.',
    '.dSdSSSMMssddsd.',
    '.dd.dSSSSssd.dd.',
    '.....dSSssd.....',
    '......dyyd......',
    '.......EE.......',
    '................',
    '................',
    '................',
  ],
  // Intel: data slate with text lines and a magenta seal.
  ui_icon_intel: [
    '................',
    '..HhhhhhhhhhS...',
    '..hKKKKKKKKKd...',
    '..hKaTTTTKKKd...',
    '..hKKKKKKKKKd...',
    '..hKTTTTTTKKd...',
    '..hKKKKKKKKKd...',
    '..hKTTTTKKKKd...',
    '..hKKKKKKKKKd...',
    '..hKTTTTTKKKd...',
    '..hKKKKKKKMpd...',
    '..hKKKKKKKMMd...',
    '..Sddddddddd....',
    '................',
    '................',
    '................',
  ],
  // Pause: two neon bars.
  ui_icon_pause: [
    '................',
    '................',
    '................',
    '....aTt..aTt....',
    '....aTt..aTt....',
    '....aTt..aTt....',
    '....aTt..aTt....',
    '....aTt..aTt....',
    '....aTt..aTt....',
    '....aTt..aTt....',
    '....aTt..aTt....',
    '....aTt..aTt....',
    '................',
    '................',
    '................',
    '................',
  ],
  // Lock (12x12): steel shackle, gunmetal body, dark keyhole.
  ui_icon_lock: [
    '............',
    '....HSSs....',
    '...Hd..sd...',
    '...h....d...',
    '..HhhhhhhS..',
    '..hSSSSSsd..',
    '..hSSkkSsd..',
    '..hSSkkSsd..',
    '..hSSSkSsd..',
    '..Sddddddd..',
    '............',
    '............',
  ],
  // Credits (10x10): faceted gold gem.
  ui_icon_credits: [
    '..........',
    '...uuOo...',
    '..uwuOOo..',
    '.uuuOOOoo.',
    '.OOOOOOoo.',
    '..OOOOoo..',
    '...OOoo...',
    '....oo....',
    '..........',
    '..........',
  ],
  // Selection cursor (12x12): magenta arrowhead pointing right.
  ui_cursor: [
    '............',
    '............',
    '..pp........',
    '..pMMp......',
    '..pMMMMp....',
    '...MMMMMMp..',
    '...mMMMMMm..',
    '..mMMMMm....',
    '..mMMm......',
    '..mm........',
    '............',
    '............',
  ],
  // Right arrow (12x12): teal triangle (ui_arrow_l is its mirror).
  ui_arrow_r: [
    '............',
    '............',
    '...a........',
    '...aa.......',
    '...aTa......',
    '...aTTa.....',
    '...TTTTT....',
    '...tTTt.....',
    '...tTt......',
    '...tt.......',
    '...t........',
    '............',
  ],
};
