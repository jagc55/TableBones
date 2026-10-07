# TableSkull Component & Asset Catalog

When building a new game, leverage existing components, mechanics, and design tokens rather than building from scratch.

---

## 1. Existing Game Patterns to Borrow From

### A. Card Games & Trick-Taking (`src/games/midnight-alley/`)
- **Playing Cards**: SVG card frames, suit badges, character fedoras, and suit icons (`MidnightCards.tsx`).
- **Blind Bidding Stepper**: Bid counter component with `soundstage.playTap()` and public bid revelation chips.
- **Card Action Animations**: Card throw animation, trick winner banner, and card fan layouts.
- **Turn-based Hand Cycling**: Hands 1 to 10 scaling logic (`midnightAlleyLogic.ts`).
- **Bot Strategy Pattern**: Simulating bot card ducking or aggressive bidding based on legal plays (`chooseBotPlay`).

### B. Grid, Swiping & Word Games (`src/games/bonegle/` & `src/games/vortilex/`)
- **SVG Swipe / Drag Trail Engine**: Smooth rubber-hose line rendering connecting cells with dynamic SVG quadratic curves and circle beads (`BonegleEngine.tsx`).
- **Dice Grid**: 3D-styled wooden letter dice with tilt transforms, hover wobbles, and selected states.
- **Trie Dictionary Search**: Fast client-side prefix tree lookup for English & Spanish vocabulary (`bonegleLogic.ts`).
- **Word Bank Sidebar**: Clean vintage receipt listing submitted words with point badges (`BonegleComponents.tsx`).
- **Revelation View**: Modal table revealing every player's hidden words, unique bonus multipliers, and missed high-scoring words.

### C. Dice, Bidding & Bluffing Games (`src/games/skull-bones/`)
- **Leather Dice Cup**: Rattle animation and rolling sounds (`SkullBonesEngine.tsx`).
- **Secret Dice Tray**: Concealed dice display with visibility toggle.
- **Bid Increment Stepper**: Quantity and face increase validation (`skullBonesLogic.ts`).
- **Bluff Calling Standoff**: Showdown card with table total comparison and caught bluff score rewards.

---

## 2. Platform Audio Soundstage (`src/utils/audio.ts`)

Import the unified soundstage instance:
```typescript
import { soundstage } from '../../utils/audio';
```

Available sound triggers:
| Method | Description | Best Used For |
| :--- | :--- | :--- |
| `soundstage.playTap()` | Mechanical wooden click | Button clicks, tile selection, option selection |
| `soundstage.playCardDeal()` | Fast paper card slide | Dealing hands, round start |
| `soundstage.playCardPlay()` | Crisp card slap | Placing a card or piece on table |
| `soundstage.playRoundBell()` | Boxing ring bell chime | Starting round, confirming submission, rolling dice |
| `soundstage.playScoreTrumpet()` | Jazzy brass trumpet fanfare | Capturing piece, scoring points, winning trick |
| `soundstage.playTimerTick()` | Clockwork ticking | Last 5 seconds of countdown |
| `soundstage.playTimerWarning()` | Double horn honk | 10 seconds remaining warning |
| `soundstage.playRoundEnd()` | Descending whistle / buzzer | Clock expired, round complete |
| `soundstage.playSlideDown()` | Comic trombone slide | Forfeit, invalid word, failed challenge |
| `soundstage.playPentatonicStep(step)` | Stride piano note | Connecting consecutive tiles/nodes in chain |

---

## 3. Contender Avatars (`src/utils/avatars.ts`)

Render player avatars cleanly anywhere:
```typescript
import { AvatarIcon, AVATAR_LIST } from '../../utils/avatars';

<AvatarIcon id={player.avatarId} size={36} />
```

Available avatar IDs:
`'boxer'`, `'magician'`, `'aviator'`, `'gymbro'`, `'astronaut'`, `'fisherman'`, `'chef'`, `'nursse'`, `'scientist'`, `'superman'`.

---

## 4. Vintage 1930s Fleischer / Cuphead Design System

All games must look like authentic 1930s animated shorts. Use CSS variables and classes from `index.css`:

### Palette Tokens
```css
--color-canvas-parchment: #f6f0db;   /* Warm aged paper */
--color-parchment-deep: #e8dcb9;     /* Deep sepia card background */
--color-glove-ivory: #fdfbf5;        /* Cartoon glove white */
--color-cuphead-red: #d33833;        /* High-energy vintage red */
--color-golden-buttercup: #ffd043;   /* Marquee gold / brass */
--color-ink-black: #1c1511;          /* Heavy cartoon line ink */
--color-ink-stroke: #2b1e17;         /* Charcoal ink stroke */
--color-cyan-speakeasy: #00bcd4;     /* Speakeasy neon accent */
```

### Typography Fonts
```css
--font-luckiest-guy: 'Luckiest Guy', cursive;    /* Chunky marquee headings */
--font-theatre-rye: 'Theatre Rye', cursive;      /* Woodcut carnival headers */
--font-courier-prime: 'Courier Prime', monospace; /* Vintage typewriter print */
--font-heading: 'Luckiest Guy', cursive;
--font-body: 'Courier Prime', monospace;
```

### Essential Utility Classes
- `.cel-card`: 3px solid ink border, 16px border-radius, hard drop-shadow (`box-shadow: 4px 4px 0px var(--color-ink-black)`).
- `.btn-cel`: Tactile button with 3px ink borders and `:hover` / `:active` bounce transforms.
- `.btn-brawl-primary`: Red action button.
- `.btn-brawl-secondary`: Golden buttercup action button.
- `.btn-brawl-neutral`: Parchment neutral button.
- `.woodcut-title`: Heavy uppercase title with ink text stroke and letter-spacing.
- `.ribbon-banner`: Vintage golden ribbon badge.
- `.ticket-stub`: Perforated vintage admission ticket badge.
- `.codex-scoring-grid`: Grid for Mafia codex rules tables.
- `.score-rule-badge.badge-pos` / `.badge-neg` / `.badge-bonus`: Rules badges.
