"use client";

import { useEffect, useState } from "react";
import { WaterMap } from "@/components/water-map";
import { statusLabel, statusSigma } from "@/lib/status";
import type { LakeDetail, WaterReport } from "@/lib/types";

type Frame = {
  id: string;
  title: string;
  caption: string;
  prompt: string;
  imageUrl: string;
};

function metersLabel(meters: number | null): string {
  if (meters == null) return "No height";
  const value = Math.abs(meters).toFixed(Math.abs(meters) >= 10 ? 1 : 2);
  return meters < 0 ? `${value} m below reference` : `${value} m above reference`;
}

function Chart({ series }: { series: LakeDetail["series"] }) {
  if (series.length < 2) return null;
  const values = series.map((point) => point.m);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = Math.max(0.5, max - min);
  const width = 560;
  const height = 140;
  const xAt = (index: number) => (index / (series.length - 1)) * width;
  const yAt = (value: number) => height - ((value - min) / span) * (height - 16) - 8;
  const line = series.map((point, index) => `${xAt(index)},${yAt(point.m)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-36 w-full">
      <line
        x1="0"
        x2={width}
        y1={yAt(0)}
        y2={yAt(0)}
        stroke="rgba(255,255,255,0.25)"
        strokeDasharray="4 4"
      />
      <polyline fill="none" stroke="#7dffe0" strokeWidth="2" points={line} />
    </svg>
  );
}

export function LineConsole() {
  const [report, setReport] = useState<WaterReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LakeDetail | null>(null);
  const [frames, setFrames] = useState<Frame[] | null>(null);
  const [imagineError, setImagineError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/lakes");
        const body = (await response.json()) as WaterReport & { error?: string };
        if (!response.ok) throw new Error(body.error || "Could not load satellite heights");
        if (cancelled) return;
        setReport(body);
        setSelected(body.ranked[0] ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load satellite heights");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function choose(id: string) {
    const known = report?.ranked.find((lake) => lake.id === id);
    if (known) {
      setSelected(known);
      setFrames(null);
      return;
    }
    setFrames(null);
    const response = await fetch(`/api/lakes/${id}`);
    const body = (await response.json()) as LakeDetail & { error?: string };
    if (response.ok) setSelected(body);
  }

  async function renderScenes() {
    if (!selected) return;
    setRendering(true);
    setImagineError(null);
    try {
      const response = await fetch("/api/imagine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      });
      const body = (await response.json()) as { error?: string; frames?: Frame[] };
      if (!response.ok || !body.frames) throw new Error(body.error || "Image generation failed");
      setFrames(body.frames);
    } catch (err) {
      setImagineError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
      <header>
        <p className="text-xs tracking-[0.22em] text-teal-200/70 uppercase">
          MHacks · Sustainability · SpaceX
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Reservoir Line</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          A satellite measured how high the water is. This ranks the lakes and reservoirs that have
          fallen farthest below their own average, and draws that shoreline.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-slate-300">
          Reading NASA’s 10-day altimeter catalog and the low-water records…
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      {report && selected ? (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#07141c]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs tracking-wide text-slate-400 uppercase">
                    {report.lakes.length} lakes · pass {report.catalogDate}
                  </p>
                  <p className="text-sm text-slate-200">Red is far below normal. Blue is far above.</p>
                </div>
              </div>
              <div className="h-[min(68vh,640px)]">
                <WaterMap lakes={report.lakes} selectedId={selected.id} onSelect={(id) => void choose(id)} />
              </div>
            </div>

            <aside className="flex max-h-[min(68vh,640px)] flex-col gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#0c1b27] p-4">
                <p className="text-xs tracking-wide text-slate-400 uppercase">
                  {statusLabel(selected.status)} · {statusSigma(selected.status)}
                </p>
                <h2 className="mt-1 text-2xl text-white">{selected.displayName}</h2>
                <p className="mt-2 text-lg text-teal-100 tabular-nums">{metersLabel(selected.latestM)}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Latest pass {selected.latestDate ?? "unknown"}
                  {selected.meanM != null ? ` · record mean ${selected.meanM.toFixed(1)} m` : ""}
                  {selected.stale ? " · this series is more than four months old" : ""}
                </p>
                {selected.about ? <p className="mt-3 text-sm leading-6 text-slate-200">{selected.about}</p> : null}
                {selected.note ? <p className="mt-2 text-sm leading-6 text-amber-100">{selected.note}</p> : null}
                <Chart series={selected.series} />
                <p className="text-xs text-slate-500">
                  Zero is the satellite reference pass, not sea level. The line is monthly mean height.
                </p>
              </div>

              <ul className="min-h-0 flex-1 overflow-auto rounded-2xl border border-white/10 bg-[#0c1b27] p-2">
                {report.ranked.map((lake) => (
                  <li key={lake.id}>
                    <button
                      type="button"
                      onClick={() => void choose(lake.id)}
                      className={`flex w-full items-start justify-between gap-3 rounded-xl px-2 py-2 text-left ${
                        lake.id === selected.id ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      <span>
                        <span className="block text-sm text-slate-100">{lake.displayName}</span>
                        <span className="text-xs text-slate-400">{statusLabel(lake.status)}</span>
                      </span>
                      <span className="text-xs text-teal-100 tabular-nums">{metersLabel(lake.latestM)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </section>

          {report.warnings.length > 0 ? (
            <ul className="rounded-2xl border border-amber-200/20 bg-amber-200/5 px-4 py-3 text-xs text-amber-100">
              {report.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <section className="rounded-2xl border border-white/10 bg-[#0c1b27] p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs tracking-wide text-slate-400 uppercase">Grok Imagine</p>
                <h2 className="text-lg text-white">Draw {selected.displayName}</h2>
                <p className="max-w-2xl text-sm text-slate-300">
                  Two stills of the same place. One is this pass. One is the fullest year in the
                  satellite record. About $0.04 total, charged only when you press the button. The
                  drawings illustrate the heights. They are not photographs from the satellite.
                </p>
              </div>
              <button
                type="button"
                disabled={rendering || selected.latestM == null || !report.imagineConfigured}
                onClick={() => void renderScenes()}
                className="rounded-full bg-teal-200 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {rendering ? "Drawing both shorelines…" : "Draw the waterline"}
              </button>
            </div>
            {!report.imagineConfigured ? (
              <p className="mt-3 text-sm text-amber-100">
                No xAI key yet. Create one at{" "}
                <a className="underline" href="https://console.x.ai" target="_blank" rel="noreferrer">
                  console.x.ai
                </a>
                , add <code className="text-teal-100">XAI_API_KEY</code> to{" "}
                <code className="text-teal-100">.env.local</code>, and restart{" "}
                <code className="text-teal-100">bun dev</code>. The map works without it.
              </p>
            ) : null}
            {imagineError ? <p className="mt-3 text-sm text-red-200">{imagineError}</p> : null}
            {frames ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {frames.map((frame) => (
                  <figure key={frame.id} className="overflow-hidden rounded-xl border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={frame.imageUrl} alt={frame.title} className="h-56 w-full object-cover" />
                    <figcaption className="px-3 py-2">
                      <p className="text-sm text-white">{frame.title}</p>
                      <p className="text-xs text-slate-400">{frame.caption}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </section>

          <p className="text-xs leading-5 text-slate-500">
            Heights are relative to one reference satellite pass, from {report.source}. NASA’s class
            compares each lake with its own history. A low lake can be drought, water use, or a dam.
            The height does not by itself say which.
          </p>
        </>
      ) : null}
    </div>
  );
}
