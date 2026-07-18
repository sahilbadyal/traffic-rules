gsap.registerPlugin(MotionPathPlugin);

// --- timing ---------------------------------------------------------------
const LEFT_GREEN = 3;
const LEFT_YELLOW = 1;
const THRU_GREEN = 4;
const THRU_YELLOW = 1;
const AXIS_TOTAL = LEFT_GREEN + LEFT_YELLOW + THRU_GREEN + THRU_YELLOW; // 9s
const CYCLE = AXIS_TOTAL * 2; // 18s
const FADE = 0.25;

const lamp = (approach, type, color) => `.signal[data-approach="${approach}"] .lamp.${type}.${color}`;

function setLamp(el, on) {
  gsap.set(el, { opacity: on ? 1 : 0.25 });
}
function fadeLamp(tl, el, on, time) {
  // positioned so the fade *completes* exactly at `time`, not starts there.
  // Wraps to the tail of the cycle if that lands before t=0 (e.g. a phase
  // that starts the cycle at t=0), so it still completes right as the loop
  // restarts instead of being silently clamped/invalid.
  let pos = time - FADE;
  if (pos < 0) pos += CYCLE;
  tl.to(el, { opacity: on ? 1 : 0.25, duration: FADE }, pos);
}

// initial state (t=0): NS protected-left green, everything else red
["sb", "nb"].forEach((a) => setLamp(lamp(a, "left", "green"), true));
["sb", "nb"].forEach((a) => {
  setLamp(lamp(a, "through", "red"), true);
  setLamp(lamp(a, "right", "red"), true);
});
["eb", "wb"].forEach((a) => {
  setLamp(lamp(a, "left", "red"), true);
  setLamp(lamp(a, "through", "red"), true);
  setLamp(lamp(a, "right", "red"), true);
});

const tl = gsap.timeline({ repeat: -1 });

function axisPhase(tl, axisApproaches, start) {
  const leftEnd = start + LEFT_GREEN;
  const thruStart = leftEnd + LEFT_YELLOW;
  const thruEnd = thruStart + THRU_GREEN;
  const axisEnd = thruEnd + THRU_YELLOW;

  axisApproaches.forEach((a) => {
    // phase begins: this axis's protected left arrow turns green (wraps to
    // the tail of the cycle via fadeLamp when start=0, closing the loop)
    fadeLamp(tl, lamp(a, "left", "red"), false, start);
    fadeLamp(tl, lamp(a, "left", "green"), true, start);

    fadeLamp(tl, lamp(a, "left", "green"), false, leftEnd);
    fadeLamp(tl, lamp(a, "left", "yellow"), true, leftEnd);

    fadeLamp(tl, lamp(a, "left", "yellow"), false, thruStart);
    fadeLamp(tl, lamp(a, "left", "red"), true, thruStart);
    fadeLamp(tl, lamp(a, "through", "red"), false, thruStart);
    fadeLamp(tl, lamp(a, "through", "green"), true, thruStart);
    fadeLamp(tl, lamp(a, "right", "red"), false, thruStart);
    fadeLamp(tl, lamp(a, "right", "green"), true, thruStart);

    fadeLamp(tl, lamp(a, "through", "green"), false, thruEnd);
    fadeLamp(tl, lamp(a, "through", "yellow"), true, thruEnd);
    fadeLamp(tl, lamp(a, "right", "green"), false, thruEnd);
    fadeLamp(tl, lamp(a, "right", "yellow"), true, thruEnd);

    fadeLamp(tl, lamp(a, "through", "yellow"), false, axisEnd);
    fadeLamp(tl, lamp(a, "through", "red"), true, axisEnd);
    fadeLamp(tl, lamp(a, "right", "yellow"), false, axisEnd);
    fadeLamp(tl, lamp(a, "right", "red"), true, axisEnd);
  });

  return axisEnd;
}

const ewStart = axisPhase(tl, ["sb", "nb"], 0);
axisPhase(tl, ["eb", "wb"], ewStart);

// --- cars -------------------------------------------------------------------
// Every car drives in from off-screen, brakes to a stop at its stop line,
// waits there until its arrow/light turns green, then accelerates through.
// All cars are drawn pointing east (0deg) by default so MotionPath autoRotate
// lines them up correctly for straight, left and right movements alike.
const OFF = 60;
const COMPASS = { sb: 90, nb: -90, eb: 0, wb: 180 };
const AXIS = { sb: "y", nb: "y", eb: "x", wb: "x" };
const FAR_START = { sb: -OFF, nb: 800 + OFF, eb: -OFF, wb: 800 + OFF };
const FAR_EXIT = { sb: 800 + OFF, nb: -OFF, eb: 800 + OFF, wb: -OFF };
const STOP_AT = { sb: 300, nb: 500, eb: 300, wb: 500 };
const LANE = {
  "sb-left": 390, "sb-straight": 350, "sb-right": 330,
  "nb-left": 410, "nb-straight": 430, "nb-right": 470,
  "eb-left": 410, "eb-straight": 430, "eb-right": 470,
  "wb-left": 390, "wb-straight": 350, "wb-right": 330,
};

// how a car's lap breaks down in time: brake to the line, sit, then launch
const LAUNCH_DELAY = 0.15; // reaction time once the light goes green
const STOP_BUFFER = 1.4; // visible dwell time stopped at the line
const APPROACH_DUR = 2.4; // time spent braking in from off-screen

// NS protected-left starts the cycle; NS through/right, EW-left, EW through/right follow.
const G_NS_LEFT = 0;
const G_NS_THRU = LEFT_GREEN + LEFT_YELLOW;
const G_EW_LEFT = AXIS_TOTAL;
const G_EW_THRU = AXIS_TOTAL + LEFT_GREEN + LEFT_YELLOW;
const LEFT_CROSS_DUR = 2.6;
const THRU_CROSS_DUR = 4.2;

// --- live caption -----------------------------------------------------------
// Explains, in plain language, why the cars on screen are behaving the way they are.
const phaseLabel = document.getElementById("phase-label");
const phaseSub = document.getElementById("phase-sub");

function caption(time, label, sub) {
  tl.call(() => {
    phaseLabel.textContent = label;
    phaseSub.textContent = sub;
  }, null, time);
}

caption(
  G_NS_LEFT,
  "North – South: protected left turn",
  "N/S left-lane cars get an exclusive green arrow; every other lane on both roads is red."
);
caption(
  G_NS_THRU,
  "North – South: through & right turn",
  "N/S straight and right-turn lanes go green together; E/W stays red."
);
caption(
  G_EW_LEFT,
  "East – West: protected left turn",
  "E/W left-lane cars get an exclusive green arrow; every other lane on both roads is red."
);
caption(
  G_EW_THRU,
  "East – West: through & right turn",
  "E/W straight and right-turn lanes go green together; N/S stays red."
);

// Returns the four absolute timeline positions for one lap, wrapping the
// approach leg to the tail of the cycle when its green phase starts at t=0
// so the "stopped and waiting" moment reads seamlessly across the loop.
function lapWindow(greenStart, crossDuration) {
  const crossStart = greenStart + LAUNCH_DELAY;
  const crossEnd = crossStart + crossDuration;
  let arrive = crossStart - STOP_BUFFER;
  let approachStart = arrive - APPROACH_DUR;
  if (approachStart < 0) {
    approachStart += CYCLE;
    arrive += CYCLE;
  }
  return { approachStart, arrive, crossStart, crossEnd };
}

function setupStraight(id, approach, movement, greenStart, crossDuration) {
  const axis = AXIS[approach];
  const other = axis === "y" ? "x" : "y";
  const laneCoord = LANE[`${approach}-${movement}`];
  const w = lapWindow(greenStart, crossDuration);

  // transformOrigin must be set on this very first gsap.set() for the element:
  // GSAP caches the rotation pivot the first time it touches an SVG element, and
  // without it explicitly pinned to the shape's actual center, it defaults to the
  // body rect's (x,y) corner instead — which sends a rotated car swinging off its
  // true path by ~15px, right off the pavement at some rotations.
  gsap.set(`#${id}`, { [other]: laneCoord, [axis]: FAR_START[approach], rotation: COMPASS[approach], transformOrigin: "50% 50%" });
  tl.fromTo(
    `#${id}`,
    { [axis]: FAR_START[approach] },
    { [axis]: STOP_AT[approach], duration: w.arrive - w.approachStart, ease: "power2.out" },
    w.approachStart
  );
  tl.to(`#${id}`, { [axis]: FAR_EXIT[approach], duration: crossDuration, ease: "power2.in" }, w.crossStart);
}

// Turn curves are built as real SVG <path> elements: a straight lead-in to
// the box edge, a quadratic-bezier curve confined entirely to the (fully
// paved) intersection box, then a straight lead-out. Confining the curve to
// the box guarantees it can never cut across the grass outside it — a single
// bezier stretched all the way from the stop line to the far exit (the old
// approach) has wildly unequal leg lengths and cuts the corner short of the
// box, which is exactly what sent cars off-road. autoRotate keeps the car's
// heading exact at every point since it's driven by the path's real tangent.
// points = [start, boxEntry, corner, boxExit, farExit]
const svgNS = "http://www.w3.org/2000/svg";
const scene = document.getElementById("scene");

function motionPathFor(id, points) {
  const [start, boxEntry, corner, boxExit, farExit] = points;
  const pathId = `path-${id}`;
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("id", pathId);
  path.setAttribute(
    "d",
    `M ${start.x},${start.y} L ${boxEntry.x},${boxEntry.y} Q ${corner.x},${corner.y} ${boxExit.x},${boxExit.y} L ${farExit.x},${farExit.y}`
  );
  path.setAttribute("fill", "none");
  scene.appendChild(path);
  return `#${pathId}`;
}

function setupTurn(id, approach, movement, turnPoints, greenStart, crossDuration) {
  const axis = AXIS[approach];
  const other = axis === "y" ? "x" : "y";
  const laneCoord = LANE[`${approach}-${movement}`];
  const w = lapWindow(greenStart, crossDuration);
  const pathSelector = motionPathFor(id, turnPoints);

  // see setupStraight for why transformOrigin has to be set on this first gsap.set()
  gsap.set(`#${id}`, { [other]: laneCoord, [axis]: FAR_START[approach], rotation: COMPASS[approach], transformOrigin: "50% 50%" });
  tl.fromTo(
    `#${id}`,
    { [axis]: FAR_START[approach] },
    { [axis]: STOP_AT[approach], duration: w.arrive - w.approachStart, ease: "power2.out" },
    w.approachStart
  );
  tl.to(
    `#${id}`,
    { motionPath: { path: pathSelector, autoRotate: true }, duration: crossDuration, ease: "power2.in" },
    w.crossStart
  );
}

// box edges: road runs 320-480 on both axes
const BOX_MIN = 320, BOX_MAX = 480;

// southbound (from north, x=390 left / 350 straight / 330 right)
setupTurn("car-sb-left", "sb", "left", [{ x: 390, y: STOP_AT.sb }, { x: 390, y: BOX_MIN }, { x: 390, y: 410 }, { x: BOX_MAX, y: 410 }, { x: 800 + OFF, y: 410 }], G_NS_LEFT, LEFT_CROSS_DUR);
setupStraight("car-sb-straight", "sb", "straight", G_NS_THRU, THRU_CROSS_DUR);
setupTurn("car-sb-right", "sb", "right", [{ x: 330, y: STOP_AT.sb }, { x: 330, y: BOX_MIN }, { x: 330, y: 330 }, { x: BOX_MIN, y: 330 }, { x: -OFF, y: 330 }], G_NS_THRU, THRU_CROSS_DUR);

// northbound (from south, x=410 left / 430 straight / 470 right)
setupTurn("car-nb-left", "nb", "left", [{ x: 410, y: STOP_AT.nb }, { x: 410, y: BOX_MAX }, { x: 410, y: 390 }, { x: BOX_MIN, y: 390 }, { x: -OFF, y: 390 }], G_NS_LEFT, LEFT_CROSS_DUR);
setupStraight("car-nb-straight", "nb", "straight", G_NS_THRU, THRU_CROSS_DUR);
setupTurn("car-nb-right", "nb", "right", [{ x: 470, y: STOP_AT.nb }, { x: 470, y: BOX_MAX }, { x: 470, y: 470 }, { x: BOX_MAX, y: 470 }, { x: 800 + OFF, y: 470 }], G_NS_THRU, THRU_CROSS_DUR);

// permissive ("yielded") left turn: same lane and path as car-nb-left, but it
// sits out the whole protected-arrow phase and only goes once the plain
// through-green is on, well after the oncoming sb-straight/sb-right traffic
// has already cleared - a longer, deliberate wait standing in for "checking
// for a gap in oncoming traffic" before turning.
const G_NS_YIELD = G_NS_THRU + 1.6;
setupTurn("car-nb-left-yield", "nb", "left", [{ x: 410, y: STOP_AT.nb }, { x: 410, y: BOX_MAX }, { x: 410, y: 390 }, { x: BOX_MIN, y: 390 }, { x: -OFF, y: 390 }], G_NS_YIELD, LEFT_CROSS_DUR + 0.2);

// eastbound (from west, y=410 left / 430 straight / 470 right)
setupTurn("car-eb-left", "eb", "left", [{ x: STOP_AT.eb, y: 410 }, { x: BOX_MIN, y: 410 }, { x: 410, y: 410 }, { x: 410, y: BOX_MIN }, { x: 410, y: -OFF }], G_EW_LEFT, LEFT_CROSS_DUR);
setupStraight("car-eb-straight", "eb", "straight", G_EW_THRU, THRU_CROSS_DUR);
setupTurn("car-eb-right", "eb", "right", [{ x: STOP_AT.eb, y: 470 }, { x: BOX_MIN, y: 470 }, { x: 330, y: 470 }, { x: 330, y: BOX_MAX }, { x: 330, y: 800 + OFF }], G_EW_THRU, THRU_CROSS_DUR);

// westbound (from east, y=390 left / 350 straight / 330 right)
setupTurn("car-wb-left", "wb", "left", [{ x: STOP_AT.wb, y: 390 }, { x: BOX_MAX, y: 390 }, { x: 390, y: 390 }, { x: 390, y: BOX_MAX }, { x: 390, y: 800 + OFF }], G_EW_LEFT, LEFT_CROSS_DUR);
setupStraight("car-wb-straight", "wb", "straight", G_EW_THRU, THRU_CROSS_DUR);
setupTurn("car-wb-right", "wb", "right", [{ x: STOP_AT.wb, y: 330 }, { x: BOX_MAX, y: 330 }, { x: 470, y: 330 }, { x: 470, y: BOX_MIN }, { x: 470, y: -OFF }], G_EW_THRU, THRU_CROSS_DUR);

// --- playback controls --------------------------------------------------
// Default pace is slowed to 0.5x so the left-turn -> through -> yellow
// sequence and each car's stop-and-wait are easy to follow; Play/Pause and
// speed are just GSAP timeline controls (tl.play/pause/timeScale).
tl.timeScale(0.5);

const playPauseBtn = document.getElementById("play-pause");
playPauseBtn.addEventListener("click", () => {
  if (tl.paused()) {
    tl.play();
    playPauseBtn.textContent = "Pause";
    playPauseBtn.setAttribute("aria-pressed", "false");
  } else {
    tl.pause();
    playPauseBtn.textContent = "Play";
    playPauseBtn.setAttribute("aria-pressed", "true");
  }
});

document.querySelectorAll(".speed-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    tl.timeScale(parseFloat(btn.dataset.speed));
    document.querySelectorAll(".speed-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});
