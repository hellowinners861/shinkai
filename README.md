# SHINKAI

SHINKAI is a smartphone-first TypeScript + Vite + Phaser 3 web-game shell.
The current vertical-slice preparation keeps the game view portrait and fixed
while leaving the creature catalog, research data, release assets, and full
gameplay systems for later roadmap stages.

## Mobile layout

- Logical game view: `450 x 800` (portrait `9:16`).
- Supported minimum CSS viewport: `320 x 568`.
- Phaser uses `Scale.FIT` and `CENTER_BOTH`; the logical view does not expand on wide screens.
- The browser pixel-ratio value used by the shell is capped at `2`.
- `viewport-fit=cover` and `env(safe-area-inset-*)` keep HUD and controls away from notches and browser edges.
- The Canvas uses `touch-action: none`; the rest of the page keeps normal browser semantics.

The shell has a floating 128px virtual movement stick with a 52px knob. It
returns to neutral on `pointerup`, `pointercancel`, hidden tabs, and window
blur. The boot hand-off and TitleScene start requests share the same lifecycle
guard, so a hidden page, lost focus, or unapproved landscape state cannot
start or keep
the dive running. Returning from a hidden or unfocused page requires the
explicit Return to game action. Resize, visual viewport, and orientation
changes refresh Phaser's scale and input bounds.

Portrait is recommended but never forcibly locked. Landscape shows a rotation
notice and can continue with the same letterboxed portrait view. Desktop input
falls back to WASD, arrow keys, `P`, and `Esc`. Pause and audio preference
controls are HTML buttons with 44px minimum touch targets; audio mute is stored
locally. The shell also respects `prefers-reduced-motion`.

## Requirements

- Node.js 20 or newer
- npm

## Install and run

```bash
npm install
npm run dev
```

Open the local Vite URL in a browser. Use the Start dive button, then move the
development submarine with the touch stick or keyboard fallback.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run check
```

`npm run check` runs type checking, unit tests, and the production build.
The build output is written to `dist/`.

## Deployment

The production site is published at
<https://hellowinners861.github.io/shinkai/>.

## Structure

```text
src/
  main.ts
  game/config.ts          # fixed portrait dimensions and rendering budget
  input/                  # reusable joystick and pure vector math
  platform/               # viewport, lifecycle, preference, and accessibility helpers
  scenes/                 # Boot, title, game shell, and result placeholders
  style.css               # safe-area and responsive shell CSS
tests/
  config.test.ts
  vector.test.ts
assets/                   # empty placeholders; no reference-only images
docs/
  DESIGN.md
```

The approved `AGENTS.md` and `docs/DESIGN.md` are the source of truth. This
preparation change does not edit the design document or any
`docs/research/*.csv` file. It does not download assets, generate images, or
implement the 100-species catalog.
