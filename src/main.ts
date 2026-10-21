import Phaser from 'phaser';
import { COLOR_PAGE_CSS, ORIENTATION_RECHECK_MS } from './config';
import { designSize } from './game/layout';
import { BootScene } from './game/scenes/BootScene';
import { GameScene } from './game/scenes/GameScene';

/**
 * Scale strategy (GDD §12, CLAUDE.md rule 5): Scale.FIT with a design size that follows the
 * viewport aspect. The short side is always 1080 design px; the long side is clamped to
 * [1080, 2400]. On viewport changes the game is resized to the new design size and every scene
 * re-runs its layout on the RESIZE event. Boot → Game: there is no title screen (rule 3).
 */
function viewport(): { w: number; h: number } {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width ?? window.innerWidth),
    h: Math.round(vv?.height ?? window.innerHeight),
  };
}

const first = viewport();
let current = designSize(first.w, first.h);

// Dev builds: ?renderer=canvas runs the Canvas renderer (headless CI machines have no GPU and
// crawl under SwiftShader WebGL, which starves Phaser's timers). Production is always AUTO.
const rendererParam = import.meta.env.DEV
  ? new URLSearchParams(window.location.search).get('renderer')
  : null;

// Dev builds: ?fpsmin=N lowers Phaser's minimum fps (default 5), i.e. raises the per-frame delta
// cap, so timers keep wall-clock time on a GPU-less machine.
const fpsMin = import.meta.env.DEV
  ? Number(new URLSearchParams(window.location.search).get('fpsmin'))
  : NaN;

const game = new Phaser.Game({
  type: rendererParam === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLOR_PAGE_CSS,
  banner: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: current.width,
    height: current.height,
  },
  render: { antialias: true, pixelArt: false, roundPixels: false },
  fps: Number.isFinite(fpsMin) && fpsMin >= 1 ? { min: fpsMin } : undefined,
  scene: [BootScene, GameScene],
});

function onViewportChange(): void {
  const v = viewport();
  const next = designSize(v.w, v.h);
  if (next.width !== current.width || next.height !== current.height) {
    current = next;
    // setGameSize (not resize): only it updates the FIT aspect ratio of the display size.
    game.scale.setGameSize(next.width, next.height);
  } else {
    game.scale.refresh();
  }
}

window.addEventListener('resize', onViewportChange);
window.visualViewport?.addEventListener('resize', onViewportChange);
window.addEventListener('orientationchange', () => {
  // iOS reports the old size for a frame or two after rotation: read it again a little later.
  for (const ms of ORIENTATION_RECHECK_MS) window.setTimeout(onViewportChange, ms);
});
