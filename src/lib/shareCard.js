import { weatherFor } from './weatherCodes.js';
import { placeLabel, localClock, clockFromISO, uvCategory, round } from './format.js';

const W = 1080;
const H = 1920;
const CX = W / 2;
const PAD = 80;
const FONT = '-apple-system, "Segoe UI", Roboto, sans-serif';
const INK = '#e8ecff';
const INK_SOFT = '#8b96bf';
const INK_DIM = '#5a6389';
const CARD_R = 40;
const PI = Math.PI;
const TAU = PI * 2;

// ── Seeded PRNG for deterministic bokeh ──
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Core drawing helpers ──
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGradientLine(ctx, y, x1, x2, color = 'rgba(255,255,255,0.1)') {
  const g = ctx.createLinearGradient(x1, 0, x2, 0);
  g.addColorStop(0, 'transparent');
  g.addColorStop(0.3, color);
  g.addColorStop(0.7, color);
  g.addColorStop(1, 'transparent');
  ctx.strokeStyle = g;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

function drawBokeh(ctx) {
  const rng = mulberry32(42);
  for (let i = 0; i < 18; i++) {
    const bx = rng() * W;
    const by = rng() * H;
    const br = 30 + rng() * 120;
    const op = 0.01 + rng() * 0.02;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    g.addColorStop(0, `rgba(255,255,255,${op})`);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fill();
  }
}

function spaced(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const totalW = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
  let x = cx - totalW / 2;
  for (const c of chars) {
    ctx.fillText(c, x, y);
    x += ctx.measureText(c).width + spacing;
  }
}

// ── Reusable cloud bezier path ──
function cloudPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.38, cy + s * 0.18);
  ctx.bezierCurveTo(cx - s * 0.5, cy + s * 0.18, cx - s * 0.5, cy - s * 0.05, cx - s * 0.32, cy - s * 0.1);
  ctx.bezierCurveTo(cx - s * 0.34, cy - s * 0.32, cx - s * 0.12, cy - s * 0.38, cx + s * 0.02, cy - s * 0.22);
  ctx.bezierCurveTo(cx + s * 0.12, cy - s * 0.38, cx + s * 0.36, cy - s * 0.32, cx + s * 0.36, cy - s * 0.1);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.05, cx + s * 0.5, cy + s * 0.18, cx + s * 0.38, cy + s * 0.18);
  ctx.closePath();
}

function fillCloud(ctx, cx, cy, s) {
  cloudPath(ctx, cx, cy, s);
  ctx.fillStyle = 'rgba(200,212,235,0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ══════════════════════════════════════════
// LARGE WEATHER CONDITION ICONS (~140px)
// ══════════════════════════════════════════

function drawIconSun(ctx, cx, cy, size, color) {
  const r = size * 0.22;
  // Glow
  const g = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, size * 0.5);
  g.addColorStop(0, (color || '#fbbf24') + '30');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.5, 0, TAU);
  ctx.fill();

  // Rays
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fcd34d';
  ctx.lineWidth = size * 0.045;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const ri = r + size * 0.08;
    const ro = r + size * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
    ctx.lineTo(cx + Math.cos(a) * ro, cy + Math.sin(a) * ro);
    ctx.stroke();
  }

  // Core
  const cg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  cg.addColorStop(0, '#fef08a');
  cg.addColorStop(1, '#fbbf24');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.lineCap = 'butt';
}

function drawIconCloud(ctx, cx, cy, size) {
  fillCloud(ctx, cx, cy, size);
}

function drawIconCloudSun(ctx, cx, cy, size, color) {
  // Sun peeking from behind top-right
  const sx = cx + size * 0.22;
  const sy = cy - size * 0.18;
  const sr = size * 0.16;

  const sg = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr + size * 0.14);
  sg.addColorStop(0, '#fbbf24' + '30');
  sg.addColorStop(1, 'transparent');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, sy, sr + size * 0.14, 0, TAU);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fcd34d';
  ctx.lineWidth = size * 0.035;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * (sr + size * 0.04), sy + Math.sin(a) * (sr + size * 0.04));
    ctx.lineTo(sx + Math.cos(a) * (sr + size * 0.12), sy + Math.sin(a) * (sr + size * 0.12));
    ctx.stroke();
  }

  const cg = ctx.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr);
  cg.addColorStop(0, '#fef08a');
  cg.addColorStop(1, '#fbbf24');
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, TAU);
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.lineCap = 'butt';

  // Cloud in front
  fillCloud(ctx, cx - size * 0.06, cy + size * 0.08, size * 0.85);
}

function drawIconCloudFog(ctx, cx, cy, size) {
  fillCloud(ctx, cx, cy - size * 0.08, size * 0.85);

  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.04;
  const lines = [
    { w: 0.5, y: 0.22, o: 0.55 },
    { w: 0.38, y: 0.32, o: 0.35 },
    { w: 0.26, y: 0.42, o: 0.2 },
  ];
  for (const l of lines) {
    ctx.strokeStyle = `rgba(200,212,235,${l.o})`;
    ctx.beginPath();
    ctx.moveTo(cx - size * l.w, cy + size * l.y);
    ctx.lineTo(cx + size * l.w, cy + size * l.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawIconCloudDrizzle(ctx, cx, cy, size) {
  fillCloud(ctx, cx, cy - size * 0.1, size * 0.85);

  const drops = [
    [-0.15, 0.2], [0.08, 0.26], [-0.06, 0.36], [0.18, 0.34], [-0.2, 0.42],
  ];
  ctx.fillStyle = '#7dd3fc';
  for (const [dx, dy] of drops) {
    ctx.beginPath();
    ctx.arc(cx + size * dx, cy + size * dy, size * 0.025, 0, TAU);
    ctx.fill();
  }
}

function drawIconCloudRain(ctx, cx, cy, size) {
  fillCloud(ctx, cx, cy - size * 0.1, size * 0.85);

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = size * 0.035;
  const lines = [
    [-0.18, 0.2, -0.24, 0.36],
    [0.0, 0.22, -0.06, 0.38],
    [0.18, 0.18, 0.12, 0.34],
  ];
  for (const [x1, y1, x2, y2] of lines) {
    ctx.beginPath();
    ctx.moveTo(cx + size * x1, cy + size * y1);
    ctx.lineTo(cx + size * x2, cy + size * y2);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawIconCloudRainWind(ctx, cx, cy, size) {
  fillCloud(ctx, cx, cy - size * 0.1, size * 0.85);

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = size * 0.035;
  const rain = [
    [-0.15, 0.2, -0.26, 0.38],
    [0.05, 0.22, -0.06, 0.4],
    [0.22, 0.18, 0.11, 0.36],
  ];
  for (const [x1, y1, x2, y2] of rain) {
    ctx.beginPath();
    ctx.moveTo(cx + size * x1, cy + size * y1);
    ctx.lineTo(cx + size * x2, cy + size * y2);
    ctx.stroke();
  }

  // Wind streaks
  ctx.strokeStyle = 'rgba(200,212,235,0.4)';
  ctx.lineWidth = size * 0.025;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.1, cy + size * 0.26);
  ctx.lineTo(cx + size * 0.4, cy + size * 0.22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.05, cy + size * 0.36);
  ctx.lineTo(cx + size * 0.32, cy + size * 0.33);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawIconCloudSnow(ctx, cx, cy, size) {
  fillCloud(ctx, cx, cy - size * 0.1, size * 0.85);

  const flakes = [
    [-0.18, 0.22], [0.1, 0.2], [-0.05, 0.34], [0.2, 0.32], [-0.14, 0.44], [0.08, 0.44],
  ];
  ctx.fillStyle = '#e0f2fe';
  for (const [dx, dy] of flakes) {
    const fx = cx + size * dx;
    const fy = cy + size * dy;
    ctx.beginPath();
    ctx.arc(fx, fy, size * 0.022, 0, TAU);
    ctx.fill();

    // Mini star lines
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI;
      const len = size * 0.035;
      ctx.beginPath();
      ctx.moveTo(fx - Math.cos(a) * len, fy - Math.sin(a) * len);
      ctx.lineTo(fx + Math.cos(a) * len, fy + Math.sin(a) * len);
      ctx.stroke();
    }
  }
}

function drawIconSnowflake(ctx, cx, cy, size) {
  const armLen = size * 0.38;
  ctx.strokeStyle = '#bae6fd';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.04;

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU - PI / 2;
    const ex = cx + Math.cos(a) * armLen;
    const ey = cy + Math.sin(a) * armLen;

    // Main arm
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Branches at 60% and 80%
    for (const t of [0.55, 0.8]) {
      const bx = cx + Math.cos(a) * armLen * t;
      const by = cy + Math.sin(a) * armLen * t;
      const bLen = size * 0.11;
      for (const da of [-PI / 4, PI / 4]) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + da) * bLen, by + Math.sin(a + da) * bLen);
        ctx.stroke();
      }
    }
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.045, 0, TAU);
  ctx.fillStyle = '#e0f2fe';
  ctx.fill();
  ctx.lineCap = 'butt';
}

function drawIconCloudLightning(ctx, cx, cy, size) {
  fillCloud(ctx, cx, cy - size * 0.12, size * 0.85);

  // Lightning bolt
  ctx.save();
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.06, cy + size * 0.06);
  ctx.lineTo(cx - size * 0.06, cy + size * 0.22);
  ctx.lineTo(cx + size * 0.04, cy + size * 0.22);
  ctx.lineTo(cx - size * 0.04, cy + size * 0.42);
  ctx.lineTo(cx + size * 0.12, cy + size * 0.2);
  ctx.lineTo(cx + size * 0.02, cy + size * 0.2);
  ctx.closePath();
  ctx.fillStyle = '#fbbf24';
  ctx.fill();
  ctx.restore();
}

const WEATHER_ICONS = {
  Sun: drawIconSun,
  Cloud: drawIconCloud,
  CloudSun: drawIconCloudSun,
  CloudFog: drawIconCloudFog,
  CloudDrizzle: drawIconCloudDrizzle,
  CloudRain: drawIconCloudRain,
  CloudRainWind: drawIconCloudRainWind,
  CloudSnow: drawIconCloudSnow,
  Snowflake: drawIconSnowflake,
  CloudLightning: drawIconCloudLightning,
  CloudOff: drawIconCloud,
};

// ══════════════════════════════════════════
// SMALL METRIC ICONS (~26px)
// ══════════════════════════════════════════

function drawMetricDroplet(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.05, cy - s * 0.2, cx + s * 0.35, cy + s * 0.05, cx + s * 0.28, cy + s * 0.22);
  ctx.arc(cx, cy + s * 0.22, s * 0.28, 0, PI, false);
  ctx.bezierCurveTo(cx - s * 0.35, cy + s * 0.05, cx - s * 0.05, cy - s * 0.2, cx, cy - s * 0.45);
  ctx.closePath();
  ctx.fillStyle = 'rgba(56,189,248,0.6)';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawMetricWind(ctx, cx, cy, s) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  const lines = [
    { y: -s * 0.22, w: 0.4 },
    { y: 0, w: 0.32 },
    { y: s * 0.22, w: 0.24 },
  ];
  for (const l of lines) {
    ctx.beginPath();
    ctx.moveTo(cx - s * l.w, cy + l.y);
    ctx.quadraticCurveTo(cx, cy + l.y - s * 0.1, cx + s * l.w, cy + l.y);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawMetricHumidity(ctx, cx, cy, s) {
  // Droplet outline
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.05, cy - s * 0.2, cx + s * 0.35, cy + s * 0.05, cx + s * 0.28, cy + s * 0.22);
  ctx.arc(cx, cy + s * 0.22, s * 0.28, 0, PI, false);
  ctx.bezierCurveTo(cx - s * 0.35, cy + s * 0.05, cx - s * 0.05, cy - s * 0.2, cx, cy - s * 0.45);
  ctx.closePath();

  ctx.save();
  ctx.clip();
  // Fill level at ~60%
  const fillY = cy - s * 0.05;
  ctx.fillStyle = 'rgba(129,140,248,0.45)';
  ctx.fillRect(cx - s * 0.4, fillY, s * 0.8, s * 0.7);
  ctx.restore();

  // Re-draw outline on top
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.05, cy - s * 0.2, cx + s * 0.35, cy + s * 0.05, cx + s * 0.28, cy + s * 0.22);
  ctx.arc(cx, cy + s * 0.22, s * 0.28, 0, PI, false);
  ctx.bezierCurveTo(cx - s * 0.35, cy + s * 0.05, cx - s * 0.05, cy - s * 0.2, cx, cy - s * 0.45);
  ctx.closePath();
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawMetricUV(ctx, cx, cy, s) {
  const r = s * 0.16;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r + s * 0.08), cy + Math.sin(a) * (r + s * 0.08));
    ctx.lineTo(cx + Math.cos(a) * (r + s * 0.2), cy + Math.sin(a) * (r + s * 0.2));
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

function drawMetricPressure(ctx, cx, cy, s) {
  // Gauge arc (270 degrees, open at bottom)
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.05, s * 0.35, PI * 0.75, PI * 0.25, false);
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Needle pointing to ~2 o'clock
  const na = -PI * 0.15;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.05);
  ctx.lineTo(cx + Math.cos(na) * s * 0.24, cy + s * 0.05 + Math.sin(na) * s * 0.24);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center pivot
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.05, 2.5, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.lineCap = 'butt';
}

function drawMetricEye(ctx, cx, cy, s) {
  // Eye outline
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy);
  ctx.quadraticCurveTo(cx, cy - s * 0.32, cx + s * 0.4, cy);
  ctx.quadraticCurveTo(cx, cy + s * 0.32, cx - s * 0.4, cy);
  ctx.closePath();
  ctx.strokeStyle = INK_SOFT;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Iris
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.12, 0, TAU);
  ctx.fillStyle = INK_SOFT;
  ctx.fill();

  // Pupil
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.05, 0, TAU);
  ctx.fillStyle = INK;
  ctx.fill();
}

const METRIC_ICONS = {
  Rain: drawMetricDroplet,
  Wind: drawMetricWind,
  Humidity: drawMetricHumidity,
  'UV Index': drawMetricUV,
  Pressure: drawMetricPressure,
  Visibility: drawMetricEye,
};

// ── Enhanced glass tile with icon ──
function drawGlassTile(ctx, x, y, w, h, label, value, accent, iconKey) {
  roundRect(ctx, x, y, w, h, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (accent) {
    const glow = ctx.createRadialGradient(x + w / 2, y + 10, 0, x + w / 2, y + 10, h * 0.8);
    glow.addColorStop(0, accent + '0a');
    glow.addColorStop(1, 'transparent');
    roundRect(ctx, x, y, w, h, 20);
    ctx.fillStyle = glow;
    ctx.fill();
  }

  // Icon
  const iconFn = METRIC_ICONS[iconKey];
  if (iconFn) {
    iconFn(ctx, x + w / 2, y + 32, 26);
  }

  // Label
  ctx.fillStyle = INK_DIM;
  ctx.font = `600 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), x + w / 2, y + 64);

  // Value
  ctx.fillStyle = INK;
  ctx.font = `700 36px ${FONT}`;
  ctx.fillText(value, x + w / 2, y + h - 30);

  // Restore the default baseline so downstream text (sunrise arc, AQI, footer)
  // isn't rendered half a line high.
  ctx.textBaseline = 'alphabetic';
}

// ── Sunrise arc visualization ──
function drawSunriseArc(ctx, y, sun, utcOffsetSeconds, gradient) {
  const panelX = PAD + 20;
  const panelW = W - PAD * 2 - 40;
  const panelH = 160;

  roundRect(ctx, panelX, y, panelW, panelH, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const arcX1 = PAD + 100;
  const arcX2 = W - PAD - 100;
  const horizY = y + 108;
  const peakY = y + 28;

  // Horizon line
  drawGradientLine(ctx, horizY, arcX1 - 20, arcX2 + 20, 'rgba(255,255,255,0.06)');

  // Compute sun progress
  let t = 0.5;
  if (sun.sunrise && sun.sunset) {
    const riseMs = new Date(sun.sunrise + 'Z').getTime();
    const setMs = new Date(sun.sunset + 'Z').getTime();
    const nowMs = Date.now() + (utcOffsetSeconds ?? 0) * 1000;
    const nowUtc = new Date(nowMs).getTime();
    if (setMs > riseMs) t = Math.max(0, Math.min(1, (nowUtc - riseMs) / (setMs - riseMs)));
  }

  // Draw full arc as dashed dim line
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const px = (1 - p) * (1 - p) * arcX1 + 2 * (1 - p) * p * CX + p * p * arcX2;
    const py = (1 - p) * (1 - p) * horizY + 2 * (1 - p) * p * peakY + p * p * horizY;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  // Draw traveled portion as solid colored line
  if (t > 0) {
    const tClamped = Math.min(t, 1);
    const travelSteps = Math.round(tClamped * steps);
    ctx.strokeStyle = gradient[0] + '60';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= travelSteps; i++) {
      const p = i / steps;
      const px = (1 - p) * (1 - p) * arcX1 + 2 * (1 - p) * p * CX + p * p * arcX2;
      const py = (1 - p) * (1 - p) * horizY + 2 * (1 - p) * p * peakY + p * p * horizY;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Sun indicator on arc
  const sunX = (1 - t) * (1 - t) * arcX1 + 2 * (1 - t) * t * CX + t * t * arcX2;
  const sunY = (1 - t) * (1 - t) * horizY + 2 * (1 - t) * t * peakY + t * t * horizY;

  // Sun glow
  const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 22);
  sg.addColorStop(0, '#fbbf24' + '40');
  sg.addColorStop(1, 'transparent');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 22, 0, TAU);
  ctx.fill();

  // Sun circle
  const scg = ctx.createRadialGradient(sunX - 3, sunY - 3, 0, sunX, sunY, 8);
  scg.addColorStop(0, '#fef08a');
  scg.addColorStop(1, '#fbbf24');
  ctx.beginPath();
  ctx.arc(sunX, sunY, 8, 0, TAU);
  ctx.fillStyle = scg;
  ctx.fill();

  // 6 tiny rays
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fcd34d';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(a) * 11, sunY + Math.sin(a) * 11);
    ctx.lineTo(sunX + Math.cos(a) * 16, sunY + Math.sin(a) * 16);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  // Labels
  ctx.textAlign = 'center';
  if (sun.sunrise) {
    ctx.fillStyle = INK_DIM;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('SUNRISE', arcX1, horizY + 22);
    ctx.fillStyle = INK;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(clockFromISO(sun.sunrise), arcX1, horizY + 48);
  }
  if (sun.sunset) {
    ctx.fillStyle = INK_DIM;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('SUNSET', arcX2, horizY + 22);
    ctx.fillStyle = INK;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText(clockFromISO(sun.sunset), arcX2, horizY + 48);
  }
}

// ── Logo mark ──
function drawLogoMark(ctx, cx, cy, size) {
  // Mini sun
  const sx = cx + size * 0.28;
  const sy = cy - size * 0.15;
  ctx.beginPath();
  ctx.arc(sx, sy, size * 0.18, 0, TAU);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();

  // Mini cloud
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.35, cy + size * 0.15);
  ctx.bezierCurveTo(cx - size * 0.42, cy + size * 0.15, cx - size * 0.42, cy - size * 0.02, cx - size * 0.28, cy - size * 0.05);
  ctx.bezierCurveTo(cx - size * 0.28, cy - size * 0.2, cx - size * 0.08, cy - size * 0.22, cx + size * 0.02, cy - size * 0.1);
  ctx.bezierCurveTo(cx + size * 0.12, cy - size * 0.18, cx + size * 0.28, cy - size * 0.1, cx + size * 0.28, cy + size * 0.02);
  ctx.bezierCurveTo(cx + size * 0.38, cy + size * 0.02, cx + size * 0.38, cy + size * 0.15, cx + size * 0.3, cy + size * 0.15);
  ctx.closePath();
  ctx.fillStyle = 'rgba(232,236,255,0.5)';
  ctx.fill();
}

// ══════════════════════════════════════════
// MAIN CARD GENERATOR
// ══════════════════════════════════════════

export async function generateWeatherCard({ location, current, daily, sun, region, aq, units, utcOffsetSeconds }) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';

  const { label: conditionLabel, icon: iconName, gradient } = weatherFor(current.code, current.isDay);

  // ===== BACKGROUND =====
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#050810');
  bg.addColorStop(0.3, '#0a1228');
  bg.addColorStop(0.6, '#111d4a');
  bg.addColorStop(1, '#1a0e3a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Condition glow
  const condGlow = ctx.createRadialGradient(CX, 480, 0, CX, 480, 650);
  condGlow.addColorStop(0, gradient[0] + '18');
  condGlow.addColorStop(0.5, gradient[1] + '08');
  condGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = condGlow;
  ctx.fillRect(0, 0, W, H);

  // Cool top-left accent
  const topGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
  topGlow.addColorStop(0, 'rgba(56,189,248,0.06)');
  topGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);

  // Warm bottom-right accent
  const btmGlow = ctx.createRadialGradient(W, H, 0, W, H, 800);
  btmGlow.addColorStop(0, 'rgba(139,92,246,0.04)');
  btmGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = btmGlow;
  ctx.fillRect(0, 0, W, H);

  // Bokeh
  drawBokeh(ctx);

  // Fine texture dots
  ctx.fillStyle = 'rgba(255,255,255,0.008)';
  for (let gx = 0; gx < W; gx += 60) {
    for (let gy = 0; gy < H; gy += 60) {
      ctx.fillRect(gx, gy, 1, 1);
    }
  }

  // Outer glass border
  roundRect(ctx, 16, 16, W - 32, H - 32, CARD_R);
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ===== TIME + DATE =====
  let y = 100;
  const now = new Date(Date.now() + (utcOffsetSeconds ?? 0) * 1000);
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const timeStr = localClock(utcOffsetSeconds);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK_DIM;
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(timeStr, CX, y);

  y += 36;
  ctx.fillStyle = INK_SOFT;
  ctx.font = `400 28px ${FONT}`;
  ctx.fillText(dateStr, CX, y);

  // ===== LOCATION =====
  y += 64;
  const place = placeLabel(location);
  ctx.fillStyle = INK;
  ctx.font = `700 56px ${FONT}`;
  const maxTextW = W - PAD * 2;
  if (ctx.measureText(place).width > maxTextW) {
    ctx.font = `700 42px ${FONT}`;
  }
  ctx.fillText(place, CX, y, maxTextW);

  if (region) {
    y += 42;
    ctx.fillStyle = INK_DIM;
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText(`${region.flag ?? ''} ${region.name ?? 'Global'}`.trim(), CX, y);
  }

  // Gradient separator
  y += 48;
  drawGradientLine(ctx, y, PAD + 140, W - PAD - 140);

  // ===== WEATHER CONDITION ICON =====
  y += 90;
  const iconCY = y;

  // Icon glow behind
  const iconGlow = ctx.createRadialGradient(CX, iconCY, 0, CX, iconCY, 180);
  iconGlow.addColorStop(0, gradient[0] + '20');
  iconGlow.addColorStop(0.6, gradient[1] + '08');
  iconGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = iconGlow;
  ctx.beginPath();
  ctx.arc(CX, iconCY, 180, 0, TAU);
  ctx.fill();

  const drawIcon = WEATHER_ICONS[iconName] ?? drawIconCloud;
  drawIcon(ctx, CX, iconCY, 140, gradient[0]);

  // ===== HERO TEMPERATURE =====
  y = iconCY + 250;
  ctx.textAlign = 'center';
  ctx.font = `800 200px ${FONT}`;
  const tempStr = units.fmtTemp(current.temp);

  // Subtle colored shadow
  ctx.fillStyle = gradient[0] + '12';
  ctx.fillText(tempStr, CX, y + 4);
  // Main temp
  ctx.fillStyle = INK;
  ctx.fillText(tempStr, CX, y);

  // ===== CONDITION LABEL =====
  y += 58;
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 38px ${FONT}`;
  ctx.fillText(conditionLabel, CX, y);

  // Accent underline
  const labelW = ctx.measureText(conditionLabel).width;
  const underHalf = Math.min(labelW * 0.5, 80);
  y += 16;
  drawGradientLine(ctx, y, CX - underHalf, CX + underHalf, gradient[0] + '40');

  // ===== FEELS LIKE + HIGH/LOW =====
  y += 52;
  ctx.fillStyle = INK_DIM;
  ctx.font = `400 26px ${FONT}`;
  const feelsStr = `Feels like ${units.fmtTemp(current.feels)}`;
  const hiLoStr = daily ? `H: ${units.fmtTemp(daily.tMax)}   L: ${units.fmtTemp(daily.tMin)}` : null;
  ctx.fillText(hiLoStr ? `${feelsStr}     ${hiLoStr}` : feelsStr, CX, y);

  // ===== FEELS BAR =====
  y += 40;
  const barInset = 180;
  const barX = PAD + barInset;
  const barW = W - PAD * 2 - barInset * 2;
  const barH = 8;

  roundRect(ctx, barX, y, barW, barH, 4);
  const feelsGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  feelsGrad.addColorStop(0, '#3b82f6');
  feelsGrad.addColorStop(0.25, '#06b6d4');
  feelsGrad.addColorStop(0.45, '#34d399');
  feelsGrad.addColorStop(0.6, '#fbbf24');
  feelsGrad.addColorStop(0.8, '#f97316');
  feelsGrad.addColorStop(1, '#ef4444');
  ctx.fillStyle = feelsGrad;
  ctx.fill();

  const feelsVal = current.feels ?? current.temp ?? 20;
  const feelsNorm = Math.min(1, Math.max(0, (feelsVal + 20) / 70));
  const dotX = barX + feelsNorm * barW;
  ctx.beginPath();
  ctx.arc(dotX, y + barH / 2, 6, 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(dotX, y + barH / 2, 10, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ===== CONDITIONS HEADER =====
  y += 56;
  ctx.fillStyle = INK_DIM;
  ctx.font = `600 18px ${FONT}`;
  ctx.textAlign = 'center';
  spaced(ctx, 'CONDITIONS', CX, y, 3);

  // ===== METRICS GRID (3x2) =====
  y += 28;
  const tileGap = 20;
  const tileW = (W - PAD * 2 - tileGap * 2) / 3;
  const tileH = 130;

  const rainStr = round(current.precipProb) != null ? `${round(current.precipProb)}%` : '--';
  const windStr = units.fmtWind(current.wind);
  const humStr = round(current.humidity) != null ? `${round(current.humidity)}%` : '--';
  const uvInfo = uvCategory(current.uv);
  const uvStr = round(current.uv, 1) != null ? `${round(current.uv, 1)}` : '--';
  const presStr = round(current.pressure) != null ? `${round(current.pressure)}` : '--';
  const visStr = current.visibility != null ? `${Math.round(current.visibility / 1000)} km` : '--';

  const tiles = [
    ['Rain', rainStr, '#38bdf8', 'Rain'],
    ['Wind', windStr, '#34d399', 'Wind'],
    ['Humidity', humStr, '#818cf8', 'Humidity'],
    ['UV Index', uvStr, uvInfo?.color, 'UV Index'],
    ['Pressure', presStr, '#fbbf24', 'Pressure'],
    ['Visibility', visStr, '#94a3b8', 'Visibility'],
  ];

  tiles.forEach(([label, value, accent, iconKey], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tx = PAD + col * (tileW + tileGap);
    const ty = y + row * (tileH + tileGap);
    drawGlassTile(ctx, tx, ty, tileW, tileH, label, value, accent, iconKey);
  });

  y += 2 * tileH + tileGap;

  // ===== GRADIENT SEPARATOR =====
  y += 36;
  drawGradientLine(ctx, y, PAD + 140, W - PAD - 140);

  // ===== SUNRISE ARC =====
  if (sun?.sunrise || sun?.sunset) {
    y += 28;
    drawSunriseArc(ctx, y, sun, utcOffsetSeconds, gradient);
    y += 160;
  }

  // ===== AQI BADGE =====
  if (aq?.usAqi != null) {
    y += 28;
    const aqi = Math.round(aq.usAqi);
    let aqLabel = 'Good';
    let aqColor = '#34d399';
    if (aqi > 300) { aqLabel = 'Hazardous'; aqColor = '#991b1b'; }
    else if (aqi > 200) { aqLabel = 'Very Unhealthy'; aqColor = '#9333ea'; }
    else if (aqi > 150) { aqLabel = 'Unhealthy'; aqColor = '#ef4444'; }
    else if (aqi > 100) { aqLabel = 'Sensitive Groups'; aqColor = '#fb923c'; }
    else if (aqi > 50) { aqLabel = 'Moderate'; aqColor = '#fbbf24'; }

    const badgeW = 340;
    const badgeH = 48;
    const bx = (W - badgeW) / 2;
    roundRect(ctx, bx, y, badgeW, badgeH, 24);
    ctx.fillStyle = aqColor + '12';
    ctx.fill();
    ctx.strokeStyle = aqColor + '30';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(bx + 28, y + badgeH / 2, 5, 0, TAU);
    ctx.fillStyle = aqColor;
    ctx.fill();

    ctx.fillStyle = aqColor;
    ctx.font = `600 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`AQI ${aqi}  -  ${aqLabel}`, CX, y + 31);
    y += badgeH;
  }

  // ===== BRANDING FOOTER =====
  y = Math.max(y + 50, H - 200);
  drawGradientLine(ctx, y, PAD + 200, W - PAD - 200);

  y += 52;
  ctx.textAlign = 'center';

  // Logo mark + title
  drawLogoMark(ctx, CX - 130, y - 8, 28);
  ctx.fillStyle = INK;
  ctx.font = `800 38px ${FONT}`;
  ctx.fillText('AccuWeather', CX + 10, y);

  y += 34;
  ctx.fillStyle = INK_DIM;
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText('Multi-model consensus forecast', CX, y);

  y += 36;
  ctx.fillStyle = 'rgba(56,189,248,0.5)';
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText('github.com/Arnav-Dugad', CX, y);

  // ===== GENERATE BLOB =====
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    );
  });
}
