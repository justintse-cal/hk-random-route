# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Joggers and walkers in Hong Kong who want a route of a specific distance without planning it by hand. Includes wheelchair users who need barrier-free segments, and Traditional Chinese / English speakers. Primary situation: on the go, typically on a phone, sometimes while running. A public tool, not a private utility.

## Product Purpose

Generate a random jogging/walking route over the HK 3D Pedestrian Network that fits the user's criteria — target distance, covered/weatherproof, barrier-free, flat, and loop. Success is a route the user can set off on: right distance, drawn on a map, followable with live GPS, exportable as GPX or shareable via link, in Traditional Chinese or English, with HKO weather warnings surfaced in the chosen language.

## Positioning

The only route tool that turns the accurate, attribute-rich HK 3D Pedestrian Network dataset into random routes that honor the user's criteria. Google Maps re-routes on its own street network and cannot express a loop; fitness apps need the route planned elsewhere first. This app draws a fresh, criteria-compliant loop or one-way route from a single origin, regenerating freely until it fits.

## Operating Context

Map-first single-page interface: pick an origin (live location, dropped pin, or bookmark), set criteria, generate, then follow / export / share. The origin snaps to the nearest network node (criteria-aware). The route renders on MapLibre GL over free vector tiles. Users can regenerate, follow with live GPS (on/off-route feedback, next-segment highlight, current street name), save routes into a 30-day local history, and open routes from a share link. Weather warnings (HKO) appear as a banner in the chosen language. Bookmarks and history persist in localStorage; there are no accounts.

## Capabilities and Constraints

- Route generation is serverless and stateless; no database. API: POST origin + target distance + criteria → Route (GeoJSON geometry + metadata).
- Target distance range 0.5–50 km; never under the target, band of +10% above it, auto-widening in steps when nothing fits.
- Confirmed dataset semantics: `Location` outdoor/indoor, `WeatherProof` covered/non-covered, `WheelchairBarrier` assessed unsuitable for mobility access (esp. wheelchair users), `Gradient` < 0.1 flat. Covered remains a soft preference when the covered-only criterion is off.
- Loop = closed route returning to the origin without repeating a segment; falls back to a badged Out-and-back when the network cannot support a loop near the origin. Loop off → one-way route ending at a random point. v1 never silently substitutes one type for another: no-loop is a clear no-route message.
- The immediately previous route's segment signature is excluded from regeneration.
- Network is fragmented into 476 components; routes are always within a single component. Distance is 2D (`Shape_Length`) per domain decision despite 3D data.
- Preprocessed typed-array binary graph (~15–25 MB) built by committed `scripts/build_graph.py`; dataset in repo is `3DPN_P2.gdb`.
- Map: MapLibre GL 5.13 + OpenFreeMap Liberty free vector tiles; no API key.
- i18n: Traditional Chinese default, English toggle, dictionary-driven; street names localized from `AliasNameTC`/`AliasNameEN`.
- Weather proxy route avoids HKO CORS; warnings only (no temperature/rain in the endpoint).
- No auth, no cross-device sync, no manual route editing, no turn-by-turn voice (out of scope for v1).
- Stack: Next.js 16 App Router on Vercel, React 19, TypeScript, vitest.
- Undecided: product name — "HK Random Route" / "HK 隨機路線" is a placeholder, open to change.

## Brand Commitments

- Bilingual identity: Traditional Chinese by default, English toggle; both languages must stay first-class in copy and street names.
- Name is not yet binding (placeholder, open to change).
- **Visual direction is the Sign System (the wayfinding grammar of airport / MTR directional signage), as committed in the layout contract (seed `c9b7dee6`).** Light neutral ground with white sign panels over the light map; the route card a quiet monotone plate in both themes (wayfinding yellow `#ffd21f` demoted to the selection accent), the generate action a calm launch gray (`#6b7280`); black humanist sans on white; white pictograms on black inset squares;            monumental distance numerals; arrows
           locked to panel edges; a lamp language (green = on route, red = off route, amber on the route badge and
           as the steady weather-signal lamp in the bottom bar). Criteria and results live as collapsible sign panels; favourites, weather, about, language, and theme sit in a bottom utility bar. The dark theme re-skins the ground while the route card stays the same monotone plate. Craft bar (finish level): Apple Maps / Apple Fitness, Strava, and Google Maps. See the contract comment in `app/layout.tsx` for the committed world.
- Distance quick presets are 3 / 5 / 10 km. The route line is a tri-color segment palette — signal blue (`#2f6fed`, distinct from the basemap's road yellow) by default, covered green (`#16a34a`) on covered segments, steep magenta (`#d81b60`) on steep segments; the origin dot is the same signal blue; the live-position dot is green (`#35c874`).
- Required attribution: HK 3D Pedestrian Network data (Lands Department) and basemap (© OpenFreeMap · © OpenStreetMap · MapLibre GL JS) credited in the About view.

## Evidence on Hand

- `docs/spec.md` — problem/solution statement, 35 user stories, implementation and testing decisions, data facts (465,475 segments; 94.4% outdoor; 85.4% flat; `AliasName` populated 99.5% while `StreetName` null 55%; effectively bidirectional).
- `CONTEXT.md` — domain glossary (Segment, Origin, Route, Criteria, Loop, One-way route, Out-and-back).
- Dataset: `3DPN_P2.gdb` in the repo; `scripts/build_graph.py` preprocesses it.
- No testimonials, case studies, press, or marketing assets exist — do not fabricate any.

## Product Principles

1. **Criteria are the contract.** The generated route must honor the user's active criteria; when the network genuinely cannot comply, say so clearly instead of quietly degrading.
2. **Set off quickly.** Origin, distance, route in the fewest steps; regenerate freely until it fits; rerun is instant.
3. **Accuracy over habit.** Use the real pedestrian network and its confirmed attribute semantics, not a generic street network.
4. **Work where the runner is.** Mobile-first, readable in TC and EN, usable outdoors with live-GPS follow mode.
5. **Be trustworthy with data.** Attribute the government dataset and basemap; surface weather warnings in the user's language.

## Accessibility & Inclusion

- Target WCAG 2.2 AA across the interface — contrast, keyboard operability, and screen-reader support — consistent with wheelchair-user use and mobile-while-running.
- Touch-first layout with adequate target sizes and safe-area awareness for phone use while moving.
