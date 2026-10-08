# Component and Asset Catalog

Reuse actual current modules. The available games are Bonegle and Midnight Alley; do not depend on removed game folders or former client-side engines.

## Game References

| Need | Frontend reference | Backend reference |
| --- | --- | --- |
| Dragging over a grid | `src/frontend/games/bonegle/BonegleEngine.tsx`: pointer capture, circular hit targets, SVG path, iframe document listeners | `src/server/games/bonegle/engine.js`: word/path validation and scoring |
| Board generation and dictionaries | Render the server board; do not generate it in React | `src/server/games/bonegle/board.js`: dice, PRNG, dictionary cache, root-relative file loading |
| Cards and trick-taking | `src/frontend/games/midnight-alley/MidnightCards.tsx` and `MidnightAlleyEngine.tsx`: card views, bids, hand layout, score summaries | `src/server/games/midnight-alley/`: deck, rules, engine, bots, private-state projection |
| Timers | Display the projected deadline and server phase | `src/server/services/matches.js`: authoritative scheduling and automatic moves |
| Results and rematch | Existing `VictoryModal` and arena flow | Existing `finishMatch`, room routes, and lifecycle services |

The frontend Midnight Alley helpers anticipate legal moves and current winners for presentation; the backend remains authoritative. Keep any duplicated pure rules aligned or extract a shared pure helper when worthwhile.

## Shared UI and Audio

- `src/frontend/components/GameStageFrame.tsx`: iframe portal and isolated game styles.
- `src/frontend/components/GameArena.tsx`: room HUD, chat, countdown and engine mounting.
- `src/frontend/types/game.ts`: manifests and engine/settings props.
- `src/frontend/utils/audio.ts`: shared `soundstage`; inspect the exported methods before using a sound.
- `src/frontend/utils/avatars.tsx`: `AvatarIcon` and `AVATAR_LIST`; `CUSTOM_AVATARS` is a compatibility alias.

Imports from a game folder:

```tsx
import { AvatarIcon } from '../../utils/avatars';
import { soundstage } from '../../utils/audio';
```

Existing cues include `playTap`, `playRoundBell`, `playScoreTrumpet`, `playSlideDown`, `playBulbHorn`, `playTileSelect`, and `playTileBacktrack`. Use local cues for interaction and server-confirmed state changes for result sounds; do not award scores because a sound played.

## Assets

Profile PNGs live only in `src/frontend/assets/avatars` and are imported by `avatars.tsx`. Do not copy them to `public/avatars`. Vite generates base-aware hashed asset URLs.

Current IDs: `aviator`, `boxer`, `astronaut`, `chef`, `fisherman`, `gymbro`, `magician`, `nursse`, `scientist`, `superman`. `nurse` is normalized to `nursse` for compatibility.

Use imports for game UI images. Reserve `public` for resources requiring stable URLs; Bonegle dictionaries remain in `public/dict` and are read on the server.

## Visual Conventions

Preserve the established illustrated tabletop style, Lucide icons, typography, palette, controls, and responsive behavior. Inspect `src/frontend/index.css` and neighboring components for actual current tokens and classes rather than inventing a second design system or assuming old token values still exist.

Games mount inside an iframe. Use `ownerDocument`, pointer capture and stable layout dimensions; release, cancellation, and lost capture must clean up local drag state. Avoid effects that recreate canonical game state on timer ticks or callback changes.