import { NextResponse } from "next/server";
import type { QuestionFlags } from "@/lib/types";
import { getSnapshot, setFlag } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as { id: string; patch: Partial<QuestionFlags> };
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  await setFlag(body.id, body.patch ?? {});
  return NextResponse.json({ flags: (await getSnapshot()).flags });
}
