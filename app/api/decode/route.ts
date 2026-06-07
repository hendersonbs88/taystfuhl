import { NextResponse } from "next/server";
import { decodeVideoUrl } from "@/lib/decode";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string; evidenceText?: string };
    const draft = await decodeVideoUrl({
      url: body.url || "",
      evidenceText: body.evidenceText || ""
    });
    return NextResponse.json(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to decode this video.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
