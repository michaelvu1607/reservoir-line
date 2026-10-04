import { imagineFrames, renderFrame } from "@/lib/imagine";
import { loadLake } from "@/lib/reservoirs";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!process.env.XAI_API_KEY) {
    return Response.json(
      {
        error:
          "XAI_API_KEY is not set. Create a key at https://console.x.ai, put it in .env.local, and restart the dev server.",
      },
      { status: 503 },
    );
  }

  let id = "";
  try {
    const body = (await request.json()) as { id?: string };
    id = body.id ?? "";
  } catch {
    id = "";
  }
  if (!id) return Response.json({ error: "Choose a lake first." }, { status: 400 });

  try {
    const lake = await loadLake(id);
    if (!lake || lake.latestM == null) {
      return Response.json({ error: "No satellite height series for that lake." }, { status: 404 });
    }
    const frames = imagineFrames(lake);
    const rendered = await Promise.all(
      frames.map(async (frame) => ({
        ...frame,
        imageUrl: await renderFrame(frame.prompt),
      })),
    );
    return Response.json({
      model: "grok-imagine-image",
      costUsd: frames.length * 0.02,
      frames: rendered,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
