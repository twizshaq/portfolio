"use client";

import { useEffect, useRef } from "react";

// Lightest to densest character drawn on each tile.
const RAMP = " .:-=+*#%@";
// Every character the atlas holds: the ramp plus a wave for ripples.
const GLYPHS = RAMP + "~";
const WAVE = RAMP.length;
const FPS = 30;

// Every cell of an animal is a soft colored tile with a character on top.
// Near animals swim over far ones; far ones are smaller, slower and dimmer.
const TILE_ALPHA = [0.14, 0.34]; // [far, near]
const GLYPH_ALPHA = [0.3, 0.7];

// Animals fade to this much of their brightness under page content: the text, images, icons
// and filled or outlined shapes inside the element marked data-ascii-content, but not the
// empty space between them. The dimming reaches CONTENT_PADDING px past each shape, then
// eases back to full brightness over CONTENT_FADE px.
const UNDER_CONTENT = 0.3;
const CONTENT_PADDING = 6;
const CONTENT_FADE = 18;

// Water only shows when something disturbs it: the cursor, a click, or a passing shark.
const WATER_ALPHA = 0.5;
const WATER_COLOR = 14;
const MAX_RIPPLES = 60;
const CURSOR_RIPPLE_GAP = 70; // px the cursor travels between ripples
const STARTLE_RANGE = 320; // px from a click that sharks react to
const DASH_BOOST = 5; // a clicked shark bursts to about this many times its cruise speed, plus one

// Sharks have a flexible spine of this many points from nose to tail (an even number,
// so the middle of the body falls halfway along a segment).
const JOINTS = 14;
// How sharply the spine may bend at each point, in radians. Keeps the body stiff like a shark's;
// it loosens up while dashing so the escape's C-bend can unwind smoothly.
const MAX_JOINT_BEND = 0.14;

const COLORS = [
  "#a8cdf0", // 0 shark: fins and edges
  "#5f9ad3", // 1 shark: body
  "#3d72ad", // 2 shark: back
  "#cdb8f7", // 3 hammerhead: fins and edges
  "#9d7fe6", // 4 hammerhead: body
  "#7356c9", // 5 hammerhead: back
  "#b4b0f5", // 6 manta: wing tips
  "#7570db", // 7 manta: wings
  "#4f48b0", // 8 manta: back
  "#f6e8c6", // 9 cream markings
  "#9fd383", // 10 turtle: skin
  "#e0ac5c", // 11 turtle: shell
  "#9b6a33", // 12 turtle: shell lines
  "#f4cf86", // 13 turtle: shell rim
  "#8fd3e8", // 14 water
];

// Each theme's colours, by the same index as COLORS: the tile behind each character,
// the character itself, and how strongly each is drawn.
type Look = {
  tiles: string[];
  glyphs: string[];
  tileAlpha: number[];
  glyphAlpha: number[];
  waterAlpha: number;
};
const LOOKS: Record<"dark" | "light", Look> = {
  dark: {
    tiles: COLORS,
    glyphs: COLORS,
    tileAlpha: TILE_ALPHA,
    glyphAlpha: GLYPH_ALPHA,
    waterAlpha: WATER_ALPHA,
  },
  // On a light page: pastel tiles with darker characters on top.
  light: {
    tiles: [
      "#7fb0e6", "#4f8fd6", "#2f6fb8", // shark
      "#b39cf2", "#8a6be0", "#6748c4", // hammerhead
      "#9d98f0", "#6a63d6", "#4a42ad", // manta
      "#e8c98a", // cream markings
      "#7cbf5c", "#d9993f", "#8a5a26", "#e9b65e", // turtle
      "#5aaecb", // water
    ],
    glyphs: [
      "#3f6fa8", "#2a5f9e", "#1d4c86",
      "#6c55b8", "#5a3fae", "#45309a",
      "#5650b0", "#433cad", "#2f2a86",
      "#a07c33",
      "#3f7a2a", "#94611d", "#5e3b14", "#a3711f",
      "#3b8fb0",
    ],
    tileAlpha: [0.12, 0.3],
    glyphAlpha: [0.3, 0.62],
    waterAlpha: 0.45,
  },
};

const currentLook = () =>
  LOOKS[document.documentElement.dataset.theme === "light" ? "light" : "dark"];

type Kind = "shark" | "hammerhead" | "manta" | "turtle";

// Which COLORS index each part of an animal uses: [edge/fins, body, back/lines, accent].
const PALETTES: Record<Kind, number[]> = {
  shark: [0, 1, 2, 9],
  hammerhead: [3, 4, 5, 9],
  manta: [6, 7, 8, 9],
  turtle: [10, 11, 12, 13],
};

type Creature = {
  kind: Kind;
  near: boolean;
  x: number;
  y: number;
  heading: number;
  speed: number;
  length: number;
  phase: number;
  seed: number;
  // Spine points from nose to tail, as x, y pairs in page coordinates (sharks only).
  // The head leads and the rest of the body follows the path it took.
  joints: Float32Array;
  // Where it is swimming to, as a spot on the screen (so it stays in view as the page scrolls),
  // and how long it has been heading there.
  goalX: number;
  goalY: number;
  goalTime: number;
  // A direction to favour when picking the next spot (away from a scare), or NaN for none.
  prefer: number;
  // How much reason it has to turn tightly right now (calmUrgency is the eased part).
  urgency: number;
  calmUrgency: number;
  // Movement state: turn speed (rad/s), current swim speed, tail effort and stroke size.
  angVel: number;
  swim: number;
  effort: number;
  amp: number;
  // Alternates between swimming and short glides.
  gliding: boolean;
  modeTime: number;
  // Startle: 1 right after a scare, easing back to 0. Scares land after a short reaction delay.
  startle: number;
  fleeX: number;
  fleeY: number;
  react: number;
  pending: number;
  pendX: number;
  pendY: number;
  // Curiosity about a still cursor, and which way it circles (1 or -1).
  curious: number;
  orbit: number;
  // Escape after a scare or a click: first the body curls into a C (coil counts down,
  // turning coilTurn radians towards dashTurn, from the pose it had when it started),
  // then dash fades from its peak as it bolts and coasts back to cruising.
  dash: number;
  coil: number;
  coilTotal: number;
  coilTurn: number;
  dashTurn: number;
  coilX: number;
  coilY: number;
  coilHeading: number;
  coilFrom: Float32Array;
  wake: number;
};

type Ripple = {
  x: number;
  y: number;
  born: number;
  life: number;
  speed: number;
  strength: number;
};

// Density functions write the part they hit here to avoid allocating per cell.
const hit = { part: 1 };
const EDGE = 0;
const BODY = 1;
const BACK = 2;
const ACCENT = 3;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// Elements drawn as one solid shape; nothing inside them needs measuring.
const SOLID = "img, svg, video, canvas, iframe, input, textarea, select";

// True for a computed color that is fully see-through, like "transparent" or "rgb(0 0 0 / 0)".
function isClear(color: string) {
  if (color === "transparent") return true;
  const args = color.match(/\(([^)]*)\)\s*$/)?.[1];
  if (!args) return false;
  const alpha = args.includes("/") ? args.split("/")[1] : args.split(",")[3];
  if (alpha === undefined) return false;
  const value = parseFloat(alpha);
  return alpha.trim().endsWith("%") ? value < 0.5 : value < 0.005;
}

// Whether an element paints something of its own: media, a fill, a border or a shadow.
function drawsItself(el: Element, style: CSSStyleDeclaration) {
  if (el.matches(SOLID)) return true;
  if (style.backgroundImage !== "none" || style.boxShadow !== "none") return true;
  if (!isClear(style.backgroundColor)) return true;
  return ["top", "right", "bottom", "left"].some(
    (side) =>
      parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0 &&
      style.getPropertyValue(`border-${side}-style`) !== "none" &&
      !isClear(style.getPropertyValue(`border-${side}-color`)),
  );
}

function inTriangle(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// All animals are seen from above. s runs from the nose (0) back to the tail (L),
// an is the distance from the spine. Each returns 0 (outside) to 1 (densest).

function sharkDensity(s: number, an: number, L: number, hammer: boolean, soft: number) {
  const u = s / L;
  if (u < -0.02 || u > 1.06) return 0;
  const W = L * 0.1;
  let v = 0;

  // Body: rounded snout, full chest, long taper into the tail.
  let w: number;
  if (u < 0.2) w = hammer ? W * (0.55 + 0.45 * (u / 0.2)) : W * Math.sqrt(Math.max(u, 0) / 0.2);
  else if (u < 0.42) w = W;
  else w = W * (0.12 + 0.88 * Math.pow(Math.max(0, 1 - (u - 0.42) / 0.52), 1.4));
  if (an < w && u >= 0) {
    const edge = clamp((w - an) / soft, 0, 1);
    v = (0.4 + 0.42 * (1 - (an / w) ** 2)) * edge;
    hit.part = an < w * 0.35 ? BACK : an < w * 0.75 ? BODY : EDGE;
  }

  // Hammerhead's wide flat head.
  if (hammer) {
    const span = W * 1.7;
    const hu = Math.abs(u - 0.04) / 0.045;
    if (an < span && hu < Math.sqrt(Math.max(0, 1 - (an / span) ** 4)) && v < 0.65) {
      v = 0.65;
      hit.part = BODY;
    }
  }

  // Dorsal fin reads as a bright ridge along the spine.
  if (u > 0.3 && u < 0.44 && an < W * 0.28) {
    v = 0.95;
    hit.part = BACK;
  }

  // Pectoral fins, pelvic fins and the forked tail.
  if (v < 0.5 && (
    inTriangle(s, an, 0.24 * L, 0.8 * W, 0.47 * L, 2.9 * W, 0.43 * L, 0.8 * W) ||
    inTriangle(s, an, 0.64 * L, 0.4 * W, 0.75 * L, 1.5 * W, 0.72 * L, 0.3 * W) ||
    inTriangle(s, an, 0.88 * L, 0, 1.05 * L, 1.1 * W, 0.98 * L, 0)
  )) {
    v = 0.5;
    hit.part = EDGE;
  }

  return v;
}

function mantaDensity(s: number, an: number, L: number, flap: number, cell: number) {
  const u = s / L;
  const span = L * 1.15 * flap;
  let v = 0;

  if (an < span) {
    const rel = an / span;
    const uu = u - 0.5 * rel * rel; // wing tips sweep back
    if (uu > 0 && uu < 0.9 * Math.pow(1 - rel, 0.9)) {
      v = 0.4 + 0.4 * (1 - rel) ** 2;
      hit.part = rel > 0.72 ? EDGE : BODY;
      // Pale shoulder markings, like a real manta's back.
      if (rel > 0.14 && rel < 0.42 && uu > 0.1 && uu < 0.32) {
        v = 0.6;
        hit.part = ACCENT;
      }
    }
  }
  if (u > 0.05 && u < 0.8 && an < L * 0.12) {
    v = 0.85;
    hit.part = BACK;
  }
  // Cephalic fins at the front.
  if (u > -0.12 && u < 0.04 && an > L * 0.07 && an < L * 0.14) {
    v = 0.6;
    hit.part = EDGE;
  }
  // Long thin tail.
  if (u > 0.85 && u < 1.8 && an < cell * 0.5) {
    v = Math.max(v, 0.5);
    hit.part = BACK;
  }

  return v;
}

function turtleDensity(s: number, an: number, L: number, phase: number) {
  let v = 0;

  // Head.
  if (((s - 0.1 * L) / (0.09 * L)) ** 2 + (an / (0.075 * L)) ** 2 < 1) {
    v = 0.6;
    hit.part = EDGE;
  }

  // Front flippers paddle; back flippers stay tucked.
  const paddle = 0.12 * L * Math.sin(phase);
  if (
    inTriangle(s, an, 0.28 * L, 0.18 * L, 0.5 * L + paddle, 0.62 * L, 0.44 * L, 0.2 * L) ||
    inTriangle(s, an, 0.74 * L, 0.12 * L, 0.92 * L, 0.27 * L, 0.84 * L, 0.08 * L)
  ) {
    v = 0.55;
    hit.part = EDGE;
  }

  // Shell with a rim and scute lines.
  const sx = (s - 0.5 * L) / (0.33 * L);
  const sy = an / (0.27 * L);
  const e = sx * sx + sy * sy;
  if (e < 1) {
    if (e > 0.72) {
      v = 0.55;
      hit.part = ACCENT;
    } else if (
      Math.abs(Math.sin(sx * Math.PI * 1.6)) < 0.2 ||
      Math.abs(sy - 0.36) < 0.08
    ) {
      v = 0.85;
      hit.part = BACK;
    } else {
      v = 0.7;
      hit.part = BODY;
    }
  }

  return v;
}

const SPECS: Record<Kind, { near: [number, number]; far: [number, number]; speed: number; reach: number }> = {
  shark: { near: [380, 480], far: [220, 260], speed: 34, reach: 0.62 },
  hammerhead: { near: [380, 480], far: [220, 260], speed: 30, reach: 0.62 },
  manta: { near: [190, 210], far: [120, 130], speed: 22, reach: 1.35 },
  turtle: { near: [150, 170], far: [95, 105], speed: 18, reach: 0.7 },
};

const hasSpine = (c: Creature) => c.kind === "shark" || c.kind === "hammerhead";

// Lay the spine out straight along the heading, centred on the animal's position.
function layStraight(c: Creature) {
  const seg = c.length / (JOINTS - 1);
  const cos = Math.cos(c.heading);
  const sin = Math.sin(c.heading);
  for (let i = 0; i < JOINTS; i++) {
    const ahead = c.length / 2 - i * seg;
    c.joints[2 * i] = c.x + cos * ahead;
    c.joints[2 * i + 1] = c.y + sin * ahead;
  }
}

// The animal's position is the middle of its body.
function centerFromSpine(c: Creature) {
  const a = JOINTS - 2; // index of the x of the joint just ahead of the middle
  c.x = (c.joints[a] + c.joints[a + 2]) / 2;
  c.y = (c.joints[a + 1] + c.joints[a + 3]) / 2;
}

// The head swims forward and every point behind follows the one ahead at a fixed distance,
// so the body traces the path the head took. Each joint can only bend so far, like a real spine,
// so in a sharp turn the tail swings out a little instead of folding.
function swimSpine(c: Creature, dx: number, dy: number) {
  const J = c.joints;
  const seg = c.length / (JOINTS - 1);
  J[0] += dx;
  J[1] += dy;
  const limit = MAX_JOINT_BEND + 0.14 * Math.min(1, c.dash * 1.5);
  let prev = c.heading;
  for (let i = 1; i < JOINTS; i++) {
    const ax = J[2 * i - 2];
    const ay = J[2 * i - 1];
    let a = Math.atan2(ay - J[2 * i + 1], ax - J[2 * i]);
    const d = Math.atan2(Math.sin(a - prev), Math.cos(a - prev));
    if (d > limit) a = prev + limit;
    else if (d < -limit) a = prev - limit;
    J[2 * i] = ax - Math.cos(a) * seg;
    J[2 * i + 1] = ay - Math.sin(a) * seg;
    prev = a;
  }
  centerFromSpine(c);
}

// Escape, stage one: the body curls into a C around its middle while the head swings
// round towards the escape direction. p runs from 0 to 1 over the coil.
const coilPose = new Float32Array(JOINTS * 2);
function poseCoil(c: Creature, p: number) {
  const e = p * p * (3 - 2 * p); // eases in and out of the bend
  const turn = c.dashTurn * c.coilTurn * e;
  c.heading = c.coilHeading + turn;
  if (!hasSpine(c)) return;
  const seg = c.length / (JOINTS - 1);
  // Segment i joins joint i - 1 and joint i. Its angle runs from +turn at the head to -turn at the tail.
  const angle = (i: number) => c.coilHeading + turn * (1 - (2 * i - 1) / (JOINTS - 1));
  const mid = JOINTS / 2; // the segment holding the middle of the body
  let a = angle(mid);
  let hx = c.coilX + (Math.cos(a) * seg) / 2;
  let hy = c.coilY + (Math.sin(a) * seg) / 2;
  let tx = c.coilX - (Math.cos(a) * seg) / 2;
  let ty = c.coilY - (Math.sin(a) * seg) / 2;
  coilPose[2 * (mid - 1)] = hx;
  coilPose[2 * (mid - 1) + 1] = hy;
  coilPose[2 * mid] = tx;
  coilPose[2 * mid + 1] = ty;
  for (let i = mid - 1; i >= 1; i--) {
    a = angle(i);
    hx += Math.cos(a) * seg;
    hy += Math.sin(a) * seg;
    coilPose[2 * (i - 1)] = hx;
    coilPose[2 * (i - 1) + 1] = hy;
  }
  for (let i = mid + 1; i < JOINTS; i++) {
    a = angle(i);
    tx -= Math.cos(a) * seg;
    ty -= Math.sin(a) * seg;
    coilPose[2 * i] = tx;
    coilPose[2 * i + 1] = ty;
  }
  // Blend from wherever the body was, so there is no jump at the start.
  for (let i = 0; i < JOINTS * 2; i++) {
    c.joints[i] = c.coilFrom[i] + (coilPose[i] - c.coilFrom[i]) * e;
  }
  centerFromSpine(c);
}

// Where a point sits against a shark's spine: s is how far back from the nose it is,
// n how far to the side (signed). Written here to avoid allocating per cell.
const spot = { s: 0, n: 0 };
function projectOnSpine(c: Creature, px: number, py: number, maxDist2: number) {
  const J = c.joints;
  // Find the nearest joint first; the closest point is on one of the two segments beside it.
  let nearest = 0;
  let best = Infinity;
  for (let i = 0; i < JOINTS; i++) {
    const dx = px - J[2 * i];
    const dy = py - J[2 * i + 1];
    const d = dx * dx + dy * dy;
    if (d < best) {
      best = d;
      nearest = i;
    }
  }
  if (best > maxDist2) return false;
  const seg = c.length / (JOINTS - 1);
  best = Infinity;
  for (let k = Math.max(0, nearest - 1); k <= Math.min(JOINTS - 2, nearest); k++) {
    const ax = J[2 * k];
    const ay = J[2 * k + 1];
    const ex = J[2 * k + 2] - ax;
    const ey = J[2 * k + 3] - ay;
    const len2 = ex * ex + ey * ey || 1;
    let t = ((px - ax) * ex + (py - ay) * ey) / len2;
    // The two ends stay open so the snout and tail tip can reach past the end points.
    if (k > 0 && t < 0) t = 0;
    if (k < JOINTS - 2 && t > 1) t = 1;
    const qx = ax + ex * t;
    const qy = ay + ey * t;
    const d = (px - qx) ** 2 + (py - qy) ** 2;
    if (d < best) {
      best = d;
      spot.s = (k + t) * seg;
      spot.n = (px - ax) * ey - (py - ay) * ex < 0 ? -Math.sqrt(d) : Math.sqrt(d);
    }
  }
  return true;
}

// Escape reflex, like a real fish: curl into a C to face away from the threat, then bolt.
// strength (0 to 1) sets how hard it turns and how scared it is; dash how fast it bursts off.
function startEscape(c: Creature, x: number, y: number, strength: number, dash: number) {
  let away: number;
  if (Math.hypot(x - c.x, y - c.y) > c.length * 0.3) {
    away = Math.atan2(c.y - y, c.x - x);
  } else {
    // Touched near the middle: whip away from whichever side was touched.
    let side = -(x - c.x) * Math.sin(c.heading) + (y - c.y) * Math.cos(c.heading);
    if (hasSpine(c) && projectOnSpine(c, x, y, Infinity)) side = spot.n;
    const turnSign = Math.abs(side) < 4 ? (Math.random() < 0.5 ? 1 : -1) : side > 0 ? -1 : 1;
    away = c.heading + turnSign * 1.2;
  }
  const needed = Math.atan2(Math.sin(away - c.heading), Math.cos(away - c.heading));
  c.dashTurn = needed < 0 ? -1 : 1;
  c.coilTurn = Math.max(0.3 * strength, Math.min(Math.abs(needed), 0.35 + 0.65 * strength));
  c.coilTotal = c.coil = 0.18 + 0.14 * strength;
  c.coilX = c.x;
  c.coilY = c.y;
  c.coilHeading = c.heading;
  c.coilFrom.set(c.joints);
  c.dash = Math.max(c.dash, dash);
  c.startle = Math.max(c.startle, 0.3 + 0.5 * strength);
  // Keep fleeing that way afterwards, then find somewhere new to go, away from the scare.
  c.goalTime = Infinity;
  c.prefer = away;
  c.fleeX = c.x - Math.cos(away) * c.length;
  c.fleeY = c.y - Math.sin(away) * c.length;
  c.pending = 0;
  c.react = 0;
  c.curious = 0;
  c.orbit = Math.random() < 0.5 ? 1 : -1;
  c.gliding = false;
  c.modeTime = 4 + Math.random() * 4;
}

// The tightest circle it will swim in right now: wide when cruising, tighter with reason to hurry.
const turnRadius = (c: Creature) => c.length * (1 - 0.45 * c.urgency - 0.2 * c.dash);

// Pick a new spot on screen to swim to. It prefers spots roughly ahead and a fair way off,
// so it mostly swims in long, easy lines and only sometimes turns right round.
function pickGoal(c: Creature, width: number, height: number, viewTop: number) {
  const mx = Math.min(c.length * 0.6, width * 0.35);
  const my = Math.min(c.length * 0.5, height * 0.35);
  // Right after a scare it favours spots away from it.
  const facing = Number.isNaN(c.prefer) ? c.heading : c.prefer;
  c.prefer = NaN;
  const radius = turnRadius(c);
  let best = -Infinity;
  for (let k = 0; k < 8; k++) {
    const gx = mx + Math.random() * (width - 2 * mx);
    const gy = my + Math.random() * (height - 2 * my);
    const dx = gx - c.x;
    const dy = gy + viewTop - c.y;
    const turn = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - facing), Math.cos(Math.atan2(dy, dx) - facing)));
    const dist = Math.hypot(dx, dy);
    // A spot too far to the side to reach in an easy turn would only have it circling.
    const reachable = dist > 2 * radius * Math.sin(Math.min(turn, Math.PI / 2));
    const score =
      Math.min(dist, c.length * 2) / c.length - turn * 0.9 + Math.random() * 0.6 - (reachable ? 0 : 3);
    if (score > best) {
      best = score;
      c.goalX = gx;
      c.goalY = gy;
    }
  }
  c.goalTime = 0;
}

// A milder scare (the cursor darting at it, or a click close by): it picks up speed and
// turns away from the threat, without the escape curl.
function spook(c: Creature, x: number, y: number, strength: number) {
  c.startle = Math.max(c.startle, strength);
  c.dash = Math.max(c.dash, strength * 0.15);
  c.fleeX = x;
  c.fleeY = y;
  c.pending = 0;
  c.curious = 0;
  c.gliding = false;
  c.goalTime = Infinity;
  c.prefer = Math.atan2(c.y - y, c.x - x);
}

function makeCreature(width: number, height: number, near: boolean, kind: Kind): Creature {
  const spec = SPECS[kind];
  const [min, max] = near ? spec.near : spec.far;
  const scale = width < 640 ? 0.6 : 1;
  const speed = spec.speed * (0.85 + Math.random() * 0.3) * (near ? 1 : 0.6);
  const heading = Math.random() * Math.PI * 2;
  const c: Creature = {
    kind,
    near,
    x: Math.random() * width,
    y: Math.random() * height,
    heading,
    speed,
    length: (min + Math.random() * (max - min)) * scale,
    phase: Math.random() * Math.PI * 2,
    seed: Math.random() * 1000,
    joints: new Float32Array(JOINTS * 2),
    goalX: 0,
    goalY: 0,
    goalTime: Infinity,
    prefer: NaN,
    urgency: 0,
    calmUrgency: 0,
    angVel: 0,
    swim: speed,
    effort: 0.5,
    amp: 0.05,
    gliding: false,
    modeTime: 3 + Math.random() * 8,
    startle: 0,
    fleeX: 0,
    fleeY: 0,
    react: 0,
    pending: 0,
    pendX: 0,
    pendY: 0,
    curious: 0,
    orbit: Math.random() < 0.5 ? 1 : -1,
    dash: 0,
    coil: 0,
    coilTotal: 1,
    coilTurn: 0,
    dashTurn: 1,
    coilX: 0,
    coilY: 0,
    coilHeading: 0,
    coilFrom: new Float32Array(JOINTS * 2),
    wake: Math.random() * 0.4,
  };
  layStraight(c);
  return c;
}

// The animals on screen. Mantas and turtles are also available as "manta" and "turtle".
const LINEUP: [Kind, boolean][] = [
  ["shark", true],
  ["hammerhead", true],
];

// Start each animal in its own slice of the first screen so they don't overlap.
function populate(width: number, height: number) {
  return LINEUP.map(([kind, near], i) => {
    const c = makeCreature(width, height, near, kind);
    c.x = ((i + 0.5) / LINEUP.length) * width;
    layStraight(c);
    return c;
  });
}

export function AsciiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: -9999, y: -9999 };
    const atlas = document.createElement("canvas");
    let look = currentLook();
    const tiles = new Map<number, number[]>();
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let cell = 11;
    let dpr = 1;
    let density = new Float32Array(0);
    let layer = new Uint8Array(0);
    let color = new Uint8Array(0);
    let cover = new Float32Array(0);
    let water = new Float32Array(0);
    let creatures: Creature[] = [];
    let ripples: Ripple[] = [];
    let clock = 0;
    const lastRipple = { x: -9999, y: -9999 };
    const cursor = { x: -9999, y: -9999, vx: 0, vy: 0, still: 0 };
    let frame = 0;
    let last = 0;
    // The animals live on the page, not the screen, so they scroll with the content.
    // gridTop is the page y of the first grid row; offset is how far it sits above the screen.
    let gridTop = 0;
    let offset = 0;
    let lastScroll = -1;
    // The page content the animals dim under (see collectInks), found again whenever it changes.
    let inks: { node: Element | Text; clips: Element[] }[] = [];
    let inksStale = true;
    const textRange = document.createRange();

    // Pre-draw every character in every color once, so each frame only copies images.
    function buildAtlas() {
      const size = Math.round(cell * dpr);
      atlas.width = GLYPHS.length * size;
      atlas.height = look.glyphs.length * size;
      const a = atlas.getContext("2d");
      if (!a) return;
      a.clearRect(0, 0, atlas.width, atlas.height);
      a.font = `${Math.round(size * 0.82)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      a.textAlign = "center";
      a.textBaseline = "middle";
      look.glyphs.forEach((c, row) => {
        a.fillStyle = c;
        for (let i = 1; i < GLYPHS.length; i++) {
          a.fillText(GLYPHS[i], i * size + size / 2, row * size + size / 2 + dpr * 0.5);
        }
      });
    }

    function resize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const prevWidth = width;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = width < 640 ? 9 : 11;
      cols = Math.ceil(width / cell) + 1;
      rows = Math.ceil(height / cell) + 2;
      density = new Float32Array(cols * rows);
      layer = new Uint8Array(cols * rows);
      color = new Uint8Array(cols * rows);
      cover = new Float32Array(cols * rows);
      water = new Float32Array(cols * rows);
      // Styles can switch at screen-size breakpoints.
      inksStale = true;
      buildAtlas();
      // Only reshuffle the animals when the width changes a lot (not on mobile toolbar resizes).
      if (!creatures.length || Math.abs(width - prevWidth) > 200) {
        creatures = populate(width, height);
      }
    }

    function addRipple(x: number, y: number, strength: number, life: number, speed: number, delay = 0) {
      if (reduceMotion.matches) return;
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({ x, y, born: performance.now() / 1000 + delay, life, speed, strength });
    }

    function update(dt: number, t: number) {
      clock = t;
      ripples = ripples.filter((r) => t - r.born < r.life);
      if (dt <= 0) return;

      // Track where the cursor is on the page, how fast it moves, and how long it has been still.
      const present = pointer.x > -9000;
      const px = pointer.x;
      const py = pointer.y + window.scrollY;
      if (present) {
        const k = Math.min(1, dt * 8);
        if (cursor.x > -9000) {
          cursor.vx += ((px - cursor.x) / dt - cursor.vx) * k;
          cursor.vy += ((py - cursor.y) / dt - cursor.vy) * k;
        }
        cursor.x = px;
        cursor.y = py;
        cursor.still = Math.hypot(cursor.vx, cursor.vy) < 30 ? cursor.still + dt : 0;
      } else {
        cursor.x = cursor.y = -9999;
        cursor.vx = cursor.vy = 0;
        cursor.still = 0;
      }

      const viewTop = window.scrollY;
      const viewBottom = viewTop + height;

      for (const c of creatures) {
        const dirX = Math.cos(c.heading);
        const dirY = Math.sin(c.heading);

        // Everything below adds up to one "where I'd like to go" direction.
        // 1. Wandering: swim to a spot on screen, meandering a little on the way, then pick
        // another once it gets close (or has been at it a while).
        c.goalTime += dt;
        const goalDist = Math.hypot(c.goalX - c.x, c.goalY + viewTop - c.y);
        const goalTurn = Math.atan2(c.goalY + viewTop - c.y, c.goalX - c.x) - c.heading;
        const goalSide = Math.abs(Math.sin(Math.atan2(Math.sin(goalTurn), Math.cos(goalTurn))));
        // New spot once it arrives, gives up after a while, or the spot has ended up too far
        // to the side to reach without circling round it.
        if (
          c.goalTime > 30 ||
          goalDist < c.length * 0.6 ||
          (c.goalTime > 2 && goalDist < 1.8 * turnRadius(c) * goalSide)
        ) {
          pickGoal(c, width, height, viewTop);
        }
        const toGoal =
          Math.atan2(c.goalY + viewTop - c.y, c.goalX - c.x) + 0.2 * Math.sin(t * 0.23 + c.seed);
        let sx = Math.cos(toGoal) * 1.2;
        let sy = Math.sin(toGoal) * 1.2;

        // 2. The cursor. Sharks sense it in front of them, or close by from any side.
        let curiousTarget = 0;
        let dodge = 0; // how hard it is turning away from the cursor, 0 to 1
        if (present && c.near) {
          const dx = c.x - px;
          const dy = c.y - py;
          const d = Math.max(1, Math.hypot(dx, dy));
          const range = Math.max(220, c.length * 1.1);
          const ahead = -(dx * dirX + dy * dirY) / d; // 1 = straight ahead, -1 = behind
          const senses = ahead > -0.3 || d < c.length * 0.6;
          const approach = (cursor.vx * dx + cursor.vy * dy) / d; // px/s toward the shark

          if (senses && d < range) {
            const speed = Math.hypot(cursor.vx, cursor.vy);
            const darting = approach > 900 && d < c.length * 0.7;
            const brushing = speed > 200 && d < c.length * 0.2;
            if (c.react === 0 && c.startle < 0.15 && (darting || brushing)) {
              // Darting right at it: it gets a fright, after a short beat to notice.
              c.react = 0.15 + Math.random() * 0.2;
              c.pending = clamp(0.2 + approach / 3000, 0.2, 0.5);
              c.pendX = px;
              c.pendY = py;
            } else if (cursor.still < 1) {
              // Otherwise it just eases out of the way.
              dodge = 1 - d / range;
              const w = dodge ** 2 * 1.4;
              sx += (dx / d) * w;
              sy += (dy / d) * w;
            }
          }

          // A cursor left still nearby makes it curious: it circles at a polite distance.
          // Once curious it stays interested a little further out, so it can loop back round.
          const interest = c.curious > 0.3 ? 800 : 520;
          if (cursor.still > 1.2 && d < interest && c.startle < 0.1) curiousTarget = 1;
          if (c.curious > 0.02) {
            const radius = Math.max(220, c.length * 0.85);
            const pull = clamp((d - radius) / radius, -1, 1.5);
            const tx = (-dy / d) * c.orbit;
            const ty = (dx / d) * c.orbit;
            sx += (tx - (dx / d) * pull * 1.2) * c.curious * 2;
            sy += (ty - (dy / d) * pull * 1.2) * c.curious * 2;
          }
        }
        c.curious += (curiousTarget - c.curious) * Math.min(1, dt * (curiousTarget ? 0.5 : 1.5));

        // A noticed scare kicks in once its reaction delay runs out. Afterwards it settles
        // for a few seconds before the cursor can startle it again.
        if (c.react > 0) {
          c.react -= dt;
          if (c.react <= 0) {
            if (c.pending > 0) spook(c, c.pendX, c.pendY, c.pending);
            c.react = -4;
          }
        } else if (c.react < 0) {
          c.react = Math.min(0, c.react + dt);
        }

        // 3. Fleeing a scare.
        if (c.startle > 0.02) {
          const ax = c.x - c.fleeX;
          const ay = c.y - c.fleeY;
          const ad = Math.max(1, Math.hypot(ax, ay));
          sx += (ax / ad) * c.startle * 4;
          sy += (ay / ad) * c.startle * 4;
        }
        c.startle *= Math.exp(-dt * 0.9);

        // 4. Stay on screen. It looks ahead along the way it is swimming and starts turning
        // early if that would take it off screen. Swimming along an edge is fine.
        const look = c.length * 0.7 + c.swim * 1.5;
        const aheadX = c.x + dirX * look;
        const aheadY = c.y + dirY * look;
        const margin = c.length * 0.15;
        const inX =
          aheadX < margin ? margin - aheadX : aheadX > width - margin ? width - margin - aheadX : 0;
        const inY =
          aheadY < viewTop + margin
            ? viewTop + margin - aheadY
            : aheadY > viewBottom - margin
              ? viewBottom - margin - aheadY
              : 0;
        let edge = 0;
        if (inX || inY) {
          const depth = Math.hypot(inX, inY);
          edge = clamp(depth / (c.length * 0.5), 0, 1);
          const w = 0.6 + 3 * edge;
          sx += (inX / depth) * w;
          sy += (inY / depth) * w;
        }
        // If its middle has drifted off screen anyway, head back towards the middle of the
        // screen, more firmly the further out it is.
        const offX = c.x < 0 ? -c.x : c.x > width ? c.x - width : 0;
        const offY = c.y < viewTop ? viewTop - c.y : c.y > viewBottom ? c.y - viewBottom : 0;
        const outside = offX || offY ? 1 : 0;
        // How far out it is, 0 to 1. It hurries back the further out it is.
        const hurry = outside ? clamp(Math.hypot(offX, offY) / (c.length * 0.5), 0, 1) : 0;
        if (outside) {
          const mx = width / 2 - c.x;
          const my = (viewTop + viewBottom) / 2 - c.y;
          const md = Math.max(1, Math.hypot(mx, my));
          const w = 2 + 4 * hurry;
          sx += (mx / md) * w;
          sy += (my / md) * w;
          edge = 1;
        }

        if (c.coil > 0) {
          // Escape, stage one: curl into a C, nearly in place.
          c.coil -= dt;
          poseCoil(c, 1 - Math.max(0, c.coil) / c.coilTotal);
          c.swim = c.speed * 0.4;
          c.angVel = 0;
          if (c.coil <= 0) {
            // Stage two: spring out of the bend with a splash from the tail.
            const tailX = hasSpine(c) ? c.joints[JOINTS * 2 - 2] : c.x - Math.cos(c.heading) * c.length * 0.5;
            const tailY = hasSpine(c) ? c.joints[JOINTS * 2 - 1] : c.y - Math.sin(c.heading) * c.length * 0.5;
            addRipple(tailX, tailY, 0.9, 1.4, 130);
          }
        } else {
          // Turning has momentum, and it can't turn tighter than its body allows: wide, lazy
          // arcs when cruising, much tighter when fleeing or about to leave the screen.
          let diff = Math.atan2(sy, sx) - c.heading;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          // When turning right around, keep going the way it is already turning, or if it
          // isn't turning yet, turn towards whichever side has more room.
          if (Math.abs(diff) > 2.6) {
            const room = (nx: number, ny: number) =>
              Math.min(
                nx > 0 ? (width - c.x) / nx : nx < 0 ? -c.x / nx : Infinity,
                ny > 0 ? (viewBottom - c.y) / ny : ny < 0 ? (viewTop - c.y) / ny : Infinity,
              );
            const way =
              Math.abs(c.angVel) > 0.02
                ? Math.sign(c.angVel)
                : room(-dirY, dirX) >= room(dirY, -dirX)
                  ? 1
                  : -1;
            if (Math.sign(diff) !== way) diff -= Math.sign(diff) * 2 * Math.PI;
          }
          const behind = clamp((Math.abs(diff) - 1) / 1.5, 0, 1);
          // Ease into tighter turns rather than snapping into them. Edges are the exception:
          // that pressure already builds smoothly as it nears the edge, and it must not overshoot.
          const urgency = Math.min(1, c.startle * 1.2 + c.dash + 0.6 * dodge + 0.5 * c.curious + 0.3 * behind);
          c.calmUrgency += (urgency - c.calmUrgency) * Math.min(1, dt * 1.5);
          c.urgency = Math.min(1, c.calmUrgency + edge);
          const minRadius = turnRadius(c);
          const maxTurn = Math.max(0.05, c.swim / minRadius);
          const wantTurn = clamp(diff * 1.2, -maxTurn, maxTurn);
          const turnAccel = (0.5 + 1.2 * c.startle + 0.8 * outside + 1.5 * c.dash) * dt;
          c.angVel += clamp(wantTurn - c.angVel, -turnAccel, turnAccel);
          c.heading += c.angVel * dt;
        }

        // Pacing: stretches of steady swimming broken up by short glides.
        c.modeTime -= dt;
        if (c.modeTime <= 0) {
          c.gliding = !c.gliding;
          c.modeTime = c.gliding ? 1.8 + Math.random() * 2.5 : 5 + Math.random() * 8;
        }
        const gliding = c.gliding && c.startle < 0.1 && c.dash < 0.05 && edge < 0.05;
        const turning = Math.min(1, Math.abs(c.angVel) / 0.4);
        // The dash only kicks in once the C-bend is done, then fades as it coasts.
        const dashing = c.coil > 0 ? 0 : c.dash;
        c.dash *= Math.exp(-dt * (c.coil > 0 ? 0 : 1.2));
        const targetSpeed =
          c.speed *
            (gliding ? 0.72 : 1) *
            (1 - 0.3 * turning * (1 - dashing) * (1 - edge)) *
            (1 + c.startle * 1.5 + hurry) +
          c.speed * DASH_BOOST * dashing;
        // Speeding up takes effort; slowing down is water drag, which bites harder at speed.
        const accel =
          targetSpeed > c.swim ? 1 + 2 * c.startle + 5 * dashing : 0.5 * Math.max(1, c.swim / c.speed);
        if (c.coil <= 0) c.swim += (targetSpeed - c.swim) * Math.min(1, dt * accel);

        // Effort drives the tail: big strokes when working, barely moving while gliding.
        const targetEffort = gliding ? 0.08 : 0.45 + 0.5 * turning + c.startle + 2.2 * dashing;
        c.effort += (targetEffort - c.effort) * Math.min(1, dt * (2 + 4 * dashing));
        c.amp = 0.03 + 0.035 * Math.min(1.4, c.effort);
        const beat =
          c.kind === "manta"
            ? 1.4
            : c.kind === "turtle"
              ? 1.6
              : Math.min(10, (c.swim / 9) * (0.45 + 0.7 * c.effort));
        c.phase += dt * beat;

        // Swim forward; each tail stroke gives a small push. Sharks move head first and
        // the body follows; mantas and turtles move as one piece.
        if (c.coil <= 0) {
          const surge = 1 + 0.06 * c.effort * Math.cos(2 * c.phase);
          const step = c.swim * surge * dt;
          if (hasSpine(c)) {
            swimSpine(c, Math.cos(c.heading) * step, Math.sin(c.heading) * step);
          } else {
            c.x += Math.cos(c.heading) * step;
            c.y += Math.sin(c.heading) * step;
          }
        }

        // Leave a soft wake behind the tail, stronger when working hard.
        c.wake -= dt;
        if (c.wake <= 0) {
          c.wake = 0.3 / (0.4 + c.effort);
          const tail = c.length * (c.kind === "manta" ? 0.6 : 0.5);
          addRipple(
            hasSpine(c) ? c.joints[JOINTS * 2 - 2] : c.x - Math.cos(c.heading) * tail,
            hasSpine(c) ? c.joints[JOINTS * 2 - 1] : c.y - Math.sin(c.heading) * tail,
            Math.min(0.75, (c.near ? 0.4 : 0.2) * (0.5 + c.effort * 0.6)),
            1.6,
            22,
          );
        }

        // Once it is completely out of view (say after a scroll), bring it back in from just
        // past the nearest edge, already heading inward. Nobody can see the jump.
        const far = c.length * 0.62;
        const entry = c.length * 0.55;
        let reentered = false;
        if (c.y < viewTop - far) {
          c.y = viewTop - entry;
          c.heading = Math.PI / 2 + (Math.random() - 0.5);
          reentered = true;
        } else if (c.y > viewBottom + far) {
          c.y = viewBottom + entry;
          c.heading = -Math.PI / 2 + (Math.random() - 0.5);
          reentered = true;
        }
        if (c.x < -far) {
          c.x = -entry;
          c.heading = Math.random() - 0.5;
          reentered = true;
        } else if (c.x > width + far) {
          c.x = width + entry;
          c.heading = Math.PI + (Math.random() - 0.5);
          reentered = true;
        }
        if (reentered) {
          c.angVel = 0;
          c.coil = 0;
          layStraight(c);
          pickGoal(c, width, height, viewTop);
        }
      }
    }

    // Sharks are drawn around their spine, so the whole body bends through every turn.
    function rasterizeSpine(c: Creature) {
      const L = c.length;
      const J = c.joints;
      const reach = L * 0.36 + cell; // widest part: the pectoral fins, plus tail sway
      const maxDist2 = (reach + L / (JOINTS - 1)) ** 2;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < JOINTS; i++) {
        minX = Math.min(minX, J[2 * i]);
        maxX = Math.max(maxX, J[2 * i]);
        minY = Math.min(minY, J[2 * i + 1]);
        maxY = Math.max(maxY, J[2 * i + 1]);
      }
      const x0 = Math.max(0, Math.floor((minX - reach) / cell));
      const x1 = Math.min(cols - 1, Math.ceil((maxX + reach) / cell));
      const y0 = Math.max(0, Math.floor((minY - reach - gridTop) / cell));
      const y1 = Math.min(rows - 1, Math.ceil((maxY + reach - gridTop) / cell));
      if (x0 > x1 || y0 > y1) return;
      const near = c.near ? 1 : 0;
      const palette = PALETTES[c.kind];
      const hammer = c.kind === "hammerhead";
      const sway = L * c.amp;

      for (let y = y0; y <= y1; y++) {
        const py = gridTop + (y + 0.5) * cell;
        for (let x = x0; x <= x1; x++) {
          if (!projectOnSpine(c, (x + 0.5) * cell, py, maxDist2)) continue;
          const s = spot.s;
          const u = s / L;
          // Tail sways side to side more than the head.
          const n = u > 0 ? spot.n - sway * Math.sin(c.phase - u * 7.5) * Math.pow(u, 1.6) : spot.n;
          const v = sharkDensity(s, Math.abs(n), L, hammer, cell);
          if (v <= 0) continue;
          const i = y * cols + x;
          if ((near && !layer[i]) || (layer[i] === near && v > density[i])) {
            density[i] = v;
            layer[i] = near;
            color[i] = palette[hit.part];
          }
        }
      }
    }

    function rasterize(c: Creature) {
      if (hasSpine(c)) return rasterizeSpine(c);
      const L = c.length;
      const cos = Math.cos(c.heading);
      const sin = Math.sin(c.heading);
      const noseX = c.x + cos * L * 0.5;
      const noseY = c.y + sin * L * 0.5;
      const radius = L * SPECS[c.kind].reach;
      const x0 = Math.max(0, Math.floor((c.x - radius) / cell));
      const x1 = Math.min(cols - 1, Math.ceil((c.x + radius) / cell));
      const y0 = Math.max(0, Math.floor((c.y - radius - gridTop) / cell));
      const y1 = Math.min(rows - 1, Math.ceil((c.y + radius - gridTop) / cell));
      if (y0 > y1) return;
      const flap = 0.8 + 0.2 * Math.sin(c.phase);
      const near = c.near ? 1 : 0;
      const palette = PALETTES[c.kind];

      for (let y = y0; y <= y1; y++) {
        const dy = gridTop + (y + 0.5) * cell - noseY;
        for (let x = x0; x <= x1; x++) {
          const dx = (x + 0.5) * cell - noseX;
          const s = -(dx * cos + dy * sin);
          const n = -dx * sin + dy * cos;
          const v =
            c.kind === "manta"
              ? mantaDensity(s, Math.abs(n), L, flap, cell)
              : turtleDensity(s, Math.abs(n), L, c.phase);
          if (v <= 0) continue;
          const i = y * cols + x;
          if ((near && !layer[i]) || (layer[i] === near && v > density[i])) {
            density[i] = v;
            layer[i] = near;
            color[i] = palette[hit.part];
          }
        }
      }
    }

    // Expanding, slightly wobbly rings with a fainter ring inside.
    function rasterizeRipple(r: Ripple) {
      const age = clock - r.born;
      if (age < 0) return;
      const k = age / r.life;
      if (k >= 1) return;
      const radius = age * r.speed;
      const thick = cell * 1.6;
      const fade = r.strength * (1 - k) ** 1.5;
      const reach = radius + thick + cell;
      const x0 = Math.max(0, Math.floor((r.x - reach) / cell));
      const x1 = Math.min(cols - 1, Math.ceil((r.x + reach) / cell));
      const y0 = Math.max(0, Math.floor((r.y - reach - gridTop) / cell));
      const y1 = Math.min(rows - 1, Math.ceil((r.y + reach - gridTop) / cell));
      for (let y = y0; y <= y1; y++) {
        const dy = gridTop + (y + 0.5) * cell - r.y;
        for (let x = x0; x <= x1; x++) {
          const dx = (x + 0.5) * cell - r.x;
          const d = Math.hypot(dx, dy);
          const wobble = Math.sin(Math.atan2(dy, dx) * 5 + age * 3) * cell * 0.35;
          const ring = 1 - Math.abs(d - radius - wobble) / thick;
          const inner = 0.5 * (1 - Math.abs(d - radius * 0.55) / thick);
          const v = Math.max(ring, inner) * fade;
          if (v <= 0.04) continue;
          const i = y * cols + x;
          if (v > water[i]) water[i] = v;
        }
      }
    }

    // Find what on the page the animals should dim under: each piece of text, and each element
    // that draws something itself (icons, images, fields, the activity squares, anything with a
    // fill, border or shadow). Empty wrappers and the space between things are left out. clips
    // lists the scrolling or overflow-hidden boxes around each one, which hide what is scrolled away.
    function collectInks() {
      inks = [];
      inksStale = false;
      const root = document.querySelector("[data-ascii-content]");
      if (!root) return;
      const walk = (el: Element, clips: Element[]) => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.opacity === "0") return;
        // Popups are fixed to the screen, so the boxes around them in the page don't cut them off.
        if (style.position === "fixed") clips = [];
        const shown = style.visibility === "visible";
        if (shown && drawsItself(el, style)) inks.push({ node: el, clips });
        if (el.matches(SOLID)) return;
        if (style.overflowX !== "visible" || style.overflowY !== "visible") clips = [...clips, el];
        for (const child of el.childNodes) {
          if (child instanceof Element) walk(child, clips);
          else if (shown && child instanceof Text && child.data.trim()) inks.push({ node: child, clips });
        }
      };
      walk(root, []);
    }

    // How bright each cell may be: 1 in open water, UNDER_CONTENT right under content.
    // Positions are read every frame, so the dimming follows scrolling and moving content.
    function measureCover() {
      cover.fill(1);
      if (inksStale) collectInks();
      const clipBoxes = new Map<Element, DOMRect>();
      for (const { node, clips } of inks) {
        let left = -Infinity;
        let top = -Infinity;
        let right = Infinity;
        let bottom = Infinity;
        for (const clip of clips) {
          let box = clipBoxes.get(clip);
          if (!box) clipBoxes.set(clip, (box = clip.getBoundingClientRect()));
          left = Math.max(left, box.left);
          top = Math.max(top, box.top);
          right = Math.min(right, box.right);
          bottom = Math.min(bottom, box.bottom);
        }
        if (node instanceof Text) {
          // One box per line of text, hugging the words.
          textRange.selectNodeContents(node);
          for (const r of textRange.getClientRects()) {
            dimUnder(Math.max(r.left, left), Math.max(r.top, top), Math.min(r.right, right), Math.min(r.bottom, bottom));
          }
        } else {
          const r = node.getBoundingClientRect();
          dimUnder(Math.max(r.left, left), Math.max(r.top, top), Math.min(r.right, right), Math.min(r.bottom, bottom));
        }
      }
    }

    // Dim the cells under one box on the screen, easing back to full brightness around it.
    function dimUnder(l: number, t: number, r: number, b: number) {
      const reach = CONTENT_PADDING + CONTENT_FADE;
      // Skip boxes that are scrolled out of view, tiny (screen-reader-only text), or off screen.
      if (r - l < 2 || b - t < 2 || b < -reach || t > height + reach || r < -reach || l > width + reach) return;
      const left = l - CONTENT_PADDING;
      const right = r + CONTENT_PADDING;
      const top = t - CONTENT_PADDING;
      const bottom = b + CONTENT_PADDING;
      const x0 = Math.max(0, Math.floor((left - CONTENT_FADE) / cell));
      const x1 = Math.min(cols - 1, Math.ceil((right + CONTENT_FADE) / cell));
      const y0 = Math.max(0, Math.floor((top - CONTENT_FADE + offset) / cell));
      const y1 = Math.min(rows - 1, Math.ceil((bottom + CONTENT_FADE + offset) / cell));
      for (let y = y0; y <= y1; y++) {
        const cy = (y + 0.5) * cell - offset;
        const dy = Math.max(top - cy, 0, cy - bottom);
        for (let x = x0; x <= x1; x++) {
          const cx = (x + 0.5) * cell;
          const dx = Math.max(left - cx, 0, cx - right);
          const fade = clamp(Math.hypot(dx, dy) / CONTENT_FADE, 0, 1);
          const i = y * cols + x;
          cover[i] = Math.min(cover[i], UNDER_CONTENT + (1 - UNDER_CONTENT) * fade);
        }
      }
    }

    function draw() {
      if (!ctx) return;
      lastScroll = window.scrollY;
      gridTop = Math.floor(lastScroll / cell) * cell;
      offset = lastScroll - gridTop;
      measureCover();
      density.fill(0);
      layer.fill(0);
      water.fill(0);
      for (const r of ripples) rasterizeRipple(r);
      // Far animals first so near ones cover them.
      for (const c of creatures) if (!c.near) rasterize(c);
      for (const c of creatures) if (c.near) rasterize(c);

      ctx.clearRect(0, 0, width, height);

      // Tiles, batched by color, layer, brightness and cover to keep draw calls low.
      for (const list of tiles.values()) list.length = 0;
      for (let i = 0; i < density.length; i++) {
        const v = density[i];
        if (v <= 0) continue;
        const level = v < 0.5 ? 0 : v < 0.75 ? 1 : 2;
        const shade = Math.round(((cover[i] - UNDER_CONTENT) / (1 - UNDER_CONTENT)) * 3);
        const key = ((color[i] * 2 + layer[i]) * 3 + level) * 4 + shade;
        let list = tiles.get(key);
        if (!list) tiles.set(key, (list = []));
        list.push(i);
      }
      for (const [key, list] of tiles) {
        if (!list.length) continue;
        const shade = key % 4;
        const level = Math.floor(key / 4) % 3;
        const near = Math.floor(key / 12) % 2;
        const dim = UNDER_CONTENT + ((1 - UNDER_CONTENT) * shade) / 3;
        ctx.fillStyle = look.tiles[Math.floor(key / 24)];
        ctx.globalAlpha = look.tileAlpha[near] * (0.55 + level * 0.3) * dim;
        ctx.beginPath();
        for (const i of list) {
          ctx.rect((i % cols) * cell + 0.5, Math.floor(i / cols) * cell - offset + 0.5, cell - 1, cell - 1);
        }
        ctx.fill();
      }

      const size = Math.round(cell * dpr);

      // Ripples, in open water only (animals swim over them).
      for (let i = 0; i < water.length; i++) {
        const w = water[i];
        if (w <= 0.04 || density[i] > 0) continue;
        const ch = w < 0.3 ? 1 : w < 0.6 ? 3 : WAVE;
        ctx.globalAlpha = look.waterAlpha * Math.min(1, w + 0.2) * cover[i];
        ctx.drawImage(
          atlas,
          ch * size, WATER_COLOR * size, size, size,
          (i % cols) * cell, Math.floor(i / cols) * cell - offset, cell, cell,
        );
      }

      // Characters on top of the tiles.
      const top = RAMP.length - 1;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < density.length; i++) {
          const v = density[i];
          if (v <= 0 || layer[i] !== pass) continue;
          const ch = Math.max(1, Math.ceil(v * top));
          ctx.globalAlpha = look.glyphAlpha[pass] * cover[i];
          ctx.drawImage(
            atlas,
            ch * size, color[i] * size, size, size,
            (i % cols) * cell, Math.floor(i / cols) * cell - offset, cell, cell,
          );
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(time: number) {
      frame = requestAnimationFrame(loop);
      if (time - last < 1000 / FPS && window.scrollY === lastScroll) return;
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;
      update(dt, time / 1000);
      draw();
    }

    function start() {
      cancelAnimationFrame(frame);
      last = 0;
      if (reduceMotion.matches) {
        draw();
      } else {
        frame = requestAnimationFrame(loop);
      }
    }

    function handleResize() {
      resize();
      if (reduceMotion.matches) draw();
    }

    // The still frame needs redrawing on scroll so it moves with the content.
    function handleScroll() {
      if (reduceMotion.matches) draw();
    }

    function handlePointerMove(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      // Drop a small ripple every so often as the cursor moves through the water.
      const x = event.clientX;
      const y = event.clientY + window.scrollY;
      if (Math.hypot(x - lastRipple.x, y - lastRipple.y) > CURSOR_RIPPLE_GAP) {
        lastRipple.x = x;
        lastRipple.y = y;
        addRipple(x, y, 0.45, 1.3, 60);
      }
    }

    // Rough hit test against an animal's body and fins (ignores the tail sway).
    function isOnBody(c: Creature, x: number, y: number) {
      const L = c.length;
      if (hasSpine(c)) {
        if (!projectOnSpine(c, x, y, (L * 0.45) ** 2)) return false;
        const along = spot.s;
        return along > -0.05 * L && along < 1.02 * L && Math.abs(spot.n) < (along < 0.55 * L ? 0.22 : 0.1) * L + cell;
      }
      const cos = Math.cos(c.heading);
      const sin = Math.sin(c.heading);
      const rx = x - (c.x + cos * L * 0.5);
      const ry = y - (c.y + sin * L * 0.5);
      const s = -(rx * cos + ry * sin);
      const n = Math.abs(-rx * sin + ry * cos);
      if (c.kind === "manta") return s > -0.1 * L && s < L && n < L * 0.9;
      if (c.kind === "turtle") return s > 0 && s < L && n < L * 0.45;
      return s > -0.05 * L && s < 1.02 * L && n < (s < 0.55 * L ? 0.22 : 0.1) * L + cell;
    }

    // A click splashes two rings. Clicking an animal makes it dash off; clicks nearby startle it.
    function handlePointerDown(event: PointerEvent) {
      const x = event.clientX;
      const y = event.clientY + window.scrollY;
      addRipple(x, y, 1, 1.8, 110);
      addRipple(x, y, 0.6, 1.6, 80, 0.2);
      // Near animals sit on top, so they get the click first.
      const target =
        creatures.find((c) => c.near && isOnBody(c, x, y)) ??
        creatures.find((c) => !c.near && isOnBody(c, x, y));
      for (const c of creatures) {
        if (c === target) {
          startEscape(c, x, y, 1, 1);
          continue;
        }
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < STARTLE_RANGE + c.length * 0.5) {
          // Closer animals flinch sooner and harder.
          c.react = 0.05 + (d / STARTLE_RANGE) * 0.15;
          c.pending = Math.max(c.pending, 0.7 * (1 - d / (STARTLE_RANGE + c.length)));
          c.pendX = x;
          c.pendY = y;
        }
      }
    }

    function handlePointerLeave() {
      pointer.x = -9999;
      pointer.y = -9999;
    }

    function handleVisibility() {
      if (document.hidden) cancelAnimationFrame(frame);
      else start();
    }

    resize();
    start();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    document.addEventListener("visibilitychange", handleVisibility);
    reduceMotion.addEventListener("change", start);

    // Switch palettes the moment the theme changes.
    const themeObserver = new MutationObserver(() => {
      look = currentLook();
      buildAtlas();
      inksStale = true;
      if (reduceMotion.matches) draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Find the content again when anything on the page is added, removed or restyled
    // (a popup opening, the activity tooltip, text changing).
    const contentObserver = new MutationObserver(() => {
      inksStale = true;
      if (reduceMotion.matches) draw();
    });
    contentObserver.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "src"],
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      reduceMotion.removeEventListener("change", start);
      themeObserver.disconnect();
      contentObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
