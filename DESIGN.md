---
name: HK Random Route
description: A random Hong Kong walking and jogging route generator told in the grammar of airport and MTR directional signage.
colors:
  wayfinding-yellow: "#ffd21f"
  sign-ink: "#171400"
  signal-blue: "#2f6fed"
  covered-green: "#16a34a"
  steep-magenta: "#d81b60"
  position-green: "#35c874"
  alert-amber: "#ffb020"
  status-green: "#2f9e57"
  status-red: "#d6443f"
  error-text: "#c2322d"
  ground: "#f4f5f7"
  surface: "#ffffff"
  surface-raise: "#fbfbfb"
  ink: "#14181d"
  ink-dim: "#3d444d"
  ink-faint: "#5a626d"
  line: "#e3e6ea"
  line-strong: "#c6ccd3"
  gray: "#6b7280"
  gray-strong: "#565d66"
  gray-ink: "#ffffff"
  route-card: "#fcffe6"
typography:
  display:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "clamp(40px, 12vw, 64px)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.03em"
  hero:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.4
  headline:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
    lineHeight: 1.4
  body:
    fontFamily: "Hanken Grotesk, Noto Sans HK, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    letterSpacing: "0.16em"
  board:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 800
    letterSpacing: "0.05em"
  micro:
    fontFamily: "Hanken Grotesk, Noto Sans HK, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  icons:
    fontFamily: "Material Symbols Outlined, sans-serif"
    fontSize: "14px"
    fontWeight: 500
rounded:
  sign: "16px"
  control: "12px"
  small: "10px"
  tiny: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.gray}"
    textColor: "{colors.gray-ink}"
    rounded: "{rounded.control}"
    height: "52px"
    typography: "{typography.headline}"
  button-primary-hover:
    backgroundColor: "{colors.gray-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.control}"
    height: "44px"
    typography: "{typography.body}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "46px"
  icon-button:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.small}"
    size: "44px"
  preset:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.control}"
    height: "44px"
  preset-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
  sign-panel:
    backgroundColor: "{colors.surface-raise}"
    rounded: "{rounded.sign}"
  route-sign:
    backgroundColor: "{colors.route-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sign}"
---

# Design System: HK Random Route

## Overview

**Creative North Star: "The Sign System"**

A route tool that reads like a terminal's wayfinding signage: one decision at a time, only the choices ahead, distance in minutes. The interface refuses both the frosted-glass dock and the kinetic split-flap theatre this category keeps shipping. Instead it is a stack of sign boards over a light map — white panels with hairline borders, a single monotone plate for the route and a calm gray launch control for generate, black humanist sans, ink pictograms on the map-control fill, and monumental distance numerals that read like a departure board from across a concourse.

The map is the ground, not the chrome. Control surfaces are honest flat boards: the criteria sheet and the route result are collapsible signs; the generate band is a gray sign; the bottom rail is a utility bar with lamps. State is told with lamps and pictograms rather than prose — green when you are on route, red when you are off it, amber on the route badge and as the weather signal. The route card is a pale wayfinding-yellow plate in the light theme and a quiet monotone plate in the dark theme, like a night terminal that stays dark.

**Key Characteristics:**
- No saturated surface color competes with the map; the light-theme route card is a pale yellow-tinted plate (wayfinding yellow diluted to a paper-soft cream), the dark-theme route card stays a monotone plate, and saturated wayfinding yellow survives only as the selection/attention accent.
- Monumental distance numerals carry the primary decision; everything else is board type on a seven-step role scale (display / hero / headline / body / label / board / micro).
- Flat sign panels with hairline borders — no glass, no blur, no glow.
- Lamps and white-on-black pictograms carry state and actions.
- One surface decision at a time: criteria first, then the route sign, then actions.
- The route line is a signal-blue spine with green covered segments and magenta steep segments — the loudest colors on the route card.

## Colors

The palette is a wayfinding system: near-neutral ground that the map and signs sit on, a functional lamp family (green / red / amber), and the route's segment palette — signal blue, covered green, steep magenta — as the only saturated non-lamp colors.

### Primary
- **Wayfinding Yellow** (#ffd21f): no longer a saturated surface — in the light theme it is diluted to a pale route-card tint (#fcffe6), and it survives as the selection highlight. The dark-theme route card stays a monotone plate, so the map and the blue route line carry the color.
- **Sign Ink** (#171400): the yellow's fixed companion; kept for the selection highlight and the loading spinner's accent.
- **Generate Gray** (#6b7280): the primary generate action — a calm launch control for the route. Its companion is **Gray Ink** (#ffffff).
- **Generate Gray Deep** (#565d66): hover for the generate action (dark theme: #4b5563 → #3f4650).

### Secondary
- **Signal Blue** (#2f6fed): the route line's default segment and the origin dot. Chosen to stay distinct from the basemap's road yellow so the route stays the loudest color on the neutral route card.
- **Covered Green** (#16a34a): the route line's covered segments. A deeper saturated green than the live-position dot (#35c874) so a covered marker stays a data color and never reads as the position lamp.
- **Steep Magenta** (#d81b60): the route line's steep segments. A saturated pink data color that stays visually distinct from the signal-blue default so a steep marker reads at a glance.
- **Position Green** (#35c874): the live-GPS position dot.

### Tertiary (functional lamps)
- **Alert Amber** (#ffb020): the route-type badge lamp (loop / one-way / out-and-back) and the steady weather-signal lamp in the utility bar.
- **Status Green** (#2f9e57): on-route lamp and success semantics.
- **Status Red** (#d6443f): off-route and error lamps; **Error Text** (#c2322d) for readable alert copy.

### Neutral
- **Ground** (#f4f5f7): the page backdrop behind the map and dock.
- **Surface** (#ffffff): sign-panel background, fields, buttons, the utility rail.
- **Surface Raise** (#fbfbfb): raised panel fill (the sign panels).
- **Ink** (#14181d): primary text and the active/pressed fill.
- **Ink Dim** (#3d444d): secondary text and labels.
- **Ink Faint** (#5a626d): hints, placeholders, disabled hints.
- **Line** (#e3e6ea): hairlines and dividers; **Line Strong** (#c6ccd3): control strokes and button borders.

Dark mode keeps the neutrals' structure and re-skins them (ground #101418, surface #191f26, surface-raise #1e252d, ink #f2f4f6, ink-dim #b6bec7, ink-faint #8b94a0, lines as white alpha), steps the generate gray down (gray #4b5563, gray-strong #3f4650), and warms the lamp soft-fills. Map controls sit on the same map-control fill as the built-in zoom buttons — light on #f6f7f8 with a #eceef0 hover (#e1e4e7 press), dark on surface-raise #1e252d with a #29323b hover — reading as one neutral cluster with the zoom stack, just larger (44px over 40px). The route card is a pale wayfinding-yellow plate in the light theme and a quiet monotone plate in the dark theme; only the terminal around it goes dark.

### Named Rules
**The Monotone Plate Rule.** The route card is a pale wayfinding-yellow plate in the light theme and a quiet monotone plate in the dark theme — no saturated surface competes with the map or the route line. Wayfinding yellow is demoted to the pale route-card tint and the selection highlight; the generate action stays a calm gray launch control.

**The Segment Palette Rule.** The route line is a tri-color segment palette: signal blue (#2f6fed) by default, covered green (#16a34a) for covered segments, steep magenta (#d81b60) for steep segments. The origin dot is the same signal blue. The three hues sit far apart on the wheel so adjacent segments stay distinguishable on both themes; the segment colors must never be the lamp amber — conditions are data colors, state is a lamp.

## Typography

**Display Font:** Hanken Grotesk (with system-ui fallback), weights 400–900
**Body Font:** Hanken Grotesk + Noto Sans HK (Latin and Traditional Chinese via the `--font-sans` / `--font-hk` stacks)
**Icon Font:** Material Symbols Outlined (14px, wght 500), subset to the two pictograms used on the route sign — `accessible` and `wb_shade`

**Character:** Humanist sans that reads like a station sign — confident, mechanical in weight, no serifs. Board micro-labels are set wide and uppercase; the one display numeral is enormous and tight-tracked.

### Hierarchy
- **Display** (900, `clamp(40px, 12vw, 64px)`, tight): the route distance on the route sign — the single loudest number on screen.
- **Hero** (800, 24px): the criteria distance plate numeral — the loudest number on a control.
- **Headline** (800, 17px): data numerals (walk/run/gain), the distance field value, active presets, the generate label.
- **Body** (400/700, 15px, 1.5): base text, street names, status rows, button and check labels.
- **Label** (800, 11px, 0.16em uppercase): panel heads (CRITERIA / ROUTE), the route badge, via and section labels.
- **Board** (800, 10px, 0.05em uppercase): captions on the route sign's plates — the pictogram factors (COVERED / BARRIER-FREE / 有蓋 / 無障礙) and the stat captions (WALKING TIME / RUNNING TIME / ELEVATION GAIN / 步行時間 / 爬升) — the label role stepped down one size so a caption holds two lines on its narrow plate.
- **Micro** (600, 12px): hints, errors, field units, credits, the language chip.

### Named Rules
**The Board Type Rule.** Every caption and panel head is letter-spaced uppercase board type at 11px (the label role), except captions on the route sign's plates, which step down to the board role at 10px so they hold one to two lines on a narrow plate. Never set a caption in sentence-case body type — wayfinding labels are pre-read, not read.

**The Monumental Distance Rule.** The route distance is the loudest type in the system. Nothing else gets the display scale; if two numbers fight, one of them is wrong.

**The Role Scale Rule.** Type lives on a seven-step role scale (display / hero / headline / body / label / board / micro). A new size is a new role with a job, never an adjustment — adjust by choosing a role.

## Layout

The app is a fixed full-viewport flex column: the map on top, the dock below. On mobile the map is ~48vh and the dock (a scrollable stack of sign panels, then the pinned generate band, then the utility rail) takes the rest; on desktop (≥768px) the map is full-bleed and the dock floats at the top-left as one panel.

On mobile the control type steps down a notch to make room for the taller map — the distance plate numeral, preset numerals, criteria labels, and generate label drop one step (hero 24→20, headline 17→15, body 15→14) — while the route card's display numeral stays loud and all 44px touch targets hold.

The dock is a column of collapsible sign panels in a scroll region, a **pinned generate band**, and a **pinned utility rail**. Sign panels (CRITERIA, ROUTE) stack with an 8px rhythm (12px on desktop) inside a 680px-max column; each panel is 16px-radius at rest, stepping to 12px inside the desktop dock (16 → 12 → 12 nesting). The generate band is outside the scroll area so its actions stay visible; it carries the follow strip, the route actions, and the gray generate/regenerate sign. The utility rail pins below it.

Density is deliberately tight and mechanical: 8px gaps between controls, 16px panel padding, 44px touch targets throughout, 52px for the primary sign (56px when the idle band runs edge-to-edge). Nothing is "airy"; the terminal is packed with what the runner needs and nothing else.

### Named Rules
**The Sign Panels Rule.** Content arranges as stacked, collapsible sign panels. Never float individual controls over the map in glass chips; if it is a control, it belongs on a sign.

**The Pinned Actions Rule.** Whatever the runner can act on while moving — follow, save, export, share, regenerate — lives in the pinned band, never in a place that scrolls away.

## Elevation & Depth

Depth is minimal and earned. Signs are flat at rest; shadows exist only to separate the dock from the map and the route sign from the dock.

### Shadow Vocabulary
- **Sign Shadow** (`0 1px 2px rgb(16 20 26 / 0.06), 0 8px 20px rgb(16 20 26 / 0.12)`): lifts the route card off its panel stack.
- **Float Shadow** (`0 2px 6px rgb(16 20 26 / 0.1), 0 10px 24px rgb(16 20 26 / 0.16)`): lifts the whole floating dock off the map on desktop. The floating dock is borderless — shadow alone separates it from the map; the dock keeps its hairline seam only where it sits edge-to-edge (mobile).

### Named Rules
**The Flat-By-Default Rule.** Panels and buttons are flat. Depth is the dock, the sign, and the map overlay chips (the origin-confirm and origin-hint plates float over the basemap and need their float shadow to separate from it) — only these cast shadows. Hover on secondary controls changes fill, never adds glow or lift.

## Shapes

The form language is signage geometry: soft corners, hairline strokes, square pictogram insets. Radii step down the nesting: sign panels 16px, controls 12px, small buttons 10px, map floating buttons 8px (app controls, kept distinct from the map's own 4px built-in zoom stack by size — 44px over 40px — while sharing its map-control fill). Buttons are rectangles with 12px corners — never pills. Map pictograms render as ink glyphs on the map-control fill, and as plain icons elsewhere.

## Components

### Buttons
- **Shape:** 12px corners; the primary is a full-width 52px sign slab, secondary and text controls are 44px.
- **Primary (Generate):** generate gray fill (#6b7280) with white text, weight 800, uppercase, ~0.08em tracking, no arrow glyph. Hover darkens to gray-strong (#565d66) with a float-shadow lift; press nudges down 1px. Loading swaps the label for a spinner; the gray holds. While idle the full-bleed GO bar breathes toward its hover state (a reduced-motion-aware attention pulse) so the calmer gray still reads as live.
- **Secondary (Regenerate / Follow):** white fill, 1px strong line stroke, ink-dim text. Hover raises the fill and darkens to ink. Follow active inverts to a solid ink fill with surface text.
- **Ghost:** the icon button — 44px, 10px corners, no stroke until the action row gives it one; ink-dim icon, hover raises the fill.

### Icon Buttons (Map + Utility)
- **Style:** 44px hit area everywhere, 10px corners; map buttons share the built-in zoom buttons' map-control fill (light #f6f7f8, dark #1e252d) with ink pictograms and a 2px keyline ring — a 44px twin of the 40px zoom stack above them. The rail's view buttons rest on the same warm neutral fill, stepping to ink when pressed.
- **State:** hover/active rest on the zoom buttons' own tints (hover #eceef0 / #29323b, press #e1e4e7); pressed rail icons fill ink and flip the pictogram to surface and keep the ink fill on hover; the weather button wears a steady amber alert lamp at its corner.
- **Map language chip:** a bordered 44px chip ("EN" / "繁") floats under the locate control on the map, keeping language reachable from the map while the legend moves to the utility rail.

### Fields (Distance input)
- **Style:** the criteria distance input is the sign's hero plate — 58px, 12px corners, 1px strong stroke, white fill, a 24px/800 tabular numeral (hero role) with a faint uppercase micro suffix. Focus swaps the stroke to ink with a 3px soft keyline ring. Plain field values elsewhere use the headline numeral at 17px/800.

### Presets (3 / 5 / 10 km)
- **Style:** three equal cells in a row, 44px, 12px corners, white fill with strong stroke, ink-dim headline numerals (17px/800).
- **State:** active cell fills ink (#14181d) and flips the numeral to surface.

### Cards / Sign Panels (CRITERIA, ROUTE)
- **Corner Style:** 16px (12px inside the desktop dock).
- **Background:** surface-raise, 1px line stroke. The head is a full-width strip with the uppercase board label and a rotating chevron; the body is 16px-padded.
- **Shadow Strategy:** none at rest; the route sign inside uses the sign shadow.
- **Internal Padding:** 12px 16px head, 16px body.

### Route Sign (the pale plate)
- **Style:** the system's signature. A pale wayfinding-yellow plate in the light theme, a monotone neutral plate in the dark theme — 16px corners, sign shadow, 16px padding. Top: the route badge — a small amber lamp + uppercase board label (LOOP / ONE-WAY / OUT-AND-BACK). Middle: left-aligned walk/run/gain stats on tinted plates with pictograms, and the distance set as monumental 900 display numerals right-aligned. Bottom: a hairlined street list ("via" label + waypoint names joined by arrows). On desktop its corners step to 12px inside the 12px sign panel.
- **Follow state:** a raised strip below the head — green (on route) or dark red (off route) with a matching lamp and current/next street.

### Follow Status Strip (generate band)
- **Style:** 12px corners, 10px padding, weight 700 at 13px, with a lamp. On route: deep green fill (#12341f) with pale green text; off route: deep red fill (#3a1210) with pale red text. It appears only while follow is active.

### Utility Rail
- **Style:** a pinned bottom bar: controls, legend, theme, favourites, weather, and about. Icon buttons at 44px; the legend button opens the legend info as a dock view in the control panel. An amber alert lamp pins to the weather button's corner.

## Do's and Don'ts

### Do:
- **Do** keep the route card quiet — a pale wayfinding-yellow plate in the light theme, a monotone plate in the dark theme — no saturated surface competes with the map or the route line.
- **Do** set the route distance as the display numeral; let it own the route sign.
- **Do** set every caption and panel head as letter-spaced uppercase board type.
- **Do** draw the route line with the segment palette — signal blue (#2f6fed) default, covered green (#16a34a) on covered segments, steep magenta (#d81b60) on steep segments — and the origin dot in the same signal blue.
- **Do** use lamps for state (green on route, red off route, amber badge, amber weather signal) and let the lamp be the first thing read.
- **Do** keep the actions a runner needs while moving in the pinned generate band.
- **Do** rest controls that sit on the map on the same map-control fill as the built-in zoom buttons, with ink pictograms.
- **Do** keep panels flat; only the dock, the route sign, and the map overlay chips (origin-confirm, origin-hint) cast shadows.

### Don't:
- **Don't** render the route line in the lamp amber (#ffb020) or a lamp green — conditions are data colors and state is a lamp, never the same hue.
- **Don't** put the follow/save/export/share actions inside a scrollable region.
- **Don't** introduce a second saturated surface color; green, red, and amber are lamps and dots only.
- **Don't** use glass, blur, glow, or pill buttons — the system is signage, not glassmorphism.
- **Don't** set captions in sentence-case body type.
- **Don't** let the weather alert be a blinking amber — alert state is a steady lamp; DELAY-style flashing belongs to no element in this build.
