# Vortilex — Design System & Style Reference
> Theatrical 1930s Fleischer Studios & Cuphead Word Brawler.

**Theme:** Light (Aged Parchment, Celluloid Film Grain & Technicolor Cel-Shading)  
**Target File:** `public/index.html`, `public/styles.css`, `public/app.js`, `public/audio.js`

---

## 1. Subject Matter & Design Philosophy

### The Brief
*Vortilex* is a real-time multiplayer word-search battleground (Boggle core mechanics) reimagined as a 1930s theatrical cartoon short produced by Fleischer Studios and styled after the hand-drawn aesthetic of Studio MDHR’s *Cuphead*. Players join a shared boxing ring, race against an antique brass stopwatch to connect adjacent letters on a wooden letter die grid, and score points by finding exclusive words. When two or more players uncover the same word, the judges strike it out without mercy.

### The Visual Metaphor
The entire application lives inside a 1930s cinema projector hall:
1. **The Celluloid Film Projection:** Shimmering film grain, vertical scratch lines, subtle projector flicker, and an ambient vignetted lens border frame every screen.
2. **Ink Registration & Woodcut Printing:** Bold, unevenly weighted black ink outlines (`3.5px` to `5px`), hard-edged offset cel drop shadows with zero Gaussian blur, and hand-cut woodblock typography.
3. **The Rubberhose Cartoon Boxing Ring:** Bouncy, bendy limbs, pie-cut cartoon eyes, oversized boxing gloves, brass ring bells, parchment ticket stubs, and ragtime stride-piano acoustic feedback.
4. **Physical Tactility:** Paper slips, stamped tickets with dashed perforations, brass clockwork, and hand-inked cross-examination broadsheets.

### Distinctive Choices vs. Generic Defaults
Unlike conventional SaaS card layouts or modern minimalist puzzle games:
- **No bland blur shadows (`rgba(0,0,0,0.1)` with 20px blur):** Replaced with sharp, hard-offset cel-shading (`--shadow-cel-md: 4px 4px 0px #1c1511`) directly inspired by comic book printing.
- **No generic sterile white `#ffffff` canvas:** Replaced by aged, warm Sepia Parchment (`#f3e7cb`) with textured diagonal grain and radial lamp washes.
- **No cookie-cutter sans-serif stacks:** A deliberate 4-tier typographic orchestration pairing comic woodcut display, theatrical saloon serif, friendly rounded body sans, and manual typewriter mono.
- **No generic purple/blue gradient buttons:** High-voltage Cuphead Carmine Red (`#d33833`) and Golden Buttercup (`#f6c445`) with heavy ink strokes, striped hatch patterns, and tactile pressed-button translation (`translate(3px, 3px)`).

---

## 2. Tokens — Colors

The palette is rooted in early 3-strip Technicolor and aged paper stock, punctuated by stark ink blacks and punchy primary hues.

| Name | Hex Value | CSS Variable | Semantic Role |
|------|-----------|--------------|---------------|
| **Canvas Parchment** | `#f3e7cb` | `--color-canvas-parchment` | Primary page canvas, warm card base, antique paper ground. |
| **Parchment Deep** | `#e8d7b3` | `--color-parchment-deep` | Recessed container tracks, toggles background, 3rd place bronze podium. |
| **Ink Black** | `#1c1511` | `--color-ink-black` | Core structural outline, hard cel drop shadows, primary bold text, pie-cut pupils. |
| **Ink Stroke** | `#2b1e17` | `--color-ink-stroke` | Cartoon mascot boots, deeper inked linework and borders. |
| **Cuphead Red** | `#d33833` | `--color-cuphead-red` | Primary high-impact CTA button, KO banners, urgent timer track, invalid word toasts, cancelled word strikethroughs. |
| **Cuphead Red Hover** | `#b72722` | `--color-cuphead-red-hover` | Active/hover state for primary red buttons and badges. |
| **Golden Buttercup** | `#f6c445` | `--color-golden-buttercup` | Title wordmarks, selected tile highlight, 1st place gold podium, secondary buttons, bell triggers. |
| **Golden Hover** | `#e5b02f` | `--color-golden-hover` | Hover state for buttercup gold elements. |
| **Mugman Cyan** | `#3e88a5` | `--color-mugman-cyan` | Secondary mascot accent, direct invite challenge ticket, duplicate word notifications. |
| **Glove Ivory** | `#fdfbf5` | `--color-glove-ivory` | Unselected letter dice face, card surfaces, white button text, contrast badges. |
| **Sepia Wash** | `rgba(28, 21, 17, 0.08)` | `--color-sepia-wash` | Background shading, stats table striping, parchment debossing. |

### Color Rules & Hierarchy
1. **Red (`#d33833`) is the Boss:** Reserved for the principal action on each screen ("¡CREAR SALA!", "¡ENTRAR AL RING!", "¡SUENA LA CAMPANA!", "¡OTRO COMBATE!") and negative/cancellation states.
2. **Gold (`#f6c445`) is the Spotlight:** Reserved for game branding ("VORTILEX"), active drag paths, points stars, and victory podium highlights.
3. **Ink Black (`#1c1511`) is the Bone Structure:** Every container, card, input, and tile MUST be encapsulated by a visible ink stroke (`>= 2px`). Floating borderless cards are strictly forbidden.

---

## 3. Tokens — Typography

The system employs four deliberately paired typefaces, each with an uncompromising role:

```
┌────────────────────────────────────────────────────────────────────────┐
│  TYPOGRAPHIC ORCHESTRATION                                             │
├──────────────────────┬─────────────────────────┬───────────────────────┤
│  LUCKIEST GUY        │  RYE                    │  FREDOKA              │
│  Loud Woodcut Display│  Theatrical Saloon Serif│  Friendly Body Sans   │
│  Titles, CTAs, Tiles │  Marquees, Ribbons, Tags│  Rules, Copy, Inputs  │
├──────────────────────┴─────────────────────────┴───────────────────────┤
│  SPECIAL ELITE                                                         │
│  Mechanical Manual Typewriter Mono                                     │
│  Ticket Stubs, Room Codes, Direct URLs                                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Typeface Definitions

#### 1. Luckiest Guy (`--font-luckiest-guy`)
- **Category:** Cursive / Heavy Woodblock Cartoon Display
- **Source:** Google Fonts
- **Weight:** 400 (Ultra Heavy)
- **Role:** Main titles, marquee logo, round clock digits, board letter tiles, primary button labels, and scoreboard counters.
- **Styling Characteristic:** Often styled with `-1deg` or `1deg` tilt, text shadows with pure white highlights or black drop shadows.

#### 2. Rye (`--font-theatre-rye`)
- **Category:** 1930s Circus / Saloon / Theatrical Slab Serif
- **Source:** Google Fonts
- **Weight:** 400
- **Role:** Theatrical credits ("FLEISCHER & STUDIO PRESENT"), ribbon banners ("A WORD BRAWL IS SURELY BREWING!"), ticket stub tags, and form labels.
- **Styling Characteristic:** Generous letter-spacing (`0.06em` to `0.15em`), uppercase styling.

#### 3. Fredoka (`--font-comic-fredoka`)
- **Category:** Rounded Geometric Humanist Sans-Serif
- **Source:** Google Fonts
- **Weights:** 500 (Medium), 600 (SemiBold), 700 (Bold)
- **Role:** Narrative copy, explanations, player alias input, game instructions, and lexicon lists.
- **Styling Characteristic:** Soft terminals that echo 1930s ink bleed, keeping long text pleasant and easy to read.

#### 4. Special Elite (`--font-typewriter-elite`)
- **Category:** Vintage Mechanical Typewriter Monospace
- **Source:** Google Fonts
- **Weight:** 400
- **Role:** Shareable room ticket codes, server URLs, date stamps, and secondary technical labels.
- **Styling Characteristic:** Smudged ink edges resembling genuine inked ribbons.

### Type Scale

| Role | Family | Weight | Size (Desktop) | Size (Mobile) | Line Height | Tracking | Token |
|------|--------|--------|----------------|---------------|-------------|----------|-------|
| **Display Hero** | Luckiest Guy | 400 | `62px` | `34px` | `0.95` | `0.04em` | `--text-display-hero` |
| **Marquee Wordmark** | Luckiest Guy | 400 | `44px` | `30px` | `0.95` | `0.05em` | `--text-wordmark` |
| **Section Title** | Luckiest Guy | 400 | `26px` | `20px` | `1.10` | `0.05em` | `--text-title` |
| **Tile Letter** | Luckiest Guy | 400 | `30px` | `24px` | `1.00` | `0.02em` | `--text-tile` |
| **Button Primary** | Luckiest Guy | 400 | `22px` | `18px` | `1.00` | `0.06em` | `--text-btn-lg` |
| **Clock Digits** | Luckiest Guy | 400 | `28px` | `24px` | `1.00` | `0.00em` | `--text-clock` |
| **Ribbon / Eyebrow**| Rye | 400 | `14px` | `12px` | `1.20` | `0.10em` | `--text-ribbon` |
| **Vintage Label** | Rye | 400 | `13px` | `12px` | `1.20` | `0.06em` | `--text-label` |
| **Body Standard** | Fredoka | 600 | `16px` | `15px` | `1.50` | `normal` | `--text-body` |
| **Body Small** | Fredoka | 600 | `13px` | `12px` | `1.35` | `normal` | `--text-body-sm` |
| **Typewriter Code** | Special Elite | 400 | `16px` | `14px` | `1.00` | `0.08em` | `--text-mono-code` |

---

## 4. Tokens — Elevation, Linework & Textures

### Hard Inked Shadows (Cel-Shading)
No blur radius is permitted on UI elements. Shadows are sharp, solid ink offsets that mimic cel acetate placed over gouache backgrounds:

```css
--shadow-cel-sm:    2.5px 2.5px 0px var(--color-ink-black);
--shadow-cel-md:    4px 4px 0px var(--color-ink-black);
--shadow-cel-lg:    6px 6px 0px var(--color-ink-black);
--shadow-cel-inset: inset 2px 2px 0px rgba(255, 255, 255, 0.4), inset -2px -2px 0px rgba(0, 0, 0, 0.2);
```

### Inked Linework
```css
--border-ink-thin:     2px solid var(--color-ink-black);
--border-ink-standard: 3.5px solid var(--color-ink-black);
--border-ink-thick:    4.5px solid var(--color-ink-black);
--border-frame:        5px solid var(--color-ink-black);
```

### Corner Radii
```css
--radius-cel-box:  14px;      /* Standard panels, cards, and modal sheets */
--radius-tile:     10px–16px; /* Die faces */
--radius-cel-pill: 9999px;    /* Chips, badges, and toggle switches */
```

### Atmospheric Film Overlays
1. **Film Vignette (`.film-vignette`):** Fixed radial shading darkening the corners:
   `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(28,21,17,0.38) 100%)`
2. **Film Scratches (`.film-scratches`):** Repeating scanline texture animated with a 2-step jitter cycle (`animation: filmFlicker 0.22s infinite steps(2)`).
3. **Parchment Canvas Background:** Dual gradient combining a subtle radial hot-spot and 45° halftone ink lines.

---

## 5. Screen Architectures & Wireframes

The experience flows across 4 theatrical screens:

### Screen 1: Theatrical Title Card & Bout Lobby (Home)
```
┌────────────────────────────────────────────────────────────────────────┐
│ ★ ★ ★    FLEISCHER & STUDIO PRESENT: VORTILEX        [SFX: ON]   ★ ★ ★ │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                 ★ A WORD BRAWL IS SURELY BREWING! ★                    │
│                                                                        │
│    [ DICE MASCOT ]          ¡UNE LETRAS!          [ INK BOTTLE ]       │
│    (Rubberhose Boxing)  ¡ANULA A TUS RIVALES!     (Cheering Fan)       │
│                             ¡GANA POR KO!                              │
│                                                                        │
│ ────────────────────────────────────────────────────────────────────── │
│                    SELECCIONA EL FORMATO DEL DUELO                     │
│                                                                        │
│   ┌──────────────┐     ┌──────────────────────┐     ┌──────────────┐   │
│   │ 4x4 EXPRÉS   │     │  ★ 5x5 EL COMBATE ★  │     │ 6x6 PESADO   │   │
│   │ 1 MINUTO     │     │  (RECOMENDADO)       │     │ 3 MINUTOS    │   │
│   └──────────────┘     └──────────────────────┘     └──────────────┘   │
│                                                                        │
│ ────────────────────────────────────────────────────────────────────── │
│   [🥊] ALIAS: [ Púgil Parlante    ]  IDIOMA: [ES][EN]  TIEMPO: [1][2][3]│
│                                                                        │
│             ┌────────────────────────────────────────────┐             │
│             │   ★ ¡CREAR SALA Y DESAFIAR! ★ (Red Button) │             │
│             └────────────────────────────────────────────┘             │
│                                                                        │
│                   O INTRODUCE UN TICKET DE ACCESO                      │
│             [ CÓDIGO: ABCD       ]  [ ¡UNIRSE! ➔ ]                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 2: Locker Room / Waiting Ring
```
┌────────────────────────────────────────────────────────────────────────┐
│                        VESTUARIO DE COMBATE                            │
│                    EL CUADRILÁTERO ESTÁ ABIERTO                        │
│                                                                        │
│   ENLACE DIRECTO: [ http://vortilex.game/?room=K9Q2  ] [ COPIAR 📋 ]   │
│                                                                        │
│   ┌───────────────────┬───────────────────┬────────────────────────┐   │
│   │ CUADRÍCULA: 5x5   │ DICCIONARIO: ES   │ ASALTO: 2:00 MIN       │   │
│   ├───────────────────┴───────────────────┴────────────────────────┤   │
│   │ REGLA DE ORO: ¡Palabras repetidas se tachan sin piedad!        │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│   LUCHADORES EN EL RING (2):                                           │
│   ┌───────────────────────────┐   ┌───────────────────────────┐        │
│   │ 🥊 Púgil Parlante (HOST)  │   │ 🎲 Rival Veloz            │        │
│   └───────────────────────────┘   └───────────────────────────┘        │
│                                                                        │
│             ┌────────────────────────────────────────────┐             │
│             │  🔔 ¡SUENA LA CAMPANA! (EMPEZAR COMBATE)   │             │
│             └────────────────────────────────────────────┘             │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 3: The Bout Arena (Live Gameplay)
```
┌────────────────────────────────────────────────────────────────────────┐
│  [LEFT CORNER]           [CENTER STAGE]            [RIGHT CORNER]      │
│                                                                        │
│  ┌────────────────┐   ┌─────────────────────────┐  ┌────────────────┐  │
│  │ BRASS STOPWATCH│   │ WORD CAPSULE:           │  │ RIVALES (2):   │  │
│  │   ( 01:45 )    │   │ [ V O R T I L E X ] +11 │  │ • Púgil: 6 w   │  │
│  │   SEGUNDOS     │   └─────────────────────────┘  │ • Rival: 4 w   │  │
│  └────────────────┘   ┌─────────────────────────┐  └────────────────┘  │
│                       │ █ 5x5 WOODCUT BOARD █   │                      │
│  ┌────────────────┐   │  [B]─[O]─[G] [G] [L]    │  ┌────────────────┐  │
│  │ SCORE DIAL:    │   │   │                     │  │ TUS GOLPES (6):│  │
│  │ PALABRAS: 8    │   │  [E] [A] [R] [T] [O]    │  │ [SOL] [MESA]   │  │
│  │ PUNTOS:   19   │   │  (Rubberhose drag line) │  │ [GATO] [ROSA]  │  │
│  └────────────────┘   └─────────────────────────┘  └────────────────┘  │
│                       ★ ARRASTRA EL RATÓN O DEDO ★                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Screen 4: The Knockout Podium & Word Collision Audit
```
┌────────────────────────────────────────────────────────────────────────┐
│                        ★ ¡KNOCKOUT FINAL! ★                            │
│                     EL VEREDICTO DE LOS JUECES                         │
│                                                                        │
│   PALABRA REINA ESCONDIDA:  [ CARACTERÍSTICA (14 LETRAS) ]             │
│                                                                        │
│                         EL PODIO DE CAMPEONES                          │
│               ┌──────────────────────────────────────┐                 │
│               │             👑 1º PUESTO             │                 │
│               │          🥊 Púgil Parlante           │                 │
│               │              34 PUNTOS               │                 │
│               │     12 Encontradas · 4 Anuladas      │                 │
│               └──────────────────────────────────────┘                 │
│                                                                        │
│ ────────────────────────────────────────────────────────────────────── │
│                   REVISIÓN DE ASALTOS & ANULACIONES                    │
│                                                                        │
│   [ 🥊 Púgil Parlante ]             [ 🎲 Rival Veloz ]                 │
│   • ÚNICAS (SUMARON):               • ÚNICAS (SUMARON):                │
│     [CABALLO +5] [TIERRA +3]          [BARCO +2] [PUERTA +3]           │
│   • ANULADAS (COINCIDENCIA):        • ANULADAS (COINCIDENCIA):         │
│     [~~GATO~~] [~~MESA~~]             [~~GATO~~] [~~MESA~~]            │
│                                                                        │
│ ────────────────────────────────────────────────────────────────────── │
│   [📜 TODAS LAS PALABRAS POSIBLES DE ESTE TABLERO (142)           ▼]   │
│                                                                        │
│   [ ¡OTRO COMBATE! 🔔 (Red Button) ]   [ SALIR A LA CARTELERA ]        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Component Catalog & Blueprint Specs

### 1. Theatrical Marquee Header (`.cuphead-marquee`)
- Sticky positioning (`top: 0`, `z-index: 100`).
- Bottom border: `4.5px solid var(--color-ink-black)`.
- Left and right ornamental stars (`★ ★ ★`) rendered in `Rye` gold.
- Central title card box with `-1deg` rotated wordmark and subtle hover zoom (`scale(1.03)`).
- **Room Ticket Stub (`.room-ticket-badge`):** Dual-cell container with a dashed perforation divider (`border-right: 2px dashed #1c1511`), displaying room code in `Luckiest Guy` and a copy button trigger.

### 2. Punch Buttons
- **Primary Wallop Button (`.btn-brawl-primary`):**
  - Background: Cuphead Red (`#d33833`) with subtle repeating -45° white hatch strips (`rgba(255,255,255,0.06)`).
  - Border: `4.5px solid #1c1511`.
  - Shadow: `4px 4px 0px #1c1511`.
  - Hover: Translates `translateY(-3px)`, shadow expands to `6px 6px`.
  - Active: Translates `translate(3px, 3px)`, shadow collapses to `1px 1px`.
- **Secondary Buttercup Button (`.btn-brawl-secondary`):**
  - Background: Golden Buttercup (`#f6c445`).
  - Text: Ink Black (`#1c1511`).
  - Border: `3.5px solid #1c1511`.

### 3. Woodcut Mode Cards (`.cuphead-bout-card`)
- Three grid options: `4x4 Duelo Rápido`, `5x5 El Gran Combate`, `6x6 Peso Pesado`.
- Micro board preview built with CSS Grid mini dots that turn red on card selection.
- Featured Card (`5x5 Pro`): Styled with `--color-golden-buttercup` background and `★ RECOMENDADO ★` ribbon tag.

### 4. Letter Dice Tiles (`.tile`)
- **Dimensions:**
  - `4x4`: `76px × 76px` (Mobile: `62px`)
  - `5x5`: `64px × 64px` (Mobile: `52px`)
  - `6x6`: `52px × 52px` (Mobile: `44px`)
- **Visual Structure:**
  - Base surface: Glove Ivory (`#fdfbf5`).
  - Inked border: `3.5px solid #1c1511`.
  - Corner radius: `16px`.
  - Debossed hit-target: Circular dashed inner ring (`::before`, `78%` width/height, `1.5px dashed rgba(28,21,17,0.16)`).
- **Selection States:**
  - In Path: Background turns `--color-golden-buttercup`, transforms `scale(1.1) rotate(1deg)`.
  - Head of Path (`.last-selected`): Background turns `--color-cuphead-red`, letter turns ivory, dashed outer ring `outline: 2px dashed #1c1511`, transforms `scale(1.15) rotate(-2deg)`.

### 5. Rubberhose Drag Trail (`.rubberhose-trail-svg`)
An absolute SVG canvas layered over the tile grid renders a vintage cartoon connection cord in real time:
- **Outer Ink Stroke (`.kofi-trail-outer`):** `stroke-width: 16px`, `#1c1511`, rounded caps and joins.
- **Inner Core Stroke (`.kofi-trail-inner`):** `stroke-width: 9px`, `#f6c445`.
- **Rubberhose Whip Tip (`.kofi-trail-cursor`):** Dashed red line (`dasharray: 8 6`, `#d33833`) trailing to the user's current cursor position.

### 6. Antique Mechanical Stopwatch (`.hud-clock-panel`)
- Brass circular housing with SVG radial progress indicator.
- Track thickness: `9px` stroke in Ink Black.
- Active hand: Cuphead Red with round cap.
- **Urgent State (`.timer-urgent`, remaining time < 15s):**
  - Stroke turns `#ff1100` with pulse glow (`animation: clockFlicker`).
  - Digits tremble violently in terror (`animation: toonTremble 0.15s infinite`).

### 7. Results Podium & Collision Audit Grid
- **Podium Cards:**
  - Rank 1: Golden Buttercup, scaled `1.03`, crown badge.
  - Rank 2: Glove Ivory.
  - Rank 3: Deep Parchment.
- **Collision Chips (`.audit-chip`):**
  - Unique words: Gold pill (`#f6c445`) with `+Points` star badge.
  - Collided words: Red pill (`#d33833`) with `text-decoration: line-through` and small subtitle label indicating which rival matched it.

---

## 7. Motion Choreography & Micro-Interactions

Motion must feel like 24fps hand-drawn animation rather than slick, frictionless modern transitions.

| Animation Class / Keyframe | Trigger / Target | Description |
|----------------------------|------------------|-------------|
| `toonIrisIn` | Screen navigation | Quick bouncy scale entrance (`scale(0.97)` to `scale(1)` via elastic bezier). |
| `toonBounceLeft / Right` | Hero Mascots | 2.2s gentle rubberhose bobbing with alternating rotation (`-2deg` to `3deg`). |
| `gloveSpin` | Waiting lobby | 360° linear rotation of the cartoon boxing glove icon. |
| `toonTremble` | Timer under 15s | Jittery multi-directional oscillation simulating cartoon anxiety. |
| `toonToastPop` | Word validation | Elastic pop scale (`scale(0.6)` to `scale(1)`) for instant positive feedback. |
| `filmFlicker` | Celluloid overlay | 2-step infinite flicker simulating 1930s projector arc-lamp variance. |

---

## 8. Procedural Audio System (1930s Soundstage)

Audio is generated procedurally via the browser Web Audio API in `public/audio.js`, routed through an antique 78 RPM gramophone filter:

### 1. The Gramophone Bandpass Filter
```js
// Simulates the acoustic horn frequency curve of a 1930s phonograph
const filter = ctx.createBiquadFilter();
filter.type = 'bandpass';
filter.frequency.setValueAtTime(1400, ctx.currentTime);
filter.Q.setValueAtTime(0.65, ctx.currentTime);
```

### 2. Audio Cue Dictionary
- **Tile Drag Tap:** Ragtime stride-piano chord progression mapped across a major pentatonic scale (`C4`, `D4`, `E4`, `G4`, `A4`, `C5`, `D5`, `E5`), accompanied by a sharp wooden block click (`triangle + sine`).
- **Word Wallop Accepted:** Low comic bass thud followed by an upbeat ragtime brass trumpet chime.
- **Duplicate Word:** Playful bulb-horn honk ("quack-quack").
- **Invalid Word / Path Break:** Slide whistle descending downward.
- **Round Bell Start:** High-resonance brass boxing ring bell gong (`880Hz + 1760Hz`).
- **Round End (Knockout):** Triple boxing bell ding followed by a comical sad slide trombone.

---

## 9. Voice, Copywriting & Vernacular

Every piece of UI copy speaks with the boisterous enthusiasm of a 1930s circus ringmaster and boxing commentator.

### Editorial Guidelines
1. **Never use generic clinical jargon:**
   - Instead of *"Submit Word"*, use **"¡GOLPE!"** or **"¡WALLOP!"**.
   - Instead of *"Lobby Waiting Room"*, use **"VESTUARIO DE COMBATE"**.
   - Instead of *"Results & Score Breakdown"*, use **"EL VEREDICTO DE LOS JUECES"**.
   - Instead of *"Duplicate Words"*, use **"PALABRAS ANULADAS POR CRUCE"**.
2. **Active Voice & Exclamation:**
   - Buttons announce the immediate event: *"¡SUENA LA CAMPANA!"*, *"¡ENTRAR AL RING!"*, *"¡OTRO COMBATE!"*.
3. **Humorous Ring Announcer Praises:**
   - When a player scores a long word: *"¡MENUDO GOLPE!"*, *"¡A LA MANDÍBULA!"*, *"¡ZAP!"*, *"¡DE PRIMERA!"*.

---

## 10. Design Checklist & Self-Critique Rules

Before adding or modifying any UI component in the codebase, verify against this strict design criterion:

- [ ] **Is it framed in ink?** Every panel and button has a solid `2px` to `5px` black stroke.
- [ ] **Are the shadows hard-edged?** No `blur-radius` on drop shadows; only offset solid ink blocks.
- [ ] **Does it respect the 4-tier font system?**
  - Titles/Numbers: `Luckiest Guy`
  - Banners/Ribbons: `Rye`
  - Body/Rules: `Fredoka`
  - Codes/Urls: `Special Elite`
- [ ] **Does it look tactile?** Buttons should depress into the screen by `2px`–`3px` when clicked.
- [ ] **Is the copy in-character?** No corporate modern language; retain the 1930s theatrical brawl persona.
- [ ] **Is motion responsive?** Animations should snap cleanly without sluggish ease-in fades.
