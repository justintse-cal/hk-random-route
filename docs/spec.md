Status: ready-for-agent

# HK Random Route Generator

## Problem Statement

A jogger or walker in Hong Kong wants a route of a specific distance but doesn't want to plan it by hand. Existing tools don't help: Google Maps re-routes on its own (inaccurate) street network and can't express a loop; fitness apps need the route planned elsewhere first. The HK 3D Pedestrian Network dataset is an accurate, attribute-rich network of walkable segments — indoor/outdoor, covered, barrier-free, gradient — but nothing turns it into random routes that respect the user's criteria.

## Solution

A web app where the user picks an origin (live location, bookmark, or dropped pin), sets criteria (target distance, covered, barrier-free, flat, loop), and generates a random route over the pedestrian network. The route renders on a map with a route card (distance, estimated duration, elevation gain, type badge), can be regenerated freely, followed with live GPS, exported as GPX, and shared via a link. Bookmarked origins and a 30-day history of accepted routes persist locally. The UI defaults to Traditional Chinese with an English toggle, and shows HKO weather warnings in the user's chosen language.

## User Stories

1. As a runner, I want to pick my origin from my live location, so that the route starts where I actually am.
2. As a runner, I want to drop a pin on the map as the origin, so that I can plan a route from any place.
3. As a returning user, I want to choose a bookmarked origin, so that I can quickly reuse my regular starting points.
4. As a runner, I want my origin snapped onto the nearest network node and shown on the map, so that I know where the route truly begins.
5. As a runner with active criteria, I want the origin snapped to a segment that satisfies those criteria, so that the route can actually start there.
6. As a user with no compliant segment nearby, I want a clear message, so that I understand why no route is available instead of seeing a generic failure.
7. As a runner, I want to input a target distance, so that the route matches my training plan.
8. As a runner, I want inline validation when the distance is outside the supported range (0.5–50 km), so that I correct it before generating.
9. As a runner, I want the route's distance to reach my target (at least the target, never under it), so that the route is a reasonable stand-in for my goal.
10. As a runner, I want the tolerance to widen automatically when nothing fits in +10%, so that I still get a route.
11. As a runner, I want to restrict routes to covered segments, so that I stay dry in the rain.
12. As a wheelchair user, I want to restrict routes to barrier-free segments, so that I can travel without obstructions.
13. As a runner who dislikes hills, I want to restrict routes to flat segments, so that I avoid steep climbs.
14. As a runner, I want a loop, so that I return to my origin without repeating a segment.
15. As a runner, I want a clear message when the network can't support a loop near my origin, so that I know no route is available instead of getting a badged fallback.
16. As a runner, I want a one-way route when loop is off, so that I can get a route that ends at a random point.
17. As a runner, I want covered segments preferred even when covered-only is off, so that I stay drier in the rain without losing route choice.
18. As a user, I want to generate a route with the default settings immediately, so that I don't need to configure everything first.
19. As a user, I want to regenerate for a fresh route, so that I can explore alternatives.
20. As a user, I want the immediate previous route never to repeat, so that regeneration always feels fresh.
21. As a runner, I want to see the route drawn on a map, so that I can understand where I'm going.
22. As a runner, I want a route card showing distance, estimated duration, elevation gain, and a type badge, so that I can decide whether the route suits me.
23. As a runner, I want to follow the route with live GPS, so that I know where to go.
24. As a follower, I want on/off-route feedback, so that I know when I've strayed.
25. As a follower, I want the current street name displayed, so that I can orient myself.
26. As a user, I want to save an accepted route, so that I can return to it later.
27. As a user, I want to see my history of accepted routes from the last 30 days, so that I can re-open a route.
28. As a user, I want bookmarked origins to persist, so that I don't re-pin my regular starting points.
29. As a user, I want to share a route via a link, so that a friend can open the same route.
30. As a power user, I want to export the route as GPX, so that I can load it into Garmin or Strava.
31. As a Cantonese speaker, I want the UI in Traditional Chinese by default, so that I can use the app comfortably.
32. As an English speaker, I want to switch the UI to English, so that I can use the app in my language.
33. As a user, I want weather warnings displayed in my chosen language, so that I can judge outdoor conditions.
34. As a mobile user, I want a responsive, minimal interface, so that I can use the app on my phone while running.
35. As a runner, I want the map to follow my current position, so that I can see where I am relative to the route.

## Implementation Decisions

### Stack

- **Next.js (App Router) on Vercel.** The frontend, the route-generation function, and a weather proxy (avoids browser CORS with the HKO API) all live in one deployable app.
- **Python preprocessing script committed to the repo.** Run at build/deploy time; produces the graph asset the function loads. Uses pyogrio (GDAL) to read the file geodatabase.
- **MapLibre GL + free vector tiles** on the client. No API key, modern look.

### Data pipeline

- Read `PedestrianRoute` (465,475 segments) from the geodatabase; ignore the seven relationship tables (`PedRouteRel*`, `AccessTime*`) in v1.
- Build a **custom typed-array binary graph** (~15–25 MB): nodes (WGS84 coordinates, reprojected from HK80/EPSG:2326), edges (from, to, 2D length from `Shape_Length`, Z for elevation gain, filter bitmask, `AliasNameTC`/`AliasNameEN` strings), plus a coarse grid spatial index for snapping.
- Per-edge **filter bitmask** encodes the confirmed semantics: `Location` (outdoor vs indoor), `WeatherProof` (covered vs non-covered), `WheelchairBarrier` (flagged as unsuitable for mobility access, particularly for wheelchair users), and `Gradient` < 0.1 (flat). The barrier-free criterion keeps segments that are *not* flagged by `WheelchairBarrier`.
- **Code dictionary confirmed**: `Location` indicates whether the segment is outdoor or indoor; `WeatherProof` indicates whether the segment is covered or non-covered; `WheelchairBarrier` indicates the segment is assessed to be unsuitable for mobility access, particularly for wheelchair users. Encode semantics, not raw codes; review `FeatureType` during preprocessing if it proves useful.
- Length is the **2D** value (`Shape_Length`) per the domain decision — the network is fragmented into 476 components, so generation is always constrained to a single component.

### Route generation (serverless function)

- API contract: `POST` with origin, target distance, and criteria → a Route (GeoJSON geometry + metadata). No database; the function is stateless.
- **Snapping**: filter-aware — snap to the nearest node on a segment satisfying the active criteria; if none within ~500 m, return the "no compliant segment near origin" message.
- **Loop** (criteria): self-avoiding random walk from the origin over compliant edges, closing via an unused edge back to the origin once the accumulated length enters the tolerance band; up to ~50 attempts, then fall back to a badged **Out-and-back**.
- **One-way route** (loop off): random walk to a random endpoint at the target distance.
- **Distance**: never under the target; a band of +10% above target; on repeated failure, widen in steps (+15%, +25%) before reporting the closest option.
- **No immediate repeat**: exclude the segment-ID signature of the previously returned route.
- Route metadata: distance, elevation gain (from Z), estimated duration at walk 4.5 km/h and run 9 km/h, type badge (Loop / One-way / Out-and-back), and street names.

### Client

- Origin via live location (browser geolocation), bookmark, or dropped pin; snapped origin shown on the map.
- Generate/regenerate controls; route card; MapLibre rendering of the Route.
- **Follow mode**: `watchPosition`, re-centering map, on/off-route detection with ~30–50 m tolerance, next-segment highlight, current street name.
- **GPX export** (Garmin/Strava). **Share link** embeds a compressed route payload in the URL (no backend needed).
- **localStorage** persistence: bookmarks and 30-day history of accepted routes (explicit save, capped at ~50); history entries store the Route + criteria + timestamp.
- **i18n**: Traditional Chinese default, English toggle; dictionary-driven. Weather banner shows `Warning_Message_Tc` / `Warning_Message_En` with no icon.

## Testing Decisions

- **One seam**: the route generation API contract. Tests exercise only the public interface — criteria in, Route out — and assert invariants on the result. Implementation details (graph build, walk, closure) are not tested directly.
- **What makes a good test**: black-box property checks on the returned Route — distance within the tolerance band; a Loop is closed and repeats no segment; every segment complies with the requested criteria; a One-way route terminates at a random endpoint; a badged Out-and-back retraces; the no-immediate-repeat rule holds across consecutive calls; failure messages surface for origins with no compliant segment within threshold, and for unsupported distances.
- **Module under test**: the generation function via its contract. Weather proxy and i18n get thin smoke tests; UI is covered by a light end-to-end flow (generate → route renders → save) rather than unit tests.
- **Randomized coverage**: the walk is stochastic, so tests run many seeded generations over the real graph and assert aggregate properties (success rate within budget, tolerance adherence, loop feasibility in the giant component) rather than fixed expectations.
- **Prior art**: none — greenfield repo; this spec defines the first test suite.

## Out of Scope

- User login, auth, and cross-device sync (deferred; localStorage in v1).
- Google Maps directions integration (rejected for accuracy and loop incompatibility).
- Turn-by-turn voice navigation.
- Live weather beyond HKO warnings (no temperature/rain values in the endpoint).
- Manual editing or waypoint manipulation of generated routes.
- Rendering the full network client-side (only generated routes are drawn).
- Premium/custom basemap styling and map-tile billing.
- Native mobile app.

## Further Notes

- Data facts gathered: the network is 465,475 MultiLineString Z segments, EPSG:2326 + HKPD heights; `Location` is 94.4% outdoor; `Gradient` < 0.1 for 85.4%; `Direction` is ~0 (effectively bidirectional); `AliasName` is populated 99.5% while `StreetName` is null 55%; `Enabled` and `PositionCertainty` are effectively constant and are not useful filters.
- The dataset in this repo is `3DPN_P2.gdb` (PROJECT.md references `3DPN_PD.gdb` — an outdated name).
- The code dictionary has been confirmed: `Location` indicates outdoor vs indoor, `WeatherProof` indicates covered vs non-covered, and `WheelchairBarrier` indicates the segment is assessed to be unsuitable for mobility access, particularly for wheelchair users.
- Three decisions are candidates for ADRs: serverless generation with a custom binary graph; loop-as-true-circuit with out-and-back fallback; and 2D distance despite 3D data. They are recorded here first; promote to `docs/adr/` if this architecture is locked in.
