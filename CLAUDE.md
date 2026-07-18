I need to make a simple animation showing the traffic light at a 4 way junction. The animation should be built with GSAP and use free/open source assets whereever needed.

## Current state

A self-contained, static GSAP animation of a 4-way signalized intersection. No build step — just `index.html`, `style.css`, `script.js`, served with any static file server (e.g. `python3 -m http.server`). GSAP core + `MotionPathPlugin` are loaded from the cdnjs CDN (MIT-licensed, free). Pushed to `https://github.com/sahilbadyal/traffic-rules` (public).

### Scene (`index.html`)
- One SVG, `viewBox="0 0 800 800"`. Intersection box is `x/y 320–480`.
- Each of the 4 approaches has 4 lanes: a protected left-turn lane, two straight-through lanes, and a right-turn lane (lane markings drawn with dashed dividers + a solid yellow median).
- Traffic signals are US-style "doghouse" heads: 3 separate black boxes with a yellow retroreflective border per approach (left-arrow / through circle / right-arrow), mounted on a shared mast bar with a pole. Positioned close to the canvas edges (not on the intersection's diagonal corners) with a bold compass label + direction arrow (e.g. "NORTH ↓") so it's unambiguous which signal controls which approach.
- 13 cars total: left/straight/right for each of the 4 approaches, plus one extra amber car on the south approach demonstrating a permissive ("yielded") left turn — it sits out the protected-arrow phase entirely and turns later during the plain through-green, yielding to oncoming traffic.
- A side panel (`.panel`) has the live phase caption, Play/Pause + speed controls (0.25×–2×, default 0.5×), and instructional bullet points explaining the signal logic and the yield-turn car.

### Signal + car logic (`script.js`)
- One GSAP timeline (`tl`, `repeat: -1`, 18s cycle) drives everything. Per axis (NS then EW): protected-left green (3s) → yellow (1s) → through+right green (4s) → yellow (1s), then the other axis runs the same sequence.
- Each car does approach → brake to a stop at the line → wait for its own lane's green → accelerate through, all as absolute-time GSAP tweens on the shared timeline (so pausing/scrubbing/speed changes affect lights and cars together).
- Turning cars follow a real SVG `<path>` (straight lead-in → quadratic-bezier curve confined to the intersection box → straight lead-out) driven by `MotionPathPlugin` with `autoRotate: true`, built at runtime from lane coordinates.
- Every car's first `gsap.set()` must include `transformOrigin: "50% 50%"` — GSAP caches the SVG rotation pivot on first touch, and without this it defaults to the body rect's corner instead of its center.
