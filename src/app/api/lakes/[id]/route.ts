import { loadLake } from "@/lib/reservoirs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, context: RouteContext<"/api/lakes/[id]">) {
  const { id } = await context.params;
  try {
    const lake = await loadLake(id);
    if (!lake) return Response.json({ error: "Lake not in the NASA 10-day catalog" }, { status: 404 });
    return Response.json(lake);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load this lake";
    return Response.json({ error: message }, { status: 500 });
  }
}
