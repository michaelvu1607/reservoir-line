import { loadReport } from "@/lib/reservoirs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    return Response.json(await loadReport());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reservoir heights";
    return Response.json({ error: message }, { status: 500 });
  }
}
