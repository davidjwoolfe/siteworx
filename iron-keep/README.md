# Iron Keep

A browser first-person shooter in the style of early-90s raycasters, rendered at full display resolution.
One level: break out of an occupied castle in 1943.

Open `index.html` in a desktop browser with WebGL2 (Chrome, Edge, Firefox, Safari 15+). No build step, no assets to download:
every texture, sprite and sound is generated in code at load.

## Controls

| Key | Action |
| --- | --- |
| W A S D | Move and strafe |
| Mouse | Turn |
| Left click | Fire |
| R | Reload |
| 1 / 2 / wheel | Switch weapon |
| E / Space | Open doors, push walls |
| Shift | Run |
| M | Map |
| N | Mute |
| Esc | Pause |
| [ / ] | Mouse sensitivity |
| F3 | Frame-rate counter |

## How it works

- `js/level.js` builds the 46x40 grid: rooms, doors, push-walls, lights, props, pickups and enemies, then bakes a lightmap patch per light.
- `js/game.js` casts one ray per screen column on the CPU (walls, sliding doors, moving push-walls), and runs input, weapons, AI and the HUD.
- `js/render.js` (WebGL2) turns the per-column data into textured, lightmapped walls and casts floors and ceilings per pixel. Sprites are billboards clipped against the per-column depth.
- `js/art.js` draws all wall textures and sprites procedurally; `js/audio.js` synthesises all sound with WebAudio.
