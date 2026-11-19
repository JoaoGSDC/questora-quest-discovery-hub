import { NextResponse } from "next/server";
import { addList, getSnapshot, removeList } from "@/db/repository";
import { seedIfEmpty } from "@/db/seed";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as { name: string; questionIds: string[] };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });
  }
  const list = await addList(body.name.trim(), body.questionIds ?? []);
  return NextResponse.json({ list, lists: (await getSnapshot()).lists });
}

export async function DELETE(req: Request) {
  await seedIfEmpty();
  const body = (await req.json()) as { id: string };
  if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  await removeList(body.id);
  return NextResponse.json({ lists: (await getSnapshot()).lists });
}
