"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });

function SceneUnavailable({ onFailure }: { onFailure: () => void }) {
  useEffect(onFailure, [onFailure]);
  return null;
}

export default function HeroExperience({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [eligible, setEligible] = useState(false);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEligible(desktop.matches && !reduced.matches);
    update();
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    let intersecting = true;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting;
      update();
    });
    if (container.current) observer.observe(container.current);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const showScene = eligible && !failed;
  const active = showScene && ready;

  return (
    <div ref={container} className={`hero-experience ${active ? "is-ready" : ""}`}>
      <div className="hero-poster-wrap">{children}</div>
      {showScene && (
        <ErrorBoundary fallback={<SceneUnavailable onFailure={onFailure} />}>
          <div className="hero-canvas" aria-hidden="true">
            <HeroScene running={visible && !paused} onReady={onReady} onFailure={onFailure} />
          </div>
        </ErrorBoundary>
      )}
      {active && (
        <button type="button" className="hero-motion-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? "Play hero animation" : "Pause hero animation"}>
          {paused ? <Play size={13} /> : <Pause size={13} />}
          {paused ? "Play motion" : "Pause motion"}
        </button>
      )}
    </div>
  );
}
