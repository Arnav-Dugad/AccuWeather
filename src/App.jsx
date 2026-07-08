import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, CloudSun, Github } from 'lucide-react';
import { DEFAULT_LOCATION } from './config/models.js';
import { placeLabel } from './lib/format.js';
import { coordLabel } from './lib/openMeteo.js';
import { reverseGeocode } from './lib/geo.js';
import { locationFromUrl, syncUrl } from './lib/url.js';
import { useGeolocation } from './hooks/useGeolocation.js';
import { useWeather } from './hooks/useWeather.js';
import { useAirQuality } from './hooks/useAirQuality.js';
import { useRainOutlook } from './hooks/useRainOutlook.js';
import { useSavedLocations } from './hooks/useSavedLocations.js';

import SearchBar from './components/SearchBar.jsx';
import UnitsToggle from './components/UnitsToggle.jsx';
import LocationChips from './components/LocationChips.jsx';
import RegionBadge from './components/RegionBadge.jsx';
import AlertBanner from './components/AlertBanner.jsx';
import DaySummary from './components/DaySummary.jsx';
import ConsensusCard from './components/ConsensusCard.jsx';
import ConfidenceIndex from './components/ConfidenceIndex.jsx';
import AirQualityCard from './components/AirQualityCard.jsx';
import SunArc from './components/SunArc.jsx';
import MoonPhase from './components/MoonPhase.jsx';
import WhatToWear from './components/WhatToWear.jsx';
import TomorrowCompare from './components/TomorrowCompare.jsx';
import ComfortIndex from './components/ComfortIndex.jsx';
import ActivityScore from './components/ActivityScore.jsx';
import BestTime from './components/BestTime.jsx';
import UvWindow from './components/UvWindow.jsx';
import NextChange from './components/NextChange.jsx';
import StormSignal from './components/StormSignal.jsx';
import EventTimeline from './components/EventTimeline.jsx';
import WeekOutlook from './components/WeekOutlook.jsx';
import RainNowcast from './components/RainNowcast.jsx';
import RainOutlook from './components/RainOutlook.jsx';
import ModelBreakdown from './components/ModelBreakdown.jsx';
import MetricsGrid from './components/MetricsGrid.jsx';
import HourlyStrip from './components/HourlyStrip.jsx';
import DailyForecast from './components/DailyForecast.jsx';
import PrecipAccum from './components/PrecipAccum.jsx';
import { SkeletonDashboard, ErrorState } from './components/LoadingState.jsx';

const RadarMap = lazy(() => import('./components/RadarMap.jsx'));

const urlLocation = locationFromUrl();

const cascade = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } } };

export default function App() {
  const [location, setLocationState] = useState(urlLocation || DEFAULT_LOCATION);
  const userActedRef = useRef(Boolean(urlLocation));
  const { locate, status: geoStatus } = useGeolocation();
  const { data, region, status, error, reload } = useWeather(location);
  const { data: aq, status: aqStatus } = useAirQuality(location);
  const { outlook, nowcast, status: rainStatus } = useRainOutlook(location);
  const { saved, has, toggle, remove } = useSavedLocations();

  const selectLocation = useCallback((loc) => {
    userActedRef.current = true;
    setLocationState(loc);
  }, []);

  useEffect(() => {
    syncUrl(location);
  }, [location]);

  const applyCoords = useCallback(async (coords) => {
    const base = {
      name: 'Your location',
      admin1: '',
      country: coordLabel(coords.latitude, coords.longitude),
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'geo',
    };
    selectLocation(base);
    const place = await reverseGeocode(coords.latitude, coords.longitude);
    if (place) {
      setLocationState((prev) =>
        prev.source === 'geo' && prev.latitude === coords.latitude
          ? { ...prev, ...place, source: 'geo' }
          : prev,
      );
    }
  }, [selectLocation]);

  useEffect(() => {
    if (userActedRef.current) return;
    let cancelled = false;
    locate()
      .then((coords) => {
        if (cancelled || userActedRef.current) return;
        applyCoords(coords);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLocate = () => locate().then(applyCoords).catch(() => {});

  const placeName = useMemo(() => {
    if (!location) return '';
    if (location.source === 'geo' && location.name === 'Your location')
      return `Your location · ${location.country}`;
    return placeLabel(location);
  }, [location]);

  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setShowTop(window.scrollY > 600); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loading = status === 'loading' || status === 'idle';

  return (
    <div className="relative min-h-screen">
      <div className="aurora" />
      <div className="grain" />

      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {/* header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="glass flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
              <CloudSun size={22} className="text-sky-300" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold tracking-tight text-ink sm:text-xl">AccuWeather</h1>
              <p className="-mt-0.5 truncate text-xs text-ink-soft">Smart Model Router · India-tuned</p>
            </div>
          </div>
          <UnitsToggle />
        </header>

        {/* search */}
        <div className="mt-6">
          <SearchBar onSelect={selectLocation} onLocate={onLocate} locating={geoStatus === 'prompting'} />
        </div>

        {/* saved locations + share */}
        <div className="mt-3">
          <LocationChips
            saved={saved}
            current={location}
            isSaved={has(location)}
            onPick={selectLocation}
            onToggleSave={toggle}
            onRemove={remove}
            data={data}
            region={region}
            aq={aq}
          />
        </div>

        {/* body */}
        <main className="mt-5">
          <AnimatePresence mode="wait">
            {status === 'error' ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ErrorState message={error} onRetry={reload} />
              </motion.div>
            ) : loading || !data ? (
              <motion.div key="skeleton" initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
                <SkeletonDashboard />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                className="space-y-4 sm:space-y-5"
                variants={cascade}
                initial="hidden"
                animate="visible"
              >
                <AlertBanner consensus={data.consensus} />

                <motion.div variants={fadeUp} className="grid gap-4 sm:gap-5 lg:grid-cols-[1.6fr_1fr]">
                  <ConsensusCard data={data} placeName={placeName} pop={outlook?.nowPop} />
                  <ConfidenceIndex confidence={data.confidence} />
                </motion.div>

                <DaySummary consensus={data.consensus} />

                <motion.div variants={fadeUp} className="grid gap-4 sm:gap-5 lg:grid-cols-2">
                  <NextChange data={data} />
                  <StormSignal data={data} />
                </motion.div>

                <motion.div variants={fadeUp} className="grid items-stretch gap-4 sm:gap-5 lg:grid-cols-3">
                  <WhatToWear data={data} />
                  <TomorrowCompare data={data} />
                  <ComfortIndex data={data} />
                </motion.div>

                <motion.div variants={fadeUp} className="grid items-start gap-4 sm:gap-5 lg:grid-cols-3">
                  <ActivityScore data={data} aq={aq} />
                  <BestTime data={data} />
                  <UvWindow data={data} />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <EventTimeline data={data} />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <RainNowcast nowcast={nowcast} status={rainStatus} />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <MetricsGrid data={data} />
                </motion.div>

                <motion.div variants={fadeUp} className="grid items-start gap-4 sm:gap-5 lg:grid-cols-3">
                  <AirQualityCard aq={aq} status={aqStatus} />
                  <SunArc sun={data.consensus.sun} utcOffset={data.meta.utcOffsetSeconds} sunshineDuration={data.consensus.daily[0]?.sunshineDuration} />
                  <MoonPhase />
                </motion.div>

                <RegionBadge region={region} />

                <motion.div variants={fadeUp}>
                  <ModelBreakdown data={data} />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <RainOutlook outlook={outlook} status={rainStatus} />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <PrecipAccum hours={data.consensus.hourly} />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <WeekOutlook data={data} />
                </motion.div>

                <motion.div variants={fadeUp} className="grid gap-4 sm:gap-5 lg:grid-cols-2">
                  <HourlyStrip data={data} />
                  <DailyForecast data={data} rainDaily={outlook?.daily} />
                </motion.div>

                <motion.div variants={fadeUp}>
                  <Suspense fallback={<div className="skeleton h-[300px] rounded-3xl sm:h-[380px] lg:h-[420px]" />}>
                    <RadarMap lat={location.latitude} lon={location.longitude} region={region} />
                  </Suspense>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* footer */}
        <footer className="mt-12 flex flex-col items-center gap-2 text-center text-xs text-ink-soft">
          <div className="divider w-full max-w-md" />
          <p className="max-w-2xl leading-relaxed">
            Independent demo project — <strong className="text-ink/80">not affiliated with
            AccuWeather, Inc.</strong> Forecast data: Open-Meteo (ECMWF · GFS · DWD ICON · NOAA HRRR).
            Radar: RainViewer · Air quality: Open-Meteo · Place names: BigDataCloud. Blends are
            transparent weighted post-processing of public model output, not a new numerical model.
          </p>
          <div className="flex items-center gap-3">
            <p className="font-medium text-ink/70">Arnav &copy; {new Date().getFullYear()}</p>
            <span className="h-3 w-px bg-white/15" />
            <a
              href="https://github.com/Arnav-Dugad"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink-soft transition hover:text-ink"
            >
              <Github size={14} />
              GitHub
            </a>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="glass fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-2xl text-ink-soft shadow-lg transition hover:text-ink"
            aria-label="Back to top"
          >
            <ChevronUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
