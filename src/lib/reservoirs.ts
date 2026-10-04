import fs from "node:fs";
import path from "node:path";
import { PLACES } from "./places";
import type { LakeDetail, LakePoint, MonthPoint, WaterReport } from "./types";

export { statusLabel, statusSigma } from "./status";

const PAGE = "https://earth.gsfc.nasa.gov/gwm/lake/";
const UA = "reservoir-line/1.0 (University of Michigan)";
const CACHE_MS = 6 * 60 * 60 * 1000;
const SERIES_RE = /^[A-Z0-9]+\s+\d+\s+(\d{8})\s+\d+\s+\d+\s+(-?\d+\.\d+)/;

type CatalogLake = {
  id: string;
  name: string;
  lon: number;
  lat: number;
  date: string;
  long_term: string | number;
};

let memo: { at: number; report: WaterReport } | null = null;

function cacheFile(): string {
  return path.join(process.cwd(), ".cache", "reservoirs.json");
}

function normalizeLon(lon: number): number {
  return lon > 180 ? lon - 360 : lon;
}

function displayName(id: string, name: string): string {
  return PLACES[id]?.displayName ?? name.replace(/\s+\d+$/, "");
}

async function fetchText(url: string, cookie = ""): Promise<string> {
  const headers: Record<string, string> = { "User-Agent": UA };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(url, { headers, cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response.text();
}

async function loadCatalog(): Promise<LakePoint[]> {
  const page = await fetch(PAGE, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!page.ok) throw new Error(`${page.status} for ${PAGE}`);
  const html = await page.text();
  const ssid = html.match(/ssid='([^']+)'/)?.[1];
  if (!ssid) throw new Error("NASA page did not include a session id");
  const cookie = page.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const raw = await fetchText(`${PAGE}FindAll/9999/${ssid}`, cookie);
  const parsed = JSON.parse(raw.slice(6)) as { nrt?: CatalogLake[] };
  return (parsed.nrt ?? []).map((lake) => ({
    id: String(lake.id),
    name: lake.name,
    lat: lake.lat,
    lon: normalizeLon(lake.lon),
    status: Number(lake.long_term),
    date: lake.date,
  }));
}

export function parseSeries(text: string): { date: string; m: number }[] {
  const points: { date: string; m: number }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = SERIES_RE.exec(line);
    if (!match) continue;
    const meters = Number(match[2]);
    if (!Number.isFinite(meters) || Math.abs(meters) > 200) continue;
    const ymd = match[1];
    points.push({
      date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
      m: meters,
    });
  }
  return points;
}

function monthlyMeans(points: { date: string; m: number }[]): MonthPoint[] {
  const groups = new Map<string, number[]>();
  for (const point of points) {
    const key = point.date.slice(0, 7);
    const list = groups.get(key) ?? [];
    list.push(point.m);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, values]) => ({
      t,
      m: values.reduce((sum, value) => sum + value, 0) / values.length,
    }));
}

function yearMean(series: MonthPoint[], year: number): number | null {
  const values = series.filter((point) => point.t.startsWith(`${year}-`)).map((point) => point.m);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export async function loadSeries(id: string): Promise<{ date: string; m: number }[]> {
  const url = `https://earth.gsfc.nasa.gov/gwm/timeseries/lake${id.padStart(6, "0")}.10d.2.txt`;
  return parseSeries(await fetchText(url));
}

function detailFromPoints(lake: LakePoint, points: { date: string; m: number }[]): LakeDetail {
  const place = PLACES[lake.id];
  const series = monthlyMeans(points);
  const latest = points[points.length - 1];
  const values = points.map((point) => point.m);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  let highYear: number | null = null;
  let highYearM: number | null = null;
  const years = new Set(series.map((point) => Number(point.t.slice(0, 4))));
  for (const year of years) {
    const value = yearMean(series, year);
    if (value == null) continue;
    if (highYearM == null || value > highYearM) {
      highYear = year;
      highYearM = value;
    }
  }
  const latestDate = latest?.date ?? null;
  const stale = latestDate
    ? Date.now() - new Date(`${latestDate}T00:00:00Z`).getTime() > 120 * 24 * 60 * 60 * 1000
    : true;
  return {
    ...lake,
    displayName: displayName(lake.id, lake.name),
    about: place?.about ?? null,
    note: place?.note ?? null,
    latestM: latest ? round(latest.m) : null,
    latestDate,
    meanM: mean == null ? null : round(mean),
    minM: values.length ? round(Math.min(...values)) : null,
    maxM: values.length ? round(Math.max(...values)) : null,
    highYear,
    highYearM: highYearM == null ? null : round(highYearM),
    series: series.map((point) => ({ t: point.t, m: round(point.m) })),
    stale,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function buildReport(): Promise<WaterReport> {
  const lakes = await loadCatalog();
  const low = lakes.filter((lake) => lake.status === 1 || lake.status === 2);
  const warnings: string[] = [];
  const ranked = (
    await pool(low, 8, async (lake) => {
      try {
        return detailFromPoints(lake, await loadSeries(lake.id));
      } catch (error) {
        warnings.push(
          `${lake.name}: ${error instanceof Error ? error.message : "series unavailable"}`,
        );
        return null;
      }
    })
  )
    .filter((lake): lake is LakeDetail => lake != null && lake.latestM != null)
    .sort((a, b) => (a.latestM ?? 0) - (b.latestM ?? 0));

  return {
    generatedAt: new Date().toISOString(),
    source:
      "NASA Global Water Measurements 10-day radar altimeter record (Sentinel-6 and the Jason series)",
    catalogDate: lakes[0]?.date ?? null,
    imagineConfigured: Boolean(process.env.XAI_API_KEY),
    lakes,
    ranked,
    warnings,
  };
}

export async function loadReport(): Promise<WaterReport> {
  if (memo && Date.now() - memo.at < CACHE_MS) return memo.report;
  const file = cacheFile();
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < CACHE_MS) {
    const report = JSON.parse(fs.readFileSync(file, "utf8")) as WaterReport;
    report.imagineConfigured = Boolean(process.env.XAI_API_KEY);
    memo = { at: Date.now(), report };
    return report;
  }
  const report = await buildReport();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report));
  memo = { at: Date.now(), report };
  return report;
}

export async function loadLake(id: string): Promise<LakeDetail | null> {
  const report = await loadReport();
  const ranked = report.ranked.find((lake) => lake.id === id);
  if (ranked) return ranked;
  const lake = report.lakes.find((item) => item.id === id);
  if (!lake) return null;
  try {
    return detailFromPoints(lake, await loadSeries(id));
  } catch {
    return {
      ...lake,
      displayName: displayName(lake.id, lake.name),
      about: PLACES[id]?.about ?? null,
      note: PLACES[id]?.note ?? null,
      latestM: null,
      latestDate: null,
      meanM: null,
      minM: null,
      maxM: null,
      highYear: null,
      highYearM: null,
      series: [],
      stale: true,
    };
  }
}
