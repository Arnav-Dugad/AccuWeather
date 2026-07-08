# AccuWeather · Smart Model Router 🌦️

An ultra-high-accuracy, **zero-cost** global weather dashboard. Its differentiator is a
**Smart Model Router** that picks and *weight-blends* numerical weather models by region to
maximize accuracy — with **elite tuning over India** to cancel the well-known GFS monsoon
hot/wet bias.

No API keys. No backend. Builds to a static site that hosts free on Vercel.

> **Disclaimer:** Independent demo project — *not affiliated with AccuWeather, Inc.* Forecast data
> from [Open-Meteo](https://open-meteo.com) (ECMWF · GFS · DWD ICON · NOAA HRRR). Radar from
> [RainViewer](https://www.rainviewer.com). Blends are transparent weighted post-processing of
> public model output, **not** a new numerical weather model.

---

## ✨ Features

- **Smart Model Router** — auto-selects a model blend from your coordinates:
  | Region | Blend | Why |
  | --- | --- | --- |
  | 🇮🇳 **India** | 60% ECMWF · 40% ICON · _GFS shown but 0%_ | Excludes GFS's monsoon wet/hot bias |
  | 🇺🇸 **North America** | 45% HRRR · 35% GFS · 20% ECMWF | Convective-scale HRRR leads over CONUS |
  | 🌍 **Global** | 70% ECMWF · 30% GFS | Robust worldwide baseline |
- **Consensus card** — weight-blended temperature & condition (reads hourly arrays, not the
  single-model `current` block).
- **Meteorological Confidence Index** — a 0–100 gauge from inter-model spread: tight agreement →
  *High*; sharp divergence → *Volatile*.
- **Full transparency breakdown** — every model side-by-side with its weight and its delta vs the
  consensus (so you can *see* GFS running hot over India and being excluded).
- **Advanced rain prediction** — probabilistic chance-of-rain (PoP) from **90+ ensemble members**
  (Open-Meteo Ensemble API: ECMWF 51 · ICON 40 · GFS 31), with expected-amount P25–P75 bands and a
  **rain-specific confidence** read ("High — 88% of members agree"). PoP weighting mirrors the
  router, so GFS stays excluded over India — which also fixes the deterministic ECMWF PoP gap.
- **2-hour minutely nowcast** — 15-minute precipitation → "Rain starting in ~25 min" headline + an
  intensity sparkline.
- **Live precipitation radar** — animated RainViewer loop on a dark Leaflet map (global incl.
  India) with **forward "forecast" frames**, plus an outbound link to IMD/INSAT-3D for Indian users.
- **Air Quality + AQI** — US AQI, category & health advice, dominant pollutant and PM2.5/PM10/O₃/NO₂
  (Open-Meteo Air-Quality API; loads independently so it never blocks the forecast).
- **24-hour temperature chart** — SVG line/area chart with precip-probability bars and a "now"
  marker, plus sunrise/sunset times.
- **Units toggle (°C/°F, km/h/mph)** — instant client-side conversion, persisted to localStorage.
- **Saved locations + shareable links** — pin favorite cities as quick-pick chips and copy a
  `?lat&lon` deep link to share any forecast.
- **Premium dark glassmorphic UI** — animated aurora backdrop, count-up animations, fully
  responsive, reduced-motion aware.
- Search any city (Open-Meteo geocoding) or use one-tap geolocation — denied/unavailable falls back
  to New Delhi; granted locations are reverse-geocoded to a real place name.

## 🧱 Tech stack

Vite · React 18 · Tailwind CSS v4 · Leaflet / react-leaflet · framer-motion · lucide-react.

## 📁 Structure

```
src/
├── config/models.js     # model registry, bounding boxes, region → weights
├── lib/
│   ├── router.js        # resolveRegion(lat,lon) + modelsForRegion
│   ├── openMeteo.js     # forecast URL builder, fetch, geocoding search
│   ├── blend.js         # weighted blend, consensus, Confidence Index
│   ├── weatherCodes.js  # WMO code → label/icon/gradient
│   └── format.js        # display formatting
├── hooks/               # useGeolocation, useWeather (router→fetch→blend)
└── components/          # SearchBar, ConsensusCard, ConfidenceIndex,
                         # ModelBreakdown, MetricsGrid, HourlyStrip,
                         # DailyForecast, RadarMap, RegionBadge, …
```

## 🚀 Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # → dist/
npm run preview      # serve the production build
```

---

## ☁️ Deploy for free

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "AccuWeather Smart Model Router"
git branch -M main

# Option A: GitHub CLI (creates the repo and pushes in one go)
gh repo create accuweather-smart-router --public --source=. --push

# Option B: create an empty repo at github.com/new, then:
git remote add origin https://github.com/<your-username>/accuweather-smart-router.git
git push -u origin main
```

### Step 2 — Deploy on Vercel (free Hobby tier)

**Dashboard (easiest):**
1. Go to <https://vercel.com/new> and sign in with GitHub.
2. **Import** your `accuweather-smart-router` repo.
3. Vercel auto-detects Vite (Build `npm run build`, Output `dist`) — confirmed by `vercel.json`.
4. Click **Deploy**. You get a live `https://<project>.vercel.app` URL in ~30s.

**Or via CLI:**
```bash
npm i -g vercel
vercel            # link/preview deploy
vercel --prod     # production deploy
```

No environment variables are required — every data source is keyless and public.

### Updating

Push to `main` and Vercel auto-redeploys:
```bash
git add . && git commit -m "update" && git push
```

---

## 📊 Data sources & accuracy notes

- **Open-Meteo** aggregates official model output (ECMWF IFS 0.25°, NOAA GFS, DWD ICON, NOAA HRRR)
  and lets you request several models in one call; this app blends them client-side.
- The **India profile** intentionally down-weights GFS to **0%** for the consensus while still
  displaying it, because GFS exhibits a documented warm/wet bias during the South-West monsoon.
  ECMWF + DWD ICON are the stronger performers over the subcontinent.
- The **Confidence Index** is honest about uncertainty: when models disagree, it tells you the
  forecast is volatile rather than projecting false precision.
