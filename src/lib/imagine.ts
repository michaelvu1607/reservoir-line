import { statusLabel } from "./status";
import type { LakeDetail } from "./types";

export const IMAGINE_MODEL = "grok-imagine-image";
export const IMAGE_COST_USD = 0.02;

export type ImagineFrame = {
  id: "now" | "high";
  title: string;
  caption: string;
  prompt: string;
};

const CAMERA =
  "Aerial photograph, late-afternoon light, documentary, natural color, no people in the foreground, no text, no numbers, no labels, no logos, no watermark, no map, no chart.";

function shoreline(meters: number): string {
  const drop = Math.abs(meters);
  const where =
    meters < 0
      ? `${drop.toFixed(drop >= 10 ? 0 : 1)} meters below the long-term satellite reference`
      : `${drop.toFixed(drop >= 10 ? 0 : 1)} meters above the long-term satellite reference`;
  if (meters <= -15) {
    return `a wide exposed shore and a pale bathtub ring, water ${where}`;
  }
  if (meters <= -5) {
    return `a clearly exposed bank, water ${where}`;
  }
  if (meters < 0) {
    return `a slightly exposed bank, water ${where}`;
  }
  return `water up against the bank, ${where}`;
}

export function imagineFrames(lake: LakeDetail): ImagineFrame[] {
  const place = lake.about ? ` ${lake.about}` : "";
  const measured = `Satellite measurement: ${lake.latestM?.toFixed(1)} m relative to the reference pass on ${lake.latestDate}. NASA class: ${statusLabel(lake.status)}.`;
  const now = lake.latestM ?? 0;
  const high = lake.highYearM ?? Math.max(0, now + 10);
  return [
    {
      id: "now",
      title: "This pass",
      caption: `${lake.displayName} at the latest measured waterline.`,
      prompt: `${CAMERA} ${lake.displayName}.${place} Show ${shoreline(now)}. ${measured}`,
    },
    {
      id: "high",
      title: lake.highYear ? `High year, ${lake.highYear}` : "A high year",
      caption: lake.highYear
        ? `Same place in ${lake.highYear}, the fullest year in this satellite record.`
        : "Same place at a higher stand in the satellite record.",
      prompt: `${CAMERA} ${lake.displayName}.${place} Show the same viewpoint with ${shoreline(high)}. ${measured} This is an illustration of another year in the record, not a forecast.`,
    },
  ];
}

type ImagineResponse = {
  data?: Array<{ url?: string | null }>;
  error?: { message?: string };
};

export async function renderFrame(prompt: string): Promise<string> {
  const key = process.env.XAI_API_KEY;
  if (!key) {
    throw new Error("XAI_API_KEY is not set. Add it to .env.local and restart the dev server.");
  }
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGINE_MODEL,
      prompt,
      aspect_ratio: "16:9",
      resolution: "1k",
      response_format: "url",
      n: 1,
    }),
  });
  const payload = (await response.json().catch(() => null)) as ImagineResponse | null;
  if (!response.ok) {
    throw new Error(`Grok Imagine ${response.status}: ${payload?.error?.message || response.statusText}`);
  }
  const url = payload?.data?.[0]?.url;
  if (!url) throw new Error("Grok Imagine returned no image URL");
  return url;
}
